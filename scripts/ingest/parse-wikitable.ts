import { stripWikiMarkup } from './parse-infobox.ts'

export interface WikiTableRow {
  cells: string[]
}

function parseRowCells(rowText: string): string[] {
  const cells: string[] = []
  let currentCell = ''
  const lines = rowText.split('\n')

  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed) continue

    if (trimmed.startsWith('|-') || trimmed.startsWith('{|') || trimmed === '|}') continue

    if (trimmed.startsWith('!')) continue

    if (trimmed.startsWith('|')) {
      if (currentCell) {
        cells.push(stripWikiMarkup(currentCell.trim()))
        currentCell = ''
      }

      const cellContent = trimmed.slice(1).trim()
      if (cellContent.includes('||')) {
        const inlineParts = cellContent.split('||')
        for (let i = 0; i < inlineParts.length; i++) {
          const part = stripWikiMarkup(inlineParts[i].trim())
          if (i === 0 && cells.length > 0 && inlineParts.length > 1) {
            cells.push(part)
          } else if (i === 0 && inlineParts.length > 1) {
            cells.push(part)
          } else {
            cells.push(part)
          }
        }
      } else {
        currentCell = cellContent
      }
    } else {
      currentCell += (currentCell ? '\n' : '') + trimmed
    }
  }

  if (currentCell) {
    cells.push(stripWikiMarkup(currentCell.trim()))
  }

  return cells.filter((c) => c.length > 0)
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
