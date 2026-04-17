// reddit.ts — Reddit discussions about a product
// Strategy: try public JSON API first, fall back to search API.

import { searchWeb } from './search.js'

export interface RedditData {
  threads: Array<{
    title:      string
    score:      number
    topComment: string
    url:        string
    subreddit:  string
  }>
}

export async function fetchRedditMentions(productName: string): Promise<RedditData | null> {
  // 1. Try the public Reddit JSON API
  const direct = await fetchViaRedditAPI(productName)
  if (direct) return direct

  // 2. Fall back to search API
  return fetchRedditViaSearch(productName)
}

// ── Reddit JSON API ───────────────────────────────────────────────────────────

async function fetchViaRedditAPI(productName: string): Promise<RedditData | null> {
  const query = encodeURIComponent(`"${productName}"`)
  const url   = `https://www.reddit.com/search.json?q=${query}&sort=top&t=year&limit=15&type=link`

  try {
    const res = await fetch(url, {
      headers: {
        // Reddit requires a non-generic User-Agent
        'User-Agent': 'web:xyz.c4ndor.app:1.0.0 (privacy-first review aggregator)',
        'Accept':     'application/json',
      },
      signal: AbortSignal.timeout(10_000),
    })

    if (!res.ok) return null

    const data = (await res.json()) as {
      data?: {
        children?: Array<{
          data: {
            title:        string
            score:        number
            selftext?:    string
            permalink:    string
            subreddit:    string
            url:          string
            num_comments: number
          }
        }>
      }
    }

    const posts   = data.data?.children ?? []
    const threads = posts
      .filter((p) => p.data.score > 1 && p.data.title)
      .slice(0, 10)
      .map((p) => ({
        title:      p.data.title,
        score:      p.data.score,
        topComment: p.data.selftext
          ? p.data.selftext.slice(0, 500).replace(/\n+/g, ' ').trim()
          : `(Link post — ${p.data.num_comments} comments)`,
        url:        `https://www.reddit.com${p.data.permalink}`,
        subreddit:  p.data.subreddit,
      }))

    return threads.length ? { threads } : null
  } catch {
    return null
  }
}

// ── Search API fallback ───────────────────────────────────────────────────────

async function fetchRedditViaSearch(productName: string): Promise<RedditData | null> {
  const results = await searchWeb(`"${productName}" site:reddit.com`, 6)
  if (!results.length) return null

  const threads = results
    .filter((r) => r.url.includes('reddit.com'))
    .map((r) => {
      const subredditMatch = r.url.match(/reddit\.com\/r\/([^/]+)/)
      return {
        title:      r.title,
        score:      0,
        topComment: r.snippet,
        url:        r.url,
        subreddit:  subredditMatch?.[1] ?? 'reddit',
      }
    })

  return threads.length ? { threads } : null
}
