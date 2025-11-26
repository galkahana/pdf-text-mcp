/**
 * Text Extraction Worker - File-based
 *
 * Async worker for extracting text from PDF files.
 */

#ifndef TEXT_EXTRACTION_WORKER_H
#define TEXT_EXTRACTION_WORKER_H

#include "text_extraction_base_worker.h"

/**
 * AsyncWorker for text extraction from file
 */
class TextExtractionWorker : public TextExtractionBaseWorker {
public:
    TextExtractionWorker(Napi::Env env, const std::string& filePath, int bidiDirection);

protected:
    void Execute() override;

private:
    std::string filePath_;
};

#endif // TEXT_EXTRACTION_WORKER_H
