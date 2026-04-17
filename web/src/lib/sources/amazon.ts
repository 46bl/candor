// amazon.ts — scrape Amazon product page for review data
// Stateless HTTP fetch. No caching. Data discarded after use.
// Note: Amazon aggressively blocks scrapers. In production, consider
// using a residential proxy or the Product Advertising API instead.

export interface AmazonData {
  avgRating: number
  reviewCount: number
  samples: string[]
  suspicionScore: string // human-readable heuristic summary
}

export async function fetchAmazonReviews(
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
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept-Encoding': 'gzip, deflate, br',
        'Connection': 'keep-alive',
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache',
        'Upgrade-Insecure-Requests': '1',
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
      },
      signal: AbortSignal.timeout(12_000),
    })

    if (!res.ok) return null
    const html = await res.text()

    // Amazon CAPTCHA / bot detection
    if (html.includes('robot check') || html.includes('captcha') || html.includes('api-services-support@amazon.com')) {
      return null
    }

    const avgRating  = parseRating(html)
    const reviewCount = parseReviewCount(html)
    const samples    = parseSamples(html)
    const suspicionScore = assessSuspicion(html, avgRating, reviewCount)

    return { avgRating, reviewCount, samples, suspicionScore }
  } catch {
    return null
  }
}

// ── Parsers ───────────────────────────────────────────────

function parseRating(html: string): number {
  const patterns = [
    /(\d+\.?\d*)\s*out of\s*5\s*stars/i,
    /"ratingScore":\s*"?(\d+\.?\d*)"?/,
    /data-hook="rating-out-of-text"[^>]*>(\d+\.?\d*)/,
    /averageCustomerRatings.*?(\d+\.?\d*)/,
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
  // Target the review text spans rendered in the product page
  const re =
    /<span[^>]*data-hook="review-body"[^>]*>[\s\S]*?<span[^>]*>([\s\S]*?)<\/span>\s*<\/span>/gi
  let m
  while ((m = re.exec(html)) !== null && reviews.length < 6) {
    const text = m[1].replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim()
    if (text.length > 20) reviews.push(text.slice(0, 400))
  }
  return reviews
}

function assessSuspicion(html: string, avgRating: number, totalCount: number): string {
  const flags: string[] = []

  // High five-star percentage
  const fiveStar = html.match(/5 star[^%\d]*(\d+)%/i) || html.match(/"fiveStarPercentage":\s*"?(\d+)"?/)
  if (fiveStar) {
    const pct = parseInt(fiveStar[1], 10)
    if (pct > 75 && totalCount > 200) {
      flags.push(`${pct}% five-star rating (unusually high for volume product)`)
    }
  }

  // Near-perfect aggregate rating with many reviews
  if (avgRating >= 4.7 && totalCount > 500) {
    flags.push('Near-perfect aggregate rating with high review volume — statistically rare for genuine consumer products')
  }

  // Vine reviews mentioned
  if (html.includes('Vine Customer Review of Free Product')) {
    flags.push('Product has Vine (complimentary) reviews — may skew positive')
  }

  return flags.length
    ? flags.join('; ')
    : 'No strong fake review signals detected from Amazon data'
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
