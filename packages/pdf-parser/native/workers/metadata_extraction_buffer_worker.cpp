/**
 * Metadata Extraction Buffer Worker Implementation
 */

#include "metadata_extraction_buffer_worker.h"
#include "../buffer_byte_reader.h"
#include <cstring>
#include <stdexcept>

MetadataExtractionFromBufferWorker::MetadataExtractionFromBufferWorker(
    Napi::Env env,
    const uint8_t* data,
    size_t size
) : MetadataExtractionBaseWorker(env),
    bufferData_(new uint8_t[size]),
    bufferSize_(size) {
    // Copy buffer data for use in worker thread
    std::memcpy(bufferData_.get(), data, size);
}

void MetadataExtractionFromBufferWorker::Execute() {
    try {
        // Check cancellation
        if (cancelled_.load()) {
            SetError("Operation cancelled");
            return;
        }

        // Create a buffer reader for direct stream access
        BufferByteReader bufferReader(bufferData_.get(), bufferSize_);

        // Delegate to core function
        result_ = MetadataExtractionBaseWorker::ExtractMetadataCore(&bufferReader, &cancelled_);

        if (result_.cancelled) {
            SetError("Operation cancelled");
        }

    } catch (const std::exception& e) {
        SetError(std::string("Metadata extraction failed: ") + e.what());
    }
}
