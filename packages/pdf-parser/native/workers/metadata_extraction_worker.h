/**
 * Metadata Extraction Worker - File-based
 *
 * Async worker for extracting metadata from PDF files.
 */

#ifndef METADATA_EXTRACTION_WORKER_H
#define METADATA_EXTRACTION_WORKER_H

#include "metadata_extraction_base_worker.h"

/**
 * AsyncWorker for metadata extraction from file
 */
class MetadataExtractionWorker : public MetadataExtractionBaseWorker {
public:
    MetadataExtractionWorker(Napi::Env env, const std::string& filePath);

protected:
    void Execute() override;

private:
    std::string filePath_;
};

#endif // METADATA_EXTRACTION_WORKER_H
