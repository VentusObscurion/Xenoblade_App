import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import type { DataManifest } from '../src/types/tracker.ts'
import { fetchXC2Collectopaedia } from './ingest/xc2.ts'

const __dirname = dirname(fileURLToPath(import.meta.url))
const OUTPUT_DIR = join(__dirname, '../public/data')

function writeJson(path: string, data: unknown): void {
  mkdirSync(dirname(path), { recursive: true })
  writeFileSync(path, JSON.stringify(data, null, 2), 'utf-8')
}

export async function ingestXC2(): Promise<void> {
  console.log('Ingesting XC2 data from Xenoblade Wiki...')
  const collectopaedia = await fetchXC2Collectopaedia('xc2')
  const xc2Dir = join(OUTPUT_DIR, 'xc2')
  writeJson(join(xc2Dir, 'collectopaedia.json'), collectopaedia)
  await updateManifest(collectopaedia.length)
  console.log(`  XC2 Collectopaedia: ${collectopaedia.length}`)
}

export async function updateManifest(xc2Count: number): Promise<void> {
  const manifestPath = join(OUTPUT_DIR, 'manifest.json')
  let manifest: DataManifest
  try {
    const { readFileSync } = await import('node:fs')
    manifest = JSON.parse(readFileSync(manifestPath, 'utf-8')) as DataManifest
  } catch {
    manifest = {
      version: '1.0.0',
      generatedAt: new Date().toISOString(),
      attribution: 'Data from Xenoblade Wiki (CC BY-SA 3.0)',
      wikiBaseUrl: 'https://xenoblade.fandom.com',
      games: {},
    }
  }
  manifest.generatedAt = new Date().toISOString()
  manifest.games.xc2 = {
    name: 'Xenoblade Chronicles 2',
    categories: { collectopaedia: xc2Count },
  }
  writeJson(manifestPath, manifest)
}
