import { parseNamedTemplate, stripWikiMarkup } from './parse-infobox.ts'

const AFFINITY_SYMBOLS: Record<string, string> = {
  pink: 'Pink Heart',
  yellow: 'Yellow Hexagon',
  green: 'Green Square',
  blue: 'Blue Diamond',
  purple: 'Purple Flower',
}

export function parseAffinityFromWiki(
  affRaw: string,
): { level: number; label: string } | undefined {
  const levelMatch = affRaw.match(/Affinity-(\d+)-(\w+)/i)
  if (levelMatch) {
    const level = parseInt(levelMatch[1], 10)
    const color = levelMatch[2].toLowerCase()
    const symbol = AFFINITY_SYMBOLS[color] ?? color
    return { level, label: `${symbol} (Level ${level})` }
  }
  return undefined
}

export function parseH2HCharacters(charField: string): string[] {
  const names: string[] = []
  for (const match of charField.matchAll(/\[\[([^|\]]+)(?:\|[^\]]+)?\]\]/g)) {
    const name = match[1].replace(/ \(XC1\)$/i, '').trim()
    if (name && name.toLowerCase() !== 'and') names.push(name)
  }
  if (names.length === 0) {
    return charField
      .split(/\band\b|[*,×]/i)
      .map((part) => stripWikiMarkup(part.trim()))
      .filter(Boolean)
  }
  return names
}

export function parseH2HLocation(locField: string): {
  region?: string
  subLocation?: string
} {
  const cleaned = locField.trim()
  const parenMatch = cleaned.match(
    /\[\[([^|\]]+)(?:\|([^\]]+))?\]\]\s*\(\s*\[\[([^|\]]+)(?:\|[^\]]+)?\]\]\s*\)/,
  )
  if (parenMatch) {
    const region = stripWikiMarkup(parenMatch[2] ?? parenMatch[1]).replace(
      / \(XC1\)$/i,
      '',
    )
    const subLocation = stripWikiMarkup(parenMatch[3])
    return { region, subLocation }
  }

  const singleMatch = cleaned.match(/\[\[([^|\]]+)(?:\|([^\]]+))?\]\]/)
  if (singleMatch) {
    const region = stripWikiMarkup(singleMatch[2] ?? singleMatch[1]).replace(
      / \(XC1\)$/i,
      '',
    )
    return { region }
  }

  const stripped = stripWikiMarkup(cleaned)
  return stripped ? { subLocation: stripped } : {}
}

function formatH2HText(text: string): string {
  return stripWikiMarkup(
    text
      .replace(/^\[\[Category:[^\]]+\]\]\s*$/gim, '')
      .replace(/^\s*:\s*/gm, '')
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/\n{3,}/g, '\n\n'),
  )
}

function extractH2HSections(wikitext: string): Array<{ title: string; content: string }> {
  const headingRegex = /^==\s*(.+?)\s*==\s*$/gm
  const matches = [...wikitext.matchAll(headingRegex)]
  const sections: Array<{ title: string; content: string }> = []

  for (let i = 0; i < matches.length; i++) {
    const match = matches[i]
    const start = match.index! + match[0].length
    const end = i + 1 < matches.length ? matches[i + 1].index! : wikitext.length
    sections.push({
      title: stripWikiMarkup(match[1]),
      content: wikitext.slice(start, end).trim(),
    })
  }

  return sections
}

function extractChoices(text: string): string[] {
  const withoutCategories = text.replace(/^\[\[Category:[^\]]+\]\]\s*$/gim, '')
  const withoutWikiLinks = withoutCategories.replace(
    /\[\[([^|\]]+)(?:\|([^\]]+))?\]\]/g,
    (_, page, display) => display ?? page,
  )
  return [...withoutWikiLinks.matchAll(/(?<!\[)\[([^\[\]]+)\](?!\])/g)].map((match) =>
    match[1].trim(),
  )
}

export function parseH2HPage(wikitext: string): {
  characters: string[]
  affinityLevel?: number
  affinityLabel?: string
  region?: string
  subLocation?: string
  timeWindow?: string
  otherRequirements?: string
  affinityEffects?: string
  intro?: string
  outcomes?: Array<{ title: string; choices: string[]; dialogue: string }>
} {
  const fields = parseNamedTemplate(wikitext, 'H2H')
  const characters = parseH2HCharacters(fields.characters ?? fields.who ?? '')
  const aff = parseAffinityFromWiki(fields.aff ?? fields.affinity ?? '')
  const location = parseH2HLocation(fields.location ?? '')
  const otherRequirements = stripWikiMarkup(
    fields.req ?? fields.requirements ?? fields.conditions ?? fields.prerequisite ?? '',
  )
  const sections = extractH2HSections(wikitext)
  const introSection = sections.find((section) => section.title === 'Introduction')
  const outcomeSections = sections
    .filter((section) => section.title !== 'Introduction')
    .map((section) => ({
      title: section.title,
      choices: extractChoices(section.content),
      dialogue: formatH2HText(section.content),
    }))

  return {
    characters,
    affinityLevel: aff?.level,
    affinityLabel: aff?.label,
    region: location.region,
    subLocation: location.subLocation,
    timeWindow: fields.time ?? fields.timing,
    otherRequirements: otherRequirements || undefined,
    affinityEffects: fields.affinity ?? fields.effects,
    intro: introSection ? formatH2HText(introSection.content) : undefined,
    outcomes: outcomeSections.length > 0 ? outcomeSections : undefined,
  }
}
