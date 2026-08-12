#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT_DIR"

BASE_VERSION="${1:-v1.0.2}"
GIT_SHA="$(git rev-parse --short HEAD)"
BUILD_TIME="$(date '+%Y-%m-%d %H:%M')"
VERSION="${BASE_VERSION}+${GIT_SHA}"

cat > "js/version.js" <<EOF
window.APP_VERSION = "${VERSION}";
window.APP_BUILD_TIME = "${BUILD_TIME}";
EOF

echo "Updated js/version.js => ${VERSION} (${BUILD_TIME})"
