// ratelimit.ts — in-memory rate limiting for account creation
//
// ── Privacy guarantee ─────────────────────────────────────────────────────────
// IP addresses are used ONLY as an in-memory Map key.
// They are NEVER written to disk, NEVER logged, NEVER linked to an account record.
// On server restart, all state is lost.
// When a window expires, the entry is deleted from memory.
// This satisfies the privacy-first model while preventing mass account creation.
//
// ── What this limits ─────────────────────────────────────────────────────────
// Account CREATION only — not analysis requests.
// Analysis requests are rate-limited by account hash (SQLite counter), not IP.

interface RateLimitEntry {
  count: number
  resetAt: number // Unix ms
}

// In-memory only — never serialized, never persisted
const creationWindows = new Map<string, RateLimitEntry>()
const analyzeWindows  = new Map<string, RateLimitEntry>()

// Clean up expired entries every 30 minutes to prevent memory growth
setInterval(() => {
  const now = Date.now()
  for (const [key, val] of creationWindows) {
    if (now > val.resetAt) creationWindows.delete(key)
  }
  for (const [key, val] of analyzeWindows) {
    if (now > val.resetAt) analyzeWindows.delete(key)
  }
}, 30 * 60 * 1000)

// ── Account creation limiter ──────────────────────────────────────────────────
// Default: max 5 new accounts per IP per 24 hours
// Rationale: legitimate users rarely need more than 1 or 2 free accounts.
// Bulk account farming requires thousands — this stops it cold.

const CREATION_LIMIT  = 5
const CREATION_WINDOW = 24 * 60 * 60 * 1000 // 24h in ms

export function checkAccountCreationLimit(ip: string): { allowed: boolean; remaining: number } {
  return checkLimit(creationWindows, ip, CREATION_LIMIT, CREATION_WINDOW)
}

// ── Anonymous (no-account) analyze limiter ────────────────────────────────────
// Not currently used (all requests require an account number) but available
// if you want to add a limited anonymous mode later.

const ANON_LIMIT  = 3
const ANON_WINDOW = 60 * 60 * 1000 // 1h

export function checkAnonAnalyzeLimit(ip: string): { allowed: boolean; remaining: number } {
  return checkLimit(analyzeWindows, ip, ANON_LIMIT, ANON_WINDOW)
}

// ── Core ──────────────────────────────────────────────────────────────────────

function checkLimit(
  store: Map<string, RateLimitEntry>,
  key: string,
  limit: number,
  windowMs: number
): { allowed: boolean; remaining: number } {
  const now = Date.now()
  const entry = store.get(key)

  if (!entry || now > entry.resetAt) {
    // First request in this window
    store.set(key, { count: 1, resetAt: now + windowMs })
    return { allowed: true, remaining: limit - 1 }
  }

  if (entry.count >= limit) {
    return { allowed: false, remaining: 0 }
  }

  entry.count++
  return { allowed: true, remaining: limit - entry.count }
}

// ── IP extraction helper ──────────────────────────────────────────────────────
// Extracts the real IP, respecting common proxy headers.
// The IP is used in-memory only — never passed to any logging function.

export function extractIP(req: Request): string {
  // Respect proxy headers (set by reverse proxy / Cloudflare / Nginx)
  const cfIP = req.headers.get('CF-Connecting-IP')       // Cloudflare
  const fwdIP = req.headers.get('X-Forwarded-For')       // Standard proxy
  const realIP = req.headers.get('X-Real-IP')            // Nginx

  if (cfIP) return cfIP.trim()
  if (fwdIP) return fwdIP.split(',')[0].trim()
  if (realIP) return realIP.trim()

  // Fallback — Bun doesn't expose raw socket IP in standard Request API
  // When behind a reverse proxy (recommended for production), the headers above will be set
  return 'unknown'
}
