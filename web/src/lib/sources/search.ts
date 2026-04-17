// search.ts — unified web search client
// Priority: Serper.dev → Brave Search API → SerpAPI
// Used as the reliable backbone for all source fetching when direct
// scraping is unavailable (which it always is on datacenter IPs).

export interface SearchResult {
  title:   string
  snippet: string
  url:     string
}

// ── Unified entry point ───────────────────────────────────────────────────────

export async function searchWeb(query: string, count = 6): Promise<SearchResult[]> {
  if (process.env.SERPER_API_KEY) {
    const r = await searchViaSerper(query, count)
    if (r.length) return r
  }
  if (process.env.BRAVE_API_KEY) {
    const r = await searchViaBrave(query, count)
    if (r.length) return r
  }
  if (process.env.SERPAPI_KEY) {
    const r = await searchViaSerpAPI(query, count)
    if (r.length) return r
  }
  return []
}

export function hasSearchKey(): boolean {
  return !!(process.env.SERPER_API_KEY || process.env.BRAVE_API_KEY || process.env.SERPAPI_KEY)
}

// ── Serper.dev ────────────────────────────────────────────────────────────────
// POST https://google.serper.dev/search
// Docs: https://serper.dev

async function searchViaSerper(query: string, count: number): Promise<SearchResult[]> {
  try {
    const res = await fetch('https://google.serper.dev/search', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-KEY': process.env.SERPER_API_KEY!,
      },
      body: JSON.stringify({ q: query, num: count }),
      signal: AbortSignal.timeout(8_000),
    })
    if (!res.ok) return []
    const data = (await res.json()) as {
      organic?: Array<{ title: string; snippet?: string; link: string }>
      answerBox?: { answer?: string; title?: string }
    }
    return (data.organic ?? []).slice(0, count).map((r) => ({
      title:   r.title,
      snippet: r.snippet ?? '',
      url:     r.link,
    }))
  } catch {
    return []
  }
}

// ── Brave Search API ──────────────────────────────────────────────────────────

async function searchViaBrave(query: string, count: number): Promise<SearchResult[]> {
  try {
    const url = `https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(query)}&count=${count}`
    const res = await fetch(url, {
      headers: {
        'Accept': 'application/json',
        'Accept-Encoding': 'gzip',
        'X-Subscription-Token': process.env.BRAVE_API_KEY!,
      },
      signal: AbortSignal.timeout(8_000),
    })
    if (!res.ok) return []
    const data = (await res.json()) as {
      web?: { results?: Array<{ title: string; description?: string; url: string }> }
    }
    return (data.web?.results ?? []).slice(0, count).map((r) => ({
      title:   r.title,
      snippet: r.description ?? '',
      url:     r.url,
    }))
  } catch {
    return []
  }
}

// ── SerpAPI ───────────────────────────────────────────────────────────────────

async function searchViaSerpAPI(query: string, count: number): Promise<SearchResult[]> {
  try {
    const url = `https://serpapi.com/search.json?q=${encodeURIComponent(query)}&api_key=${process.env.SERPAPI_KEY}&num=${count}&hl=en`
    const res = await fetch(url, { signal: AbortSignal.timeout(8_000) })
    if (!res.ok) return []
    const data = (await res.json()) as {
      organic_results?: Array<{ title: string; snippet?: string; link: string }>
    }
    return (data.organic_results ?? []).slice(0, count).map((r) => ({
      title:   r.title,
      snippet: r.snippet ?? '',
      url:     r.link,
    }))
  } catch {
    return []
  }
}
