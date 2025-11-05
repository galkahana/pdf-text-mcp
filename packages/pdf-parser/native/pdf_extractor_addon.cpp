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
 */
struct TextExtractionResult {
    std::string text;
    int pageCount;
    int bidiDirection;
};

TextExtractionResult ExtractTextCore(IByteReaderWithPosition* stream, int bidiDirection) {
    TextExtraction textExtraction;

    // Extract text from all pages (-1 means all pages)
    PDFHummus::EStatusCode status = textExtraction.ExtractText(stream, 0, -1);

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

    return {extractedText, pageCount, bidiDirection};
}

/**
 * Extract text from PDF file
 * Opens file and delegates to stream-based core function
 * Bidi algorithm is always applied; direction can be specified (defaults to LTR)
 */
Napi::Value ExtractTextFromFile(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();

    if (info.Length() < 1 || !info[0].IsString()) {
        Napi::TypeError::New(env, "Expected file path as string").ThrowAsJavaScriptException();
        return env.Null();
    }

    std::string filePath = info[0].As<Napi::String>().Utf8Value();
    // Always use LTR (0) - bidi algorithm is always applied for proper text ordering
    int bidiDirection = 0;  // 0 = LTR (Left-to-Right)

    if (info.Length() > 1 && info[1].IsNumber()) {
        bidiDirection = info[1].As<Napi::Number>().Int32Value();
    }

    try {
        // Open PDF file
        InputFile pdfFile;
        PDFHummus::EStatusCode status = pdfFile.OpenFile(filePath);

        if (status != PDFHummus::eSuccess) {
            throw std::runtime_error("Failed to open PDF file");
        }

        // Get the file stream and delegate to core function
        IByteReaderWithPosition* stream = pdfFile.GetInputStream();
        TextExtractionResult result = ExtractTextCore(stream, bidiDirection);

        // Build result object
        Napi::Object napiResult = Napi::Object::New(env);
        napiResult.Set("text", Napi::String::New(env, result.text));
        napiResult.Set("pageCount", Napi::Number::New(env, result.pageCount));
        napiResult.Set("bidiDirection", Napi::Number::New(env, result.bidiDirection));

        return napiResult;

    } catch (const std::exception& e) {
        Napi::Error::New(env, std::string("Extraction failed: ") + e.what()).ThrowAsJavaScriptException();
        return env.Null();
    }
}

/**
 * Extract text from PDF buffer
 * Creates buffer stream and delegates to stream-based core function
 * Bidi algorithm is always applied; direction can be specified (defaults to LTR)
 */
Napi::Value ExtractTextFromBuffer(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();

    if (info.Length() < 1 || !info[0].IsBuffer()) {
        Napi::TypeError::New(env, "Expected buffer").ThrowAsJavaScriptException();
        return env.Null();
    }

    Napi::Buffer<uint8_t> buffer = info[0].As<Napi::Buffer<uint8_t>>();
    // Always use LTR (0) - bidi algorithm is always applied for proper text ordering
    int bidiDirection = 0;  // 0 = LTR (Left-to-Right)

    if (info.Length() > 1 && info[1].IsNumber()) {
        bidiDirection = info[1].As<Napi::Number>().Int32Value();
    }

    try {
        // Create a buffer reader for direct stream access
        BufferByteReader bufferReader(buffer.Data(), buffer.Length());

        // Delegate to core function
        TextExtractionResult result = ExtractTextCore(&bufferReader, bidiDirection);

        // Build result object
        Napi::Object napiResult = Napi::Object::New(env);
        napiResult.Set("text", Napi::String::New(env, result.text));
        napiResult.Set("pageCount", Napi::Number::New(env, result.pageCount));
        napiResult.Set("bidiDirection", Napi::Number::New(env, result.bidiDirection));

        return napiResult;

    } catch (const std::exception& e) {
        Napi::Error::New(env, std::string("Extraction failed: ") + e.what()).ThrowAsJavaScriptException();
        return env.Null();
    }
}

/**
 * Core metadata extraction logic (shared by file and buffer operations)
 * Works with any IByteReaderWithPosition stream source
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
};

MetadataExtractionResult ExtractMetadataCore(IByteReaderWithPosition* stream) {
    // Create parser and parse from stream
    PDFParser parser;
    PDFHummus::EStatusCode status = parser.StartPDFParsing(stream);

    if (status != PDFHummus::eSuccess) {
        throw std::runtime_error("Failed to parse PDF from stream");
    }

    MetadataExtractionResult result = {};

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
 * Get PDF metadata from file
 * Opens file and delegates to stream-based core function
 */
Napi::Value GetMetadataFromFile(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();

    if (info.Length() < 1 || !info[0].IsString()) {
        Napi::TypeError::New(env, "Expected file path as string").ThrowAsJavaScriptException();
        return env.Null();
    }

    std::string filePath = info[0].As<Napi::String>().Utf8Value();

    try {
        // Open PDF file
        InputFile pdfFile;
        PDFHummus::EStatusCode status = pdfFile.OpenFile(filePath);

        if (status != PDFHummus::eSuccess) {
            throw std::runtime_error("Failed to open PDF file");
        }

        // Get the file stream and delegate to core function
        IByteReaderWithPosition* stream = pdfFile.GetInputStream();
        MetadataExtractionResult metadata = ExtractMetadataCore(stream);

        // Build result object
        Napi::Object result = Napi::Object::New(env);
        result.Set("pageCount", Napi::Number::New(env, metadata.pageCount));
        result.Set("version", Napi::String::New(env, metadata.version));
        SetMetadataField(result, "title", metadata.title, env);
        SetMetadataField(result, "author", metadata.author, env);
        SetMetadataField(result, "subject", metadata.subject, env);
        SetMetadataField(result, "creator", metadata.creator, env);
        SetMetadataField(result, "producer", metadata.producer, env);
        SetMetadataField(result, "creationDate", metadata.creationDate, env);
        SetMetadataField(result, "modificationDate", metadata.modificationDate, env);

        return result;

    } catch (const std::exception& e) {
        Napi::Error::New(env, std::string("Metadata extraction failed: ") + e.what()).ThrowAsJavaScriptException();
        return env.Null();
    }
}

/**
 * Get PDF metadata from buffer
 * Creates buffer stream and delegates to stream-based core function
 */
Napi::Value GetMetadataFromBuffer(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();

    if (info.Length() < 1 || !info[0].IsBuffer()) {
        Napi::TypeError::New(env, "Expected buffer").ThrowAsJavaScriptException();
        return env.Null();
    }

    Napi::Buffer<uint8_t> buffer = info[0].As<Napi::Buffer<uint8_t>>();

    try {
        // Create a buffer reader for direct stream access
        BufferByteReader bufferReader(buffer.Data(), buffer.Length());

        // Delegate to core function
        MetadataExtractionResult metadata = ExtractMetadataCore(&bufferReader);

        // Build result object
        Napi::Object result = Napi::Object::New(env);
        result.Set("pageCount", Napi::Number::New(env, metadata.pageCount));
        result.Set("version", Napi::String::New(env, metadata.version));
        SetMetadataField(result, "title", metadata.title, env);
        SetMetadataField(result, "author", metadata.author, env);
        SetMetadataField(result, "subject", metadata.subject, env);
        SetMetadataField(result, "creator", metadata.creator, env);
        SetMetadataField(result, "producer", metadata.producer, env);
        SetMetadataField(result, "creationDate", metadata.creationDate, env);
        SetMetadataField(result, "modificationDate", metadata.modificationDate, env);

        return result;

    } catch (const std::exception& e) {
        Napi::Error::New(env, std::string("Metadata extraction failed: ") + e.what()).ThrowAsJavaScriptException();
        return env.Null();
    }
}

/**
 * Initialize the addon
 */
Napi::Object Init(Napi::Env env, Napi::Object exports) {
    exports.Set("extractTextFromFile", Napi::Function::New(env, ExtractTextFromFile));
    exports.Set("extractTextFromBuffer", Napi::Function::New(env, ExtractTextFromBuffer));
    exports.Set("getMetadataFromFile", Napi::Function::New(env, GetMetadataFromFile));
    exports.Set("getMetadataFromBuffer", Napi::Function::New(env, GetMetadataFromBuffer));

    return exports;
}

NODE_API_MODULE(pdf_parser_native, Init)