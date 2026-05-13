# Manual Testing Checklist

This checklist covers the full manual test plan for QuietRead for Messenger. Run through all sections before tagging a release.

Automated unit tests (Vitest) cover isolated logic. This checklist covers end-to-end behavior in a real browser with a real Messenger session.

---

## Test Environment Setup

- [ ] Chrome (or Chromium) latest stable
- [ ] Extension built from source (`npm run build`) and loaded as unpacked from `dist/`, OR loaded from the release ZIP
- [ ] Extension version visible at `chrome://extensions` matches expected release version
- [ ] Two separate Chrome profiles available, each logged in to a different Messenger account (Profile A = reader with QuietRead, Profile B = sender without QuietRead)
- [ ] Both accounts can message each other
- [ ] Both Messenger tabs open and ready

Record your Chrome version and extension version at the top of each test run.

---

## Section 1: Installation and Initial State

- [ ] **1.1** Extension loads without errors at `chrome://extensions` (no red error badge)
- [ ] **1.2** Extension icon appears in the toolbar
- [ ] **1.3** Clicking the toolbar icon opens the popup without errors
- [ ] **1.4** Popup shows protection status as "On" (default)
- [ ] **1.5** Opening `messenger.com` shows the status pill on the page
- [ ] **1.6** Status pill reads "Protected" (or equivalent) when protection is on
- [ ] **1.7** Opening `facebook.com/messages` also shows the status pill
- [ ] **1.8** No JavaScript errors in the browser console on Messenger pages (F12 → Console)

---

## Section 2: Protection Toggle — Popup

- [ ] **2.1** Click the protection toggle in the popup to disable protection
- [ ] **2.2** Status pill on Messenger page updates to "Off" (or equivalent) without a page reload
- [ ] **2.3** Close and reopen the popup — the toggle still shows "Off" (state persisted)
- [ ] **2.4** Re-enable protection via the popup toggle
- [ ] **2.5** Status pill updates back to "Protected"
- [ ] **2.6** Close and reopen the popup — the toggle shows "On" (state persisted)

---

## Section 3: Protection Toggle — Options Page

- [ ] **3.1** Open the options page (right-click extension icon → Options)
- [ ] **3.2** Protection toggle in options reflects the same state as the popup
- [ ] **3.3** Toggle protection off in options — popup toggle also shows off on next open
- [ ] **3.4** Toggle protection on in options — popup toggle also shows on on next open

---

## Section 4: Thread Guard Warning Toast

- [ ] **4.1** Set protection to OFF
- [ ] **4.2** On messenger.com, click on a conversation in the list
- [ ] **4.3** A warning toast appears at the top of the page ("QuietRead protection is off...")
- [ ] **4.4** The toast dismisses automatically within ~3 seconds
- [ ] **4.5** Set protection back to ON
- [ ] **4.6** Click a conversation — no warning toast appears

---

## Section 5: Status Pill Visibility Toggle

- [ ] **5.1** Open options page
- [ ] **5.2** Disable "Show status pill" toggle
- [ ] **5.3** Navigate to `messenger.com` — status pill is not visible
- [ ] **5.4** Re-enable "Show status pill" — status pill reappears (may require page reload)

---

## Section 6: Debug Mode — Activation

- [ ] **6.1** Open options page and enable Debug Mode
- [ ] **6.2** Confirm the Diagnostics section appears in the options page
- [ ] **6.3** Open `messenger.com` and open any conversation thread
- [ ] **6.4** The Diagnostics panel shows at least one observed request entry (if candidate URLs were detected)
- [ ] **6.5** Check the browser console in the Messenger tab — `[QuietRead] Debug instrumentation hook active` should be logged
- [ ] **6.6** Disable Debug Mode in options
- [ ] **6.7** Reload Messenger — `[QuietRead] Debug instrumentation hook active` message no longer appears in console

---

## Section 7: Debug Log Privacy

- [ ] **7.1** Enable debug mode
- [ ] **7.2** Open a conversation thread on Messenger
- [ ] **7.3** Open the options Diagnostics panel and inspect any logged entries
- [ ] **7.4** Confirm no query parameters appear in the logged URLs (all URLs should be path-only, e.g., `/api/graphql` not `/api/graphql?doc_id=12345&token=abc...`)
- [ ] **7.5** Confirm no request bodies, auth tokens, cookie values, or message content appear in any log entry
- [ ] **7.6** Confirm the log does not exceed 50 entries (open many threads if needed to trigger the cap)

---

## Section 8: Two-Account Seen Verification (Core Blocking Test)

This is the most important test. It directly verifies whether read receipts are being suppressed.

**Setup:**
- Profile A: Chrome with QuietRead, Account A logged in
- Profile B: Separate Chrome profile (no QuietRead), Account B logged in
- Profile B has an open conversation with Account A in Messenger

**Test 8.1: Protection ON — Seen should NOT appear**

- [ ] **8.1.1** In Profile B (Account B), send a new message to Account A. Confirm the message shows no Seen indicator yet.
- [ ] **8.1.2** In Profile A (Account A, QuietRead ON), open the conversation thread with Account B. Read the message. Wait 10 seconds.
- [ ] **8.1.3** In Profile B, confirm that the Seen indicator does NOT appear on the sent message.
- [ ] **8.1.4** Wait an additional 30 seconds and confirm Seen still does not appear.
- [ ] **8.1.5** Record result: PASS / FAIL / PARTIAL (seen appeared after some delay)

**Test 8.2: Protection OFF — Seen SHOULD appear (control test)**

- [ ] **8.2.1** In Profile A, disable QuietRead protection (toggle off in popup).
- [ ] **8.2.2** In Profile B, send a new message to Account A.
- [ ] **8.2.3** In Profile A, open the conversation thread. Read the message. Wait 10 seconds.
- [ ] **8.2.4** In Profile B, confirm that the Seen indicator DOES appear on the sent message.
- [ ] **8.2.5** This verifies the test setup is working correctly. If Seen does not appear even with protection off, something is wrong with the test setup.
- [ ] **8.2.6** Re-enable protection in Profile A after this test.

**Test 8.3: Toggle mid-session**

- [ ] **8.3.1** Protection is ON in Profile A.
- [ ] **8.3.2** In Profile B, send a new message to Account A.
- [ ] **8.3.3** In Profile A, open the thread (Seen should not appear in Profile B yet — wait 10 seconds to confirm).
- [ ] **8.3.4** In Profile A, disable protection via the popup.
- [ ] **8.3.5** In Profile A, remain on the same thread for 15 seconds.
- [ ] **8.3.6** In Profile B, observe whether Seen appears after protection is turned off.
- [ ] **8.3.7** Record result: Seen appeared after toggle / Seen did not appear

**Test 8.4: Debug mode ON + protection ON**

- [ ] **8.4.1** Enable debug mode in options. Confirm protection is also on.
- [ ] **8.4.2** Repeat the 8.1 sequence (new message from B, open in A, wait, check Seen in B).
- [ ] **8.4.3** Confirm debug mode does not accidentally re-enable receipt signals (debug hook is observer-only, not a blocker bypass).
- [ ] **8.4.4** Check the diagnostics panel for any entries flagged as candidates.

---

## Section 9: Browser Restart Persistence

- [ ] **9.1** Set protection to ON. Close Chrome entirely (all windows).
- [ ] **9.2** Reopen Chrome and navigate to `messenger.com`.
- [ ] **9.3** Confirm the status pill shows "Protected" without needing to toggle anything.
- [ ] **9.4** Confirm the popup shows protection as ON.

---

## Section 10: Extension Update Simulation

- [ ] **10.1** Load a test build as an unpacked extension.
- [ ] **10.2** Set a non-default setting (e.g., disable status pill).
- [ ] **10.3** Load a new build (bump version in manifest.json, rebuild, reload the extension at `chrome://extensions`).
- [ ] **10.4** Confirm settings are preserved across the reload.
- [ ] **10.5** Confirm protection is applied correctly after the reload.

---

## Section 11: Site Detection

- [ ] **11.1** Navigate to `https://www.messenger.com/t/` — status pill is visible, popup shows protected
- [ ] **11.2** Navigate to `https://www.facebook.com/messages/` — status pill is visible, popup shows protected
- [ ] **11.3** Navigate to `https://www.facebook.com/` (not /messages) — status pill is NOT visible (content script does not inject on general Facebook pages)
- [ ] **11.4** Navigate to an unrelated site — no QuietRead UI is injected

---

## Section 12: Popup and Options UI Accessibility

- [ ] **12.1** Popup is navigable by keyboard (Tab, Enter, Space)
- [ ] **12.2** Options page is navigable by keyboard
- [ ] **12.3** No obvious visual regressions in popup or options page at 100%, 125%, 150% browser zoom

---

## Recording Results

For each test run, record:

- Date
- Chrome version
- Extension version / commit hash
- Result of Section 8 (two-account Seen test) — this is the most critical
- Any failures and steps to reproduce

File a bug report for any failures in Sections 7 or 8.
