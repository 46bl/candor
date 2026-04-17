// trustpilot.ts — scrape Trustpilot for company-level trust signals
// Stateless. No caching. Data discarded after use.

export interface TrustpilotData {
  trustScore: number
  totalReviews: number
  samples: string[]
}

export async function fetchTrustpilot(
  brandName: string,
  domain?: string
): Promise<TrustpilotData | null> {
  // Prefer domain slug (e.g. "amazon.com"), fall back to normalized brand name
  const slug = domain
    ? domain.replace(/^www\./, '')
    : brandName.toLowerCase().replace(/[^a-z0-9.-]/g, '')

  const url = `https://www.trustpilot.com/review/${slug}`

  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml',
        'Accept-Language': 'en-US,en;q=0.9',
      },
      signal: AbortSignal.timeout(10_000),
    })

    if (!res.ok) return null
    const html = await res.text()

    const trustScore  = parseTrustScore(html)
    const totalReviews = parseTotalReviews(html)
    const samples     = parseSamples(html)

    if (trustScore === 0 && totalReviews === 0) return null

    return { trustScore, totalReviews, samples }
  } catch {
    return null
  }
}

// ── Parsers ───────────────────────────────────────────────

function parseTrustScore(html: string): number {
  const patterns = [
    /"trustScore":\s*"?(\d+\.?\d*)"?/,
    /TrustScore\s+(\d+\.?\d*)/,
    /"ratingValue":\s*"?(\d+\.?\d*)"?/,
    /class="[^"]*star-rating[^"]*"[^>]*>.*?(\d+\.?\d*)\s*\/\s*5/is,
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
    /"numberOfRatings":\s*(\d+)/,
  ]
  for (const re of patterns) {
    const m = html.match(re)
    if (m) return parseInt(m[1].replace(/,/g, ''), 10)
  }
  return 0
}

function parseSamples(html: string): string[] {
  const samples: string[] = []
  // Trustpilot embeds review text in JSON-LD and in data attributes
  const patterns = [
    /"text":\s*"([^"]{30,500})"/g,
    /"description":\s*"([^"]{30,500})"/g,
    /data-service-review-text-typography[^>]*>\s*([\s\S]{30,400}?)\s*<\//g,
  ]
  for (const re of patterns) {
    let m
    while ((m = re.exec(html)) !== null && samples.length < 6) {
      const text = m[1]
        .replace(/\\n/g, ' ')
        .replace(/\\"/g, '"')
        .replace(/\s+/g, ' ')
        .trim()
      if (text.length > 30 && !samples.includes(text)) {
        samples.push(text.slice(0, 400))
      }
    }
    if (samples.length >= 4) break
  }
  return samples
}
