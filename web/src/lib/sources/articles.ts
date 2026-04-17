// articles.ts — fetch editorial web articles about a product
// Priority: Brave Search API → SerpAPI → DuckDuckGo HTML fallback
// Stateless. No caching. Data discarded after use.

export interface ArticleData {
  articles: Array<{
    title: string
    snippet: string
    url: string
  }>
}

export async function fetchArticles(productName: string): Promise<ArticleData | null> {
  if (process.env.BRAVE_API_KEY) {
    const result = await fetchViaBrave(productName)
    if (result) return result
  }

  if (process.env.SERPAPI_KEY) {
    const result = await fetchViaSerpAPI(productName)
    if (result) return result
  }

  return fetchViaDuckDuckGo(productName)
}

// ── Brave Search API ──────────────────────────────────────

async function fetchViaBrave(productName: string): Promise<ArticleData | null> {
  const query = encodeURIComponent(`${productName} honest review`)
  const url = `https://api.search.brave.com/res/v1/web/search?q=${query}&count=6&freshness=py`

  try {
    const res = await fetch(url, {
      headers: {
        Accept: 'application/json',
        'Accept-Encoding': 'gzip',
        'X-Subscription-Token': process.env.BRAVE_API_KEY!,
      },
      signal: AbortSignal.timeout(8_000),
    })
    if (!res.ok) return null
    const data = (await res.json()) as {
      web?: { results?: Array<{ title: string; description?: string; url: string }> }
    }
    const results = data.web?.results ?? []
    if (!results.length) return null
    return {
      articles: results.slice(0, 5).map((r) => ({
        title: r.title,
        snippet: r.description ?? '',
        url: r.url,
      })),
    }
  } catch {
    return null
  }
}

// ── SerpAPI ───────────────────────────────────────────────

async function fetchViaSerpAPI(productName: string): Promise<ArticleData | null> {
  const query = encodeURIComponent(`${productName} review`)
  const url = `https://serpapi.com/search.json?q=${query}&api_key=${process.env.SERPAPI_KEY}&num=6&hl=en`

  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(8_000) })
    if (!res.ok) return null
    const data = (await res.json()) as {
      organic_results?: Array<{ title: string; snippet?: string; link: string }>
    }
    const results = data.organic_results ?? []
    if (!results.length) return null
    return {
      articles: results.slice(0, 5).map((r) => ({
        title: r.title,
        snippet: r.snippet ?? '',
        url: r.link,
      })),
    }
  } catch {
    return null
  }
}

// ── DuckDuckGo HTML scrape (no-key fallback) ──────────────
// DuckDuckGo rate-limits heavily. In production, prefer Brave or SerpAPI.

async function fetchViaDuckDuckGo(productName: string): Promise<ArticleData | null> {
  const query = encodeURIComponent(`${productName} honest review`)
  const url = `https://html.duckduckgo.com/html/?q=${query}`

  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Accept': 'text/html',
        'Accept-Language': 'en-US,en;q=0.9',
      },
      signal: AbortSignal.timeout(10_000),
    })
    if (!res.ok) return null
    const html = await res.text()

    // DDG HTML result structure: .result__a for title/url, .result__snippet for excerpt
    const articles: ArticleData['articles'] = []

    // Extract result links + snippets via regex (no DOM parser in Bun edge context)
    const linkRe = /<a[^>]+class="result__a"[^>]+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi
    const snipRe = /<a[^>]+class="result__snippet"[^>]*>([\s\S]*?)<\/a>/gi

    const links: { url: string; title: string }[] = []
    let lm
    while ((lm = linkRe.exec(html)) !== null && links.length < 6) {
      const title = lm[2].replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim()
      const href = lm[1]
      if (title && href && !href.includes('duckduckgo.com')) {
        links.push({ url: href, title })
      }
    }

    const snippets: string[] = []
    let sm
    while ((sm = snipRe.exec(html)) !== null && snippets.length < 6) {
      snippets.push(sm[1].replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim())
    }

    for (let i = 0; i < Math.min(links.length, 5); i++) {
      articles.push({
        title: links[i].title,
        snippet: snippets[i] ?? '',
        url: links[i].url,
      })
    }

    return articles.length ? { articles } : null
  } catch {
    return null
  }
}
