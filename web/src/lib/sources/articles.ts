// articles.ts — editorial web articles and review snippets
// Uses the shared search module (Serper > Brave > SerpAPI).
// Falls back to DuckDuckGo HTML scrape only as a last resort.

import { searchWeb } from './search.js'

export interface ArticleData {
  articles: Array<{
    title:   string
    snippet: string
    url:     string
  }>
}

export async function fetchArticles(productName: string): Promise<ArticleData | null> {
  // Try API-backed search first (reliable on any IP)
  const results = await searchWeb(`${productName} honest review`, 6)
  if (results.length) {
    return { articles: results }
  }

  // Last resort: DuckDuckGo HTML scrape (rate-limited on server IPs)
  return fetchViaDuckDuckGo(productName)
}

// ── DuckDuckGo HTML scrape (no-key last resort) ───────────────────────────────

async function fetchViaDuckDuckGo(productName: string): Promise<ArticleData | null> {
  const query = encodeURIComponent(`${productName} honest review`)
  const url   = `https://html.duckduckgo.com/html/?q=${query}`

  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent':      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Accept':          'text/html',
        'Accept-Language': 'en-US,en;q=0.9',
      },
      signal: AbortSignal.timeout(10_000),
    })
    if (!res.ok) return null
    const html = await res.text()

    const articles: ArticleData['articles'] = []
    const linkRe = /<a[^>]+class="result__a"[^>]+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi
    const snipRe = /<a[^>]+class="result__snippet"[^>]*>([\s\S]*?)<\/a>/gi

    const links: { url: string; title: string }[] = []
    let lm
    while ((lm = linkRe.exec(html)) !== null && links.length < 6) {
      const title = lm[2].replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim()
      const href  = lm[1]
      if (title && href && !href.includes('duckduckgo.com')) links.push({ url: href, title })
    }

    const snippets: string[] = []
    let sm
    while ((sm = snipRe.exec(html)) !== null && snippets.length < 6) {
      snippets.push(sm[1].replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim())
    }

    for (let i = 0; i < Math.min(links.length, 5); i++) {
      articles.push({ title: links[i].title, snippet: snippets[i] ?? '', url: links[i].url })
    }

    return articles.length ? { articles } : null
  } catch {
    return null
  }
}
