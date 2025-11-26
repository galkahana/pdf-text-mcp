/**
 * Text Extraction Base Worker
 *
 * Base class for text extraction workers (file and buffer).
 * Contains shared extraction logic and result conversion.
 */

#ifndef TEXT_EXTRACTION_BASE_WORKER_H
#define TEXT_EXTRACTION_BASE_WORKER_H

#include "cancellable_async_worker.h"
#include "IByteReaderWithPosition.h"
#include <string>

/**
 * Result structure for text extraction operations
 */
struct TextExtractionResult {
    std::string text;       // Extracted text content
    int pageCount;          // Number of pages processed
    int bidiDirection;      // Detected/applied direction (0=LTR, 1=RTL)
    bool cancelled;         // Whether extraction was cancelled
};

/**
 * Base class for text extraction workers
 * Provides shared extraction logic and result conversion
 */
class TextExtractionBaseWorker : public CancellableAsyncWorker<TextExtractionResult> {
public:
    TextExtractionBaseWorker(Napi::Env env, int bidiDirection);

protected:
    /**
     * Core text extraction logic (shared by file and buffer operations)
     *
     * @param stream Byte stream to read PDF from
     * @param bidiDirection Text direction: 0=LTR, 1=RTL, -1=auto-detect
     * @param cancelFlag Optional atomic flag for cancellation
     * @return Extraction result with text and metadata
     */
    static TextExtractionResult ExtractTextCore(
        IByteReaderWithPosition* stream,
        int bidiDirection,
        std::atomic<bool>* cancelFlag = nullptr
    );

    Napi::Object ResultToNapiObject(Napi::Env env, const TextExtractionResult& result) override;

    int bidiDirection_;
};

#endif // TEXT_EXTRACTION_BASE_WORKER_H
