#!/usr/bin/env node
/**
 * Downloads Manrope and Spectral font files from Google Fonts and saves them
 * to public/fonts/. Also writes src/styles/fonts.css with @font-face rules.
 * Run once: node scripts/download-fonts.mjs
 */
import { mkdir, writeFile, rm } from 'node:fs/promises'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = fileURLToPath(new URL('.', import.meta.url))
const fontsDir = join(__dirname, '..', 'public', 'fonts')
const cssOut = join(__dirname, '..', 'src', 'styles', 'fonts.css')

// Clean and recreate fonts directory
await rm(fontsDir, { recursive: true, force: true })
await mkdir(fontsDir, { recursive: true })

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36'

const GOOGLE_FONTS_URL =
  'https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700;800&family=Spectral:ital,wght@0,400;0,600;0,700;1,400&display=swap'

console.log('Fetching font CSS from Google Fonts…')
const cssRes = await fetch(GOOGLE_FONTS_URL, { headers: { 'User-Agent': UA } })
if (!cssRes.ok) throw new Error(`Google Fonts API returned ${cssRes.status}`)
const googleCss = await cssRes.text()

// Extract all font-face blocks
const faceBlocks = [...googleCss.matchAll(/@font-face\s*\{[^}]+\}/g)].map((m) => m[0])

const localFaces = []
// url → local filename (each unique URL gets a unique file)
const urlToFile = new Map()
// base name → count (to make filenames unique per unicode subset)
const nameCount = new Map()

for (const block of faceBlocks) {
  const familyMatch = block.match(/font-family:\s*'([^']+)'/)
  const styleMatch = block.match(/font-style:\s*(\w+)/)
  const weightMatch = block.match(/font-weight:\s*([\d]+)/)
  const urlMatch = block.match(/url\(([^)]+)\)\s*format\('?woff2'?\)/)
  const unicodeMatch = block.match(/unicode-range:\s*([^;]+);/)

  if (!familyMatch || !urlMatch) continue

  const family = familyMatch[1]
  const style = styleMatch ? styleMatch[1] : 'normal'
  const weight = weightMatch ? weightMatch[1] : '400'
  const url = urlMatch[1].replace(/['"]/g, '')
  const unicode = unicodeMatch ? unicodeMatch[1].trim() : null

  const baseName = `${family.replace(/\s+/g, '-').toLowerCase()}-${weight}-${style}`

  if (!urlToFile.has(url)) {
    const idx = (nameCount.get(baseName) || 0) + 1
    nameCount.set(baseName, idx)
    const fileName = idx === 1 ? `${baseName}.woff2` : `${baseName}-${idx}.woff2`

    process.stdout.write(`  Downloading ${fileName} … `)
    const fontRes = await fetch(url)
    if (!fontRes.ok) { console.log(`SKIP (${fontRes.status})`); continue }
    const buf = Buffer.from(await fontRes.arrayBuffer())
    await writeFile(join(fontsDir, fileName), buf)
    urlToFile.set(url, fileName)
    console.log('done')
  }

  const localFile = urlToFile.get(url)
  if (!localFile) continue

  localFaces.push(
    [
      `@font-face {`,
      `  font-family: '${family}';`,
      `  font-style: ${style};`,
      `  font-weight: ${weight};`,
      `  font-display: swap;`,
      `  src: url('/fonts/${localFile}') format('woff2');`,
      unicode ? `  unicode-range: ${unicode};` : null,
      `}`
    ]
      .filter(Boolean)
      .join('\n')
  )
}

await writeFile(cssOut, localFaces.join('\n\n') + '\n')
console.log(`\nWrote ${localFaces.length} @font-face rules to src/styles/fonts.css`)
console.log('Remove the Google Fonts <link> from index.html and add: <link rel="stylesheet" href="/src/styles/fonts.css">')
