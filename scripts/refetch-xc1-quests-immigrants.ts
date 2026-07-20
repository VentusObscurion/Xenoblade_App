/**
 * Targeted XC1 re-ingest: quests + Colony 6 immigrants only.
 * Merges counts into the existing manifest without wiping other games.
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import type { DataManifest } from '../src/types/tracker.ts'
import { fetchColony6Immigrants } from './ingest/xc1-extra.ts'
import { fetchQuests, XC1_QUEST_CATEGORIES } from './ingest/xc1.ts'

const __dirname = dirname(fileURLToPath(import.meta.url))
const OUTPUT_DIR = join(__dirname, '../public/data')

async function main() {
  const xc1Dir = join(OUTPUT_DIR, 'xc1')
  mkdirSync(xc1Dir, { recursive: true })

  console.log('Re-fetching XC1 quests + Colony 6 immigrants...')
  const quests = await fetchQuests(XC1_QUEST_CATEGORIES, 'xc1')
  const immigrants = await fetchColony6Immigrants('xc1')

  writeFileSync(join(xc1Dir, 'quests.json'), JSON.stringify(quests, null, 2), 'utf-8')
  writeFileSync(
    join(xc1Dir, 'colony-immigrants.json'),
    JSON.stringify(immigrants, null, 2),
    'utf-8',
  )

  const manifestPath = join(OUTPUT_DIR, 'manifest.json')
  const manifest = JSON.parse(readFileSync(manifestPath, 'utf-8')) as DataManifest
  manifest.generatedAt = new Date().toISOString()
  if (manifest.games.xc1) {
    manifest.games.xc1.categories.quest = quests.length
    manifest.games.xc1.categories.colony_immigrant = immigrants.length
  }
  writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), 'utf-8')

  const challenges = quests.filter((q) => /^Challenge/i.test(q.name))
  console.log(`Wrote ${quests.length} quests (${challenges.length} Challenge*), ${immigrants.length} immigrants`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
