# Manual Installation Guide

QuietRead for Messenger is not available on the Chrome Web Store. It must be installed manually as an unpacked extension. This guide walks through the process step by step.

---

## Before You Begin

- You need Google Chrome (version 109 or later, which supports Manifest V3) or a Chromium-based browser such as Microsoft Edge, Brave, or Arc.
- You do not need to install any developer tools or have any programming experience.
- The folder you unzip the extension into must remain on your computer as long as the extension is installed. If you delete or move the folder, the extension will stop working.

---

## Option A: Install from a Release ZIP (Recommended)

This is the easiest method for most users.

### Step 1: Download the Release

1. Go to the [Releases page](../../releases) of this repository on GitHub.
2. Find the latest release (the one at the top of the list).
3. Under "Assets," click the file named `quietread-for-messenger-vX.Y.Z.zip` to download it.

### Step 2: Unzip the File

1. Locate the downloaded ZIP file (usually in your Downloads folder).
2. Unzip it:
   - **macOS:** Double-click the ZIP file. A folder will appear next to it.
   - **Windows:** Right-click the ZIP file and choose "Extract All..." then choose a destination. A good choice is a folder like `Documents/Extensions/QuietRead`.
   - **Linux:** Right-click and choose "Extract Here," or run `unzip quietread-for-messenger-vX.Y.Z.zip -d ~/extensions/quietread`.
3. Note the full path to the extracted folder. You will need it in Step 4.

**Important:** Do not delete or move this folder after installing. Chrome loads the extension from this folder every time the browser starts.

### Step 3: Open Chrome Extensions

1. Open Google Chrome.
2. In the address bar, type `chrome://extensions` and press Enter.
3. You will see a page listing all your installed extensions.

### Step 4: Enable Developer Mode

1. In the top-right corner of the `chrome://extensions` page, find the toggle labeled **Developer mode**.
2. Click it to turn it on. A new set of buttons will appear at the top of the page ("Load unpacked," "Pack extension," "Update").

### Step 5: Load the Extension

1. Click the **Load unpacked** button.
2. A file picker dialog will open.
3. Navigate to the folder you unzipped in Step 2 and select it (select the folder itself, not a file inside it).
4. Click **Select** (macOS/Linux) or **Select Folder** (Windows).

### Step 6: Confirm Installation

1. The QuietRead for Messenger card should now appear on the `chrome://extensions` page.
2. Confirm there is no red error badge on the card.
3. Look for the QuietRead icon in your Chrome toolbar (it may be hidden under the puzzle-piece Extensions menu — click the puzzle piece and pin QuietRead for easy access).

---

## Option B: Build and Install from Source

This method is for developers or users who want to build the extension themselves.

### Prerequisites

- [Node.js](https://nodejs.org/) version 20 or later (includes npm)
- Git

### Step 1: Clone the Repository

```bash
git clone https://github.com/YOUR_ORG/quietread-for-messenger.git
cd quietread-for-messenger
```

### Step 2: Install Dependencies

```bash
npm install
```

### Step 3: Build the Extension

```bash
npm run build
```

This produces a `dist/` folder containing the compiled extension.

### Step 4: Load in Chrome

Follow Steps 3–6 from Option A, but select the `dist/` folder inside the cloned repository instead of a downloaded ZIP.

---

## Verifying the Installation

1. Navigate to `https://www.messenger.com` or `https://www.facebook.com/messages`.
2. You should see a small status badge appear in the lower-left corner of the page indicating "Protected."
3. Click the QuietRead icon in the toolbar. The popup should show protection is enabled.

If neither appears, see [Troubleshooting](#troubleshooting) below.

---

## Updating the Extension

Chrome does not automatically update sideloaded (unpacked) extensions. To update:

### Updating from a New Release ZIP

1. Download the new release ZIP from the Releases page.
2. Unzip it into the **same folder** you originally used (replace all existing files), or unzip to a new folder.
   - If you unzip to the same folder: go to `chrome://extensions`, find the QuietRead card, and click the circular refresh icon. The extension will reload with the new files.
   - If you unzip to a new folder: go to `chrome://extensions`, click **Remove** on the old QuietRead card, then click **Load unpacked** and select the new folder.
3. Confirm the version number on the card matches the new release.

### Updating from Source (Option B)

```bash
git pull
npm install
npm run build
```

Then go to `chrome://extensions` and click the refresh icon on the QuietRead card.

---

## Uninstalling

1. Go to `chrome://extensions`.
2. Find the QuietRead for Messenger card.
3. Click **Remove**.
4. Optionally delete the folder you extracted the extension into.

---

## Troubleshooting

### The extension card shows a red error badge

Click "Errors" on the card to see the error details. Common causes:
- The folder was moved or deleted after installation. Re-load the extension from the correct location.
- A build file is missing. Try rebuilding (`npm run build`) and reloading.

### The status pill does not appear on Messenger

- Confirm the extension is enabled (toggle on the card at `chrome://extensions` should be blue).
- Hard-reload the Messenger tab (Ctrl+Shift+R or Cmd+Shift+R on macOS).
- Check the browser console (F12 → Console) for any JavaScript errors from the extension.

### The popup opens but shows an error state

- Try reloading the extension at `chrome://extensions`.
- Check for errors in the extension's service worker by clicking "Service worker" on the card.

### Chrome says "This extension is not from the Chrome Web Store"

This is expected for sideloaded extensions. Chrome may show a one-time warning. Click "Keep" or dismiss the notification. The extension is safe — you can review the full source code in this repository.

### Developer mode keeps turning off

Some enterprise-managed Chrome installations disable Developer mode. In that case, loading unpacked extensions is not possible on that machine. Try a personal (non-managed) Chrome profile.

---

## Privacy Note

Installing the extension requires enabling Developer mode in Chrome. Developer mode itself does not reduce your browser security; it simply allows loading extensions from local files. QuietRead does not use Developer mode features beyond loading the unpacked extension.

For full details on what the extension does and does not do with your data, see [docs/privacy-model.md](privacy-model.md).
