---
name: Bug Report
about: Report a bug or unexpected behavior in QuietRead for Messenger
title: "[BUG] "
labels: bug
assignees: ''
---

## Bug Description

<!-- A clear and concise description of what the bug is. -->

## Steps to Reproduce

1.
2.
3.

## Expected Behavior

<!-- What did you expect to happen? -->

## Actual Behavior

<!-- What actually happened? -->

## Two-Account Seen Test Result

<!-- If this bug is about Seen receipts leaking through, please fill this in. -->

- Protection was: ON / OFF
- Seen indicator appeared in the sender's view: YES / NO / NOT TESTED
- Time between opening the thread and Seen appearing (if applicable):

## Debug Log

<!--
If you have debug mode enabled, paste the relevant entries from the Diagnostics panel
in the options page below.

IMPORTANT: The debug log automatically strips query parameters from URLs.
Please do NOT paste raw network logs from DevTools that include full URLs
with query strings — these may contain session tokens or personal identifiers.

Paste only the sanitized output from the QuietRead Diagnostics panel.
-->

<details>
<summary>Debug log entries (sanitized)</summary>

```
(paste here)
```

</details>

## Environment

- **Chrome version:** (e.g., 125.0.6422.112)
- **Extension version:** (visible at chrome://extensions)
- **Operating system:** (e.g., macOS 15.4, Windows 11, Ubuntu 24.04)
- **Messenger URL:** messenger.com / facebook.com/messages / both

## Extension Load Method

- [ ] Installed from release ZIP (unpacked)
- [ ] Built from source

## Additional Context

<!-- Any other information that might be relevant. Screenshots of the Messenger UI
(not containing private conversations) are welcome. -->

## Checklist

- [ ] I searched existing issues and this has not been reported before
- [ ] I confirmed the bug is reproducible (it happens more than once)
- [ ] My debug log (if attached) does not contain session tokens, full URLs with query parameters, or message content
- [ ] I have not included any personal account information in this report
