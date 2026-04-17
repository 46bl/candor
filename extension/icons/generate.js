// generate.js — generate PNG icons from SVG for the Chrome extension
// Run with: bun generate.js  OR  node generate.js
// Requires: @resvg/resvg-js  →  bun add @resvg/resvg-js

import { readFileSync, writeFileSync } from 'fs'
import { Resvg } from '@resvg/resvg-js'

const svgSource = readFileSync('./icon.svg', 'utf-8')
const sizes = [16, 48, 128]

for (const size of sizes) {
  const resvg = new Resvg(svgSource, {
    fitTo: { mode: 'width', value: size },
  })
  const png = resvg.render().asPng()
  writeFileSync(`./icon${size}.png`, png)
  console.log(`✓ icon${size}.png`)
}

console.log('Icons generated. Load the extension in chrome://extensions.')
