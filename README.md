# CANDOR

**Know before you buy. No strings attached.**

Privacy-first review aggregator. Pulls from Amazon, Reddit, Trustpilot, and web articles.
Analyzes with AI. Keeps nothing.

---

## Web App

### Setup

```bash
cd web
bun install
cp .env.example .env   # configure your AI provider (see below)
bun run dev            # → http://localhost:3000
```

### AI Providers

```bash
# Groq — fast, cheap, recommended for production (default)
# Get a free key at https://console.groq.com
AI_PROVIDER=openai
OPENAI_API_KEY=gsk_...
OPENAI_BASE_URL=https://api.groq.com/openai/v1
OPENAI_MODEL=llama-3.1-8b-instant

# OpenAI
AI_PROVIDER=openai
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-4o-mini

# Anthropic
AI_PROVIDER=anthropic
ANTHROPIC_API_KEY=sk-ant-...
ANTHROPIC_MODEL=claude-haiku-4-5-20251001

# Ollama — local, no API key needed
# Prerequisites: ollama serve && ollama pull llama3.2
AI_PROVIDER=ollama
OLLAMA_MODEL=llama3.2

# LM Studio — local, no API key needed
# Prerequisites: start LM Studio server on port 1234
AI_PROVIDER=lmstudio

# Mock mode — deterministic fake data, no AI calls at all
USE_MOCK=true bun run dev
```

### Production

```bash
# Set NODE_ENV=production so the account cookie is flagged Secure (HTTPS only)
NODE_ENV=production bun run start
```

---

## Browser Extension

The extension works in **Chrome, Edge, Brave, and Firefox** (128+).

### Prerequisites — Generate Icons

The extension requires PNG icons before it can be loaded. Generate them from the source SVG:

```bash
cd extension/icons
bun install          # installs @resvg/resvg-js locally
bun generate.js      # outputs icon16.png, icon48.png, icon128.png
```

If you don't have Bun, any SVG-to-PNG tool works. The source file is `icon.svg`.
Required sizes: **16×16**, **48×48**, **128×128**.

### Loading in Chrome / Edge / Brave (development)

1. Open `chrome://extensions` (or `edge://extensions`)
2. Enable **Developer mode** (toggle, top-right)
3. Click **Load unpacked**
4. Select the `extension/` folder
5. Visit any Amazon product page — the `[ C ] CANDOR` badge appears bottom-right

### Loading in Firefox (development)

1. Open `about:debugging#/runtime/this-firefox`
2. Click **Load Temporary Add-on...**
3. Navigate to the `extension/` folder and select `manifest.json`
4. Visit any Amazon product page — the badge appears

> **Note:** Temporary add-ons in Firefox are removed on browser restart. For persistent installs, sign and distribute via [addons.mozilla.org](https://addons.mozilla.org/developers/).

### Configuring the API URL

By default the extension talks to `http://localhost:3000` (local dev).
To point it at your production server, edit `extension/config.js`:

```js
var CANDOR_CONFIG = {
  API_URL: 'https://candor.app'   // ← change this
}
```

---

## Packaging for Distribution

### Chrome Web Store

```bash
cd extension

# Remove any dev artifacts, then zip the entire folder
# Do NOT include node_modules, .DS_Store, or source maps
zip -r candor-chrome.zip . \
  --exclude "*.DS_Store" \
  --exclude "__MACOSX/*" \
  --exclude "*.map"
```

Upload `candor-chrome.zip` at [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole).

Required before submitting:
- All three icon sizes generated (16, 48, 128 px PNG)
- `config.js` pointing to production URL
- Privacy policy URL filled in the store listing (point to `/privacy`)

### Firefox Add-ons (AMO)

Firefox requires the source code to be submitted alongside the packaged extension
so Mozilla reviewers can verify it. Package both:

```bash
cd extension

# 1. Extension package (what users install)
zip -r candor-firefox.zip . \
  --exclude "*.DS_Store" \
  --exclude "__MACOSX/*"

# 2. Source package (for Mozilla review — zip the entire repo root)
cd ..
zip -r candor-source.zip . \
  --exclude "*/node_modules/*" \
  --exclude "*/.git/*" \
  --exclude "*.DS_Store"
```

Submit at [Firefox Add-on Developer Hub](https://addons.mozilla.org/developers/).
Upload `candor-firefox.zip` as the add-on, and `candor-source.zip` when prompted for source code.

The `browser_specific_settings.gecko.id` in `manifest.json` (`candor@candor.app`)
must match the add-on ID you register with Mozilla.

---

## Architecture

```
/candor
├── web/                        Bun + Hono server
│   ├── src/
│   │   ├── index.ts            Server entry, security headers
│   │   ├── routes/             Page routes (HTML responses)
│   │   │   ├── index.ts        GET /
│   │   │   ├── analyze.ts      GET+POST /analyze (cookie handling)
│   │   │   ├── account.ts      GET /account/new, /account, POST /account/status
│   │   │   ├── upgrade.ts      GET+POST /upgrade
│   │   │   ├── privacy.ts      GET /privacy
│   │   │   └── terms.ts        GET /terms
│   │   ├── api/
│   │   │   └── analyze.ts      POST /api/analyze (JSON), GET /api/health
│   │   ├── lib/
│   │   │   ├── analyze.ts      Orchestrator (parallel fetch + AI)
│   │   │   ├── extract.ts      URL/product name parser
│   │   │   ├── account.ts      Account number logic, auth, rate limits
│   │   │   ├── db.ts           SQLite (bun:sqlite) — accounts + subscriptions
│   │   │   ├── ratelimit.ts    In-memory IP rate limiting (account creation)
│   │   │   ├── ai/
│   │   │   │   ├── client.ts   Unified AI client (all providers)
│   │   │   │   ├── prompts.ts  Analysis prompt templates
│   │   │   │   └── mock.ts     Deterministic mock for development
│   │   │   └── sources/
│   │   │       ├── amazon.ts   Amazon review scraper + fake review heuristics
│   │   │       ├── reddit.ts   Reddit JSON API
│   │   │       ├── trustpilot.ts Trustpilot scraper
│   │   │       └── articles.ts Web article search (Brave → SerpAPI → DDG)
│   │   └── views/              HTML template functions
│   ├── public/style.css        Global monochrome CSS
│   └── .env.example            All environment variables documented
│
└── extension/                  Chrome + Firefox MV3 extension
    ├── manifest.json           MV3 manifest (includes Firefox gecko settings)
    ├── compat.js               Browser API shim (chrome ↔ browser namespace)
    ├── config.js               API URL configuration
    ├── background.js           Service worker — relays API calls
    ├── content.js              Product page detector + badge injector
    ├── popup.html              Extension popup shell
    ├── popup.js                Popup logic, settings, result rendering
    ├── popup.css               Popup styles
    └── icons/
        ├── icon.svg            Source icon (edit this)
        ├── generate.js         PNG generator script
        ├── icon16.png          Generated
        ├── icon48.png          Generated
        └── icon128.png         Generated
```

---

## API Reference

```
POST /api/analyze
Content-Type: application/json

{
  "input": "https://amazon.com/dp/B08N5LNQCX",   ← URL or product name
  "accountNumber": "1234-5678-9012-3456",
  "customAI": {                                    ← optional
    "provider": "openai",
    "model": "gpt-4o-mini",
    "apiKey": "sk-...",
    "baseUrl": "https://api.openai.com/v1"
  }
}
```

```
GET /api/health
→ { "status": "ok", "privacy": "no-data-stored" }
```

Full response schema: see `web/src/lib/analyze.ts` → `AnalysisResult`.

---

## Privacy

- **No request logging** — zero logging middleware in the server
- **No analytics** — no third-party scripts anywhere
- **No cookies** unless the user explicitly opts in (account number convenience cookie — SameSite=Strict, never HttpOnly, clearable at any time)
- **No IP storage** — IPs used only as in-memory rate-limit keys for account creation, never written to disk, purged on server restart
- **No search history** — we record that you made *N* checks today, not what you checked
- **Cache-Control: no-store** on all `/api/*` responses
- **Custom API keys** — transmitted over HTTPS, used in-memory per-request, immediately discarded

Full policy: `/privacy`

---

## Monetization

- **Free** — 5 checks/day, account number required, web only
- **Pro** — $7/month or $55/year — unlimited checks + extension
- **Founding Supporter** — $89 one-time, first 200 only — unlimited forever
- Revenue source: subscriptions only. Never data. Never ads.
