// mock.ts — deterministic mock responses for development/testing
// USE_MOCK=true → no AI API calls, no network requests to sources
// Used for local dev without API keys, or integration tests

import type { AnalysisResult } from '../analyze.js'

export function getMockResult(productName: string): AnalysisResult {
  return {
    product: productName || 'Sample Product',
    brand: 'ExampleBrand',
    score: 6.8,
    verdict:
      'Decent mid-range option with recurring battery and customer service issues that affect long-term reliability.',
    summary:
      'This product offers solid performance at its price point, but persistent reports of battery degradation within 6 months and slow customer service responses are concerning. Reddit users frequently suggest comparable alternatives with better long-term reliability records.',
    pros: [
      'Good build quality out of the box',
      'Easy setup and intuitive controls',
      'Competitive price for the feature set',
      'Comfortable for extended use sessions',
    ],
    cons: [
      'Battery life degrades noticeably within 6 months',
      'Bluetooth connectivity drops reported on multiple device types',
      'Customer service response times reported as 2–3 weeks',
      'Ear cushion material wears faster than expected',
    ],
    redFlags: [
      '22% of Amazon reviews appear incentivized (verified purchase rate below category average)',
      'Multiple reports of failure shortly after the 1-year warranty expires',
    ],
    reviewQuality: 'mixed',
    fakeReviewRisk: 'medium',
    sources: [
      {
        name: 'Amazon',
        url: 'https://amazon.com',
        reviewCount: 1847,
        sentiment: 'mixed',
      },
      {
        name: 'Reddit',
        url: 'https://reddit.com',
        reviewCount: 14,
        sentiment: 'negative',
      },
      {
        name: 'Trustpilot',
        url: 'https://trustpilot.com',
        reviewCount: 203,
        sentiment: 'mixed',
      },
      {
        name: 'Web Articles',
        url: 'https://duckduckgo.com',
        reviewCount: 4,
        sentiment: 'mixed',
      },
    ],
    processedAt: new Date().toISOString(),
    privacyNote: 'No data retained. Request discarded.',
  }
}
