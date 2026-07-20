import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import type { Category, DataManifest, GameId } from '../src/types/tracker.ts'
import {
  fetchXC2Blades,
  fetchXC2Collectopaedia,
  fetchXC2HeartToHearts,
  fetchXC2Quests,
  fetchXC2UniqueMonsters,
} from './ingest/xc2.ts'
import {
  fetchTornaCollectopaedia,
  fetchTornaQuests,
  fetchTornaUniqueMonsters,
} from './ingest/xc2-torna.ts'
import {
  fetchFRCollectopaedia,
  fetchFRQuests,
  fetchFRUniqueMonsters,
  fetchXC3Collectopaedia,
  fetchXC3Heroes,
  fetchXC3Quests,
  fetchXC3UniqueMonsters,
} from './ingest/xc3.ts'

const __dirname = dirname(fileURLToPath(import.meta.url))
const OUTPUT_DIR = join(__dirname, '../public/data')

function writeJson(path: string, data: unknown): void {
  mkdirSync(dirname(path), { recursive: true })
  writeFileSync(path, JSON.stringify(data, null, 2), 'utf-8')
}

function loadManifest(): DataManifest {
  const manifestPath = join(OUTPUT_DIR, 'manifest.json')
  try {
    return JSON.parse(readFileSync(manifestPath, 'utf-8')) as DataManifest
  } catch {
    return {
      version: '1.0.0',
      generatedAt: new Date().toISOString(),
      attribution: 'Data from Xenoblade Wiki (CC BY-SA 3.0)',
      wikiBaseUrl: 'https://xenoblade.fandom.com',
      games: {},
    }
  }
}

function saveManifest(
  gameId: GameId,
  name: string,
  categories: Partial<Record<Category, number>>,
): void {
  const manifest = loadManifest()
  manifest.generatedAt = new Date().toISOString()
  manifest.games[gameId] = { name, categories }
  writeJson(join(OUTPUT_DIR, 'manifest.json'), manifest)
}

export async function ingestXC2(): Promise<void> {
  console.log('Ingesting XC2 data from Xenoblade Wiki...')
  const [quests, monsters, h2h, blades, collectopaedia] = await Promise.all([
    fetchXC2Quests('xc2'),
    fetchXC2UniqueMonsters('xc2'),
    fetchXC2HeartToHearts('xc2'),
    fetchXC2Blades('xc2'),
    fetchXC2Collectopaedia('xc2'),
  ])

  const dir = join(OUTPUT_DIR, 'xc2')
  writeJson(join(dir, 'quests.json'), quests)
  writeJson(join(dir, 'unique-monsters.json'), monsters)
  writeJson(join(dir, 'heart-to-hearts.json'), h2h)
  writeJson(join(dir, 'blades.json'), blades)
  writeJson(join(dir, 'collectopaedia.json'), collectopaedia)

  saveManifest('xc2', 'Xenoblade Chronicles 2', {
    quest: quests.length,
    unique_monster: monsters.length,
    heart_to_heart: h2h.length,
    blade: blades.length,
    collectopaedia: collectopaedia.length,
  })

  console.log(
    `  XC2: ${quests.length} quests, ${monsters.length} UMs, ${h2h.length} H2H, ${blades.length} blades, ${collectopaedia.length} collectibles`,
  )
}

export async function ingestTorna(): Promise<void> {
  console.log('Ingesting Torna ~ The Golden Country...')
  const [quests, monsters, collectopaedia] = await Promise.all([
    fetchTornaQuests('xc2-torna'),
    fetchTornaUniqueMonsters('xc2-torna'),
    fetchTornaCollectopaedia('xc2-torna'),
  ])

  const dir = join(OUTPUT_DIR, 'xc2-torna')
  writeJson(join(dir, 'quests.json'), quests)
  writeJson(join(dir, 'unique-monsters.json'), monsters)
  writeJson(join(dir, 'collectopaedia.json'), collectopaedia)

  saveManifest('xc2-torna', 'Torna ~ The Golden Country', {
    quest: quests.length,
    unique_monster: monsters.length,
    collectopaedia: collectopaedia.length,
  })

  console.log(
    `  Torna: ${quests.length} quests, ${monsters.length} UMs, ${collectopaedia.length} collectibles`,
  )
}

export async function ingestXC3(): Promise<void> {
  console.log('Ingesting XC3 data...')
  const [quests, monsters, heroes, collectopaedia] = await Promise.all([
    fetchXC3Quests('xc3'),
    fetchXC3UniqueMonsters('xc3'),
    fetchXC3Heroes('xc3'),
    fetchXC3Collectopaedia('xc3'),
  ])

  const dir = join(OUTPUT_DIR, 'xc3')
  writeJson(join(dir, 'quests.json'), quests)
  writeJson(join(dir, 'unique-monsters.json'), monsters)
  writeJson(join(dir, 'heroes.json'), heroes)
  writeJson(join(dir, 'collectopaedia.json'), collectopaedia)

  saveManifest('xc3', 'Xenoblade Chronicles 3', {
    quest: quests.length,
    unique_monster: monsters.length,
    hero: heroes.length,
    collectopaedia: collectopaedia.length,
  })

  console.log(
    `  XC3: ${quests.length} quests, ${monsters.length} UMs, ${heroes.length} heroes, ${collectopaedia.length} collectibles`,
  )
}

export async function ingestFutureRedeemed(): Promise<void> {
  console.log('Ingesting Future Redeemed...')
  const [quests, monsters, collectopaedia] = await Promise.all([
    fetchFRQuests('xc3-fr'),
    fetchFRUniqueMonsters('xc3-fr'),
    fetchFRCollectopaedia('xc3-fr'),
  ])

  const dir = join(OUTPUT_DIR, 'xc3-fr')
  writeJson(join(dir, 'quests.json'), quests)
  writeJson(join(dir, 'unique-monsters.json'), monsters)
  writeJson(join(dir, 'collectopaedia.json'), collectopaedia)

  saveManifest('xc3-fr', 'Future Redeemed', {
    quest: quests.length,
    unique_monster: monsters.length,
    collectopaedia: collectopaedia.length,
  })

  console.log(
    `  FR: ${quests.length} quests, ${monsters.length} UMs, ${collectopaedia.length} collectibles`,
  )
}
