#!/bin/bash
# GameScript Unreal Plugin Build Script
# Builds the plugin to distributable form

set -e  # Exit on error

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PLUGIN_PATH="$SCRIPT_DIR/GameScript.uplugin"
OUTPUT_PATH="$SCRIPT_DIR/Build"

# Color output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Detect Unreal Engine installation
detect_ue_path() {
    # Try environment variable first
    if [ -n "$UE_PATH" ] && [ -d "$UE_PATH" ]; then
        echo "$UE_PATH"
        return 0
    fi

    # Common installation paths
    local UE_PATHS=(
        "/Users/Shared/Epic Games/UE_5.7"
        "/Users/Shared/Epic Games/UE_5.6"
        "/Users/Shared/Epic Games/UE_5.5"
        "C:/Program Files/Epic Games/UE_5.7"
        "C:/Program Files/Epic Games/UE_5.6"
        "$HOME/UnrealEngine/Engine"
    )

    for path in "${UE_PATHS[@]}"; do
        if [ -d "$path" ]; then
            echo "$path"
            return 0
        fi
    done

    return 1
}

# Find RunUAT script
find_uat_script() {
    local ue_path="$1"

    # macOS/Linux
    if [ -f "$ue_path/Engine/Build/BatchFiles/RunUAT.sh" ]; then
        echo "$ue_path/Engine/Build/BatchFiles/RunUAT.sh"
        return 0
    fi

    # Windows
    if [ -f "$ue_path/Engine/Build/BatchFiles/RunUAT.bat" ]; then
        echo "$ue_path/Engine/Build/BatchFiles/RunUAT.bat"
        return 0
    fi

    return 1
}

# Detect platform
detect_platform() {
    case "$(uname -s)" in
        Darwin*)
            echo "Mac"
            ;;
        Linux*)
            echo "Linux"
            ;;
        CYGWIN*|MINGW*|MSYS*)
            echo "Win64"
            ;;
        *)
            echo "Mac"  # Default
            ;;
    esac
}

echo -e "${GREEN}GameScript Unreal Plugin Builder${NC}"
echo "================================"

# Detect Unreal Engine
echo -n "Detecting Unreal Engine installation... "
UE_PATH=$(detect_ue_path)
if [ $? -ne 0 ]; then
    echo -e "${RED}FAILED${NC}"
    echo ""
    echo -e "${RED}Error: Could not find Unreal Engine installation${NC}"
    echo ""
    echo "Please set the UE_PATH environment variable:"
    echo "  export UE_PATH=\"/path/to/UnrealEngine\""
    echo ""
    echo "Or install Unreal Engine 5.7 to a standard location:"
    echo "  /Users/Shared/Epic Games/UE_5.7 (macOS)"
    echo "  C:/Program Files/Epic Games/UE_5.7 (Windows)"
    exit 1
fi
echo -e "${GREEN}OK${NC}"
echo "  Found: $UE_PATH"

# Find UAT script
echo -n "Locating build tool (RunUAT)... "
UAT_SCRIPT=$(find_uat_script "$UE_PATH")
if [ $? -ne 0 ]; then
    echo -e "${RED}FAILED${NC}"
    echo -e "${RED}Error: Could not find RunUAT script${NC}"
    exit 1
fi
echo -e "${GREEN}OK${NC}"

# Detect platform
PLATFORM=$(detect_platform)
echo "Platform: $PLATFORM"

# Verify plugin file exists
if [ ! -f "$PLUGIN_PATH" ]; then
    echo -e "${RED}Error: Plugin file not found: $PLUGIN_PATH${NC}"
    exit 1
fi

# Clean previous build
if [ -d "$OUTPUT_PATH" ]; then
    echo -n "Cleaning previous build... "
    rm -rf "$OUTPUT_PATH"
    echo -e "${GREEN}OK${NC}"
fi

echo ""
echo "Building plugin..."
echo "  Plugin: $PLUGIN_PATH"
echo "  Output: $OUTPUT_PATH"
echo "  Target: $PLATFORM"
echo ""

# Build the plugin
"$UAT_SCRIPT" BuildPlugin \
    -Plugin="$PLUGIN_PATH" \
    -Package="$OUTPUT_PATH" \
    -TargetPlatforms="$PLATFORM" \
    -Rocket

BUILD_EXIT_CODE=$?

echo ""
if [ $BUILD_EXIT_CODE -eq 0 ]; then
    echo -e "${GREEN}✓ Build successful!${NC}"
    echo ""
    echo "Plugin packaged to: $OUTPUT_PATH"
    echo ""
    echo "To install:"
    echo "  1. Copy '$OUTPUT_PATH' to 'YourProject/Plugins/GameScript/'"
    echo "  2. Regenerate project files"
    echo "  3. Enable plugin in Editor"
else
    echo -e "${RED}✗ Build failed with exit code $BUILD_EXIT_CODE${NC}"
    echo ""
    echo "Check the log for details:"
    echo "  ~/Library/Logs/Unreal Engine/LocalBuildLogs/ (macOS)"
    echo "  %APPDATA%/Unreal Engine/Logs/ (Windows)"
    exit $BUILD_EXIT_CODE
fi
