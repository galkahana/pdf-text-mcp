/**
 * Cancellable Async Worker Base Class
 *
 * Template base class for all PDF extraction workers.
 * Provides common cancellation and promise handling.
 */

#ifndef CANCELLABLE_ASYNC_WORKER_H
#define CANCELLABLE_ASYNC_WORKER_H

#include <napi.h>
#include <atomic>

/**
 * Interface for cancellable operations
 * Provides type-erased access to Cancel() for generic cancellation
 */
class ICancellable {
public:
    virtual ~ICancellable() = default;
    virtual void Cancel() = 0;
};

/**
 * Base async worker with cancellation support
 *
 * Template pattern for all extraction operations.
 * Subclasses only need to implement:
 * - Execute(): Perform the actual work
 * - ResultToNapiObject(): Convert result to JavaScript object
 *
 * @tparam TResult The result type for this worker
 */
template<typename TResult>
class CancellableAsyncWorker : public Napi::AsyncWorker, public ICancellable {
public:
    CancellableAsyncWorker(Napi::Env env);
    virtual ~CancellableAsyncWorker();

    // Get the promise that will resolve/reject when work is done
    Napi::Promise GetPromise();

    // Called from JS thread to cancel the operation (implements ICancellable)
    void Cancel() override;

protected:
    // Common error handling
    void OnError(const Napi::Error& e) override;

    // Common success handling
    void OnOK() override;

    // Subclasses must implement this to convert result to Napi::Object
    virtual Napi::Object ResultToNapiObject(Napi::Env env, const TResult& result) = 0;

    std::atomic<bool> cancelled_;
    TResult result_;
    Napi::Promise::Deferred deferred_;
};

// Template implementation (must be in header)

template<typename TResult>
CancellableAsyncWorker<TResult>::CancellableAsyncWorker(Napi::Env env)
    : Napi::AsyncWorker(env),
      cancelled_(false),
      deferred_(Napi::Promise::Deferred::New(env)) {}

template<typename TResult>
CancellableAsyncWorker<TResult>::~CancellableAsyncWorker() {}

template<typename TResult>
Napi::Promise CancellableAsyncWorker<TResult>::GetPromise() {
    return deferred_.Promise();
}

template<typename TResult>
void CancellableAsyncWorker<TResult>::Cancel() {
    cancelled_.store(true);
}

template<typename TResult>
void CancellableAsyncWorker<TResult>::OnError(const Napi::Error& e) {
    deferred_.Reject(e.Value());
}

template<typename TResult>
void CancellableAsyncWorker<TResult>::OnOK() {
    Napi::Env env = Env();
    Napi::Object napiResult = ResultToNapiObject(env, result_);
    deferred_.Resolve(napiResult);
}

#endif // CANCELLABLE_ASYNC_WORKER_H
