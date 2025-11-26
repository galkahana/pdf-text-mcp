/**
 * Text Extraction Base Worker Implementation
 */

#include "text_extraction_base_worker.h"
#include "../text_direction_detection.h"
#include "TextExtraction.h"
#include "ErrorsAndWarnings.h"
#include "lib/text-composition/TextComposer.h"
#include <stdexcept>

using namespace PdfParser;

// ============================================================================
// CORE TEXT EXTRACTION LOGIC
// ============================================================================

TextExtractionResult TextExtractionBaseWorker::ExtractTextCore(
    IByteReaderWithPosition* stream,
    int bidiDirection,
    std::atomic<bool>* cancelFlag
) {
    // Check for cancellation before starting
    if (cancelFlag && cancelFlag->load()) {
        return {"", 0, bidiDirection, true};
    }

    TextExtraction textExtraction;

    // Extract text from all pages
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

    // Auto-detect text direction if bidiDirection is -1
    int effectiveBidiDirection = bidiDirection;
    if (bidiDirection == -1) {
        effectiveBidiDirection = DetectTextDirection(textExtraction.textsForPages);
    }

    // Get results as text with bidi algorithm applied
    std::string extractedText = textExtraction.GetResultsAsText(
        effectiveBidiDirection,
        TextComposer::eSpacingBoth
    );

    // Count pages
    int pageCount = static_cast<int>(textExtraction.textsForPages.size());

    return {extractedText, pageCount, effectiveBidiDirection, false};
}

// ============================================================================
// TEXT EXTRACTION BASE WORKER
// ============================================================================

TextExtractionBaseWorker::TextExtractionBaseWorker(
    Napi::Env env,
    int bidiDirection
) : CancellableAsyncWorker<TextExtractionResult>(env),
    bidiDirection_(bidiDirection) {
    result_ = {"", 0, bidiDirection, false};
}

Napi::Object TextExtractionBaseWorker::ResultToNapiObject(
    Napi::Env env,
    const TextExtractionResult& result
) {
    Napi::Object napiResult = Napi::Object::New(env);
    napiResult.Set("text", Napi::String::New(env, result.text));
    napiResult.Set("pageCount", Napi::Number::New(env, result.pageCount));
    napiResult.Set("bidiDirection", Napi::Number::New(env, result.bidiDirection));
    return napiResult;
}
