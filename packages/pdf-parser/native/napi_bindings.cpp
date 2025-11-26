/**
 * N-API Binding Functions Implementation
 */

#include "napi_bindings.h"
#include "workers/cancellable_async_worker.h"
#include "workers/text_extraction_worker.h"
#include "workers/text_extraction_buffer_worker.h"
#include "workers/metadata_extraction_worker.h"
#include "workers/metadata_extraction_buffer_worker.h"

// ============================================================================
// TEXT EXTRACTION BINDINGS
// ============================================================================

Napi::Value ExtractTextFromFile(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();

    if (info.Length() < 1 || !info[0].IsString()) {
        Napi::TypeError::New(env, "Expected file path as string").ThrowAsJavaScriptException();
        return env.Null();
    }

    std::string filePath = info[0].As<Napi::String>().Utf8Value();
    int bidiDirection = 0;  // Default: LTR

    if (info.Length() > 1 && info[1].IsNumber()) {
        bidiDirection = info[1].As<Napi::Number>().Int32Value();
    }

    // Create async worker
    TextExtractionWorker* worker = new TextExtractionWorker(env, filePath, bidiDirection);

    // Store worker reference on the promise for cancellation (as ICancellable interface)
    Napi::Promise promise = worker->GetPromise();
    Napi::Object promiseObj = promise.As<Napi::Object>();
    promiseObj.Set("_worker", Napi::External<ICancellable>::New(env, static_cast<ICancellable*>(worker)));

    // Queue the work
    worker->Queue();

    return promise;
}

Napi::Value ExtractTextFromBuffer(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();

    if (info.Length() < 1 || !info[0].IsBuffer()) {
        Napi::TypeError::New(env, "Expected buffer").ThrowAsJavaScriptException();
        return env.Null();
    }

    Napi::Buffer<uint8_t> buffer = info[0].As<Napi::Buffer<uint8_t>>();
    int bidiDirection = 0;  // Default: LTR

    if (info.Length() > 1 && info[1].IsNumber()) {
        bidiDirection = info[1].As<Napi::Number>().Int32Value();
    }

    // Create async worker
    TextExtractionFromBufferWorker* worker = new TextExtractionFromBufferWorker(
        env, buffer.Data(), buffer.Length(), bidiDirection
    );

    // Store worker reference on the promise for cancellation (as ICancellable interface)
    Napi::Promise promise = worker->GetPromise();
    Napi::Object promiseObj = promise.As<Napi::Object>();
    promiseObj.Set("_worker", Napi::External<ICancellable>::New(env, static_cast<ICancellable*>(worker)));

    // Queue the work
    worker->Queue();

    return promise;
}

// ============================================================================
// METADATA EXTRACTION BINDINGS
// ============================================================================

Napi::Value GetMetadataFromFile(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();

    if (info.Length() < 1 || !info[0].IsString()) {
        Napi::TypeError::New(env, "Expected file path as string").ThrowAsJavaScriptException();
        return env.Null();
    }

    std::string filePath = info[0].As<Napi::String>().Utf8Value();

    // Create async worker
    MetadataExtractionWorker* worker = new MetadataExtractionWorker(env, filePath);

    // Store worker reference on the promise for cancellation (as ICancellable interface)
    Napi::Promise promise = worker->GetPromise();
    Napi::Object promiseObj = promise.As<Napi::Object>();
    promiseObj.Set("_worker", Napi::External<ICancellable>::New(env, static_cast<ICancellable*>(worker)));

    // Queue the work
    worker->Queue();

    return promise;
}

Napi::Value GetMetadataFromBuffer(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();

    if (info.Length() < 1 || !info[0].IsBuffer()) {
        Napi::TypeError::New(env, "Expected buffer").ThrowAsJavaScriptException();
        return env.Null();
    }

    Napi::Buffer<uint8_t> buffer = info[0].As<Napi::Buffer<uint8_t>>();

    // Create async worker
    MetadataExtractionFromBufferWorker* worker = new MetadataExtractionFromBufferWorker(
        env, buffer.Data(), buffer.Length()
    );

    // Store worker reference on the promise for cancellation (as ICancellable interface)
    Napi::Promise promise = worker->GetPromise();
    Napi::Object promiseObj = promise.As<Napi::Object>();
    promiseObj.Set("_worker", Napi::External<ICancellable>::New(env, static_cast<ICancellable*>(worker)));

    // Queue the work
    worker->Queue();

    return promise;
}
