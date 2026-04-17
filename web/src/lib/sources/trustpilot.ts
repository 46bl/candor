// trustpilot.ts — Trustpilot company trust signals
// Strategy: try direct scrape first, fall back to search API snippets.

import { searchWeb } from './search.js'

export interface TrustpilotData {
  trustScore:   number
  totalReviews: number
  samples:      string[]
}

export async function fetchTrustpilot(
  brandName: string,
  domain?: string
): Promise<TrustpilotData | null> {
  // 1. Try direct scrape
  const direct = await scrapeTrustpilot(brandName, domain)
  if (direct) return direct

  // 2. Fall back to search API
  return fetchTrustpilotViaSearch(brandName, domain)
}

// ── Direct scrape ─────────────────────────────────────────────────────────────

async function scrapeTrustpilot(
  brandName: string,
  domain?: string
): Promise<TrustpilotData | null> {
  const slug = domain
    ? domain.replace(/^www\./, '')
    : brandName.toLowerCase().replace(/[^a-z0-9.-]/g, '')

  try {
    const res = await fetch(`https://www.trustpilot.com/review/${slug}`, {
      headers: {
        'User-Agent':      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Accept':          'text/html,application/xhtml+xml',
        'Accept-Language': 'en-US,en;q=0.9',
      },
      signal: AbortSignal.timeout(10_000),
    })

    if (!res.ok) return null
    const html = await res.text()

    const trustScore    = parseTrustScore(html)
    const totalReviews  = parseTotalReviews(html)
    const samples       = parseSamples(html)

    if (trustScore === 0 && totalReviews === 0) return null
    return { trustScore, totalReviews, samples }
  } catch {
    return null
  }
}

// ── Search API fallback ───────────────────────────────────────────────────────

async function fetchTrustpilotViaSearch(
  brandName: string,
  domain?: string
): Promise<TrustpilotData | null> {
  const target = domain ?? brandName
  const results = await searchWeb(`${target} site:trustpilot.com reviews`, 4)
  if (!results.length) return null

  let trustScore   = 0
  let totalReviews = 0
  const samples: string[] = []

  for (const r of results) {
    const text = `${r.title} ${r.snippet}`

    if (!trustScore) {
      const m = text.match(/(\d+\.?\d*)\s*(?:out of\s*5|\/\s*5|\s*TrustScore)/i) ||
                text.match(/rated\s+(\d+\.?\d*)/i)
      if (m) {
        const v = parseFloat(m[1])
        if (v > 0 && v <= 5) trustScore = v
      }
    }

    if (!totalReviews) {
      const m = text.match(/([\d,]+)\s*reviews?/i)
      if (m) totalReviews = parseInt(m[1].replace(/,/g, ''), 10)
    }

    if (r.snippet.length > 30) {
      samples.push(`[From web: ${r.title}] ${r.snippet}`.slice(0, 400))
    }
  }

  if (!samples.length) return null
  return { trustScore, totalReviews, samples }
}

// ── Parsers ───────────────────────────────────────────────────────────────────

function parseTrustScore(html: string): number {
  const patterns = [
    /"trustScore":\s*"?(\d+\.?\d*)"?/,
    /TrustScore\s+(\d+\.?\d*)/,
    /"ratingValue":\s*"?(\d+\.?\d*)"?/,
  ]
  for (const re of patterns) {
    const m = html.match(re)
    if (m) {
      const val = parseFloat(m[1])
      if (val > 0 && val <= 5) return val
    }
  }
  return 0
}

function parseTotalReviews(html: string): number {
  const patterns = [
    /"reviewCount":\s*(\d+)/,
    /([\d,]+)\s+(?:total\s+)?(?:reviews?|ratings?)/i,
  ]
  for (const re of patterns) {
    const m = html.match(re)
    if (m) return parseInt(m[1].replace(/,/g, ''), 10)
  }
  return 0
}

function parseSamples(html: string): string[] {
  const samples: string[] = []
  const patterns = [
    /"text":\s*"([^"]{30,500})"/g,
    /"description":\s*"([^"]{30,500})"/g,
  ]
  for (const re of patterns) {
    let m
    while ((m = re.exec(html)) !== null && samples.length < 6) {
      const text = m[1].replace(/\\n/g, ' ').replace(/\\"/g, '"').replace(/\s+/g, ' ').trim()
      if (text.length > 30 && !samples.includes(text)) samples.push(text.slice(0, 400))
    }
    if (samples.length >= 4) break
  }
  return samples
}
