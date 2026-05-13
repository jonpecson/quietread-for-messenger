#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
VERSION=$(node -p "require('$PROJECT_DIR/package.json').version")
RELEASE_DIR="$PROJECT_DIR/release"
ZIP_NAME="quietread-for-messenger-v${VERSION}.zip"

echo "==> Building extension..."
cd "$PROJECT_DIR"
npm run build

echo "==> Packaging extension v${VERSION}..."
rm -rf "$RELEASE_DIR"
mkdir -p "$RELEASE_DIR"

# Create a clean staging directory
STAGING="$RELEASE_DIR/quietread-for-messenger"
mkdir -p "$STAGING"

# Copy build output (excluding source HTML duplicates)
cp -r dist/* "$STAGING/"
rm -rf "$STAGING/src"

# Copy manifest and rules
cp manifest.json "$STAGING/"
cp -r rules "$STAGING/"

echo "==> Creating ZIP..."
cd "$RELEASE_DIR"
zip -r "$ZIP_NAME" "quietread-for-messenger/"

# Clean staging
rm -rf "$STAGING"

echo "==> Package created: release/${ZIP_NAME}"
echo "    Full path: $RELEASE_DIR/$ZIP_NAME"
