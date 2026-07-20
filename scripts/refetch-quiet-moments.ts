import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { fetchQuietMoments } from './ingest/xc1.ts'
import type { DataManifest } from '../src/types/tracker.ts'

const __dirname = dirname(fileURLToPath(import.meta.url))
const OUTPUT_DIR = join(__dirname, '../public/data')

async function main() {
  const items = await fetchQuietMoments('xc1-fc')
  if (items.length < 2) {
    throw new Error(`Quiet moments ingest looks broken (${items.length} entries)`)
  }
  if (items.some((i) => /Heart-to-Heart/i.test(i.name))) {
    throw new Error('Quiet moments still includes Heart-to-Heart pages')
  }

  const fcDir = join(OUTPUT_DIR, 'xc1-fc')
  mkdirSync(fcDir, { recursive: true })
  writeFileSync(
    join(fcDir, 'quiet-moments.json'),
    JSON.stringify(items, null, 2),
    'utf-8',
  )

  const manifestPath = join(OUTPUT_DIR, 'manifest.json')
  const manifest = JSON.parse(readFileSync(manifestPath, 'utf-8')) as DataManifest
  manifest.generatedAt = new Date().toISOString()
  if (manifest.games['xc1-fc']?.categories) {
    manifest.games['xc1-fc'].categories.quiet_moment = items.length
  }
  writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), 'utf-8')

  console.log(`Wrote ${items.length} quiet moments`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
