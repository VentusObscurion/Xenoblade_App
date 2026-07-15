import type { Prerequisite, PrerequisiteType } from '../../src/types/tracker.ts'

export function stripWikiMarkup(text: string): string {
  return text
    .replace(/\[\[(?:File|Image|Datei):[^\]]*\]\]/gi, '')
    .replace(/\{\{([^}|]+)(?:\|[^}]*)?\}\}/g, '$1')
    .replace(/\[\[([^|\]]+)\|([^\]]+)\]\]/g, '$2')
    .replace(/\[\[([^\]]+)\]\]/g, '$1')
    .replace(/\[\[([^|\]#]+)(?:\|([^\]]*))?/g, (_, page, display) => (display || page).trim())
    .replace(/''([^']+)''/g, '$1')
    .replace(/\[\[?/g, '')
    .replace(/\]\]?/g, '')
    .replace(/#([A-Za-z0-9_ ()]+)/g, '')
    .replace(/'''+/g, '')
    .replace(/<br\s*\/?>/gi, ', ')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&#\d+;/g, '')
    .replace(/\|link=[^|]*/gi, '')
    .replace(/\d+px/gi, '')
    .replace(/\bcenter\b/gi, '')
    .replace(/\s+/g, ' ')
    .trim()
}

function extractBalancedTemplate(wikitext: string, start: number): string | null {
  if (!wikitext.startsWith('{{', start)) return null

  let depth = 0
  for (let i = start; i < wikitext.length - 1; i++) {
    if (wikitext.slice(i, i + 2) === '{{') {
      depth++
      i++
      continue
    }
    if (wikitext.slice(i, i + 2) === '}}') {
      depth--
      if (depth === 0) return wikitext.slice(start, i + 2)
      i++
    }
  }

  return null
}

function findAtTopLevel(content: string, start: number, char: string): number {
  let linkDepth = 0
  let templateDepth = 0

  for (let i = start; i < content.length; i++) {
    if (content.slice(i, i + 2) === '[[') {
      linkDepth++
      i++
      continue
    }
    if (content.slice(i, i + 2) === ']]') {
      linkDepth = Math.max(0, linkDepth - 1)
      i++
      continue
    }
    if (content.slice(i, i + 2) === '{{') {
      templateDepth++
      i++
      continue
    }
    if (content.slice(i, i + 2) === '}}') {
      if (templateDepth > 0) {
        templateDepth--
        i++
        continue
      }
      if (linkDepth === 0) return -1
    }
    if (content[i] === char && linkDepth === 0 && templateDepth === 0) {
      return i
    }
  }

  return -1
}

function findClosingBrace(content: string, start: number): number {
  let linkDepth = 0
  let templateDepth = 0

  for (let i = start; i < content.length - 1; i++) {
    if (content.slice(i, i + 2) === '[[') {
      linkDepth++
      i++
      continue
    }
    if (content.slice(i, i + 2) === ']]') {
      linkDepth = Math.max(0, linkDepth - 1)
      i++
      continue
    }
    if (content.slice(i, i + 2) === '{{') {
      templateDepth++
      i++
      continue
    }
    if (content.slice(i, i + 2) === '}}') {
      if (templateDepth > 0) {
        templateDepth--
        i++
        continue
      }
      if (linkDepth === 0) return i
    }
  }

  return content.length
}

function extractTemplateParams(templateContent: string): Record<string, string> {
  const fields: Record<string, string> = {}
  const firstPipe = templateContent.indexOf('|')
  if (firstPipe === -1) return fields

  let i = firstPipe

  while (i < templateContent.length) {
    if (templateContent[i] !== '|') {
      i++
      continue
    }
    i++

    const eqPos = findAtTopLevel(templateContent, i, '=')
    if (eqPos === -1) break

    const key = templateContent.slice(i, eqPos).trim().toLowerCase()
    i = eqPos + 1

    const nextPipe = findAtTopLevel(templateContent, i, '|')
    const end = nextPipe === -1 ? findClosingBrace(templateContent, i) : nextPipe
    const rawValue = templateContent.slice(i, end).trim()
    i = end

    if (key && rawValue) fields[key] = rawValue
  }

  return fields
}

function parseInfoboxFields(wikitext: string, templatePattern: RegExp): Record<string, string> {
  const fields: Record<string, string> = {}
  const startMatch = wikitext.match(templatePattern)
  if (!startMatch || startMatch.index === undefined) return fields

  const content = extractBalancedTemplate(wikitext, startMatch.index)
  if (!content) return fields

  const rawFields = extractTemplateParams(content)
  for (const [key, value] of Object.entries(rawFields)) {
    const stripped = stripWikiMarkup(value)
    if (stripped) fields[key] = stripped
  }

  return fields
}

function getInfoboxRawFields(
  wikitext: string,
  templateNames: string[],
): Record<string, string> {
  for (const templateName of templateNames) {
    const pattern = new RegExp(
      `\\{\\{[Ii]nfobox\\s+${templateName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`,
    )
    const startMatch = wikitext.match(pattern)
    if (!startMatch || startMatch.index === undefined) continue

    const content = extractBalancedTemplate(wikitext, startMatch.index)
    if (!content) continue

    const rawFields = extractTemplateParams(content)
    if (Object.keys(rawFields).length > 0) return rawFields
  }

  return {}
}

export function parseInfoboxRaw(
  wikitext: string,
  templateNames: string[],
): Record<string, string> {
  return getInfoboxRawFields(wikitext, templateNames)
}

export function parseInfobox(wikitext: string, templateNames: string[]): Record<string, string> {
  const rawFields = getInfoboxRawFields(wikitext, templateNames)
  const fields: Record<string, string> = {}

  for (const [key, value] of Object.entries(rawFields)) {
    const stripped = stripWikiMarkup(value)
    if (stripped) fields[key] = stripped
  }

  return fields
}

export function parseGenericInfobox(wikitext: string): Record<string, string> {
  return parseInfoboxFields(wikitext, /\{\{[Ii]nfobox\b/)
}

export function parseListField(value: string): string[] {
  return value
    .split(/<br\s*\/?>|\n/)
    .map((part) => stripWikiMarkup(part.trim()))
    .filter(Boolean)
}

function classifyPrerequisite(text: string): PrerequisiteType {
  const lower = text.toLowerCase()
  if (/\blevel\b|\blv\.?\s*\d+/i.test(lower)) return 'level'
  if (
    /\baffinity\b|\breputation\b|[☆★]|[\d½]+(?:\s*½|\s*1\/2)/i.test(text) ||
    /\barea\s+[☆★\d½]/i.test(lower)
  ) {
    return 'affinity'
  }
  if (/\bheart-to-heart\b|\bh2h\b/i.test(lower)) return 'affinity'
  if (/\bquest\b|\bmission\b|\brequires\b.*\bcomplete\b/i.test(lower)) return 'quest'
  if (/\bchapter\b|\bstory\b|\bmain story\b|\bevent\b/i.test(lower)) return 'story_flag'
  if (/\btime\b|\bday\b|\bnight\b|\b\d{2}:\d{2}/i.test(lower)) return 'time'
  if (/\barea\b|\blocation\b|\bzone\b|\bregion\b/i.test(lower)) return 'area'
  return 'other'
}

export function extractPrerequisites(
  fields: Record<string, string>,
  fieldNames: string[],
): Prerequisite[] {
  const prerequisites: Prerequisite[] = []

  for (const fieldName of fieldNames) {
    const value = fields[fieldName]
    if (!value) continue

    const parts = value.split(/[,;]\s*/).filter(Boolean)
    for (const part of parts) {
      const label = stripWikiMarkup(part)
      if (!label) continue
      prerequisites.push({
        type: classifyPrerequisite(label),
        label,
      })
    }
  }

  const levelField = fields.level ?? fields.lv
  if (levelField) {
    const levelNum = parseInt(levelField.replace(/\D/g, ''), 10)
    if (!Number.isNaN(levelNum) && !prerequisites.some((p) => p.type === 'level')) {
      prerequisites.unshift({ type: 'level', label: `Level ${levelNum}` })
    }
  }

  return prerequisites
}

export function parseLevel(value?: string): number | undefined {
  if (!value) return undefined
  const num = parseInt(value.replace(/\D/g, ''), 10)
  return Number.isNaN(num) ? undefined : num
}

export function parseWikiSection(wikitext: string, sectionName: string): string | undefined {
  const pattern = new RegExp(`==\\s*${sectionName}\\s*==([\\s\\S]*?)(?=\\n==[^=]|$)`, 'i')
  const match = wikitext.match(pattern)
  if (!match) return undefined
  return formatWikiSection(match[1].trim())
}

function formatWikiSection(text: string): string {
  return text
    .split('\n')
    .map((line) => {
      const trimmed = line.trim()
      if (!trimmed || /^Category:/i.test(trimmed)) return ''
      const bullet = trimmed.match(/^[*#]+(.*)$/)
      if (bullet) return stripWikiMarkup(bullet[1].trim())
      return stripWikiMarkup(trimmed)
    })
    .filter(Boolean)
    .join('\n')
}

export function extractQuestGuide(wikitext: string): {
  description?: string
  walkthrough?: string
} {
  const fields = parseGenericInfobox(wikitext)
  const objectives = parseWikiSection(wikitext, 'Objectives')
  const walkthrough =
    parseWikiSection(wikitext, 'Walkthrough') ??
    parseWikiSection(wikitext, 'Guide')

  return {
    description: fields.description || fields.objective || fields.objectives,
    walkthrough: walkthrough || objectives,
  }
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/['']/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}
