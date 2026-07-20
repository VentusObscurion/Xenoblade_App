import type { Prerequisite, TrackableItem } from '../types/tracker.ts'
import { cleanWikiMarkup } from './wiki-text.ts'

function cleanPrerequisite(prereq: Prerequisite): Prerequisite {
  return {
    ...prereq,
    label: cleanWikiMarkup(prereq.label),
  }
}

export function sanitizeItem(item: TrackableItem): TrackableItem {
  return {
    ...item,
    name: cleanWikiMarkup(item.name),
    region: item.region ? cleanWikiMarkup(item.region) : undefined,
    description: item.description ? cleanWikiMarkup(item.description) : undefined,
    walkthrough: item.walkthrough
      ? item.walkthrough
          .split('\n')
          .map((line) => cleanWikiMarkup(line))
          .join('\n')
      : undefined,
    rewards: item.rewards?.map((r) => cleanWikiMarkup(r)),
    characters: item.characters?.map((c) => cleanWikiMarkup(c)),
    itemLocations: item.itemLocations?.map((loc) => cleanWikiMarkup(loc)),
    itemTradeInfo: item.itemTradeInfo?.map((entry) => cleanWikiMarkup(entry)),
    itemGifting: item.itemGifting ? cleanWikiMarkup(item.itemGifting) : undefined,
    itemQuestUses: item.itemQuestUses?.map((quest) => cleanWikiMarkup(quest)),
    prerequisites: item.prerequisites.map(cleanPrerequisite),
  }
}
