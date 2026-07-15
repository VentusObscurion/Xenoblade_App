export function cleanWikiMarkup(text: string): string {
  if (!text) return text

  return text
    .replace(/\[\[(?:File|Image|Datei):[^\]]*\]\]/gi, '')
    .replace(/\[\[([^|\]]+)\|([^\]]+)\]\]/g, '$2')
    .replace(/\[\[([^\]]+)\]\]/g, '$1')
    .replace(/\[\[([^|\]#]+)(?:\|([^\]]*))?/g, (_, page, display) => (display || page).trim())
    .replace(/\{\{([^}|]+)(?:\|[^}]*)?\}\}/g, '$1')
    .replace(/\[\[?/g, '')
    .replace(/\]\]?/g, '')
    .replace(/#([A-Za-z0-9_ ()]+)/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}
