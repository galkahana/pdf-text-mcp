cmake_minimum_required(VERSION 3.15)
project(pdf_parser_native)

# Set C++ standard
set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

# Enable bidi support - must be set before FetchContent to pass down to pdf-text-extraction
set(USE_BIDI ON CACHE BOOL "Enable bidirectional text support" FORCE)

# Fetch pdf-text-extraction library
include(FetchContent)

# Set extract timestamp policy for CMake 3.24+ (if supported)
if(POLICY CMP0135)
  cmake_policy(SET CMP0135 NEW)
endif()

FetchContent_Declare(
  pdf-text-extraction
  URL https://github.com/galkahana/pdf-text-extraction/archive/refs/tags/v1.1.9.tar.gz
  URL_HASH SHA256=5bd63becb30cbf155a164dabde8df98cb5cc597bb0904f42367234df51873607
)
FetchContent_MakeAvailable(pdf-text-extraction)

# Node.js addon setup
include_directories(${CMAKE_JS_INC})

# Include node-addon-api headers
execute_process(COMMAND node -p "require('node-addon-api').include"
  WORKING_DIRECTORY ${CMAKE_SOURCE_DIR}
  OUTPUT_VARIABLE NODE_ADDON_API_DIR
  OUTPUT_STRIP_TRAILING_WHITESPACE
)
string(REPLACE "\"" "" NODE_ADDON_API_DIR ${NODE_ADDON_API_DIR})
include_directories(${NODE_ADDON_API_DIR})

# Add NAPI_VERSION definition
add_definitions(-DNAPI_VERSION=8)

file(GLOB SOURCE_FILES "native/*.cpp" "native/*.h")

# Create the Node.js addon
add_library(${PROJECT_NAME} SHARED ${SOURCE_FILES} ${CMAKE_JS_SRC})
set_target_properties(${PROJECT_NAME} PROPERTIES PREFIX "" SUFFIX ".node")

# Link with Node.js
target_link_libraries(${PROJECT_NAME} ${CMAKE_JS_LIB})

# Link with TextExtraction library
target_link_libraries(${PROJECT_NAME} TextExtraction::TextExtraction)

# Include TextExtraction headers
target_include_directories(${PROJECT_NAME} PRIVATE
  ${pdf-text-extraction_SOURCE_DIR}/TextExtraction
)

# Platform-specific configurations
if(MSVC AND CMAKE_JS_NODELIB_DEF AND CMAKE_JS_NODELIB_TARGET)
  # Windows
  execute_process(COMMAND ${CMAKE_AR} /def:${CMAKE_JS_NODELIB_DEF} /out:${CMAKE_JS_NODELIB_TARGET} ${CMAKE_JS_NODELIB})
  target_link_libraries(${PROJECT_NAME} ${CMAKE_JS_NODELIB_TARGET})
endif()