#!/bin/bash
# Generates FlatSharp code from the schema and copies Core source files to Unity.
# This replaces the complex ILRepack build process with simple code generation + source distribution.
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SCHEMA_PATH="$SCRIPT_DIR/../../core/schema/snapshot.fbs"
CSHARP_DIR="$SCRIPT_DIR/../csharp"
CORE_DIR="$CSHARP_DIR/GameScript.Core"
UNITY_PACKAGE="$SCRIPT_DIR/Packages/studio.shortsleeve.gamescriptunity"
GENERATED_DIR="$UNITY_PACKAGE/Runtime/Generated"
PLUGINS_DIR="$UNITY_PACKAGE/Runtime/Plugins"

echo "=== GameScript Unity Code Generator ==="
echo "Schema: $SCHEMA_PATH"
echo "Output: $GENERATED_DIR"

# Ensure output directory exists
mkdir -p "$GENERATED_DIR"

# Step 1: Build the Core project to trigger FlatSharp code generation
echo ""
echo "=== Step 1: Building GameScript.Core to generate FlatSharp code ==="
cd "$CSHARP_DIR"
dotnet build GameScript.Core/GameScript.Core.csproj -c Release

# Step 2: Post-process and copy the FlatSharp generated file
GENERATED_SOURCE="$CORE_DIR/obj/Release/netstandard2.1/FlatSharp.generated.cs"
OUTPUT_FILE="$GENERATED_DIR/FlatSharp.generated.cs"

if [ ! -f "$GENERATED_SOURCE" ]; then
    echo "ERROR: Generated file not found at $GENERATED_SOURCE"
    exit 1
fi

echo ""
echo "=== Step 2: Post-processing FlatSharp generated code for Unity ==="

# Create a temporary file for processing
TEMP_FILE=$(mktemp)

# Disable nullable (Unity C# 9 limitation)
# Assembly isolation is provided by GameScriptUnity.asmdef - no extern alias needed
cat > "$TEMP_FILE" << 'HEADER'
// Post-processed for Unity compatibility
// - Disabled nullable reference types (Unity C# 9 limitation)
// - FlatSharp isolation provided by GameScriptUnity.asmdef
#nullable disable
#pragma warning disable CS8669 // Nullable annotations in generated code
HEADER

# Process the generated file:
# 1. Remove all #nullable directives (Unity C# 9 limitation)
sed -e 's/^#nullable.*$/\/\/ nullable disabled for Unity/' \
    "$GENERATED_SOURCE" >> "$TEMP_FILE"

mv "$TEMP_FILE" "$OUTPUT_FILE"
echo "Generated: $OUTPUT_FILE"

# Step 3: Copy Core source files (removing version hack from Attributes.cs)
echo ""
echo "=== Step 3: Copying Core source files ==="

# Attributes.cs - remove the AssemblyInformationalVersion hack
sed '/^\[assembly: AssemblyInformationalVersion/d' "$CORE_DIR/Attributes.cs" > "$GENERATED_DIR/Attributes.cs"
echo "Copied: Attributes.cs (removed version hack)"

# Manifest.cs - copy as-is
cp "$CORE_DIR/Manifest.cs" "$GENERATED_DIR/Manifest.cs"
echo "Copied: Manifest.cs"

# Command.cs - copy as-is
cp "$CORE_DIR/Command.cs" "$GENERATED_DIR/Command.cs"
echo "Copied: Command.cs"

# Step 4: Copy FlatSharp.Runtime.dll
echo ""
echo "=== Step 4: Copying FlatSharp.Runtime.dll ==="
FLATSHARP_DLL="$CORE_DIR/bin/Release/netstandard2.1/FlatSharp.Runtime.dll"
if [ -f "$FLATSHARP_DLL" ]; then
    cp "$FLATSHARP_DLL" "$PLUGINS_DIR/"
    echo "Copied: $PLUGINS_DIR/FlatSharp.Runtime.dll"
else
    echo "WARNING: FlatSharp.Runtime.dll not found at $FLATSHARP_DLL"
fi

# Step 5: Remove the old GameScript.Core.dll (no longer needed)
if [ -f "$PLUGINS_DIR/GameScript.Core.dll" ]; then
    echo ""
    echo "=== Step 5: Removing old GameScript.Core.dll ==="
    rm "$PLUGINS_DIR/GameScript.Core.dll"
    echo "Removed: $PLUGINS_DIR/GameScript.Core.dll"
fi

echo ""
echo "=== Done ==="
echo ""
echo "Open Unity and verify there are no compilation errors."
