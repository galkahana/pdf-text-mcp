/**
 * BufferByteReader - Memory Buffer Stream Reader
 *
 * Implements IByteReaderWithPosition for reading from Node.js memory buffers.
 * This allows direct PDF parsing from buffers without creating temporary files.
 *
 * Key benefits:
 * - Zero disk I/O for buffer-based operations
 * - Works with the same extraction logic as file-based operations (DRY principle)
 * - Simple implementation leveraging the stream abstraction
 */

#ifndef BUFFER_BYTE_READER_H
#define BUFFER_BYTE_READER_H

#include "IByteReaderWithPosition.h"
#include "IOBasicTypes.h"
#include <cstdint>

/**
 * BufferByteReader: Implements IByteReaderWithPosition for memory buffers
 *
 * Provides sequential and random access to PDF data stored in memory.
 * Thread-safe for single-threaded access (does not support concurrent reads).
 */
class BufferByteReader : public IByteReaderWithPosition {
public:
    /**
     * Constructor
     * @param inData Pointer to buffer data (must remain valid for lifetime of reader)
     * @param inSize Buffer size in bytes
     */
    BufferByteReader(const uint8_t* inData, size_t inSize);

    virtual ~BufferByteReader();

    // IByteReader interface
    virtual IOBasicTypes::LongBufferSizeType Read(
        IOBasicTypes::Byte* inBuffer,
        IOBasicTypes::LongBufferSizeType inBufferSize) override;

    virtual bool NotEnded() override;

    // IByteReaderWithPosition interface
    virtual void SetPosition(IOBasicTypes::LongFilePositionType inOffsetFromStart) override;
    virtual void SetPositionFromEnd(IOBasicTypes::LongFilePositionType inOffsetFromEnd) override;
    virtual IOBasicTypes::LongFilePositionType GetCurrentPosition() override;
    virtual void Skip(IOBasicTypes::LongBufferSizeType inSkipSize) override;

private:
    const uint8_t* data;       // Pointer to buffer data (not owned)
    size_t size;               // Buffer size in bytes
    size_t position;           // Current read position
};

#endif // BUFFER_BYTE_READER_H
