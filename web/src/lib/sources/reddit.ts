// reddit.ts — fetch Reddit discussions about a product
// Uses the public JSON API — no API key required for read-only search.
// Stateless. No caching. Data discarded after use.

export interface RedditData {
  threads: Array<{
    title: string
    score: number
    topComment: string
    url: string
    subreddit: string
  }>
}

export async function fetchRedditMentions(productName: string): Promise<RedditData | null> {
  // Search for threads mentioning the product with "review" context
  const query = encodeURIComponent(`"${productName}"`)
  const searchUrl = `https://www.reddit.com/search.json?q=${query}&sort=top&t=year&limit=15&type=link`

  try {
    const res = await fetch(searchUrl, {
      headers: {
        // Reddit requires a descriptive User-Agent
        'User-Agent': 'Candor/1.0 privacy-first-review-aggregator',
        'Accept': 'application/json',
      },
      signal: AbortSignal.timeout(10_000),
    })

    if (!res.ok) return null

    const data = (await res.json()) as {
      data?: {
        children?: Array<{
          data: {
            title: string
            score: number
            selftext?: string
            permalink: string
            subreddit: string
            url: string
            num_comments: number
          }
        }>
      }
    }

    const posts = data.data?.children ?? []

    const threads = posts
      .filter((p) => p.data.score > 1 && p.data.title)
      .slice(0, 10)
      .map((p) => ({
        title: p.data.title,
        score: p.data.score,
        topComment: p.data.selftext
          ? p.data.selftext.slice(0, 500).replace(/\n+/g, ' ').trim()
          : `(Link post — ${p.data.num_comments} comments)`,
        url: `https://www.reddit.com${p.data.permalink}`,
        subreddit: p.data.subreddit,
      }))

    if (!threads.length) return null
    return { threads }
  } catch {
    return null
  }
}
