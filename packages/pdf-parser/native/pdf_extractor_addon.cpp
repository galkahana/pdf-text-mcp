/**
 * Node.js native addon for PDF text extraction
 *
 * Main module initialization file.
 * Delegates all implementation to specialized modules in workers/ folder.
 */

#include <napi.h>
#include "napi_bindings.h"
#include "workers/cancellable_async_worker.h"

/**
 * Cancel an in-progress extraction operation
 * Accepts a worker reference and calls Cancel() on it
 */
Napi::Value CancelOperation(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();

    if (info.Length() < 1) {
        Napi::TypeError::New(env, "Expected worker reference").ThrowAsJavaScriptException();
        return env.Undefined();
    }

    // All workers implement ICancellable interface
    if (info[0].IsExternal()) {
        Napi::External<ICancellable> ext = info[0].As<Napi::External<ICancellable>>();
        ICancellable* worker = ext.Data();

        if (worker) {
            worker->Cancel();
        }
    }

    return env.Undefined();
}

/**
 * Initialize the native addon
 * Exports all extraction functions to JavaScript
 */
Napi::Object Init(Napi::Env env, Napi::Object exports) {
    // Text extraction
    exports.Set("extractTextFromFile", Napi::Function::New(env, ExtractTextFromFile));
    exports.Set("extractTextFromBuffer", Napi::Function::New(env, ExtractTextFromBuffer));

    // Metadata extraction
    exports.Set("getMetadataFromFile", Napi::Function::New(env, GetMetadataFromFile));
    exports.Set("getMetadataFromBuffer", Napi::Function::New(env, GetMetadataFromBuffer));

    // Worker cancellation
    exports.Set("cancelOperation", Napi::Function::New(env, CancelOperation));

    return exports;
}

// Register the module with Node.js
NODE_API_MODULE(pdf_parser_native, Init)
