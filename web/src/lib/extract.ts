// extract.ts — parse product identity from a URL or free-text query
// Stateless. No caching. All data lives only in the current request.

export interface ProductInfo {
  name: string
  brand?: string
  asin?: string
  domain?: string
  url?: string
  isUrl: boolean
}

export async function extractProduct(input: string): Promise<ProductInfo> {
  const trimmed = input.trim()

  let url: URL | null = null
  try {
    // Normalize: prepend https:// if missing protocol
    const normalized = /^https?:\/\//i.test(trimmed)
      ? trimmed
      : `https://${trimmed}`
    url = new URL(normalized)
    // Reject if it looks like it was only nominally a URL
    if (!url.hostname.includes('.')) url = null
  } catch {
    url = null
  }

  if (!url) {
    return { name: trimmed, isUrl: false }
  }

  const hostname = url.hostname.replace(/^www\./, '')

  // ── Amazon ──────────────────────────────────────────────
  if (hostname.match(/^amazon\./)) {
    const asin = extractAmazonASIN(url.href)
    const name = await fetchAmazonTitle(url.href)
    return {
      name: name || 'Amazon Product',
      asin,
      domain: hostname,
      url: url.href,
      isUrl: true,
    }
  }

  // ── Etsy ────────────────────────────────────────────────
  if (hostname.includes('etsy.com')) {
    const h1 = await fetchPageH1(url.href)
    return {
      name: h1 || extractNameFromPath(url),
      domain: hostname,
      url: url.href,
      isUrl: true,
    }
  }

  // ── Generic: try schema.org Product name ──────────────
  const schemaName = await fetchSchemaProductName(url.href)
  return {
    name: schemaName || extractNameFromPath(url),
    domain: hostname,
    url: url.href,
    isUrl: true,
  }
}

// ── Helpers ──────────────────────────────────────────────

function extractAmazonASIN(href: string): string | undefined {
  const patterns = [
    /\/dp\/([A-Z0-9]{10})/,
    /\/gp\/product\/([A-Z0-9]{10})/,
    /\/ASIN\/([A-Z0-9]{10})/,
    /[?&]asin=([A-Z0-9]{10})/i,
  ]
  for (const re of patterns) {
    const m = href.match(re)
    if (m) return m[1]
  }
  return undefined
}

async function fetchAmazonTitle(href: string): Promise<string | null> {
  try {
    const res = await fetch(href, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept': 'text/html,application/xhtml+xml',
      },
      signal: AbortSignal.timeout(9000),
    })
    if (!res.ok) return null
    const html = await res.text()
    const m =
      html.match(/<span[^>]*id="productTitle"[^>]*>\s*([\s\S]*?)\s*<\/span>/) ||
      html.match(/<title>([^|]+)/i)
    return m ? m[1].replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim() : null
  } catch {
    return null
  }
}

async function fetchPageH1(href: string): Promise<string | null> {
  try {
    const res = await fetch(href, {
      headers: { 'User-Agent': 'Mozilla/5.0', 'Accept': 'text/html' },
      signal: AbortSignal.timeout(8000),
    })
    if (!res.ok) return null
    const html = await res.text()
    const m = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i)
    return m ? m[1].replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim() : null
  } catch {
    return null
  }
}

async function fetchSchemaProductName(href: string): Promise<string | null> {
  try {
    const res = await fetch(href, {
      headers: { 'User-Agent': 'Mozilla/5.0', 'Accept': 'text/html' },
      signal: AbortSignal.timeout(8000),
    })
    if (!res.ok) return null
    const html = await res.text()
    const scriptMatch = html.match(
      /<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi
    )
    if (!scriptMatch) return null
    for (const block of scriptMatch) {
      const content = block.replace(/<script[^>]*>|<\/script>/gi, '')
      try {
        const data = JSON.parse(content)
        const product = Array.isArray(data)
          ? data.find((d: { '@type'?: string }) => d['@type'] === 'Product')
          : data['@type'] === 'Product' ? data : null
        if (product?.name) return String(product.name).trim()
      } catch {
        continue
      }
    }
    return null
  } catch {
    return null
  }
}

function extractNameFromPath(url: URL): string {
  const segments = url.pathname.split('/').filter(Boolean)
  const last = segments[segments.length - 1] ?? ''
  const cleaned = last
    .replace(/\.\w+$/, '')     // strip extension
    .replace(/[-_]/g, ' ')     // slugs → spaces
    .replace(/\d{4,}/g, '')    // strip long numbers
    .trim()
  return cleaned || url.hostname.replace(/^www\./, '').split('.')[0]
}
