/**
 * Enrich trackable JSON files with wiki thumbnail URLs (pageimages API).
 */
import { readdirSync, readFileSync, writeFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { dirname } from 'node:path'
import type { TrackableItem } from '../src/types/tracker.ts'
import { getPageThumbnails, titleFromWikiUrl } from './ingest/wiki-client.ts'

const __dirname = dirname(fileURLToPath(import.meta.url))
const DATA_DIR = join(__dirname, '../public/data')

const SKIP_FILES = new Set([
  'manifest.json',
  'collectopaedia.json',
  'colony-reconstruction.json',
  'colony-immigrants.json',
  'landmarks.json',
  'items.json',
  'achievements.json',
])

function listJsonFiles(dir: string): string[] {
  const out: string[] = []
  for (const name of readdirSync(dir)) {
    const path = join(dir, name)
    if (statSync(path).isDirectory()) {
      out.push(...listJsonFiles(path))
      continue
    }
    if (!name.endsWith('.json') || SKIP_FILES.has(name)) continue
    out.push(path)
  }
  return out
}

async function enrichFile(path: string): Promise<number> {
  const raw = JSON.parse(readFileSync(path, 'utf-8')) as unknown
  if (!Array.isArray(raw)) return 0
  const items = raw as TrackableItem[]
  if (items.length === 0 || !items[0]?.wikiUrl) return 0

  const titleByIndex = new Map<number, string>()
  const titles: string[] = []
  for (let i = 0; i < items.length; i++) {
    const title = titleFromWikiUrl(items[i].wikiUrl)
    if (!title) continue
    titleByIndex.set(i, title)
    titles.push(title)
  }

  const uniqueTitles = [...new Set(titles)]
  console.log(`  ${path.replace(DATA_DIR + '\\', '').replace(DATA_DIR + '/', '')}: ${uniqueTitles.length} pages`)
  const thumbs = await getPageThumbnails(uniqueTitles, 400)

  let updated = 0
  for (const [index, title] of titleByIndex) {
    const url = thumbs.get(title)
    if (!url) continue
    if (items[index].imageUrl === url) continue
    items[index].imageUrl = url
    updated++
  }

  if (updated > 0) {
    writeFileSync(path, JSON.stringify(items, null, 2), 'utf-8')
  }
  return updated
}

async function main() {
  const files = listJsonFiles(DATA_DIR)
  console.log(`Enriching images in ${files.length} data files...`)
  let total = 0
  for (const file of files) {
    total += await enrichFile(file)
  }
  console.log(`Done. Updated ${total} entries with imageUrl.`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
