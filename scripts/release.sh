#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
VERSION=$(node -p "require('$PROJECT_DIR/package.json').version")
TAG="v${VERSION}"
ZIP_NAME="quietread-for-messenger-v${VERSION}.zip"
RELEASE_DIR="$PROJECT_DIR/release"

cd "$PROJECT_DIR"

echo "==> QuietRead for Messenger release: ${TAG}"

# Step 1: Build and package
echo "==> Step 1: Build and package..."
bash scripts/package-extension.sh

# Step 2: Ensure all changes are committed
if [[ -n "$(git status --porcelain)" ]]; then
  echo "ERROR: Working directory is not clean. Commit changes first."
  exit 1
fi

# Step 3: Create tag if it doesn't exist
if git rev-parse "$TAG" >/dev/null 2>&1; then
  echo "==> Tag ${TAG} already exists, skipping tag creation"
else
  echo "==> Creating tag ${TAG}..."
  git tag -a "$TAG" -m "Release ${TAG}"
fi

# Step 4: Push commits and tags
echo "==> Pushing commits and tags..."
git push origin main --tags

# Step 5: Create GitHub release
echo "==> Creating GitHub release..."
RELEASE_NOTES="## QuietRead for Messenger ${TAG}

Initial open-source MVP release.

### Installation
This is an ad-hoc release for local installation only (not published to the Chrome Web Store).

1. Download the ZIP file below
2. Extract the ZIP
3. Open \`chrome://extensions\` in Chrome
4. Enable **Developer Mode**
5. Click **Load unpacked** and select the extracted folder

### What's included
- Protection toggle with persistent state
- Candidate read-receipt request blocking via declarativeNetRequest
- In-page status pill on Messenger Web
- Debug instrumentation mode for validating blocking rules
- Popup and options UI
- Thread-open warning when protection is off

### Important notes
- **Best-effort protection**: Messenger's internal APIs may change at any time
- Read-receipt blocking rules are experimental and require real-world validation
- Debug mode helps identify and validate candidate network requests
- No data leaves your device — all processing is local

### Technical details
- Manifest V3 Chrome extension
- TypeScript + React + Vite build
- 5 candidate DNR blocking rules for read-receipt patterns
- Content script with page-level fetch/XHR instrumentation (debug mode only)
"

if gh release view "$TAG" >/dev/null 2>&1; then
  echo "==> Release ${TAG} already exists. Uploading asset..."
  gh release upload "$TAG" "$RELEASE_DIR/$ZIP_NAME" --clobber
else
  gh release create "$TAG" \
    "$RELEASE_DIR/$ZIP_NAME" \
    --title "QuietRead for Messenger ${TAG}" \
    --notes "$RELEASE_NOTES"
fi

echo "==> Release ${TAG} complete!"
echo "    Release: https://github.com/$(gh repo view --json nameWithOwner -q .nameWithOwner)/releases/tag/${TAG}"
