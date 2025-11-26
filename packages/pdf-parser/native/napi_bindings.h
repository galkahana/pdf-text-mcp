/**
 * N-API Binding Functions
 *
 * JavaScript-accessible functions for PDF extraction.
 */

#ifndef NAPI_BINDINGS_H
#define NAPI_BINDINGS_H

#include <napi.h>

// Text extraction bindings
Napi::Value ExtractTextFromFile(const Napi::CallbackInfo& info);
Napi::Value ExtractTextFromBuffer(const Napi::CallbackInfo& info);

// Metadata extraction bindings
Napi::Value GetMetadataFromFile(const Napi::CallbackInfo& info);
Napi::Value GetMetadataFromBuffer(const Napi::CallbackInfo& info);

#endif // NAPI_BINDINGS_H
