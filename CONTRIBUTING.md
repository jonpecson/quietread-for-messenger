# Contributing to QuietRead for Messenger

Thank you for your interest in contributing. This is an early-stage, experimental project and all help is appreciated — especially contributions that improve the reliability of read-receipt blocking patterns.

---

## Ways to Contribute

### 1. Report New Read-Receipt Endpoints

The most impactful contribution right now is discovering read-receipt endpoints that the current blocking rules miss.

**How to research:**

1. Enable debug mode in the QuietRead options page.
2. Open Messenger in Chrome with two browser profiles (or two separate accounts) side by side.
3. Open a conversation thread in the QuietRead-protected profile.
4. Watch the debug log in the options page for any candidate requests that were *observed but not blocked*.
5. On the second profile, check whether the "Seen" indicator appears.
6. If it does, the request that caused it is a new candidate pattern.

See [docs/research-read-receipts.md](docs/research-read-receipts.md) for a detailed walkthrough and [docs/testing-checklist.md](docs/testing-checklist.md) for the full verification procedure.

Please open an issue with:
- The sanitized URL path (no query parameters, no tokens) — the debug log strips these automatically
- The HTTP method
- Whether it appeared as a `fetch` or `xhr` request
- Chrome version and date of observation (Facebook deploys frequently)

### 2. Submit Bug Reports

Use the [bug report template](.github/ISSUE_TEMPLATE/bug_report.md) on GitHub Issues. Attach a sanitized debug log export if available. Never paste raw network logs that might contain auth tokens or personal data.

### 3. Submit Code Contributions

Pull requests are welcome for:
- New or updated DNR blocking rules
- Bug fixes in the content script, popup, or options page
- Improvements to the test suite
- Documentation fixes

### 4. Improve Documentation

If something in the docs is unclear, inaccurate, or missing, a PR or issue is very welcome.

---

## Ground Rules

- Be respectful and constructive. This project exists to help people in difficult situations.
- Do not include anyone's real Facebook credentials, session tokens, or personal data in issues, PRs, or discussions.
- Do not use this project's infrastructure as a platform to discuss or perform activities that violate Facebook's Terms of Service beyond the narrow use case of suppressing your own read receipts.

---

## Development Setup

```bash
git clone https://github.com/YOUR_ORG/quietread-for-messenger.git
cd quietread-for-messenger
npm install
npm run dev        # watch mode
npm test           # run unit tests
npm run typecheck  # TypeScript check
npm run lint       # ESLint
```

Load `dist/` as an unpacked extension via `chrome://extensions` (Developer mode on).

---

## Code Style

- TypeScript strict mode is enabled — all files must type-check cleanly (`npm run typecheck`).
- ESLint is configured for TypeScript and React. Run `npm run lint` before submitting.
- No external runtime dependencies may be added without a discussion in an issue first. The extension must remain dependency-free at runtime.
- Privacy commitments must be maintained: no new network calls, no external domains, no token or body capture.

---

## Submitting a Pull Request

1. Fork the repository.
2. Create a feature branch: `git checkout -b feat/my-improvement`.
3. Make your changes and ensure `npm run build`, `npm test`, and `npm run typecheck` all pass.
4. Write a clear commit message describing what and why (not how).
5. Open a pull request against `main` with a description of what the PR changes and why.
6. Link any relevant issues.

Do **not** include `Co-Authored-By: Claude` or similar AI attribution lines in commit messages.

---

## Adding or Updating Blocking Rules

When adding a new DNR rule pattern:

1. Add the rule object to the `CANDIDATE_RULES` array in `src/background/dnr-rules.ts`, using the next available `DNR_RULE_ID_START + N` id.
2. If the pattern is also appropriate as a static rule, add it to `rules/static-rules.json` with the next sequential id (static rule ids are separate from dynamic rule ids).
3. Document the new pattern in a comment explaining what endpoint it targets and how it was discovered.
4. Add a test in `src/tests/rule-manager.test.ts` if applicable.
5. Update the blocking patterns table in [docs/architecture.md](docs/architecture.md) and the README.

**Never include actual endpoint responses, GraphQL operation bodies, or access tokens in source code or documentation.**

---

## Commit Message Format

Use the imperative mood and be concise:

```
fix: block mark_seen variant observed on 2026-05-12
feat: add thread_read_state pattern to static ruleset
docs: clarify debug mode workflow in research guide
test: add site-detection tests for facebook.com/messages variants
```

---

## License

By contributing, you agree that your contributions will be licensed under the MIT License.
