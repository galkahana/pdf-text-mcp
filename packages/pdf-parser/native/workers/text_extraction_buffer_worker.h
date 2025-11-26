/**
 * Text Extraction Worker - Buffer-based
 *
 * Async worker for extracting text from PDF buffers.
 */

#ifndef TEXT_EXTRACTION_BUFFER_WORKER_H
#define TEXT_EXTRACTION_BUFFER_WORKER_H

#include "text_extraction_base_worker.h"
#include <memory>

/**
 * AsyncWorker for text extraction from buffer
 */
class TextExtractionFromBufferWorker : public TextExtractionBaseWorker {
public:
    TextExtractionFromBufferWorker(
        Napi::Env env,
        const uint8_t* data,
        size_t size,
        int bidiDirection
    );

protected:
    void Execute() override;

private:
    std::unique_ptr<uint8_t[]> bufferData_;
    size_t bufferSize_;
};

#endif // TEXT_EXTRACTION_BUFFER_WORKER_H
