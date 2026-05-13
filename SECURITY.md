# Security Policy

## Supported Versions

Only the latest release of QuietRead for Messenger receives security fixes.

| Version | Supported |
|---------|-----------|
| 0.1.x   | Yes       |
| < 0.1   | No        |

---

## Scope of This Policy

This policy covers security vulnerabilities in the QuietRead for Messenger extension itself — its source code, build pipeline, and published release artifacts.

It does **not** cover:

- Facebook or Messenger's own security posture
- Chrome or Chromium browser vulnerabilities
- The effectiveness or completeness of read-receipt blocking (this is a best-effort tool, not a security guarantee)

---

## Reporting a Vulnerability

**Please do not open a public GitHub issue to report a security vulnerability.**

If you discover a security issue — including but not limited to:

- The extension leaking user data, tokens, or message content in a way inconsistent with its stated privacy model
- A way for a malicious webpage to abuse the extension's messaging interface
- A supply-chain issue in the build pipeline or release artifacts
- The extension unintentionally sending data to external servers

Please report it privately by one of the following methods:

1. **GitHub private vulnerability reporting** — Use the "Report a vulnerability" button on the Security tab of this repository (if enabled).
2. **Email** — Send details to the maintainer(s) listed in `package.json` or the repository contact page. Encrypt with PGP if you have the maintainer's public key.

Include:
- A clear description of the issue
- Steps to reproduce (with extension version and Chrome version)
- The potential impact
- Any suggested fix, if you have one

We aim to acknowledge reports within 72 hours and to publish a fix or mitigation within 14 days for confirmed vulnerabilities.

---

## Privacy Model Violations

The extension's [privacy model](docs/privacy-model.md) makes specific commitments (no servers, no token collection, no message content leaving the device, no telemetry). If you find evidence that any of these commitments is violated, treat it as a high-severity security report and follow the private disclosure process above.

---

## Extension Permissions and Attack Surface

QuietRead's declared permissions are intentionally minimal:

- `storage` — reads and writes only to `chrome.storage.local`; no network access
- `declarativeNetRequest` — installs blocking rules; does not read network traffic content
- `host_permissions` for `messenger.com` and `facebook.com` — allows content script injection and DNR scoping

The extension does not request `webRequest` (which would allow reading request bodies), `cookies`, `tabs`, `history`, or any permission that would grant access to data beyond what is strictly needed.

If you discover a way that the extension's current permissions could be abused to exfiltrate user data, please report it privately.

---

## Build and Release Integrity

Release ZIP files published on the GitHub Releases page are built from tagged commits in this repository. If you discover evidence that a published artifact does not correspond to the tagged source code, report it immediately.

---

## Responsible Disclosure

We follow coordinated disclosure. We ask that you:

- Give us a reasonable window to address the issue before public disclosure
- Avoid exploiting the vulnerability beyond what is necessary to demonstrate it
- Do not access, modify, or delete data belonging to other users

We will credit you in the changelog (with your permission) when a vulnerability you report is fixed.
