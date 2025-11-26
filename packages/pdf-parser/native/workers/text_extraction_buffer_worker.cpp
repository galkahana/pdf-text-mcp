/**
 * Text Extraction Buffer Worker Implementation
 */

#include "text_extraction_buffer_worker.h"
#include "../buffer_byte_reader.h"
#include <cstring>
#include <stdexcept>

TextExtractionFromBufferWorker::TextExtractionFromBufferWorker(
    Napi::Env env,
    const uint8_t* data,
    size_t size,
    int bidiDirection
) : TextExtractionBaseWorker(env, bidiDirection),
    bufferData_(new uint8_t[size]),
    bufferSize_(size) {
    // Copy buffer data for use in worker thread
    std::memcpy(bufferData_.get(), data, size);
}

void TextExtractionFromBufferWorker::Execute() {
    try {
        // Check cancellation
        if (cancelled_.load()) {
            SetError("Operation cancelled");
            return;
        }

        // Create a buffer reader for direct stream access
        BufferByteReader bufferReader(bufferData_.get(), bufferSize_);

        // Delegate to core function
        result_ = TextExtractionBaseWorker::ExtractTextCore(&bufferReader, bidiDirection_, &cancelled_);

        if (result_.cancelled) {
            SetError("Operation cancelled");
        }

    } catch (const std::exception& e) {
        SetError(std::string("Extraction failed: ") + e.what());
    }
}
