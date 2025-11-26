/**
 * Metadata Extraction Worker Implementation
 */

#include "metadata_extraction_worker.h"
#include "InputFile.h"
#include <stdexcept>

MetadataExtractionWorker::MetadataExtractionWorker(
    Napi::Env env,
    const std::string& filePath
) : MetadataExtractionBaseWorker(env),
    filePath_(filePath) {
}

void MetadataExtractionWorker::Execute() {
    try {
        // Open PDF file
        InputFile pdfFile;
        PDFHummus::EStatusCode status = pdfFile.OpenFile(filePath_);

        if (status != PDFHummus::eSuccess) {
            SetError("Failed to open PDF file");
            return;
        }

        // Check cancellation
        if (cancelled_.load()) {
            SetError("Operation cancelled");
            return;
        }

        // Get the file stream and delegate to core function
        IByteReaderWithPosition* stream = pdfFile.GetInputStream();
        result_ = MetadataExtractionBaseWorker::ExtractMetadataCore(stream, &cancelled_);

        if (result_.cancelled) {
            SetError("Operation cancelled");
        }

    } catch (const std::exception& e) {
        SetError(std::string("Metadata extraction failed: ") + e.what());
    }
}
