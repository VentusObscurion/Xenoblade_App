import { openDB, type DBSchema, type IDBPDatabase } from 'idb'
import {
  clearAllGameStates,
  exportGameStates,
  importGameStates,
  type StoredGameStates,
} from './game-state-storage.ts'
import type { ProgressEntry } from '../types/tracker.ts'

interface ProgressDB extends DBSchema {
  progress: {
    key: string
    value: ProgressEntry
  }
}

const DB_NAME = 'xenoblade-tracker'
const DB_VERSION = 1

let dbPromise: Promise<IDBPDatabase<ProgressDB>> | null = null

function getDb(): Promise<IDBPDatabase<ProgressDB>> {
  if (!dbPromise) {
    dbPromise = openDB<ProgressDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        db.createObjectStore('progress', { keyPath: 'itemId' })
      },
    })
  }
  return dbPromise
}

export async function getAllProgress(): Promise<Record<string, ProgressEntry>> {
  const db = await getDb()
  const all = await db.getAll('progress')
  return Object.fromEntries(all.map((entry) => [entry.itemId, entry]))
}

export async function getProgress(itemId: string): Promise<ProgressEntry | undefined> {
  const db = await getDb()
  return db.get('progress', itemId)
}

export async function setProgress(entry: ProgressEntry): Promise<void> {
  const db = await getDb()
  await db.put('progress', entry)
}

export async function toggleProgress(itemId: string): Promise<ProgressEntry> {
  const existing = await getProgress(itemId)
  const completed = !existing?.completed
  const entry: ProgressEntry = {
    itemId,
    accepted: completed ? true : existing?.accepted === true,
    completed,
    completedAt: completed ? new Date().toISOString() : undefined,
    notes: existing?.notes,
  }
  await setProgress(entry)
  return entry
}

export async function exportProgress(): Promise<string> {
  const all = await getAllProgress()
  return JSON.stringify(
    {
      version: 2,
      exportedAt: new Date().toISOString(),
      progress: all,
      gameState: exportGameStates(),
    },
    null,
    2,
  )
}

export async function importProgress(json: string): Promise<number> {
  const data = JSON.parse(json) as {
    progress?: Record<string, ProgressEntry>
    gameState?: StoredGameStates
  }
  const entries = Object.values(data.progress ?? {})
  const db = await getDb()
  const tx = db.transaction('progress', 'readwrite')
  for (const entry of entries) {
    await tx.store.put(entry)
  }
  await tx.done
  importGameStates(data.gameState)
  return entries.length
}

export async function clearProgress(): Promise<void> {
  const db = await getDb()
  await db.clear('progress')
  clearAllGameStates()
  localStorage.removeItem('xenoblade-new-available')
}
