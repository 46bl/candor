// content.js — product page detector + floating badge injector
// Injected on supported product pages (see manifest.json matches).
// No data is collected, stored, or transmitted from this script.
// The badge is purely cosmetic — it signals that CANDOR can analyze this page.
// compat.js is loaded first (see manifest), so `api` is available here.

'use strict';

(function () {
  // Run only once per page
  if (document.getElementById('candor-badge')) return

  const product = detectProduct()
  if (!product) return

  injectBadge(product)
})()

// ── Product detection ─────────────────────────────────────────────────────────

function detectProduct() {
  const href = window.location.href
  const host = window.location.hostname

  // Amazon
  if (host.includes('amazon.')) {
    if (!href.match(/\/dp\/[A-Z0-9]{10}/) && !href.match(/\/gp\/product\/[A-Z0-9]{10}/)) {
      return null // Not a product page
    }
    const titleEl = document.getElementById('productTitle')
    const name = titleEl ? titleEl.textContent.trim() : 'Amazon Product'
    return { name: name.slice(0, 150), url: href }
  }

  // Etsy listings
  if (host.includes('etsy.com') && href.includes('/listing/')) {
    const h1 = document.querySelector('h1')
    return h1 ? { name: h1.textContent.trim().slice(0, 150), url: href } : null
  }

  // Best Buy
  if (host.includes('bestbuy.com') && href.includes('/site/')) {
    const h1 = document.querySelector('h1.sku-title')
    return h1 ? { name: h1.textContent.trim().slice(0, 150), url: href } : null
  }

  // Walmart
  if (host.includes('walmart.com') && href.includes('/ip/')) {
    const h1 = document.querySelector('h1[itemprop="name"]') || document.querySelector('h1')
    return h1 ? { name: h1.textContent.trim().slice(0, 150), url: href } : null
  }

  // Generic: schema.org Product markup
  const schemas = document.querySelectorAll('script[type="application/ld+json"]')
  for (const el of schemas) {
    try {
      const data = JSON.parse(el.textContent || '{}')
      const arr = Array.isArray(data) ? data : [data]
      const product = arr.find((d) => d['@type'] === 'Product')
      if (product?.name) {
        return { name: String(product.name).slice(0, 150), url: href }
      }
    } catch {
      continue
    }
  }

  return null
}

// ── Badge ─────────────────────────────────────────────────────────────────────

function injectBadge(product) {
  const badge = document.createElement('div')
  badge.id = 'candor-badge'
  badge.setAttribute('role', 'button')
  badge.setAttribute('tabindex', '0')
  badge.setAttribute('aria-label', `Check "${product.name}" with CANDOR`)
  badge.textContent = '[ C ] CANDOR'

  Object.assign(badge.style, {
    position:     'fixed',
    bottom:       '20px',
    right:        '20px',
    zIndex:       '2147483647',
    background:   '#0A0A0A',
    color:        '#FFFFFF',
    fontFamily:   '"JetBrains Mono", "Courier New", monospace',
    fontSize:     '11px',
    fontWeight:   '700',
    letterSpacing:'0.06em',
    padding:      '8px 14px',
    cursor:       'pointer',
    userSelect:   'none',
    boxShadow:    '0 2px 12px rgba(0,0,0,0.35)',
    border:       '1px solid #2E2E2E',
    transition:   'opacity 0.15s',
    lineHeight:   '1',
  })

  // Click: open CANDOR web app with URL pre-filled
  badge.addEventListener('click', () => {
    const apiUrl = (typeof CANDOR_CONFIG !== 'undefined' && CANDOR_CONFIG.API_URL)
      ? CANDOR_CONFIG.API_URL
      : 'http://localhost:3000'
    const analyzeUrl = `${apiUrl}/analyze?q=${encodeURIComponent(product.url)}`
    window.open(analyzeUrl, '_blank', 'noopener,noreferrer')
  })

  badge.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') badge.click()
  })

  badge.addEventListener('mouseenter', () => { badge.style.opacity = '0.8' })
  badge.addEventListener('mouseleave', () => { badge.style.opacity = '1' })

  document.body.appendChild(badge)

  // Signal to background: product info is available (for popup to pick up)
  // We store only the URL and name in session storage — cleared when tab closes
  try {
    api.runtime.sendMessage({ type: 'PAGE_PRODUCT', product })
  } catch {
    // Extension context may be invalidated on navigation — safe to ignore
  }
}
