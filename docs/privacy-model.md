# Privacy Model

QuietRead for Messenger is built on a set of hard privacy commitments. This document describes each commitment, what it means technically, and how it is enforced in the code.

---

## Core Commitments

### 1. No Servers

The extension has no backend server, no API endpoint, and no network destination of its own. It makes zero outbound network requests.

The only network activity the extension performs is **blocking** — it prevents Messenger's read-receipt requests from reaching Facebook's servers. It does not initiate any requests of its own.

**How it is enforced:**
- The extension declares no URLs in its own code that it fetches from.
- The manifest does not declare `fetch`, `XMLHttpRequest`, or any outbound request permissions beyond the `declarativeNetRequest` blocking API.
- The extension's `host_permissions` for `messenger.com` and `facebook.com` are required only for content script injection and DNR rule scoping — they do not enable the extension to *send* data to those domains on its own.

---

### 2. No Analytics or Telemetry

No usage events, click events, error reports, crash reports, performance metrics, or any other form of telemetry are collected or transmitted.

There are no third-party analytics SDKs (no Google Analytics, Mixpanel, Sentry, Amplitude, or similar) in the extension.

**How it is enforced:**
- `package.json` has no runtime dependencies. The extension ships with no third-party libraries loaded at runtime.
- All UI is built from plain React with no embedded analytics hooks.

---

### 3. No Message Content Leaves Your Device

The extension never reads, accesses, stores, or transmits the content of any Messenger conversation — messages, photos, videos, reactions, or any other conversation data.

The content script is injected into Messenger pages but does not access the page DOM in any way that would allow it to read message text. It reads only the current page URL (to determine if it is on a Messenger thread) and clicks on conversation link elements (to detect navigation events for the warning toast).

The debug hook observes network requests. It accesses only the **URL** of each request, not the request body, not the response body, and not any headers. Request bodies in Messenger's GraphQL calls contain message content and other sensitive data — the hook does not touch them.

**How it is enforced:**
- The `fetch` wrapper in `src/injected/fetch-xhr-hook.ts` reads only `input` (the URL) and `init?.method`. It does not access `init.body`.
- The XHR wrapper reads only `url` and `method` from the arguments to `open()`. It does not attach a listener to `load` or read the response.
- The content script does not query the DOM for message text.

---

### 4. No Auth Tokens or Session Identifiers Collected

Messenger URLs frequently contain sensitive query parameters: `doc_id`, `fb_dtsg`, `jazoest`, access tokens, and other session-specific values. These are stripped before any URL is stored or displayed.

The `sanitizeUrl()` function in `src/injected/fetch-xhr-hook.ts` uses the `URL` constructor to parse the full URL and then reconstructs it using only `origin + pathname`, discarding the `search` (query string) and `hash` entirely.

**Example:**
- Input: `https://www.messenger.com/api/graphql?doc_id=12345&fb_dtsg=AQHabc...&jazoest=12345`
- Stored/displayed: `https://www.messenger.com/api/graphql`

This behavior is unconditional — it applies whether or not debug mode is enabled, and the sanitized form is the only form the extension ever sees.

---

### 5. No Third-Party Telemetry

No third-party code is loaded by the extension at runtime. No external scripts, fonts, stylesheets, or images are fetched from CDNs or remote servers.

All assets (icons, styles, scripts) are bundled at build time and served from the extension package itself.

**How it is enforced:**
- The manifest does not declare any Content Security Policy exceptions for external sources.
- Vite builds bundle all imports into the output files — no dynamic `import()` from remote URLs.
- The `web_accessible_resources` declaration only exposes the injected hook script, which is a local file.

---

### 6. Debug Logs Are Local and Sanitized

When debug mode is enabled, a log of observed candidate network requests is stored in `chrome.storage.local`. This storage is:
- **Local only.** `chrome.storage.local` stores data on your device in the browser's local profile directory. It is not synced to any Google account or server unless you have explicitly enabled Chrome Sync for extension data (which would sync to your own Google account only — QuietRead has no access to that sync).
- **Capped.** The log stores a maximum of 50 entries (`MAX_DEBUG_ENTRIES = 50` in `src/shared/constants.ts`). Older entries are dropped when the cap is reached.
- **Sanitized.** Each entry contains only: a generated ID, timestamp (Unix ms), sanitized URL path, HTTP method, request type (`fetch` or `xhr`), and an optional note. No tokens, bodies, or personal identifiers.
- **Never uploaded.** Nothing in the extension reads the debug log and sends it anywhere. You can export it manually from the diagnostics panel.

When debug mode is disabled, the debug hook is not injected and no new entries are written. Existing log entries remain in storage until cleared or overwritten.

---

## What the Extension Cannot See

To be explicit about scope:

| Data | Can QuietRead see it? |
|------|-----------------------|
| Content of messages you receive | No |
| Content of messages you send | No |
| Messages from other conversations | No |
| Your Facebook account password | No |
| Your Facebook session cookies or tokens | No |
| Your Facebook friends list or contacts | No |
| Who you are messaging | No |
| Photos, videos, or files in conversations | No |
| Your Facebook profile or account information | No |
| Messenger call audio or video | No |
| Websites you visit (other than Messenger) | No |
| Your browsing history | No |

---

## Storage Summary

| What is stored | Where | When cleared |
|----------------|-------|-------------|
| `protectionEnabled` (boolean) | `chrome.storage.local` | Never automatically; removed on extension uninstall |
| `debugEnabled` (boolean) | `chrome.storage.local` | Never automatically; removed on extension uninstall |
| `showStatusPill` (boolean) | `chrome.storage.local` | Never automatically; removed on extension uninstall |
| Debug log entries (max 50) | `chrome.storage.local` | Overwritten by new entries when cap reached; removed on extension uninstall |

No data is stored anywhere else.

---

## Open Source Transparency

All of the above commitments are verifiable by reading the source code. The extension is open source under the MIT license. Every file is available in this repository. The build process (Vite + TypeScript) is deterministic and reproducible — you can build from source and compare the output to the released artifact.

If you find any discrepancy between these stated commitments and the actual code behavior, please report it as a high-priority security issue following the [SECURITY.md](../SECURITY.md) process.
