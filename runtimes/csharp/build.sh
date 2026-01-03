#!/bin/bash
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

CORE_OUTPUT="GameScript.Core/bin/Release/netstandard2.1"
UNITY_OUTPUT="GameScript.Unity/bin/Release/netstandard2.1"
EDITOR_OUTPUT="GameScript.Unity.Editor/bin/Release/netstandard2.1"
UNITY_PLUGINS="../unity/Packages/studio.shortsleeve.gamescriptunity/Runtime/Plugins"
DIST_DIR="dist"

echo "=== Restoring dotnet tools ==="
dotnet tool restore

echo "=== Building all projects ==="
dotnet build GameScript.Unity.Editor/GameScript.Unity.Editor.csproj -c Release

echo "=== Copying Core DLLs to Unity Plugins ==="
cp "$CORE_OUTPUT/GameScript.Core.dll" "$UNITY_PLUGINS/"
cp "$CORE_OUTPUT/FlatSharp.Runtime.dll" "$UNITY_PLUGINS/"

echo "=== Creating distribution directory ==="
rm -rf "$DIST_DIR"
mkdir -p "$DIST_DIR"

echo "=== Merging GameScript.Unity.dll (Core + FlatSharp + Unity Runtime) ==="
dotnet tool run ilrepack -- \
    /internalize \
    /lib:"$CORE_OUTPUT" \
    /lib:"$UNITY_OUTPUT" \
    /lib:"Dependencies/Unity" \
    /out:"$DIST_DIR/GameScript.Unity.dll" \
    "$UNITY_OUTPUT/GameScript.Unity.dll" \
    "$CORE_OUTPUT/GameScript.Core.dll" \
    "$CORE_OUTPUT/FlatSharp.Runtime.dll" \
    "$CORE_OUTPUT/System.Buffers.dll" \
    "$CORE_OUTPUT/System.Memory.dll" \
    "$CORE_OUTPUT/System.Numerics.Vectors.dll" \
    "$CORE_OUTPUT/System.Runtime.CompilerServices.Unsafe.dll"

echo "=== Merging GameScript.Unity.Editor.dll ==="
dotnet tool run ilrepack -- \
    /lib:"$DIST_DIR" \
    /lib:"$EDITOR_OUTPUT" \
    /lib:"Dependencies/Unity" \
    /out:"$DIST_DIR/GameScript.Unity.Editor.dll" \
    "$EDITOR_OUTPUT/GameScript.Unity.Editor.dll"

echo "=== Build complete ==="
echo "Output:"
echo "  $DIST_DIR/GameScript.Unity.dll"
echo "  $DIST_DIR/GameScript.Unity.Editor.dll"
