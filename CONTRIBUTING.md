# Contributing to CANDOR

Thanks for your interest. CANDOR is a small project — contributions are welcome
as long as they stay true to the core principles below.

## Core principles (non-negotiable)

Any contribution must preserve these:

- **No logging of user inputs.** Product queries, account numbers, and IP addresses
  must never be written to disk or sent to third parties.
- **No analytics.** No page-view tracking, no event reporting, no external scripts.
- **No silent mock fallbacks.** Failures must surface as real errors, not fake data.
- **Stateless analysis.** Review data fetched per-request must be discarded when
  the request completes. Nothing buffered, nothing cached server-side.

If a PR introduces any form of data retention or tracking, it will be closed.

## Getting started

```bash
git clone https://github.com/46bl/candor.git
cd candor/web
bun install
cp .env.example .env    # add a Groq or OpenAI key
USE_MOCK=true bun run dev   # no AI key needed for UI work
```

For extension work:
1. `cd extension/icons && bun install && bun generate.js`
2. Load `extension/` as an unpacked extension in Chrome or Firefox

## What's useful to contribute

- **Better source parsers** — the Amazon/Trustpilot/Reddit parsers break when
  sites update their HTML. Fixes here are always welcome.
- **New AI provider support** — adding support for more OpenAI-compatible endpoints
  in `web/src/lib/ai/client.ts`.
- **Additional review sources** — new scrapers in `web/src/lib/sources/` following
  the existing pattern (return `null` on failure, never throw).
- **UI improvements** — the frontend is plain HTML/CSS in `web/src/views/`.
  No framework, keep it that way.
- **Bug fixes** — open an issue first if the fix is non-trivial.

## What to avoid

- Adding npm dependencies without a strong reason — the web app has two: `hono`
  and `@anthropic-ai/sdk`. Keep it lean.
- React, Vue, or any frontend framework — the views are intentional string templates.
- Any form of client-side analytics or error reporting SDKs.
- Changes to the privacy model (data retention, logging, cookies without user opt-in).

## Pull request process

1. Fork the repo and create a branch from `master`.
2. Keep PRs focused — one thing per PR.
3. If you're adding a new source or AI provider, include a note on how you tested it.
4. PRs that break the mock mode (`USE_MOCK=true`) won't be merged.

## Reporting issues

Open a GitHub issue. Include:
- What you tried to do
- What actually happened (error message, logs from `journalctl -u candor`)
- Your AI provider and model
- Whether `USE_MOCK=true` works correctly

Do **not** include your account number or API keys in issues.
