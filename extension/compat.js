// compat.js — Cross-browser WebExtension API shim
//
// Firefox exposes `browser` (Promise-based) and also a `chrome` compatibility alias.
// Chrome/Edge expose only `chrome` (callback-based).
// We prefer `browser` when available — it gives real Promises and is the standard.
//
// This file must be loaded FIRST in every script context:
//   - content scripts: listed first in manifest content_scripts[].js
//   - popup: first <script> tag in popup.html
//   - service worker: importScripts('compat.js') at the top of background.js
//
// After this runs, all other scripts use `api.*` instead of `chrome.*`.

;(function (global) {
  global.api = (typeof global.browser !== 'undefined') ? global.browser : global.chrome
}(typeof globalThis !== 'undefined' ? globalThis : self))
