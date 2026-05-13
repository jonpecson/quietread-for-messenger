# Researching Read-Receipt Endpoints

This guide explains how to use QuietRead's debug mode to discover and validate Messenger read-receipt network endpoints, and how to update the blocking rules when new patterns are found.

This is technical documentation for contributors and researchers. It does not require deep programming experience, but it does require comfort with Chrome DevTools and the ability to run two Messenger sessions simultaneously.

---

## Why Research Is Needed

Facebook does not publish documentation for its internal Messenger APIs. The read-receipt/Seen system relies on one or more network requests that fire when a recipient opens a conversation thread containing unread messages. These endpoints change over time as Facebook deploys updates.

The current blocking rules in `src/background/dnr-rules.ts` were identified by observing network traffic. They may not be complete, and they may become stale. The debug mode exists specifically to support ongoing pattern discovery.

---

## What Debug Mode Does

When debug mode is enabled in the options page, QuietRead injects a small script (`injected/fetch-xhr-hook.js`) into the Messenger page context. This script wraps `window.fetch()` and `XMLHttpRequest.prototype.open/send` to observe outgoing requests.

For every request whose URL matches a list of candidate substrings (e.g., `mark_read`, `ReadReceipt`, `thread_read_state`), the hook:

1. Strips all query parameters from the URL (to protect tokens and session identifiers)
2. Records the URL path, HTTP method, request type (`fetch` or `xhr`), and timestamp
3. Posts this sanitized entry to the content script via `window.postMessage`
4. The content script relays it to the background, which stores it in `chrome.storage.local`

The debug log is viewable in the QuietRead options page under "Diagnostics."

**The hook does not block requests.** It is purely observational. Blocking is handled separately by DNR rules.

---

## Setting Up a Two-Account Research Session

You need two Facebook accounts to verify whether a Seen receipt was actually delivered. Using your personal account risks revealing your real identity — consider using test accounts.

### Prerequisites

- Two separate Facebook/Messenger accounts (can be test accounts)
- Two Chrome profiles (or Chrome + a Chromium-based browser) to keep sessions separate
- QuietRead installed in one profile (the "reader" profile)

### Step 1: Prepare the Reader Profile

1. Open Chrome Profile A (the reader — the one with QuietRead installed).
2. Log in to Messenger in this profile.
3. Open the QuietRead options page: right-click the toolbar icon → Options.
4. Enable **Debug Mode**. You should see the Diagnostics section appear.
5. Confirm the status pill on the Messenger page shows "Protected."

### Step 2: Prepare the Sender Profile

1. Open Chrome Profile B (a separate Chrome profile or a different browser with no QuietRead extension).
2. Log in to the second Messenger account.
3. Send a message to the first account (the reader). Leave the conversation thread open in Profile B so you can watch for the Seen indicator.

### Step 3: Open the Thread in the Reader Profile

1. In Profile A (QuietRead active), navigate to the conversation from the sender.
2. Open the thread and read the message.
3. Wait 5–10 seconds.

### Step 4: Check the Seen Indicator in the Sender Profile

1. In Profile B, look at the message you sent. Does the "Seen" indicator appear?
   - **No "Seen":** The blocking is working for this session. Note the debug log entries for reference.
   - **"Seen" appears:** The blocking failed. Proceed to Step 5.

### Step 5: Identify the Unblocked Request

1. In Profile A, open the QuietRead options page and look at the Diagnostics panel.
2. Look for entries flagged as "Candidate read-receipt request" that were **not blocked** by DNR.
3. Cross-reference with Chrome DevTools:
   - Press F12 in Profile A on the Messenger tab.
   - Go to the Network panel. Filter by XHR/Fetch.
   - Clear the log, then re-open the thread.
   - Look for outgoing POST or GET requests that fired when the thread was opened.
   - Compare URL paths against the patterns in `src/background/dnr-rules.ts`.

4. Identify the request(s) that are not covered by existing patterns.

---

## Interpreting the Debug Log

The Diagnostics panel shows entries in this format:

| Field | Description |
|-------|-------------|
| Timestamp | Unix ms when the request was initiated |
| URL | Sanitized path only (query parameters stripped) |
| Method | HTTP verb (POST, GET, etc.) |
| Type | `fetch` or `xhr` |
| Note | "Candidate read-receipt request" if the URL matched a known pattern substring |

Entries with **no Note** are requests the hook observed but did not flag as candidates. If Seen leaked through, look for entries without a Note that fired close to when you opened the thread — these may be new patterns.

Entries with a Note were flagged as candidates. If DNR was active, the actual network request should have been blocked. If Seen still appeared despite the request being flagged, it suggests DNR may have failed to block it (check `chrome://extensions` for DNR rule errors) or that a *different* unflagged request carried the receipt.

---

## Using Chrome's Network Panel in Parallel

The debug hook only observes `fetch` and `XHR` requests. Some requests may use the Beacon API (`navigator.sendBeacon`), which the hook does not intercept. To catch everything:

1. Open Chrome DevTools (F12) in the reader tab.
2. Go to Network → check "Preserve log."
3. Filter to "Fetch/XHR" or use the search box.
4. Open the thread and watch for new requests firing in the 1–5 second window after the thread opens.
5. Look at request URLs and filter for terms like: `read`, `seen`, `receipt`, `mark`, `lightspeed`, `lsd`, `graphql`.

Copy the **path only** (not the full URL with query parameters) before sharing or filing an issue.

---

## Updating the Blocking Rules

Once you have identified a new unblocked pattern, add it to `src/background/dnr-rules.ts`:

```typescript
{
  id: DNR_RULE_ID_START + 5,  // use the next available N
  priority: 1,
  action: { type: chrome.declarativeNetRequest.RuleActionType.BLOCK },
  condition: {
    urlFilter: '*your-new-pattern*',
    initiatorDomains: ['www.messenger.com', 'www.facebook.com'],
    resourceTypes: [chrome.declarativeNetRequest.ResourceType.XMLHTTPREQUEST],
  },
},
```

Also add the pattern to the `READ_RECEIPT_PATTERNS` array in `src/injected/fetch-xhr-hook.ts` so the debug hook will flag it in future sessions:

```typescript
const READ_RECEIPT_PATTERNS = [
  // ... existing patterns ...
  'your-new-pattern',
];
```

If the pattern is broad enough and stable enough to warrant inclusion in the static ruleset, add it to `rules/static-rules.json` as well with the next sequential static rule ID.

Rebuild, reload the extension, and run the two-account test again to verify the new pattern successfully blocks the receipt.

---

## Notes on Pattern Specificity

**Prefer specific patterns over broad ones.** The pattern `*mark_read*` is intentionally broad, but broad patterns carry a risk of accidentally blocking legitimate Messenger functionality. If you discover a more specific endpoint (e.g., a specific GraphQL operation name), prefer the specific form.

**Document your findings.** Add a comment above each rule explaining what endpoint it targets, when it was observed, and how it was discovered. Example:

```typescript
// Observed 2026-05-14: GraphQL mutation `MarkThreadRead` fires via /api/graphql
// approximately 2 seconds after opening an unread thread on messenger.com.
// Confirmed via two-account test: blocking this prevents Seen from appearing.
```

**Date your observations.** Facebook deploys continuously. A pattern observed today may change next month. Dated comments help future researchers understand the history.

---

## What Not to Include

When filing issues or pull requests with pattern research:

- **Do not include** full URLs with query parameters — these may contain session tokens
- **Do not include** request bodies — these may contain message content or auth tokens
- **Do not include** response bodies
- **Do not include** cookie values or `Authorization` headers
- **Do not include** real names, account IDs, or conversation content

Share only the URL path (e.g., `/api/graphql`) and the operation name if visible in a sanitized form.
