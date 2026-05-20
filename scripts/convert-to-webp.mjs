#!/usr/bin/env node
/**
 * Converts all PNGs in public/assets/media/pictures/ to WebP at 80% quality.
 * Deletes the originals after conversion.
 * Run once: node scripts/convert-to-webp.mjs
 */
import sharp from 'sharp'
import { readdir, unlink } from 'node:fs/promises'
import { join, basename, extname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = fileURLToPath(new URL('.', import.meta.url))
const picturesDir = join(__dirname, '..', 'public', 'assets', 'media', 'pictures')

const files = await readdir(picturesDir)
const pngs = files.filter((f) => extname(f).toLowerCase() === '.png')

if (pngs.length === 0) {
  console.log('No PNGs found — already converted or directory empty.')
  process.exit(0)
}

for (const file of pngs) {
  const src = join(picturesDir, file)
  const dest = join(picturesDir, `${basename(file, '.png')}.webp`)
  await sharp(src).webp({ quality: 80 }).toFile(dest)
  await unlink(src)
  console.log(`  ✓ ${file} → ${basename(dest)}`)
}

console.log(`\nDone. Converted ${pngs.length} PNG(s) to WebP.`)
