# Technical Architecture

QuietRead for Messenger is a Manifest V3 (MV3) Chrome extension. This document describes how its components fit together, what each layer is responsible for, and the reasoning behind key design decisions.

---

## High-Level Overview

```
Browser Chrome
  └─ Background Service Worker          (always-running, manages rules and state)
       ├─ chrome.storage.local          (persists settings)
       └─ declarativeNetRequest API     (installs/removes blocking rules)

Messenger Tab (messenger.com / facebook.com/messages)
  └─ Content Script                     (injected at document_idle)
       ├─ Status Pill                   (on-page indicator)
       ├─ Thread Guard                  (click listener, warning toast)
       └─ [debug mode only]
            └─ Injected Page Script     (fetch/XHR hook in page context)

Toolbar Popup                           (React, communicates via runtime messages)
Options Page                            (React, diagnostics + settings)
```

All inter-component communication uses `chrome.runtime.sendMessage` / `chrome.runtime.onMessage`. No external network calls are made by the extension itself.

---

## Manifest V3 Rationale

The extension targets MV3 because:

- DNR (`declarativeNetRequest`) is the MV3-native approach to network blocking and is more performant and privacy-preserving than the MV2 `webRequest` API (which can read full request content).
- MV3 is the current and future standard for Chrome extensions. MV2 is deprecated.
- DNR rules run inside the browser engine, not in JavaScript, so they are not bypassable by page-level code and do not expose request bodies to the extension.

---

## Component Details

### Background Service Worker (`src/background/service-worker.ts`)

The entry point for the background context. Chrome may suspend and restart the service worker at any time, so all persistent state is stored in `chrome.storage.local` rather than in-memory variables.

Responsibilities:
- On `onInstalled` and `onStartup`: calls `initializeStorage()` to set default values and apply DNR rules matching the stored `protectionEnabled` setting.
- Delegates message handling to `setupMessageListeners()`.

### Storage (`src/background/storage.ts`)

Thin wrapper around `chrome.storage.local` typed to `QuietReadSettings`. Provides `initializeStorage`, `getSettings`, and `saveSettings` helpers. On first install, writes the defaults defined in `src/shared/constants.ts`.

### DNR Rule Manager (`src/background/dnr-rules.ts`)

Manages the dynamic DNR rules that perform the actual network blocking.

**Why dynamic rules instead of static rules?**

Static rules (declared in `manifest.json` and loaded from `rules/static-rules.json`) are always applied unless the ruleset is disabled as a whole. Dynamic rules can be added and removed at runtime via `updateDynamicRules`, allowing the extension to toggle blocking on and off without reloading. The static ruleset ships as a minimal fallback (covering the two most established patterns) and is disabled by default in the manifest; the service worker manages the full candidate set via dynamic rules.

**Candidate patterns (dynamic rules, IDs 1000–1004):**

| Rule ID | Pattern | Target |
|---------|---------|--------|
| 1000 | `*/ajax/mercury/change_read_status*` | Legacy Mercury HTTP endpoint |
| 1001 | `*mark_read*` | Broad read-marking signal |
| 1002 | `*/api/graphql*ReadReceipt*` | GraphQL read receipt mutation |
| 1003 | `*/api/graphqlbatch*ReadReceipt*` | Batched GraphQL read receipt mutation |
| 1004 | `*thread_read_state*` | Lightspeed protocol thread read state |

All rules:
- Action: `block`
- Resource type: `xmlhttprequest` only
- Initiator domains: `www.messenger.com`, `www.facebook.com`
- Priority: 1

### Messaging (`src/background/messaging.ts`)

Handles `chrome.runtime.onMessage` for the following message types (defined in `src/shared/constants.ts`):

| Message | Direction | Action |
|---------|-----------|--------|
| `quietread:get-status` | Any → Background | Returns current settings |
| `quietread:toggle-protection` | Popup/Options → Background | Saves setting, enables/disables DNR rules |
| `quietread:toggle-debug` | Options → Background | Saves setting, relays to content scripts |
| `quietread:request-observed` | Content → Background | Appends entry to debug log in storage |
| `quietread:get-diagnostics` | Options → Background | Returns settings + rule status + recent log |

### Content Script (`src/content/messenger-content.ts`)

Injected into matching Messenger pages at `document_idle`. Orchestrates the page-level components.

Initializes:
1. **Status pill** — a small floating badge showing "Protected" or "Off". Subscribes to `quietread:status-update` messages to re-render on toggle.
2. **Thread guard** — attaches a capture-phase click listener to `document`. When a conversation link (`a[href*="/t/"]`) is clicked and protection is off, shows a dismissing warning toast.
3. **Debug hook injection** — if debug mode is enabled, creates a `<script>` tag pointing to `injected/fetch-xhr-hook.js` (declared as a `web_accessible_resource` in the manifest), injects it into the page `<head>`, and listens for `window.postMessage` events from the hook to relay sanitized entries to the background.

### Injected Debug Hook (`src/injected/fetch-xhr-hook.ts`)

This script runs in the **page context** — the same JavaScript environment as Messenger's own code — not in the extension's isolated sandbox. This is necessary to intercept `fetch()` and `XMLHttpRequest` before the browser's network layer processes them.

**Privacy design:**
- `sanitizeUrl()` strips all query parameters from captured URLs via the `URL` constructor, ensuring tokens, session identifiers, and other sensitive query values are never logged.
- Only URL path, HTTP method, request type (`fetch`/`xhr`), and timestamp are captured.
- Request bodies, response bodies, and headers are never touched.
- Only URLs matching a known pattern list are relayed; all other traffic is ignored completely.

The hook communicates with the content script via `window.postMessage({ source: 'quietread-hook', entry: ... })`.

**Important:** the hook observes requests regardless of whether DNR has blocked them. A request can appear in the debug log even if it was successfully blocked by a DNR rule. This is by design — it allows researchers to see what Messenger is trying to send and compare against what DNR is blocking.

### Popup (`src/popup/`)

A React single-page app rendered in the toolbar popup. On open, sends `quietread:get-status` to the background and renders the current state. Sends `quietread:toggle-protection` when the toggle is clicked. Links to the options page.

Build entry: `src/popup/popup.html` → `Popup.tsx`.

### Options Page (`src/options/`)

A React single-page app with:
- Protection on/off toggle (mirrors popup)
- Debug mode toggle
- Status pill visibility toggle
- Diagnostics panel: sends `quietread:get-diagnostics` and displays rule status, observed request count, and a table of recent debug log entries

Build entry: `src/options/options.html` → `Options.tsx`.

---

## Build System

Vite with `@crxjs/vite-plugin` handles:
- TypeScript compilation
- React JSX transform
- Multi-entry bundling (service worker, content script, injected hook, popup, options)
- Manifest rewriting for development vs. production
- Asset fingerprinting (icons, CSS)

`tsc --noEmit` provides a separate strict type-check pass before production builds.

---

## Data Flow: Protection Toggle

```
User clicks toggle in Popup
  → Popup sends quietread:toggle-protection { enabled: true/false }
    → Background receives message
      → Saves to chrome.storage.local
      → Calls enableReadReceiptBlocking() or disableReadReceiptBlocking()
        → chrome.declarativeNetRequest.updateDynamicRules(...)
      → Broadcasts quietread:status-update to all Messenger tabs
        → Content script re-renders status pill
```

---

## Data Flow: Debug Request Observed

```
Messenger page calls fetch("https://www.messenger.com/api/graphql")
  → Injected hook intercepts window.fetch
    → isCandidate(url) checks against pattern list
      → If match: sanitizeUrl(), relay via window.postMessage
        → Content script receives postMessage
          → Sends quietread:request-observed { entry } to background
            → Background appends to debug log in chrome.storage.local (capped at 50)
              → Options diagnostics panel reads log on next refresh
```

---

## Known Architectural Gaps

- **WebSocket blocking:** Chrome's DNR API does not support blocking WebSocket (`websocket`) resource types in a way that selectively targets subprotocol messages. Messenger's Lightspeed protocol uses WebSocket for some state synchronization that may include read state. This is an open research question.
- **Service worker suspension:** Chrome may suspend the service worker between messages. State is fully persisted in `chrome.storage.local`, so rules are re-applied on the next `onStartup`, but there is a small window during browser startup before `initializeStorage()` runs where dynamic rules may not be active.
- **Content script re-injection:** Navigations within Messenger's single-page app do not always trigger a full page load, so the content script is not re-injected on every thread change. The thread guard and status pill are designed to persist for the page lifetime.
