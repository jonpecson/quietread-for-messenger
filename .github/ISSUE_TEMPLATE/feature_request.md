---
name: Feature Request
about: Suggest an improvement or new feature for QuietRead for Messenger
title: "[FEATURE] "
labels: enhancement
assignees: ''
---

## Summary

<!-- A brief one-sentence description of what you are requesting. -->

## Problem or Motivation

<!--
What problem does this feature solve? Who is affected and how?
If this is related to a Seen receipt leaking through on a new endpoint,
describe which request you observed and how you verified it.
-->

## Proposed Solution

<!-- Describe the feature or change you would like to see. Be as specific as you can. -->

## Alternatives Considered

<!-- Have you considered any alternative approaches? Why is your proposed solution better for this use case? -->

## Is This a New Blocking Pattern?

<!-- If you are requesting a new read-receipt blocking pattern, please fill this section in. -->

- [ ] Yes, this is a new blocking pattern

**Observed URL path (no query parameters):**
<!-- e.g., /api/graphql (strip everything after the ?) -->

**HTTP method:** GET / POST / other

**Request type:** fetch / xhr / beacon / websocket / other

**Chrome version when observed:**

**Approximate date observed:**

**How was it verified?** (e.g., two-account test — Seen appeared despite existing rules; checked debug log and saw the request was not flagged)

## Privacy Considerations

<!--
Does the proposed feature involve observing, storing, or transmitting any new
categories of data? If so, describe what data and why it is necessary.

QuietRead's privacy commitments require that no message content, no auth tokens,
and no personal identifiers leave the device. Features that would violate these
commitments will not be accepted.
-->

## Additional Context

<!-- Any other context, links to related issues, or screenshots (without personal data) that might be helpful. -->

## Checklist

- [ ] I searched existing issues and this has not been requested before
- [ ] This feature aligns with the project's goals (privacy-first, local-only, no servers)
- [ ] If this involves a new blocking pattern, I have provided a sanitized URL path (no query parameters)
- [ ] I have not included any personal account information, session tokens, or message content in this request
