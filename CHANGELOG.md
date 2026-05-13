# Changelog

All notable changes to QuietRead for Messenger will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).
This project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [Unreleased]

---

## [0.1.0] — 2026-05-14

Initial MVP release.

### Added

- Manifest V3 Chrome extension scaffold with TypeScript and Vite build pipeline
- Background service worker managing extension lifecycle and settings initialization
- `declarativeNetRequest` dynamic rule management for blocking Seen/read-receipt network requests
- Static fallback ruleset (`rules/static-rules.json`) bundled with the extension
- Five candidate blocking patterns targeting known read-receipt endpoints:
  - `*/ajax/mercury/change_read_status*`
  - `*mark_read*`
  - `*/api/graphql*ReadReceipt*`
  - `*/api/graphqlbatch*ReadReceipt*`
  - `*thread_read_state*`
- Content script running on `messenger.com` and `facebook.com/messages` at `document_idle`
- On-page status pill indicating whether protection is active
- Warning toast when protection is disabled and a conversation link is clicked
- Toolbar popup (React) with protection on/off toggle
- Options page (React) with debug mode toggle, status pill toggle, and diagnostics panel
- Debug mode: injected fetch/XHR hook observing candidate requests in the page context
  - Sanitized URL capture only (query parameters stripped to protect tokens)
  - Log entries relayed to background via content script messaging
  - Capped at 50 entries stored in `chrome.storage.local`
- Site detection utility supporting both Messenger and Facebook Messages URLs
- Full TypeScript types for all extension messages and settings
- Unit tests for site detection, storage, and rule manager (Vitest)
- MIT license

### Known Limitations (v0.1.0)

- Blocking patterns are experimental and may not cover all receipt signals
- WebSocket and SSE traffic is not blocked
- No automated integration test with real Facebook network traffic
- No Chrome Web Store listing

[Unreleased]: https://github.com/YOUR_ORG/quietread-for-messenger/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/YOUR_ORG/quietread-for-messenger/releases/tag/v0.1.0
