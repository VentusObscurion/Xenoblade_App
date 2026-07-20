import type { Prerequisite, TrackableItem } from '../types/tracker.ts'
import {
  cleanAreaLabel,
  formatResultsText,
  formatTradeEntry,
  formatUniqueCommentLines,
  formatWalkthroughLines,
  stripDecorativeQuotes,
} from './format-display.ts'
import { cleanWikiMarkup } from './wiki-text.ts'

function cleanPrerequisite(prereq: Prerequisite): Prerequisite {
  return {
    ...prereq,
    label: cleanWikiMarkup(prereq.label),
  }
}

export function sanitizeItem(item: TrackableItem): TrackableItem {
  const walkthroughLines = item.walkthrough
    ? formatWalkthroughLines(item.walkthrough)
    : []

  return {
    ...item,
    name: cleanWikiMarkup(item.name),
    region: item.region ? cleanAreaLabel(item.region) : undefined,
    description: item.description
      ? stripDecorativeQuotes(cleanWikiMarkup(item.description))
      : undefined,
    walkthrough:
      walkthroughLines.length > 0 ? walkthroughLines.join('\n') : undefined,
    results: item.results ? formatResultsText(item.results) : undefined,
    uniqueComments: item.uniqueComments
      ? formatUniqueCommentLines(item.uniqueComments).join('\n')
      : undefined,
    giver: item.giver ? cleanWikiMarkup(item.giver) : undefined,
    subLocation: item.subLocation ? cleanAreaLabel(item.subLocation) : undefined,
    rewards: item.rewards?.map((r) => cleanWikiMarkup(r)),
    characters: item.characters?.map((c) => cleanWikiMarkup(c)),
    itemLocations: item.itemLocations?.map((loc) => cleanAreaLabel(loc)),
    itemTradeInfo: item.itemTradeInfo?.map((entry) => formatTradeEntry(entry)),
    itemGifting: item.itemGifting ? cleanWikiMarkup(item.itemGifting) : undefined,
    itemQuestUses: item.itemQuestUses?.map((quest) => cleanWikiMarkup(quest)),
    prerequisites: item.prerequisites.map(cleanPrerequisite),
  }
}
