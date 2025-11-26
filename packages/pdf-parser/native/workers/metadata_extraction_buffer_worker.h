/**
 * Metadata Extraction Worker - Buffer-based
 *
 * Async worker for extracting metadata from PDF buffers.
 */

#ifndef METADATA_EXTRACTION_BUFFER_WORKER_H
#define METADATA_EXTRACTION_BUFFER_WORKER_H

#include "metadata_extraction_base_worker.h"
#include <memory>

/**
 * AsyncWorker for metadata extraction from buffer
 */
class MetadataExtractionFromBufferWorker : public MetadataExtractionBaseWorker {
public:
    MetadataExtractionFromBufferWorker(
        Napi::Env env,
        const uint8_t* data,
        size_t size
    );

protected:
    void Execute() override;

private:
    std::unique_ptr<uint8_t[]> bufferData_;
    size_t bufferSize_;
};

#endif // METADATA_EXTRACTION_BUFFER_WORKER_H
