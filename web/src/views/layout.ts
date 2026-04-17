// Base HTML layout — no analytics, no tracking scripts, zero cookies set

export function layout(title: string, body: string, opts?: { noindex?: boolean }): string {
  const year = new Date().getFullYear()
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta name="referrer" content="no-referrer">
${opts?.noindex ? '<meta name="robots" content="noindex, nofollow">' : '<meta name="robots" content="index, follow">'}
<title>${escHtml(title)} — CANDOR</title>
<meta name="description" content="Know before you buy. Honest review aggregation from Amazon, Reddit, Trustpilot, and the web. No tracking, no cookies, no data storage.">
<link rel="stylesheet" href="/public/style.css">
<!-- No analytics. No tracking pixels. No third-party scripts. That is the product. -->
</head>
<body>
<nav class="nav">
  <a href="/" class="nav-logo">[ C ]&nbsp;&nbsp;CANDOR</a>
  <a href="/analyze" class="nav-link">Check a Product</a>
</nav>
<main>${body}</main>
<footer class="footer">
  <span>&copy; ${year} CANDOR</span>
  <span>No cookies &middot; No tracking &middot; No data stored</span>
</footer>
</body>
</html>`
}

export function escHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}
