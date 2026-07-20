import { getProgress, setProgress } from './progress-db.ts'
import type { ProgressEntry } from '../types/tracker.ts'

export async function setAccepted(
  itemId: string,
  accepted: boolean,
): Promise<ProgressEntry> {
  const existing = await getProgress(itemId)
  const completed = existing?.completed ?? false
  const entry: ProgressEntry = {
    itemId,
    // Completing a quest always implies accepted
    accepted: completed ? true : accepted,
    completed,
    completedAt: existing?.completedAt,
    notes: existing?.notes,
  }
  await setProgress(entry)
  return entry
}

export async function setCompleted(
  itemId: string,
  completed: boolean,
): Promise<ProgressEntry> {
  const existing = await getProgress(itemId)
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
