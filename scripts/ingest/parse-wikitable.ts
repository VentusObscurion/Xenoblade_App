import { stripWikiMarkup } from './parse-infobox.ts'

export interface WikiTableRow {
  cells: string[]
}

export function extractWikiTable(wikitext: string, startIndex: number): string | null {
  if (!wikitext.startsWith('{|', startIndex)) return null

  let depth = 0
  for (let i = startIndex; i < wikitext.length - 1; i++) {
    if (wikitext.slice(i, i + 2) === '{|') {
      depth++
      i++
      continue
    }
    if (wikitext.slice(i, i + 2) === '|}') {
      depth--
      if (depth === 0) return wikitext.slice(startIndex, i + 2)
      i++
    }
  }

  return null
}

function processTableCell(raw: string): string {
  if (/class\s*=\s*["']empty["']/i.test(raw)) return ''
  return stripWikiMarkup(raw.trim())
}

export function parseTableCells(chunk: string): string[] {
  const cells: string[] = []
  let current = ''

  for (const line of chunk.split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('|-') || trimmed === '|}' || trimmed.startsWith('{|')) {
      continue
    }

    if (trimmed.startsWith('!')) {
      if (current) cells.push(processTableCell(current))
      const content = trimmed.slice(1).trim()
      const headerValue = content.match(/\|\s*([^|]+)$/)
      current = headerValue ? headerValue[1].trim() : content
      continue
    }

    if (trimmed.startsWith('||')) {
      if (current) cells.push(processTableCell(current))
      current = ''
      for (const part of trimmed.split('||')) {
        const cell = part.replace(/^\|/, '').trim()
        if (cell) cells.push(processTableCell(cell))
      }
      continue
    }

    if (trimmed.startsWith('|')) {
      if (current) cells.push(processTableCell(current))
      const afterFirst = trimmed.slice(1)
      const inlineValue = afterFirst.match(/^[^|]*\|(.+)$/)
      if (inlineValue && /rowspan|style|colspan|align|vertical-align/i.test(afterFirst)) {
        cells.push(processTableCell(inlineValue[1]))
        current = ''
      } else if (afterFirst.includes('||')) {
        for (const part of afterFirst.split('||')) {
          const cell = part.trim()
          if (cell) cells.push(processTableCell(cell))
        }
        current = ''
      } else {
        current = afterFirst
      }
      continue
    }

    current += (current ? '\n' : '') + trimmed
  }

  if (current) cells.push(processTableCell(current))
  return cells
}

function parseRowCells(rowText: string): string[] {
  return parseTableCells(rowText).filter((c) => c.length > 0)
}

function isSectionHeaderRow(cells: string[]): boolean {
  if (cells.length === 0) return true
  if (cells.length === 1 && cells[0].length < 60) return true
  if (cells[0].toLowerCase().includes('colspan')) return true
  return false
}

export function parseWikitable(wikitext: string): WikiTableRow[] {
  const tableMatches = wikitext.matchAll(/\{\|[\s\S]*?\|\}/g)
  const rows: WikiTableRow[] = []

  for (const tableMatch of tableMatches) {
    const tableContent = tableMatch[0]
    const rowChunks = tableContent.split(/\n\s*\|-/)

    for (const chunk of rowChunks) {
      if (chunk.includes('{|') && !chunk.includes('\n|') && !chunk.includes('\n!')) continue

      const cells = parseRowCells(chunk)
      if (cells.length === 0) continue
      if (isSectionHeaderRow(cells)) continue
      if (cells[0].toLowerCase() === 'title' || cells[0].toLowerCase() === 'award') continue

      rows.push({ cells })
    }
  }

  return rows
}

export function findHeaderIndex(headers: string[], ...candidates: string[]): number {
  const normalized = headers.map((h) => h.toLowerCase())
  for (const candidate of candidates) {
    const idx = normalized.findIndex((h) => h.includes(candidate.toLowerCase()))
    if (idx >= 0) return idx
  }
  return -1
}

export function parseAllWikitableWithHeaders(wikitext: string): WikiTableRow[] {
  const tableMatches = [...wikitext.matchAll(/\{\|[\s\S]*?\|\}/g)]
  const allRows: WikiTableRow[] = []

  for (const tableMatch of tableMatches) {
    const { rows } = parseSingleTable(tableMatch[0])
    allRows.push(...rows)
  }

  return allRows
}

function parseSingleTable(tableContent: string): {
  headers: string[]
  rows: WikiTableRow[]
} {
  const rowChunks = tableContent.split(/\n\s*\|-/)
  let headers: string[] = []
  const dataRows: WikiTableRow[] = []

  for (const chunk of rowChunks) {
    const headerCells: string[] = []
    const lines = chunk.split('\n')
    let isHeaderRow = false

    for (const line of lines) {
      const trimmed = line.trim()
      if (trimmed.startsWith('!')) {
        isHeaderRow = true
        const cellContent = trimmed.slice(1).trim()
        if (cellContent.includes('!!')) {
          headerCells.push(
            ...cellContent.split('!!').map((c) => stripWikiMarkup(c.trim())),
          )
        } else {
          headerCells.push(stripWikiMarkup(cellContent))
        }
      }
    }

    if (isHeaderRow && headers.length === 0) {
      headers = headerCells.filter(Boolean)
      continue
    }

    const cells = parseRowCells(chunk)
    if (cells.length === 0 || isSectionHeaderRow(cells)) continue
    if (headers.length > 0 && cells[0].toLowerCase() === headers[0]?.toLowerCase()) continue

    dataRows.push({ cells })
  }

  return { headers, rows: dataRows }
}

export function parseWikitableWithHeaders(wikitext: string): {
  headers: string[]
  rows: WikiTableRow[]
} {
  const tableMatches = [...wikitext.matchAll(/\{\|[\s\S]*?\|\}/g)]

  for (const tableMatch of tableMatches) {
    const result = parseSingleTable(tableMatch[0])
    if (result.rows.length > 0) return result
  }

  return { headers: [], rows: parseWikitable(wikitext) }
}
