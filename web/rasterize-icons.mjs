// One-off: rasterize public/icon.svg into PWA/touch icon PNGs via system Chrome.
import { chromium } from 'playwright'
import { readFileSync } from 'node:fs'

const svg = readFileSync('public/icon.svg', 'utf8')
const browser = await chromium.launch({ channel: 'chrome', headless: true })

for (const size of [512, 192, 180]) {
  const page = await browser.newPage({ viewport: { width: size, height: size } })
  await page.setContent(
    `<!doctype html><html><body style="margin:0">${svg.replace('<svg ', `<svg width="${size}" height="${size}" `)}</body></html>`,
  )
  const name = size === 180 ? 'public/apple-touch-icon.png' : `public/icon-${size}.png`
  await page.screenshot({ path: name, omitBackground: true })
  console.log('✓', name)
  await page.close()
}
await browser.close()
