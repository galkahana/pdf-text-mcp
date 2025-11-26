/**
 * Metadata Extraction Base Worker Implementation
 */

#include "metadata_extraction_base_worker.h"
#include "PDFParser.h"
#include "PDFDictionary.h"
#include "PDFObjectCast.h"
#include "PDFLiteralString.h"
#include "PDFHexString.h"
#include "PDFTextString.h"
#include "EStatusCode.h"
#include <stdexcept>
#include <cstdio>

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Helper function to extract string value from PDF object
 * Properly decodes PDF strings (PDFDocEncoding or UTF-16BE) to UTF-8
 */
static std::string GetStringFromPDFObject(PDFObject* obj) {
    if (!obj) {
        return "";
    }

    if (obj->GetType() == PDFObject::ePDFObjectLiteralString) {
        PDFLiteralString* litStr = (PDFLiteralString*)obj;
        PDFTextString textStr(litStr->GetValue());
        return textStr.ToUTF8String();
    } else if (obj->GetType() == PDFObject::ePDFObjectHexString) {
        PDFHexString* hexStr = (PDFHexString*)obj;
        PDFTextString textStr(hexStr->GetValue());
        return textStr.ToUTF8String();
    }

    return "";
}

/**
 * Helper to set metadata field on Napi::Object (sets null if empty)
 */
static void SetMetadataField(Napi::Object& obj, const std::string& key, const std::string& value, Napi::Env& env) {
    if (value.empty()) {
        obj.Set(key, env.Null());
    } else {
        obj.Set(key, Napi::String::New(env, value));
    }
}

// ============================================================================
// CORE METADATA EXTRACTION LOGIC
// ============================================================================

MetadataExtractionResult MetadataExtractionBaseWorker::ExtractMetadataCore(
    IByteReaderWithPosition* stream,
    std::atomic<bool>* cancelFlag
) {
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

// ============================================================================
// METADATA EXTRACTION BASE WORKER
// ============================================================================

MetadataExtractionBaseWorker::MetadataExtractionBaseWorker(
    Napi::Env env
) : CancellableAsyncWorker<MetadataExtractionResult>(env) {
    result_ = {0, "", "", "", "", "", "", "", "", false};
}

Napi::Object MetadataExtractionBaseWorker::ResultToNapiObject(
    Napi::Env env,
    const MetadataExtractionResult& result
) {
    Napi::Object napiResult = Napi::Object::New(env);
    napiResult.Set("pageCount", Napi::Number::New(env, result.pageCount));
    SetMetadataField(napiResult, "version", result.version, env);
    SetMetadataField(napiResult, "title", result.title, env);
    SetMetadataField(napiResult, "author", result.author, env);
    SetMetadataField(napiResult, "subject", result.subject, env);
    SetMetadataField(napiResult, "creator", result.creator, env);
    SetMetadataField(napiResult, "producer", result.producer, env);
    SetMetadataField(napiResult, "creationDate", result.creationDate, env);
    SetMetadataField(napiResult, "modificationDate", result.modificationDate, env);
    return napiResult;
}
