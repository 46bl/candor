// analyze.ts — core orchestrator
// Fetches all sources in parallel, calls AI, returns AnalysisResult.
// Nothing is stored. Everything is discarded when this function returns.

import { extractProduct } from './extract.js'
import { fetchAmazonReviews } from './sources/amazon.js'
import { fetchRedditMentions } from './sources/reddit.js'
import { fetchTrustpilot } from './sources/trustpilot.js'
import { fetchArticles } from './sources/articles.js'
import { getAIClient, type CustomAIOptions } from './ai/client.js'
import { buildAnalysisPrompt } from './ai/prompts.js'
import { getMockResult } from './ai/mock.js'

export interface AnalysisResult {
  product: string
  brand: string
  url?: string
  score: number
  verdict: string
  summary: string
  pros: string[]
  cons: string[]
  redFlags: string[]
  reviewQuality: 'reliable' | 'mixed' | 'suspicious' | 'insufficient'
  fakeReviewRisk: 'low' | 'medium' | 'high'
  sources: Array<{
    name: string
    url: string
    reviewCount: number
    sentiment: 'positive' | 'neutral' | 'negative' | 'mixed'
  }>
  processedAt: string
  privacyNote: string
}

export async function analyzeProduct(
  input: string,
  customAI?: CustomAIOptions
): Promise<AnalysisResult> {
  if (process.env.USE_MOCK === 'true') {
    return getMockResult(input)
  }

  // 1. Extract structured product info from URL or free text
  const product = await extractProduct(input)

  // 2. Fetch all sources in parallel — failures are isolated, not fatal
  const [amazonRes, redditRes, trustpilotRes, articlesRes] = await Promise.allSettled([
    fetchAmazonReviews(product.name, product.asin, product.url),
    fetchRedditMentions(product.name),
    fetchTrustpilot(product.brand ?? product.name, product.domain),
    fetchArticles(product.name),
  ])

  // 3. Build context string and source list from settled results
  const contextParts: string[] = []
  const sources: AnalysisResult['sources'] = []

  if (amazonRes.status === 'fulfilled' && amazonRes.value) {
    const d = amazonRes.value
    const sentiment = ratingToSentiment(d.avgRating)
    contextParts.push(
      `=== AMAZON REVIEWS ===\n` +
      `Average Rating: ${d.avgRating}/5\n` +
      `Total Ratings: ${d.reviewCount}\n` +
      `Suspicion Assessment: ${d.suspicionScore}\n` +
      (d.samples.length
        ? `Sample Reviews:\n${d.samples.map((s, i) => `[${i + 1}] ${s}`).join('\n')}`
        : 'No review text samples extracted.')
    )
    sources.push({
      name: 'Amazon',
      url: product.url ?? `https://amazon.com/dp/${product.asin ?? ''}`,
      reviewCount: d.reviewCount,
      sentiment,
    })
  }

  if (redditRes.status === 'fulfilled' && redditRes.value?.threads.length) {
    const d = redditRes.value
    const threadText = d.threads
      .map((t) => `r/${t.subreddit} [score:${t.score}]: "${t.title}"\n${t.topComment}`)
      .join('\n\n')
    contextParts.push(`=== REDDIT DISCUSSIONS ===\n${threadText}`)
    sources.push({
      name: 'Reddit',
      url: `https://www.reddit.com/search/?q=${encodeURIComponent(product.name)}`,
      reviewCount: d.threads.length,
      sentiment: 'mixed',
    })
  }

  if (trustpilotRes.status === 'fulfilled' && trustpilotRes.value) {
    const d = trustpilotRes.value
    contextParts.push(
      `=== TRUSTPILOT ===\n` +
      `TrustScore: ${d.trustScore}/5\n` +
      `Total Reviews: ${d.totalReviews}\n` +
      (d.samples.length
        ? `Sample Reviews:\n${d.samples.map((s, i) => `[${i + 1}] ${s}`).join('\n')}`
        : 'No review samples extracted.')
    )
    sources.push({
      name: 'Trustpilot',
      url: `https://www.trustpilot.com/review/${product.domain ?? product.name}`,
      reviewCount: d.totalReviews,
      sentiment: ratingToSentiment(d.trustScore),
    })
  }

  if (articlesRes.status === 'fulfilled' && articlesRes.value?.articles.length) {
    const d = articlesRes.value
    const articleText = d.articles
      .map((a, i) => `[${i + 1}] "${a.title}"\n${a.snippet}`)
      .join('\n\n')
    contextParts.push(`=== WEB ARTICLES & EDITORIAL REVIEWS ===\n${articleText}`)
    sources.push({
      name: 'Web Articles',
      url: `https://duckduckgo.com/?q=${encodeURIComponent(product.name + ' review')}`,
      reviewCount: d.articles.length,
      sentiment: 'mixed',
    })
  }

  // 4. No data available → return mock with insufficient verdict
  if (contextParts.length === 0) {
    const mock = getMockResult(product.name)
    return { ...mock, reviewQuality: 'insufficient', redFlags: [], score: 5.0,
      verdict: 'Insufficient public data to form a reliable verdict.', sources }
  }

  // 5. Build prompt and call AI (use custom provider if user supplied one)
  const prompt = buildAnalysisPrompt(product.name, contextParts.join('\n\n'))
  const aiClient = getAIClient(customAI)
  const raw = await aiClient.complete(prompt)

  // 6. Parse AI response — extract JSON blob even if wrapped in prose
  let parsed: Partial<AnalysisResult> = {}
  try {
    const jsonMatch = raw.match(/\{[\s\S]*\}/)
    if (jsonMatch) parsed = JSON.parse(jsonMatch[0])
  } catch {
    // If parsing fails, return mock rather than crashing the request
    return getMockResult(product.name)
  }

  // 7. Validate and clamp all fields
  return {
    product: String(parsed.product ?? product.name).slice(0, 200),
    brand:   String(parsed.brand   ?? 'Unknown').slice(0, 100),
    url:     product.url,
    score:   clamp(typeof parsed.score === 'number' ? parsed.score : 5.0, 0, 10),
    verdict: String(parsed.verdict ?? 'Analysis complete.').slice(0, 500),
    summary: String(parsed.summary ?? '').slice(0, 1000),
    pros:    toStringArray(parsed.pros).slice(0, 6),
    cons:    toStringArray(parsed.cons).slice(0, 6),
    redFlags: toStringArray(parsed.redFlags).slice(0, 4),
    reviewQuality: validateEnum(parsed.reviewQuality, ['reliable','mixed','suspicious','insufficient'], 'mixed'),
    fakeReviewRisk: validateEnum(parsed.fakeReviewRisk, ['low','medium','high'], 'low'),
    sources,
    processedAt: new Date().toISOString(),
    privacyNote: 'No data retained. Request discarded.',
  }
}

// ── Helpers ───────────────────────────────────────────────

function ratingToSentiment(rating: number): 'positive' | 'neutral' | 'negative' | 'mixed' {
  if (rating >= 4.0) return 'positive'
  if (rating >= 3.0) return 'mixed'
  if (rating >= 2.0) return 'negative'
  return 'mixed'
}

function clamp(v: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, v))
}

function toStringArray(v: unknown): string[] {
  if (!Array.isArray(v)) return []
  return v.map((i) => String(i)).filter(Boolean)
}

function validateEnum<T extends string>(
  v: unknown,
  options: T[],
  fallback: T
): T {
  return options.includes(v as T) ? (v as T) : fallback
}
