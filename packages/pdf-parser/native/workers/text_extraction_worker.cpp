/**
 * Text Extraction Worker Implementation
 */

#include "text_extraction_worker.h"
#include "InputFile.h"
#include <stdexcept>

TextExtractionWorker::TextExtractionWorker(
    Napi::Env env,
    const std::string& filePath,
    int bidiDirection
) : TextExtractionBaseWorker(env, bidiDirection),
    filePath_(filePath) {
}

void TextExtractionWorker::Execute() {
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
        result_ = TextExtractionBaseWorker::ExtractTextCore(stream, bidiDirection_, &cancelled_);

        if (result_.cancelled) {
            SetError("Operation cancelled");
        }

    } catch (const std::exception& e) {
        SetError(std::string("Extraction failed: ") + e.what());
    }
}
