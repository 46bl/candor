// amazon.ts — Amazon review data
// Strategy: try direct page fetch first (works in dev / behind residential proxy).
// On datacenter IPs Amazon blocks immediately, so fall back to search API snippets.

import { searchWeb } from './search.js'

export interface AmazonData {
  avgRating:      number
  reviewCount:    number
  samples:        string[]
  suspicionScore: string
}

export async function fetchAmazonReviews(
  productName: string,
  asin?: string,
  productUrl?: string
): Promise<AmazonData | null> {
  // 1. Try direct scrape
  const direct = await scrapeAmazon(productName, asin, productUrl)
  if (direct) return direct

  // 2. Fall back to search API snippets
  return fetchAmazonViaSearch(productName, asin)
}

// ── Direct scrape ─────────────────────────────────────────────────────────────

async function scrapeAmazon(
  productName: string,
  asin?: string,
  productUrl?: string
): Promise<AmazonData | null> {
  const url = productUrl
    ? ensureAmazonUrl(productUrl, asin)
    : asin
    ? `https://www.amazon.com/dp/${asin}`
    : null

  if (!url) return null

  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent':      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Accept':          'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept-Encoding': 'gzip, deflate, br',
        'Connection':      'keep-alive',
        'Cache-Control':   'no-cache',
        'Upgrade-Insecure-Requests': '1',
      },
      signal: AbortSignal.timeout(12_000),
    })

    if (!res.ok) return null
    const html = await res.text()

    if (
      html.includes('robot check') ||
      html.includes('captcha') ||
      html.includes('api-services-support@amazon.com') ||
      html.includes('Type the characters you see')
    ) return null

    const avgRating     = parseRating(html)
    const reviewCount   = parseReviewCount(html)
    const samples       = parseSamples(html)
    const suspicionScore = assessSuspicion(html, avgRating, reviewCount)

    // If we got nothing useful, treat as blocked
    if (avgRating === 0 && reviewCount === 0 && samples.length === 0) return null

    return { avgRating, reviewCount, samples, suspicionScore }
  } catch {
    return null
  }
}

// ── Search API fallback ───────────────────────────────────────────────────────

async function fetchAmazonViaSearch(
  productName: string,
  asin?: string
): Promise<AmazonData | null> {
  const query = asin
    ? `${productName} reviews site:amazon.com`
    : `"${productName}" amazon reviews rating`

  const results = await searchWeb(query, 5)
  if (!results.length) return null

  // Extract rating hints from snippets
  let avgRating   = 0
  let reviewCount = 0
  const samples: string[] = []

  for (const r of results) {
    const text = `${r.title} ${r.snippet}`

    if (!avgRating) {
      const m = text.match(/(\d+\.?\d*)\s*out of\s*5/i) || text.match(/(\d+\.?\d*)\s*stars?/i)
      if (m) {
        const v = parseFloat(m[1])
        if (v > 0 && v <= 5) avgRating = v
      }
    }

    if (!reviewCount) {
      const m = text.match(/([\d,]+)\s*(?:global\s+)?ratings?/i) ||
                text.match(/([\d,]+)\s*reviews?/i)
      if (m) reviewCount = parseInt(m[1].replace(/,/g, ''), 10)
    }

    if (r.snippet && r.snippet.length > 30) {
      samples.push(`[From web: ${r.title}] ${r.snippet}`.slice(0, 400))
    }
  }

  if (!samples.length) return null

  return {
    avgRating,
    reviewCount,
    samples,
    suspicionScore: avgRating >= 4.7 && reviewCount > 500
      ? 'Near-perfect aggregate rating with high volume — verify authenticity'
      : 'Based on web search snippets — direct review data unavailable',
  }
}

// ── Parsers ───────────────────────────────────────────────────────────────────

function parseRating(html: string): number {
  const patterns = [
    /(\d+\.?\d*)\s*out of\s*5\s*stars/i,
    /"ratingScore":\s*"?(\d+\.?\d*)"?/,
    /data-hook="rating-out-of-text"[^>]*>(\d+\.?\d*)/,
  ]
  for (const re of patterns) {
    const m = html.match(re)
    if (m) return parseFloat(m[1])
  }
  return 0
}

function parseReviewCount(html: string): number {
  const patterns = [
    /([\d,]+)\s+(?:global\s+)?ratings?/i,
    /"reviewCount":\s*(\d+)/,
    /data-hook="total-review-count"[^>]*>([\d,]+)/,
  ]
  for (const re of patterns) {
    const m = html.match(re)
    if (m) return parseInt(m[1].replace(/,/g, ''), 10)
  }
  return 0
}

function parseSamples(html: string): string[] {
  const reviews: string[] = []
  const re = /<span[^>]*data-hook="review-body"[^>]*>[\s\S]*?<span[^>]*>([\s\S]*?)<\/span>\s*<\/span>/gi
  let m
  while ((m = re.exec(html)) !== null && reviews.length < 6) {
    const text = m[1].replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim()
    if (text.length > 20) reviews.push(text.slice(0, 400))
  }
  return reviews
}

function assessSuspicion(html: string, avgRating: number, totalCount: number): string {
  const flags: string[] = []
  const fiveStar = html.match(/5 star[^%\d]*(\d+)%/i)
  if (fiveStar) {
    const pct = parseInt(fiveStar[1], 10)
    if (pct > 75 && totalCount > 200) flags.push(`${pct}% five-star rating (unusually high for volume)`)
  }
  if (avgRating >= 4.7 && totalCount > 500) {
    flags.push('Near-perfect aggregate rating with high review volume')
  }
  if (html.includes('Vine Customer Review of Free Product')) {
    flags.push('Product has Vine (complimentary) reviews — may skew positive')
  }
  return flags.length ? flags.join('; ') : 'No strong fake review signals detected'
}

function ensureAmazonUrl(url: string, asin?: string): string {
  try {
    const u = new URL(url)
    if (!u.pathname.includes('/dp/') && !u.pathname.includes('/gp/') && asin) {
      return `https://www.amazon.com/dp/${asin}`
    }
    return url
  } catch {
    return asin ? `https://www.amazon.com/dp/${asin}` : url
  }
}
