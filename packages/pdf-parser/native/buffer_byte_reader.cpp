/**
 * BufferByteReader Implementation
 */

#include "buffer_byte_reader.h"
#include <cstring>
#include <algorithm>

BufferByteReader::BufferByteReader(const uint8_t* inData, size_t inSize)
    : data(inData), size(inSize), position(0) {
}

BufferByteReader::~BufferByteReader() {
}

IOBasicTypes::LongBufferSizeType BufferByteReader::Read(
    IOBasicTypes::Byte* inBuffer,
    IOBasicTypes::LongBufferSizeType inBufferSize) {

    if (position >= size) {
        return 0;  // EOF
    }

    size_t bytesToRead = std::min(static_cast<size_t>(inBufferSize), size - position);
    std::memcpy(inBuffer, data + position, bytesToRead);
    position += bytesToRead;
    return static_cast<IOBasicTypes::LongBufferSizeType>(bytesToRead);
}

bool BufferByteReader::NotEnded() {
    return position < size;
}

void BufferByteReader::SetPosition(IOBasicTypes::LongFilePositionType inOffsetFromStart) {
    if (inOffsetFromStart < 0) {
        position = 0;
    } else if (static_cast<size_t>(inOffsetFromStart) > size) {
        position = size;
    } else {
        position = static_cast<size_t>(inOffsetFromStart);
    }
}

void BufferByteReader::SetPositionFromEnd(IOBasicTypes::LongFilePositionType inOffsetFromEnd) {
    if (inOffsetFromEnd < 0 || static_cast<size_t>(inOffsetFromEnd) > size) {
        position = 0;
    } else {
        position = size - static_cast<size_t>(inOffsetFromEnd);
    }
}

IOBasicTypes::LongFilePositionType BufferByteReader::GetCurrentPosition() {
    return static_cast<IOBasicTypes::LongFilePositionType>(position);
}

void BufferByteReader::Skip(IOBasicTypes::LongBufferSizeType inSkipSize) {
    position += inSkipSize;
    if (position > size) {
        position = size;
    }
}
