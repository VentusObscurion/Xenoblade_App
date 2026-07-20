import { cleanWikiMarkup } from './wiki-text.ts'

/** Strip wrapping/wiki quotes and category footer noise. */
export function stripDecorativeQuotes(text: string): string {
  return text
    .replace(/^Category:.+$/gim, '')
    .replace(/''+/g, '')
    .replace(/[“”]/g, '"')
    .replace(/^["']+|["']+$/g, '')
    .replace(/\s+"/g, ' ')
    .replace(/"\s+/g, ' ')
    .replace(/"/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

/** Walkthrough as bullet lines without wrapping quotes. */
export function formatWalkthroughLines(text: string): string[] {
  return text
    .split(/\n+/)
    .map((line) => stripDecorativeQuotes(cleanWikiMarkup(line)))
    .map((line) => line.replace(/^[-*•]\s*/, '').trim())
    .filter(Boolean)
}

/** Results as clean lines (no wrapping quotes). */
export function formatResultsLines(text: string): string[] {
  return text
    .split(/\n+/)
    .map((line) => stripDecorativeQuotes(cleanWikiMarkup(line)))
    .filter(Boolean)
}

export function formatResultsText(text: string): string {
  return formatResultsLines(text).join('\n')
}

/** Unique comments as "Name: dialogue" lines. */
export function formatUniqueCommentLines(text: string): string[] {
  return text
    .split(/\n+/)
    .map((line) => line.trim())
    .filter((line) => line && !/^Category:/i.test(line))
    .map((line) => {
      let cleaned = line.replace(/^:+\s*/, '')
      cleaned = cleaned.replace(/'{2,}/g, '')
      cleaned = cleaned.replace(/[“”]/g, '"')
      // 'Name': "dialogue" or Name: "dialogue"
      const match = cleaned.match(/^'?([^':]+)'?\s*:\s*"?(.*)"?\s*$/)
      if (match) {
        const speaker = cleanWikiMarkup(match[1]).trim()
        const dialogue = stripDecorativeQuotes(cleanWikiMarkup(match[2]))
        return `${speaker}: ${dialogue}`
      }
      return stripDecorativeQuotes(cleanWikiMarkup(cleaned))
    })
    .filter(Boolean)
}

/** Prefer plain area name: "Colony 9 (XC1) | Colony 9" → "Colony 9" */
export function cleanAreaLabel(label: string): string {
  let text = cleanWikiMarkup(label)
    .replace(/\{\{!\}\}/g, '|')
    .replace(/!/g, '|')
    .replace(/\s*\|\s*/g, ' | ')
    .trim()

  if (text.includes(' | ')) {
    const parts = text.split(' | ').map((p) => p.trim()).filter(Boolean)
    text = parts[parts.length - 1] ?? text
  }

  text = text.replace(/\s*\(XC1\)\s*/gi, '').trim()
  return text
}

export function formatTradeEntry(entry: string): string {
  return entry
    .split(' · ')
    .map((part, index, parts) =>
      index === parts.length - 1 ? cleanAreaLabel(part) : cleanWikiMarkup(part),
    )
    .join(' · ')
}

export interface GiftAffinity {
  character: string
  value: string
}

export function parseGiftingEntries(gifting: string): GiftAffinity[] {
  return gifting
    .split(';')
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => {
      const [character, ...rest] = part.split(':')
      return {
        character: cleanWikiMarkup(character ?? '').trim(),
        value: rest.join(':').trim(),
      }
    })
    .filter((entry) => entry.character)
}

export const AFFINITY_COLOR_HEX: Record<number, string> = {
  1: '#e88bb0',
  2: '#d4b84a',
  3: '#5aaf6a',
  4: '#5a8fd4',
  5: '#9b6bc9',
}
