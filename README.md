# QuietRead for Messenger

> Read with breathing room.

A privacy-first Chrome extension that offers **best-effort, experimental** protection against Seen/read-receipt signals when reading conversations on Messenger Web.

> **Recommended:** Use this extension on **[messenger.com](https://www.messenger.com)** for the best experience. The extension is tested and validated primarily on messenger.com. While facebook.com/messages is also supported, messenger.com provides the most reliable protection.

---

## Why This Exists

Messenger's "Seen" indicator tells the sender the exact moment you opened their message. For most people this is harmless. For others — people dealing with harassment, stalking, emotional coercion, or abusive relationships — that tiny timestamp can be genuinely dangerous. It signals presence, availability, and responsiveness in situations where the person receiving the message needs time, distance, or simply the ability to read without being watched.

QuietRead exists for those situations. It attempts to silently drop the network requests that deliver the "Seen" receipt to Facebook's servers, so you can open and read a thread without the other party being notified.

**This is an experimental, best-effort tool.** Facebook changes its internal APIs frequently. No protection can be guaranteed. See [Known Limitations](#known-limitations) and the [Privacy Model](docs/privacy-model.md) before relying on this extension for safety-critical use.

---

## Current Status

**Early MVP — v0.1.0 — Experimental**

This extension is under active development. The blocking patterns are based on observed network traffic and may not capture every read-receipt signal Facebook sends. Use debug mode to validate coverage in your environment. Do not rely on this extension as your only safety measure.

There is **no Chrome Web Store release** yet. Installation requires loading the extension manually from a built ZIP or unpacked folder.

---

## Features

- Intercepts and blocks known Messenger read-receipt/Seen network requests using Chrome's `declarativeNetRequest` API (MV3)
- Works on **messenger.com** (recommended) and facebook.com/messages
- Persistent on/off toggle via the toolbar popup
- On-page status pill so you always know whether protection is active while browsing
- Warning toast when protection is disabled and you open a conversation thread
- Optional debug mode: captures (sanitized) network request metadata locally so you can research new receipt endpoints without sending anything to external servers
- All settings stored locally via `chrome.storage.local` — no account required, no servers contacted
- Open source, MIT licensed

---

## Installation

There is no Chrome Web Store listing yet. Install manually:

### Option A — Download a Release ZIP (recommended for most users)

1. Go to the [Releases page](../../releases) on GitHub.
2. Download the latest `quietread-for-messenger-vX.Y.Z.zip` asset.
3. Unzip the file to a permanent folder on your computer (do not delete this folder after installing).
4. Open Chrome and navigate to `chrome://extensions`.
5. Enable **Developer mode** using the toggle in the top-right corner.
6. Click **Load unpacked**.
7. Select the unzipped folder.
8. The QuietRead icon will appear in your toolbar. Pin it for easy access.

### Option B — Build from Source

See [Development Setup](#development-setup) below, then load the `dist/` folder as an unpacked extension.

### Updating

Chrome does not auto-update sideloaded extensions. To update, download the new release ZIP, replace the contents of the folder you originally loaded, and click the refresh icon on the extension card at `chrome://extensions`.

---

## Development Setup

Requires Node.js 20+ and npm.

```bash
# Clone the repository
git clone https://github.com/jonpecson/quietread-for-messenger.git
cd quietread-for-messenger

# Install dependencies
npm install

# Build once (production)
npm run build

# Build and watch for changes (development)
npm run dev

# Type-check only
npm run typecheck

# Lint
npm run lint

# Run unit tests
npm test

# Run unit tests in watch mode
npm run test:watch

# Package a release ZIP
npm run package
```

After building, load the `dist/` folder as an unpacked extension via `chrome://extensions` (Developer mode on, Load unpacked).

---

## Privacy Model

QuietRead is designed around a strict set of privacy commitments:

- **No servers.** The extension has no backend. It does not phone home.
- **No analytics or telemetry.** No usage events, crash reports, or metrics are collected.
- **No message content ever leaves your device.** The extension never reads, stores, or transmits the content of any Messenger conversation.
- **No auth tokens or cookies collected.** The debug hook intentionally strips query parameters from captured URLs to avoid logging tokens.
- **No third-party SDKs.** The extension contains no tracking libraries, advertising SDKs, or external dependencies at runtime.
- **Debug logs are local and sanitized.** When debug mode is on, only URL paths and HTTP methods are captured — never bodies, never headers, never tokens. Logs are stored in `chrome.storage.local` and capped at 50 entries. They are never uploaded anywhere.

Full details: [docs/privacy-model.md](docs/privacy-model.md)

---

## Technical Architecture

QuietRead is a Manifest V3 Chrome extension composed of four layers:

### Background Service Worker (`src/background/`)

The service worker manages persistent state and network blocking rules. On install and browser startup it initializes settings in `chrome.storage.local` and applies or removes `declarativeNetRequest` dynamic rules according to the current `protectionEnabled` setting.

### Declarative Net Request Rules

Blocking is performed by Chrome's `declarativeNetRequest` API (DNR). DNR rules run at the browser level, before the page JavaScript can observe them, and cannot be bypassed by page-level code. Dynamic rules are loaded by the service worker. A static fallback ruleset (`rules/static-rules.json`) is bundled with the extension.

Current candidate URL patterns blocked when protection is enabled:

| Pattern | Rationale |
|---|---|
| `*/ajax/mercury/change_read_status*` | Legacy Messenger read-status endpoint |
| `*mark_read*` | Broad mark-read signal pattern |
| `*/api/graphql*ReadReceipt*` | GraphQL read receipt mutation |
| `*/api/graphqlbatch*ReadReceipt*` | Batched GraphQL read receipt mutation |
| `*thread_read_state*` | Lightspeed protocol thread read state |

All rules target `xmlhttprequest` resource types only and are scoped to `www.messenger.com` and `www.facebook.com` initiator domains.

### Content Script (`src/content/`)

Injected into Messenger pages at `document_idle`. Responsibilities:
- Renders the on-page status pill (`page-status-pill.ts`)
- Monitors conversation link clicks and shows a warning toast if protection is off (`thread-guard.ts`)
- In debug mode, injects the fetch/XHR instrumentation hook into the page context and relays sanitized log entries to the background

### Page-Level Interception Hook (`src/injected/fetch-xhr-hook.ts`)

Runs in the **page context** (MAIN world, injected at `document_start`) to intercept read receipts at their source. Modern Messenger sends read receipts primarily through **MQTT over WebSocket** (`wss://edge-chat.messenger.com`), not as separate HTTP requests. The hook wraps `WebSocket.send()`, `fetch()`, and `XMLHttpRequest` to inspect outgoing data for read-receipt patterns and silently drops matching messages. This is the primary blocking mechanism — DNR rules serve as a secondary safety net for URL-matching requests.

### Popup (`src/popup/`) and Options (`src/options/`)

React + TypeScript UIs. The popup provides the main on/off toggle and a link to options. The options page exposes debug mode, status pill visibility, and a diagnostics panel showing recent observed requests.

---

## Permission Explanations

| Permission | Why it is needed |
|---|---|
| `storage` | Persists your on/off preference and debug log locally in `chrome.storage.local` |
| `declarativeNetRequest` | Allows the extension to install and remove network blocking rules via the DNR API |
| `host_permissions: messenger.com` | Required for content scripts and DNR rule scoping to Messenger Web |
| `host_permissions: facebook.com` | Required for content scripts and DNR rule scoping to facebook.com/messages |

The extension does **not** request `tabs`, `cookies`, `webRequest`, `history`, or `browsingData` permissions.

---

## Non-Goals

QuietRead will never:

- Access, read, or transmit the content of any Messenger conversation
- Access anyone else's account or messages
- Bypass Facebook's login or authentication systems
- Modify or intercept outgoing messages you send
- Guarantee invisibility — Facebook can and does change its APIs
- Store or transmit your Facebook session tokens, cookies, or credentials
- Serve as a surveillance tool of any kind

---

## Known Limitations

- **Best-effort only.** Facebook changes its internal GraphQL and Lightspeed APIs regularly. A blocking pattern that works today may stop working after a Facebook deployment. There is no way to guarantee that every read-receipt signal is suppressed.
- **DNR blocks at the network layer, not the application layer.** If Facebook adds a new endpoint not covered by the current patterns, receipts may slip through until the rules are updated.
- **WebSocket interception depends on early injection.** The hook must load before Messenger's scripts open the WebSocket connection. A hard refresh (`Ctrl+Shift+R` / `Cmd+Shift+R`) after installing or updating ensures the hook loads first.
- **Mobile apps are unaffected.** This extension only applies to Messenger Web in Chrome (or Chromium-based browsers). It has no effect on the Messenger mobile app or Facebook app.
- **Other browsers are not supported.** The extension targets Chrome/Chromium MV3. Firefox support is not planned at this time.
- **The status pill may not render on all Messenger layouts.** Facebook's DOM structure changes; the pill's injection point may break with UI updates.
- **No guarantee of Facebook policy compliance.** Using this extension may be inconsistent with Facebook's Terms of Service. Use at your own discretion.

---

## Roadmap

- [ ] Improved pattern coverage via community-contributed research sessions
- [ ] Automatic detection of unblocked receipt requests and in-app alert
- [ ] WebSocket/SSE traffic analysis (research phase)
- [ ] Firefox / Manifest V2 compatibility layer
- [ ] Chrome Web Store submission (pending review of extension policies)
- [ ] Automated integration tests using a controlled two-account environment
- [ ] Signed release artifacts

---

## Contributing

Contributions are welcome, especially:
- New blocking patterns discovered via debug mode research
- Bug reports with debug logs (sanitized — no personal data)
- Improvements to test coverage
- Documentation and translation

Please read [CONTRIBUTING.md](CONTRIBUTING.md) before opening a pull request.

---

## License

MIT License. See [LICENSE](LICENSE).

---

## Safety Disclaimer

This extension is provided as-is, without warranty of any kind. It offers **best-effort, experimental** protection. It is not a security product, not a legal tool, and should not be the sole measure relied upon in any situation involving personal safety. If you are in a dangerous situation, please contact local emergency services or a domestic violence / safety resource appropriate to your location.

The extension developers make no representations about its effectiveness against any specific version of Messenger or Facebook's APIs.
