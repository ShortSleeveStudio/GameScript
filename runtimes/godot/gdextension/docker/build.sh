#!/usr/bin/env bash
# Cross-compile the GameScript GDExtension for linux/web/windows using Docker.
# Writes binaries to runtimes/godot/project/addons/gamescript/bin/ on the host.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
GODOT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
IMAGE="gamescript-godot-builder"

PLATFORM="${1:-}"
if [[ -z "$PLATFORM" ]]; then
  echo "Usage: $0 <linux|web|windows>"
  exit 1
fi

case "$PLATFORM" in
  linux)   SCONS_ARGS=(platform=linux) ;;
  web)     SCONS_ARGS=(platform=web) ;;
  windows) SCONS_ARGS=(platform=windows use_mingw=yes) ;;
  *) echo "Unknown platform: $PLATFORM (expected linux|web|windows)"; exit 1 ;;
esac

echo "=== Building Docker image (${IMAGE}) ==="
docker build -t "$IMAGE" "$SCRIPT_DIR"

echo "=== Building GDExtension for ${PLATFORM} (debug + release) ==="
docker run --rm \
  --user "$(id -u):$(id -g)" \
  -e HOME=/tmp \
  -v "$GODOT_ROOT":/work \
  -w /work/gdextension \
  "$IMAGE" \
  bash -c "scons ${SCONS_ARGS[*]} target=template_debug && scons ${SCONS_ARGS[*]} target=template_release"

echo "=== Done. Output: runtimes/godot/project/addons/gamescript/bin/ ==="
