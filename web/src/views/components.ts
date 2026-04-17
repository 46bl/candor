import { escHtml } from './layout.js'
import type { AnalysisResult } from '../lib/analyze.js'

export function scoreBar(score: number): string {
  const pct = Math.min(100, Math.max(0, (score / 10) * 100))
  return `<div class="score-row">
  <div>
    <div class="score-num">${score.toFixed(1)}</div>
    <div class="score-denom">/ 10</div>
  </div>
  <div class="score-bar-wrap">
    <div class="score-bar-fill" style="width:${pct.toFixed(1)}%"></div>
  </div>
</div>`
}

export function bulletList(items: string[], cls: 'pros' | 'cons' | 'flags'): string {
  if (!items.length) return '<p style="font-size:13px;color:var(--c-hint)">None reported.</p>'
  return `<ul class="result-list ${cls}">${items.map(i => `<li>${escHtml(i)}</li>`).join('')}</ul>`
}

export function qualityBadges(r: AnalysisResult): string {
  const qMap: Record<string, string> = {
    reliable:     'Reviews: Reliable',
    mixed:        'Reviews: Mixed',
    suspicious:   'Reviews: Suspicious',
    insufficient: 'Reviews: Insufficient',
  }
  const fMap: Record<string, string> = {
    low:    'Fake Risk: Low',
    medium: 'Fake Risk: Medium',
    high:   'Fake Risk: High',
  }
  const qWarn = r.reviewQuality === 'suspicious'
  const fWarn = r.fakeReviewRisk === 'high' || r.fakeReviewRisk === 'medium'

  return `<div class="badge-row">
  <span class="badge${qWarn ? ' warn' : ''}">${escHtml(qMap[r.reviewQuality] ?? r.reviewQuality)}</span>
  <span class="badge${fWarn ? ' warn' : ''}">${escHtml(fMap[r.fakeReviewRisk] ?? r.fakeReviewRisk)}</span>
</div>`
}

export function sourcesBlock(sources: AnalysisResult['sources']): string {
  if (!sources.length) return ''
  const rows = sources.map(s => `<div class="source-row">
  <span class="source-name">${escHtml(s.name)}</span>
  <span class="source-count">${s.reviewCount} points</span>
  <span class="source-sentiment">${escHtml(s.sentiment)}</span>
</div>`).join('')
  return `<div class="result-card" style="padding:var(--sp-md)">
  <div class="result-section-label">Sources checked</div>
  <div class="sources-list">${rows}</div>
</div>`
}

export function renderResult(r: AnalysisResult): string {
  const hasFlags = r.redFlags.length > 0

  return `<div class="results">

  <div class="result-card${hasFlags ? ' flagged' : ''}">
    <div class="result-product">${escHtml(r.product)}</div>
    <div class="result-brand">${escHtml(r.brand)}</div>
    ${scoreBar(r.score)}
    <div class="verdict">${escHtml(r.verdict)}</div>
    ${qualityBadges(r)}
  </div>

  ${r.summary ? `<div class="result-card">
    <div class="result-section-label">Summary</div>
    <p style="font-size:14px;line-height:1.7;color:var(--c-muted)">${escHtml(r.summary)}</p>
  </div>` : ''}

  ${r.pros.length ? `<div class="result-card">
    <div class="result-section-label">What people like</div>
    ${bulletList(r.pros, 'pros')}
  </div>` : ''}

  ${r.cons.length ? `<div class="result-card">
    <div class="result-section-label">Common complaints</div>
    ${bulletList(r.cons, 'cons')}
  </div>` : ''}

  ${hasFlags ? `<div class="result-card flagged">
    <div class="result-section-label">&#9888; Red flags</div>
    ${bulletList(r.redFlags, 'flags')}
  </div>` : ''}

  ${sourcesBlock(r.sources)}

  <div class="privacy-note">
    ${escHtml(r.privacyNote)}<br>
    Analysis completed at request time. Nothing was stored.
  </div>

</div>`
}
