/**
 * Node.js native addon for PDF text extraction
 *
 * This file provides the C++ bridge between the pdf-text-extraction library
 * and the Node.js TypeScript interface.
 */

#include <napi.h>
#include <string>
#include <memory>
#include <chrono>
#include <atomic>
#include "TextExtraction.h"
#include "ErrorsAndWarnings.h"
#include "lib/text-composition/TextComposer.h"
#include "EStatusCode.h"
#include "PDFParser.h"
#include "PDFDictionary.h"
#include "PDFObjectCast.h"
#include "PDFLiteralString.h"
#include "PDFHexString.h"
#include "PDFName.h"
#include "InputFile.h"
#include "PDFTextString.h"
#include "lib/bidi/BidiConversion.h"
#include "IByteReaderWithPosition.h"
#include "IOBasicTypes.h"

/**
 * BufferByteReader: Implements IByteReaderWithPosition for reading from memory buffers
 * This allows direct PDF parsing from Node.js buffers without temp files
 */
class BufferByteReader : public IByteReaderWithPosition {
private:
    const uint8_t* data;
    size_t size;
    size_t position;

public:
    BufferByteReader(const uint8_t* inData, size_t inSize)
        : data(inData), size(inSize), position(0) {}

    virtual ~BufferByteReader() {}

    // IByteReader interface
    virtual IOBasicTypes::LongBufferSizeType Read(IOBasicTypes::Byte* inBuffer, IOBasicTypes::LongBufferSizeType inBufferSize) override {
        if (position >= size) {
            return 0;  // EOF
        }

        size_t bytesToRead = std::min(inBufferSize, size - position);
        std::memcpy(inBuffer, data + position, bytesToRead);
        position += bytesToRead;
        return bytesToRead;
    }

    virtual bool NotEnded() override {
        return position < size;
    }

    // IByteReaderWithPosition interface
    virtual void SetPosition(IOBasicTypes::LongFilePositionType inOffsetFromStart) override {
        if (inOffsetFromStart < 0) {
            position = 0;
        } else if (static_cast<size_t>(inOffsetFromStart) > size) {
            position = size;
        } else {
            position = static_cast<size_t>(inOffsetFromStart);
        }
    }

    virtual void SetPositionFromEnd(IOBasicTypes::LongFilePositionType inOffsetFromEnd) override {
        if (inOffsetFromEnd < 0 || static_cast<size_t>(inOffsetFromEnd) > size) {
            position = 0;
        } else {
            position = size - static_cast<size_t>(inOffsetFromEnd);
        }
    }

    virtual IOBasicTypes::LongFilePositionType GetCurrentPosition() override {
        return static_cast<IOBasicTypes::LongFilePositionType>(position);
    }

    virtual void Skip(IOBasicTypes::LongBufferSizeType inSkipSize) override {
        position += inSkipSize;
        if (position > size) {
            position = size;
        }
    }
};

/**
 * Helper function to extract string value from PDF object
 * Properly decodes PDF strings (PDFDocEncoding or UTF-16BE) to UTF-8
 */
std::string GetStringFromPDFObject(PDFObject* obj) {
    if (!obj) {
        return "";
    }

    if (obj->GetType() == PDFObject::ePDFObjectLiteralString) {
        PDFLiteralString* litStr = (PDFLiteralString*)obj;
        // Use PDFTextString to properly decode the string
        PDFTextString textStr(litStr->GetValue());
        return textStr.ToUTF8String();
    } else if (obj->GetType() == PDFObject::ePDFObjectHexString) {
        PDFHexString* hexStr = (PDFHexString*)obj;
        // Use PDFTextString to properly decode the string
        PDFTextString textStr(hexStr->GetValue());
        return textStr.ToUTF8String();
    }

    return "";
}

/**
 * Core text extraction logic (shared by file and buffer operations)
 * Works with any IByteReaderWithPosition stream source
 * Bidi algorithm is always applied with the specified direction
 * Supports cancellation via atomic flag
 */
struct TextExtractionResult {
    std::string text;
    int pageCount;
    int bidiDirection;
    bool cancelled;
};

TextExtractionResult ExtractTextCore(IByteReaderWithPosition* stream, int bidiDirection, std::atomic<bool>* cancelFlag = nullptr) {
    // Check for cancellation before starting
    if (cancelFlag && cancelFlag->load()) {
        return {"", 0, bidiDirection, true};
    }

    TextExtraction textExtraction;

    // Extract text from all pages (-1 means all pages)
    // Note: The underlying library doesn't support cancellation during extraction,
    // but we check before and after the operation
    PDFHummus::EStatusCode status = textExtraction.ExtractText(stream, 0, -1);

    // Check for cancellation after extraction
    if (cancelFlag && cancelFlag->load()) {
        return {"", 0, bidiDirection, true};
    }

    if (status != PDFHummus::eSuccess) {
        std::string errorMsg = "Extraction failed";
        if (!textExtraction.LatestError.description.empty()) {
            errorMsg += ": " + textExtraction.LatestError.description;
        }
        throw std::runtime_error(errorMsg);
    }

    // Get results as text with bidi algorithm applied
    // bidiDirection: 0 (LTR) or 1 (RTL) - always applied for proper text ordering
    std::string extractedText = textExtraction.GetResultsAsText(bidiDirection, TextComposer::eSpacingBoth);

    // Count pages
    int pageCount = static_cast<int>(textExtraction.textsForPages.size());

    return {extractedText, pageCount, bidiDirection, false};
}

/**
 * AsyncWorker for text extraction from file
 * Runs extraction in worker thread with cancellation support
 */
class TextExtractionWorker : public Napi::AsyncWorker {
public:
    TextExtractionWorker(Napi::Env env, const std::string& filePath, int bidiDirection)
        : Napi::AsyncWorker(env),
          filePath_(filePath),
          bidiDirection_(bidiDirection),
          cancelled_(false),
          result_{"", 0, bidiDirection, false},
          deferred_(Napi::Promise::Deferred::New(env)) {
    }

    ~TextExtractionWorker() {}

    // Get the promise that will resolve/reject when work is done
    Napi::Promise GetPromise() {
        return deferred_.Promise();
    }

    // Called from JS thread to cancel the operation
    void Cancel() {
        cancelled_.store(true);
    }

protected:
    // Runs in worker thread
    void Execute() override {
        try {
            // Open PDF file
            InputFile pdfFile;
            PDFHummus::EStatusCode status = pdfFile.OpenFile(filePath_);

            if (status != PDFHummus::eSuccess) {
                SetError("Failed to open PDF file");
                return;
            }

            // Check cancellation before extraction
            if (cancelled_.load()) {
                SetError("Operation cancelled");
                return;
            }

            // Get the file stream and delegate to core function
            IByteReaderWithPosition* stream = pdfFile.GetInputStream();
            result_ = ExtractTextCore(stream, bidiDirection_, &cancelled_);

            if (result_.cancelled) {
                SetError("Operation cancelled");
            }

        } catch (const std::exception& e) {
            SetError(std::string("Extraction failed: ") + e.what());
        }
    }

    // Runs in JS thread after Execute completes
    void OnOK() override {
        Napi::Env env = Env();
        Napi::Object napiResult = Napi::Object::New(env);
        napiResult.Set("text", Napi::String::New(env, result_.text));
        napiResult.Set("pageCount", Napi::Number::New(env, result_.pageCount));
        napiResult.Set("bidiDirection", Napi::Number::New(env, result_.bidiDirection));
        deferred_.Resolve(napiResult);
    }

    void OnError(const Napi::Error& e) override {
        deferred_.Reject(e.Value());
    }

private:
    std::string filePath_;
    int bidiDirection_;
    std::atomic<bool> cancelled_;
    TextExtractionResult result_;
    Napi::Promise::Deferred deferred_;
};

/**
 * Extract text from PDF file
 * Returns a promise and stores worker reference for cancellation
 */
Napi::Value ExtractTextFromFile(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();

    if (info.Length() < 1 || !info[0].IsString()) {
        Napi::TypeError::New(env, "Expected file path as string").ThrowAsJavaScriptException();
        return env.Null();
    }

    std::string filePath = info[0].As<Napi::String>().Utf8Value();
    int bidiDirection = 0;  // 0 = LTR (Left-to-Right)

    if (info.Length() > 1 && info[1].IsNumber()) {
        bidiDirection = info[1].As<Napi::Number>().Int32Value();
    }

    // Create async worker
    TextExtractionWorker* worker = new TextExtractionWorker(env, filePath, bidiDirection);

    // Store worker reference on the promise for cancellation
    Napi::Promise promise = worker->GetPromise();
    Napi::Object promiseObj = promise.As<Napi::Object>();
    promiseObj.Set("_worker", Napi::External<TextExtractionWorker>::New(env, worker));

    // Queue the work
    worker->Queue();

    return promise;
}

/**
 * AsyncWorker for text extraction from buffer
 * Runs extraction in worker thread with cancellation support
 */
class TextExtractionFromBufferWorker : public Napi::AsyncWorker {
public:
    TextExtractionFromBufferWorker(Napi::Env env, const uint8_t* data, size_t size, int bidiDirection)
        : Napi::AsyncWorker(env),
          bufferData_(new uint8_t[size]),
          bufferSize_(size),
          bidiDirection_(bidiDirection),
          cancelled_(false),
          result_{"", 0, bidiDirection, false},
          deferred_(Napi::Promise::Deferred::New(env)) {
        // Copy buffer data for use in worker thread
        std::memcpy(bufferData_.get(), data, size);
    }

    ~TextExtractionFromBufferWorker() {}

    Napi::Promise GetPromise() {
        return deferred_.Promise();
    }

    void Cancel() {
        cancelled_.store(true);
    }

protected:
    void Execute() override {
        try {
            // Check cancellation before extraction
            if (cancelled_.load()) {
                SetError("Operation cancelled");
                return;
            }

            // Create a buffer reader for direct stream access
            BufferByteReader bufferReader(bufferData_.get(), bufferSize_);

            // Delegate to core function
            result_ = ExtractTextCore(&bufferReader, bidiDirection_, &cancelled_);

            if (result_.cancelled) {
                SetError("Operation cancelled");
            }

        } catch (const std::exception& e) {
            SetError(std::string("Extraction failed: ") + e.what());
        }
    }

    void OnOK() override {
        Napi::Env env = Env();
        Napi::Object napiResult = Napi::Object::New(env);
        napiResult.Set("text", Napi::String::New(env, result_.text));
        napiResult.Set("pageCount", Napi::Number::New(env, result_.pageCount));
        napiResult.Set("bidiDirection", Napi::Number::New(env, result_.bidiDirection));
        deferred_.Resolve(napiResult);
    }

    void OnError(const Napi::Error& e) override {
        deferred_.Reject(e.Value());
    }

private:
    std::unique_ptr<uint8_t[]> bufferData_;
    size_t bufferSize_;
    int bidiDirection_;
    std::atomic<bool> cancelled_;
    TextExtractionResult result_;
    Napi::Promise::Deferred deferred_;
};

/**
 * Extract text from PDF buffer
 * Returns a promise and stores worker reference for cancellation
 */
Napi::Value ExtractTextFromBuffer(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();

    if (info.Length() < 1 || !info[0].IsBuffer()) {
        Napi::TypeError::New(env, "Expected buffer").ThrowAsJavaScriptException();
        return env.Null();
    }

    Napi::Buffer<uint8_t> buffer = info[0].As<Napi::Buffer<uint8_t>>();
    int bidiDirection = 0;  // 0 = LTR (Left-to-Right)

    if (info.Length() > 1 && info[1].IsNumber()) {
        bidiDirection = info[1].As<Napi::Number>().Int32Value();
    }

    // Create async worker
    TextExtractionFromBufferWorker* worker = new TextExtractionFromBufferWorker(
        env, buffer.Data(), buffer.Length(), bidiDirection);

    // Store worker reference on the promise for cancellation
    Napi::Promise promise = worker->GetPromise();
    Napi::Object promiseObj = promise.As<Napi::Object>();
    promiseObj.Set("_worker", Napi::External<TextExtractionFromBufferWorker>::New(env, worker));

    // Queue the work
    worker->Queue();

    return promise;
}

/**
 * Core metadata extraction logic (shared by file and buffer operations)
 * Works with any IByteReaderWithPosition stream source
 * Supports cancellation via atomic flag
 */
struct MetadataExtractionResult {
    unsigned long pageCount;
    std::string version;
    std::string title;
    std::string author;
    std::string subject;
    std::string creator;
    std::string producer;
    std::string creationDate;
    std::string modificationDate;
    bool cancelled;
};

MetadataExtractionResult ExtractMetadataCore(IByteReaderWithPosition* stream, std::atomic<bool>* cancelFlag = nullptr) {
    // Check for cancellation before starting
    if (cancelFlag && cancelFlag->load()) {
        return {0, "", "", "", "", "", "", "", "", true};
    }

    // Create parser and parse from stream
    PDFParser parser;
    PDFHummus::EStatusCode status = parser.StartPDFParsing(stream);

    if (status != PDFHummus::eSuccess) {
        throw std::runtime_error("Failed to parse PDF from stream");
    }

    // Check for cancellation after parsing
    if (cancelFlag && cancelFlag->load()) {
        return {0, "", "", "", "", "", "", "", "", true};
    }

    MetadataExtractionResult result = {};
    result.cancelled = false;

    // Get page count
    result.pageCount = parser.GetPagesCount();

    // Get PDF version
    double pdfVersion = parser.GetPDFLevel();
    char versionStr[10];
    snprintf(versionStr, sizeof(versionStr), "%.1f", pdfVersion);
    result.version = versionStr;

    // Get trailer dictionary
    PDFDictionary* trailer = parser.GetTrailer();
    if (trailer) {
        // Query Info dictionary
        PDFObjectCastPtr<PDFDictionary> infoDict(parser.QueryDictionaryObject(trailer, "Info"));

        if (infoDict.GetPtr()) {
            // Extract metadata fields
            PDFObject* titleObj = infoDict->QueryDirectObject("Title");
            if (titleObj) {
                result.title = GetStringFromPDFObject(titleObj);
            }

            PDFObject* authorObj = infoDict->QueryDirectObject("Author");
            if (authorObj) {
                result.author = GetStringFromPDFObject(authorObj);
            }

            PDFObject* subjectObj = infoDict->QueryDirectObject("Subject");
            if (subjectObj) {
                result.subject = GetStringFromPDFObject(subjectObj);
            }

            PDFObject* creatorObj = infoDict->QueryDirectObject("Creator");
            if (creatorObj) {
                result.creator = GetStringFromPDFObject(creatorObj);
            }

            PDFObject* producerObj = infoDict->QueryDirectObject("Producer");
            if (producerObj) {
                result.producer = GetStringFromPDFObject(producerObj);
            }

            PDFObject* creationDateObj = infoDict->QueryDirectObject("CreationDate");
            if (creationDateObj) {
                result.creationDate = GetStringFromPDFObject(creationDateObj);
            }

            PDFObject* modDateObj = infoDict->QueryDirectObject("ModDate");
            if (modDateObj) {
                result.modificationDate = GetStringFromPDFObject(modDateObj);
            }
        }
    }

    return result;
}

/**
 * Helper to set metadata field on Napi::Object (sets null if empty)
 */
void SetMetadataField(Napi::Object& obj, const std::string& key, const std::string& value, Napi::Env& env) {
    if (!value.empty()) {
        obj.Set(key, Napi::String::New(env, value));
    } else {
        obj.Set(key, env.Null());
    }
}

/**
 * AsyncWorker for metadata extraction from file
 */
class MetadataExtractionWorker : public Napi::AsyncWorker {
public:
    MetadataExtractionWorker(Napi::Env env, const std::string& filePath)
        : Napi::AsyncWorker(env),
          filePath_(filePath),
          cancelled_(false),
          result_{0, "", "", "", "", "", "", "", "", false},
          deferred_(Napi::Promise::Deferred::New(env)) {
    }

    ~MetadataExtractionWorker() {}

    Napi::Promise GetPromise() {
        return deferred_.Promise();
    }

    void Cancel() {
        cancelled_.store(true);
    }

protected:
    void Execute() override {
        try {
            if (cancelled_.load()) {
                SetError("Operation cancelled");
                return;
            }

            InputFile pdfFile;
            PDFHummus::EStatusCode status = pdfFile.OpenFile(filePath_);

            if (status != PDFHummus::eSuccess) {
                SetError("Failed to open PDF file");
                return;
            }

            IByteReaderWithPosition* stream = pdfFile.GetInputStream();
            result_ = ExtractMetadataCore(stream, &cancelled_);

            if (result_.cancelled) {
                SetError("Operation cancelled");
            }

        } catch (const std::exception& e) {
            SetError(std::string("Metadata extraction failed: ") + e.what());
        }
    }

    void OnOK() override {
        Napi::Env env = Env();
        Napi::Object result = Napi::Object::New(env);
        result.Set("pageCount", Napi::Number::New(env, result_.pageCount));
        result.Set("version", Napi::String::New(env, result_.version));
        SetMetadataField(result, "title", result_.title, env);
        SetMetadataField(result, "author", result_.author, env);
        SetMetadataField(result, "subject", result_.subject, env);
        SetMetadataField(result, "creator", result_.creator, env);
        SetMetadataField(result, "producer", result_.producer, env);
        SetMetadataField(result, "creationDate", result_.creationDate, env);
        SetMetadataField(result, "modificationDate", result_.modificationDate, env);
        deferred_.Resolve(result);
    }

    void OnError(const Napi::Error& e) override {
        deferred_.Reject(e.Value());
    }

private:
    std::string filePath_;
    std::atomic<bool> cancelled_;
    MetadataExtractionResult result_;
    Napi::Promise::Deferred deferred_;
};

/**
 * Get PDF metadata from file
 * Returns a promise and stores worker reference for cancellation
 */
Napi::Value GetMetadataFromFile(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();

    if (info.Length() < 1 || !info[0].IsString()) {
        Napi::TypeError::New(env, "Expected file path as string").ThrowAsJavaScriptException();
        return env.Null();
    }

    std::string filePath = info[0].As<Napi::String>().Utf8Value();

    MetadataExtractionWorker* worker = new MetadataExtractionWorker(env, filePath);

    Napi::Promise promise = worker->GetPromise();
    Napi::Object promiseObj = promise.As<Napi::Object>();
    promiseObj.Set("_worker", Napi::External<MetadataExtractionWorker>::New(env, worker));

    worker->Queue();

    return promise;
}

/**
 * AsyncWorker for metadata extraction from buffer
 */
class MetadataExtractionFromBufferWorker : public Napi::AsyncWorker {
public:
    MetadataExtractionFromBufferWorker(Napi::Env env, const uint8_t* data, size_t size)
        : Napi::AsyncWorker(env),
          bufferData_(new uint8_t[size]),
          bufferSize_(size),
          cancelled_(false),
          result_{0, "", "", "", "", "", "", "", "", false},
          deferred_(Napi::Promise::Deferred::New(env)) {
        std::memcpy(bufferData_.get(), data, size);
    }

    ~MetadataExtractionFromBufferWorker() {}

    Napi::Promise GetPromise() {
        return deferred_.Promise();
    }

    void Cancel() {
        cancelled_.store(true);
    }

protected:
    void Execute() override {
        try {
            if (cancelled_.load()) {
                SetError("Operation cancelled");
                return;
            }

            BufferByteReader bufferReader(bufferData_.get(), bufferSize_);
            result_ = ExtractMetadataCore(&bufferReader, &cancelled_);

            if (result_.cancelled) {
                SetError("Operation cancelled");
            }

        } catch (const std::exception& e) {
            SetError(std::string("Metadata extraction failed: ") + e.what());
        }
    }

    void OnOK() override {
        Napi::Env env = Env();
        Napi::Object result = Napi::Object::New(env);
        result.Set("pageCount", Napi::Number::New(env, result_.pageCount));
        result.Set("version", Napi::String::New(env, result_.version));
        SetMetadataField(result, "title", result_.title, env);
        SetMetadataField(result, "author", result_.author, env);
        SetMetadataField(result, "subject", result_.subject, env);
        SetMetadataField(result, "creator", result_.creator, env);
        SetMetadataField(result, "producer", result_.producer, env);
        SetMetadataField(result, "creationDate", result_.creationDate, env);
        SetMetadataField(result, "modificationDate", result_.modificationDate, env);
        deferred_.Resolve(result);
    }

    void OnError(const Napi::Error& e) override {
        deferred_.Reject(e.Value());
    }

private:
    std::unique_ptr<uint8_t[]> bufferData_;
    size_t bufferSize_;
    std::atomic<bool> cancelled_;
    MetadataExtractionResult result_;
    Napi::Promise::Deferred deferred_;
};

/**
 * Get PDF metadata from buffer
 * Returns a promise and stores worker reference for cancellation
 */
Napi::Value GetMetadataFromBuffer(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();

    if (info.Length() < 1 || !info[0].IsBuffer()) {
        Napi::TypeError::New(env, "Expected buffer").ThrowAsJavaScriptException();
        return env.Null();
    }

    Napi::Buffer<uint8_t> buffer = info[0].As<Napi::Buffer<uint8_t>>();

    MetadataExtractionFromBufferWorker* worker = new MetadataExtractionFromBufferWorker(
        env, buffer.Data(), buffer.Length());

    Napi::Promise promise = worker->GetPromise();
    Napi::Object promiseObj = promise.As<Napi::Object>();
    promiseObj.Set("_worker", Napi::External<MetadataExtractionFromBufferWorker>::New(env, worker));

    worker->Queue();

    return promise;
}

/**
 * Cancel a running operation
 * Takes a worker reference and calls Cancel() on it
 */
Napi::Value CancelOperation(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();

    if (info.Length() < 1) {
        Napi::TypeError::New(env, "Expected worker reference").ThrowAsJavaScriptException();
        return env.Undefined();
    }

    // Try each worker type - only one will match
    if (info[0].IsExternal()) {
        Napi::External<void> ext = info[0].As<Napi::External<void>>();
        void* data = ext.Data();

        // We don't know the exact type, but Cancel() is a public method on all workers
        // This is a bit of a hack, but it works because all worker classes have the same layout
        // for the Cancel() method. A better approach would be to use a base class.
        // For now, we'll try casting to each type

        // Try TextExtractionWorker
        try {
            TextExtractionWorker* worker = static_cast<TextExtractionWorker*>(data);
            if (worker) {
                worker->Cancel();
                return env.Undefined();
            }
        } catch(...) {}

        // Try TextExtractionFromBufferWorker
        try {
            TextExtractionFromBufferWorker* worker = static_cast<TextExtractionFromBufferWorker*>(data);
            if (worker) {
                worker->Cancel();
                return env.Undefined();
            }
        } catch(...) {}

        // Try MetadataExtractionWorker
        try {
            MetadataExtractionWorker* worker = static_cast<MetadataExtractionWorker*>(data);
            if (worker) {
                worker->Cancel();
                return env.Undefined();
            }
        } catch(...) {}

        // Try MetadataExtractionFromBufferWorker
        try {
            MetadataExtractionFromBufferWorker* worker = static_cast<MetadataExtractionFromBufferWorker*>(data);
            if (worker) {
                worker->Cancel();
                return env.Undefined();
            }
        } catch(...) {}
    }

    return env.Undefined();
}

/**
 * Initialize the addon
 */
Napi::Object Init(Napi::Env env, Napi::Object exports) {
    exports.Set("extractTextFromFile", Napi::Function::New(env, ExtractTextFromFile));
    exports.Set("extractTextFromBuffer", Napi::Function::New(env, ExtractTextFromBuffer));
    exports.Set("getMetadataFromFile", Napi::Function::New(env, GetMetadataFromFile));
    exports.Set("getMetadataFromBuffer", Napi::Function::New(env, GetMetadataFromBuffer));
    exports.Set("cancelOperation", Napi::Function::New(env, CancelOperation));

    return exports;
}

NODE_API_MODULE(pdf_parser_native, Init)