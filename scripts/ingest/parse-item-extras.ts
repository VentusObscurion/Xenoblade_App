import {
  parseNamedTemplate,
  stripWikiMarkup,
} from './parse-infobox.ts'

function parseSourceField(source?: string): { locations: string[]; hasTrade: boolean } {
  if (!source) return { locations: [], hasTrade: false }
  const parts = source
    .split(/<br\s*\/?>|\n|,/)
    .map((part) => stripWikiMarkup(part.trim()))
    .filter(Boolean)
  const hasTrade = parts.some((part) => /^trade$/i.test(part))
  const locations = parts.filter((part) => !/^trade$/i.test(part))
  return { locations, hasTrade }
}

function parseTradeEntries(wikitext: string): string[] {
  const trade = parseNamedTemplate(wikitext, 'Trade')
  const entries: string[] = []

  for (let i = 1; i <= 10; i++) {
    const npc = trade[`npc${i}`]
    if (!npc) break
    const aff = trade[`aff${i}`]
    const area = trade[`area${i}`]
    const parts = [npc, aff, area].filter(Boolean)
    entries.push(parts.join(' · '))
  }

  return entries
}

function parseQuestUses(wikitext: string): string[] {
  const section = wikitext.match(/==\s*Quests\s*==([\s\S]*?)(?=\n==[^=]|$)/i)?.[1]
  if (!section) return []

  return section
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.startsWith('*'))
    .map((line) => stripWikiMarkup(line.replace(/^\*+\s*/, '')))
    .filter(Boolean)
}

function parseGiftingTable(expandedWikitext: string): string | undefined {
  if (!expandedWikitext.includes('Recipient')) return undefined

  const nameMatches = [
    ...expandedWikitext.matchAll(/\|\s*class="name"\s*\|\s*\[\[([^|\]]+)/g),
  ]
  const affSection = expandedWikitext.split(/!\s*Affinity/i)[1]
  if (!affSection || nameMatches.length === 0) return undefined

  const affMatches = [...affSection.matchAll(/\|\s*class="[^"]*"\s*\|\s*(-?\d+)/g)]
  if (affMatches.length === 0) return undefined

  return nameMatches
    .map((match, index) => {
      const recipient = stripWikiMarkup(match[1].trim())
      const value = affMatches[index]?.[1] ?? '?'
      return `${recipient}: ${value}`
    })
    .join('; ')
}

export function parseItemExtras(
  wikitext: string,
  source?: string,
  giftingExpanded?: string,
): {
  locations: string[]
  hasTrade: boolean
  tradeInfo: string[]
  questUses: string[]
  gifting?: string
} {
  const { locations, hasTrade } = parseSourceField(source)
  const tradeInfo = parseTradeEntries(wikitext)
  const questUses = parseQuestUses(wikitext)
  const gifting = giftingExpanded ? parseGiftingTable(giftingExpanded) : undefined

  return {
    locations,
    hasTrade: hasTrade || tradeInfo.length > 0,
    tradeInfo,
    questUses,
    gifting,
  }
}
