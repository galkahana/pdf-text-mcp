/**
 * Metadata Extraction Base Worker
 *
 * Base class for metadata extraction workers (file and buffer).
 * Contains shared extraction logic and result conversion.
 */

#ifndef METADATA_EXTRACTION_BASE_WORKER_H
#define METADATA_EXTRACTION_BASE_WORKER_H

#include "cancellable_async_worker.h"
#include "IByteReaderWithPosition.h"
#include <string>

/**
 * Result structure for metadata extraction operations
 */
struct MetadataExtractionResult {
    unsigned long pageCount;
    std::string version;
    std::string title;
    std::string author;
    std::string subject;
    std::string creator;
    std::string producer;
    std::string creationDate;
    std::string modificationDate;
    bool cancelled;
};

/**
 * Base class for metadata extraction workers
 * Provides shared extraction logic and result conversion
 */
class MetadataExtractionBaseWorker : public CancellableAsyncWorker<MetadataExtractionResult> {
public:
    MetadataExtractionBaseWorker(Napi::Env env);

protected:
    /**
     * Core metadata extraction logic (shared by file and buffer operations)
     *
     * @param stream Byte stream to read PDF from
     * @param cancelFlag Optional atomic flag for cancellation
     * @return Metadata extraction result
     */
    static MetadataExtractionResult ExtractMetadataCore(
        IByteReaderWithPosition* stream,
        std::atomic<bool>* cancelFlag = nullptr
    );

    Napi::Object ResultToNapiObject(Napi::Env env, const MetadataExtractionResult& result) override;
};

#endif // METADATA_EXTRACTION_BASE_WORKER_H
