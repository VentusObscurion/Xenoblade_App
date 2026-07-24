/**
 * Fetch XC1 persons (NPCs) and patch Replica Monado story gates in quests.json.
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import type { DataManifest, TrackableItem } from '../src/types/tracker.ts'
import { fetchXC1Persons } from './ingest/xc1-extra.ts'

const __dirname = dirname(fileURLToPath(import.meta.url))
const OUTPUT_DIR = join(__dirname, '../public/data')

async function main() {
  const xc1Dir = join(OUTPUT_DIR, 'xc1')
  mkdirSync(xc1Dir, { recursive: true })

  const persons = await fetchXC1Persons('xc1')
  writeFileSync(join(xc1Dir, 'persons.json'), JSON.stringify(persons, null, 2), 'utf-8')

  const questsPath = join(xc1Dir, 'quests.json')
  const quests = JSON.parse(readFileSync(questsPath, 'utf-8')) as TrackableItem[]
  let patched = 0
  for (const quest of quests) {
    if (!/^Replica Monado/i.test(quest.name)) continue
    for (const prereq of quest.prerequisites) {
      if (/interior landing site/i.test(prereq.label)) {
        prereq.type = 'story_flag'
        prereq.label = 'Mechonis Core cleared'
        patched++
      }
    }
  }
  writeFileSync(questsPath, JSON.stringify(quests, null, 2), 'utf-8')

  const manifestPath = join(OUTPUT_DIR, 'manifest.json')
  const manifest = JSON.parse(readFileSync(manifestPath, 'utf-8')) as DataManifest
  manifest.generatedAt = new Date().toISOString()
  if (manifest.games.xc1) {
    manifest.games.xc1.categories.person = persons.length
  }
  writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), 'utf-8')

  console.log(`Wrote ${persons.length} persons, patched ${patched} Replica Monado prereqs`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
