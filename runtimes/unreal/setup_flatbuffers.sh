#!/bin/bash
# Setup FlatBuffers for GameScript Unreal Plugin
# Auto-fetches FlatBuffers headers and generates C++ code from schema

set -e

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
THIRD_PARTY_DIR="$SCRIPT_DIR/ThirdParty"
FLATBUFFERS_DIR="$THIRD_PARTY_DIR/flatbuffers"
SCHEMA_PATH="$SCRIPT_DIR/../../core/schema/snapshot.fbs"
OUTPUT_DIR="$SCRIPT_DIR/Source/GameScript/Private/Generated"

echo "GameScript Unreal Plugin - FlatBuffers Setup"
echo "============================================="

# 1. Ensure FlatBuffers headers exist
if [ ! -d "$FLATBUFFERS_DIR" ]; then
    echo "Fetching FlatBuffers headers..."
    cd "$THIRD_PARTY_DIR"
    git clone --depth 1 --branch v24.3.25 https://github.com/google/flatbuffers.git
    echo "FlatBuffers headers fetched successfully"
else
    echo "FlatBuffers headers already present"
fi

# 2. Check if flatc is available
if ! command -v flatc &> /dev/null; then
    echo "ERROR: flatc compiler not found"
    echo "Please install FlatBuffers compiler:"
    echo "  macOS: brew install flatbuffers"
    echo "  Linux: apt install flatbuffers-compiler or build from source"
    echo "  Windows: Download from https://github.com/google/flatbuffers/releases"
    exit 1
fi

echo "Found flatc: $(which flatc)"
echo "Version: $(flatc --version)"

# 3. Generate C++ header from schema
echo "Generating C++ header from schema..."
mkdir -p "$OUTPUT_DIR"
flatc --cpp --scoped-enums --gen-mutable --filename-suffix "" \
    -o "$OUTPUT_DIR" \
    "$SCHEMA_PATH"

if [ -f "$OUTPUT_DIR/snapshot.h" ]; then
    echo "Successfully generated: $OUTPUT_DIR/snapshot.h"
else
    echo "ERROR: Failed to generate snapshot.h"
    exit 1
fi

echo ""
echo "Setup complete!"
echo "You can now build the GameScript plugin in Unreal Engine"
