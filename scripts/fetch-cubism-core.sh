#!/usr/bin/env bash
# Download Live2D Cubism Core (proprietary, not committed).
# Required once per machine / Docker image for offline use.
# Browser clients can also load it from the official CDN at runtime.
set -euo pipefail
DEST="$(dirname "$0")/../client/public/live2d/runtime/live2dcubismcore.min.js"
mkdir -p "$(dirname "$DEST")"
URL="https://cubism.live2d.com/sdk-web/cubismcore/live2dcubismcore.min.js"
echo "Fetching Cubism Core → $DEST"
curl -fsSL "$URL" -o "$DEST"
echo "OK ($(wc -c < "$DEST") bytes)"
