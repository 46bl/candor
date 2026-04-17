# CANDOR

**Know before you buy. No strings attached.**

Privacy-first, self-hostable review aggregator. Pulls from Amazon, Reddit,
Trustpilot, and the web. Analyzes with AI. Keeps nothing.

> **Note on scraping:** Datacenter IPs are blocked by Amazon, Trustpilot, and
> DuckDuckGo. For production use you'll need a search API key (Serper, Brave,
> or SerpAPI) — see [Configuration](#configuration). Local development with
> `USE_MOCK=true` works without any keys.

---

## Features

- **Multi-source aggregation** — Amazon reviews, Reddit discussions, Trustpilot
  scores, and editorial articles, fetched in parallel
- **AI analysis** — works with any OpenAI-compatible endpoint: Groq, OpenAI,
  Anthropic, Ollama, LM Studio, or any custom endpoint
- **Mullvad-style accounts** — random 16-digit number, no email, SHA-256 hashed
  server-side. Only the hash is stored.
- **Browser extension** — Chrome, Edge, Brave, and Firefox (128+). Injects a
  badge on product pages; popup for quick analysis.
- **Zero data retention** — review data, AI prompts, and responses are discarded
  when each request completes. No search history. No IP logging.
- **Self-hostable** — single Bun process, SQLite database, nginx reverse proxy.
  Runs on any VPS.

---

## Quick start (local)

```bash
git clone https://github.com/46bl/candor.git
cd candor/web
bun install
cp .env.example .env

# No API keys needed — mock mode returns realistic fake data
USE_MOCK=true bun run dev
# → http://localhost:3000
```

---

## Configuration

All configuration is in `web/.env`. Copy `web/.env.example` to get started.

### AI provider

CANDOR works with any provider. Groq with `llama-3.1-8b-instant` is recommended
— it's fast and has a generous free tier.

```env
# Groq (recommended — get a free key at console.groq.com)
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

# Local — Ollama (ollama serve && ollama pull llama3.2)
AI_PROVIDER=ollama
OLLAMA_MODEL=llama3.2

# Local — LM Studio
AI_PROVIDER=lmstudio
```

### Search API (required in production)

Direct scraping is blocked on datacenter IPs. Add one of these:

| Provider | Free tier | Paid |
|---|---|---|
| [Serper.dev](https://serper.dev) | 2,500 searches | $50 / 50k |
| [Brave Search](https://brave.com/search/api/) | 2,000 / month | ~$3 / 1k |
| [SerpAPI](https://serpapi.com) | 100 / month | $50 / 5k |

```env
SERPER_API_KEY=your_key   # or BRAVE_API_KEY or SERPAPI_KEY
```

Without a search key, sources fall back to direct scraping — which works in
development on residential IPs but fails silently on VPS/cloud hosts.

### Accounts and subscriptions

The account system is optional. By default, a free account allows 5 checks/day.
You can disable the limit or remove the account requirement entirely by editing
`web/src/lib/account.ts`.

Stripe integration is stubbed. Without `STRIPE_SECRET_KEY`, the `/upgrade` page
auto-upgrades accounts in development mode for testing.

---

## Self-hosting (Ubuntu 24.04 + nginx + Cloudflare)

```bash
# 1. Clone to your server
git clone https://github.com/46bl/candor.git /opt/candor

# 2. Before running setup, create your Cloudflare Origin Certificate:
#    Cloudflare dashboard → SSL/TLS → Origin Server → Create Certificate
#    Save cert → /etc/ssl/candor/origin.pem
#    Save key  → /etc/ssl/candor/origin.key
#    Set SSL mode to "Full (strict)"

# 3. Run the setup script
sudo bash /opt/candor/setup.sh

# 4. Add your API keys
sudo nano /etc/candor.env

# 5. Start
sudo systemctl restart candor
sudo journalctl -u candor -f
```

The setup script:
- Installs Bun system-wide
- Creates a `candor` system user
- Writes a hardened systemd service
- Configures nginx with Cloudflare real-IP headers
- Locks HTTP/HTTPS to Cloudflare IP ranges via ufw

**Not using Cloudflare?** Edit `setup.sh` — replace the Cloudflare Origin
Certificate block with certbot: `certbot --nginx -d yourdomain.com`.

---

## Browser extension

### Development

```bash
# Generate icons from source SVG first
cd extension/icons
bun install && bun generate.js

# Point extension at local server (default)
# extension/config.js → API_URL: 'http://localhost:3000'
```

Load in Chrome: `chrome://extensions` → Developer mode → Load unpacked → select `extension/`  
Load in Firefox: `about:debugging` → Load Temporary Add-on → select `extension/manifest.json`

### Packaging for distribution

```bash
# Chrome Web Store
cd extension
zip -r candor-chrome.zip . --exclude "*.DS_Store" --exclude "__MACOSX/*"

# Firefox AMO (also zip the source for Mozilla review)
zip -r candor-firefox.zip . --exclude "*.DS_Store"
cd .. && zip -r candor-source.zip . --exclude "*/node_modules/*" --exclude "*/.git/*"
```

Before packaging for your own deployment, update `extension/config.js` with your
server URL and `extension/manifest.json` with your domain in `host_permissions`
and your own `browser_specific_settings.gecko.id`.

---

## Architecture

```
candor/
├── web/                        Bun + Hono server
│   ├── src/
│   │   ├── index.ts            Entry point, security headers
│   │   ├── routes/             Page routes (HTML)
│   │   │   ├── analyze.ts      GET+POST /analyze (cookie handling)
│   │   │   ├── account.ts      /account/* — account management
│   │   │   ├── upgrade.ts      /upgrade  — Stripe stub
│   │   │   ├── privacy.ts      /privacy
│   │   │   └── terms.ts        /terms
│   │   ├── api/
│   │   │   └── analyze.ts      POST /api/analyze (JSON endpoint)
│   │   ├── lib/
│   │   │   ├── analyze.ts      Orchestrator — parallel fetch + AI
│   │   │   ├── extract.ts      URL / product name parser
│   │   │   ├── account.ts      Account number logic + auth
│   │   │   ├── db.ts           SQLite (bun:sqlite)
│   │   │   ├── ratelimit.ts    In-memory IP rate limiting
│   │   │   ├── ai/
│   │   │   │   ├── client.ts   Unified AI client (all providers)
│   │   │   │   ├── prompts.ts  Analysis prompt
│   │   │   │   └── mock.ts     Deterministic mock for development
│   │   │   └── sources/
│   │   │       ├── search.ts   Unified search (Serper/Brave/SerpAPI)
│   │   │       ├── amazon.ts   Amazon — direct scrape → search fallback
│   │   │       ├── reddit.ts   Reddit JSON API → search fallback
│   │   │       ├── trustpilot.ts Trustpilot — direct scrape → search fallback
│   │   │       └── articles.ts Web articles via search API
│   │   └── views/              HTML template functions (no framework)
│   ├── public/style.css        Monochrome CSS
│   └── .env.example
│
├── extension/                  Chrome + Firefox MV3
│   ├── manifest.json
│   ├── compat.js               chrome/browser namespace shim
│   ├── config.js               API URL — change for your deployment
│   ├── background.js           Service worker
│   ├── content.js              Badge injector
│   ├── popup.html/js/css       Extension popup
│   └── icons/                  SVG source + PNG generator
│
├── setup.sh                    Production setup (Ubuntu 24.04 + Cloudflare)
├── LICENSE                     MIT
└── CONTRIBUTING.md
```

---

## API

```
POST /api/analyze
Content-Type: application/json

{
  "input": "https://amazon.com/dp/B08N5LNQCX",
  "accountNumber": "1234-5678-9012-3456",
  "customAI": {
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

Full response schema: `web/src/lib/analyze.ts` → `AnalysisResult`.

---

## Privacy model

- No cookies unless user explicitly opts in (account convenience cookie)
- No IP addresses stored — used only as in-memory rate-limit key for account
  creation, never written to disk, cleared on restart
- No search history — only a daily check counter is stored per account
- No analytics, no third-party scripts
- Custom API keys sent over HTTPS, used in-memory per request, immediately discarded
- `Cache-Control: no-store` on all `/api/*` responses

Full policy at `/privacy` on any running instance.

---

## Support

CANDOR is free and open source. If it's useful to you, consider buying me a coffee:

[![ko-fi](https://ko-fi.com/img/githubbutton_sm.svg)](https://ko-fi.com/46blz)

---

## License

MIT — see [LICENSE](LICENSE).
