const WIKI_API = 'https://xenoblade.fandom.com/api.php'
const USER_AGENT = 'XenobladeTracker/1.0 (personal tracker PWA)'
const RATE_LIMIT_MS = 150

export interface WikiPage {
  pageid: number
  title: string
  wikitext?: string
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function apiRequest(params: Record<string, string>): Promise<unknown> {
  const url = new URL(WIKI_API)
  url.searchParams.set('format', 'json')
  url.searchParams.set('formatversion', '2')
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value)
  }

  const response = await fetch(url.toString(), {
    headers: { 'User-Agent': USER_AGENT },
  })

  if (!response.ok) {
    throw new Error(`Wiki API error: ${response.status} ${response.statusText}`)
  }

  await sleep(RATE_LIMIT_MS)
  return response.json()
}

export async function getCategoryMembers(category: string): Promise<WikiPage[]> {
  const members: WikiPage[] = []
  let continueToken: string | undefined

  do {
    const params: Record<string, string> = {
      action: 'query',
      list: 'categorymembers',
      cmtitle: `Category:${category}`,
      cmlimit: '500',
      maxlag: '5',
    }
    if (continueToken) {
      params.cmcontinue = continueToken
    }

    const data = (await apiRequest(params)) as {
      query?: { categorymembers?: WikiPage[] }
      continue?: { cmcontinue?: string }
    }

    if (data.query?.categorymembers) {
      members.push(...data.query.categorymembers)
    }
    continueToken = data.continue?.cmcontinue
  } while (continueToken)

  return members.filter((m) => !m.title.startsWith('Category:'))
}

/** Include subcategory pages (Category:*) as well as normal pages. */
export async function getCategoryMembersIncludingSubcats(
  category: string,
): Promise<WikiPage[]> {
  const members: WikiPage[] = []
  let continueToken: string | undefined

  do {
    const params: Record<string, string> = {
      action: 'query',
      list: 'categorymembers',
      cmtitle: `Category:${category}`,
      cmlimit: '500',
      maxlag: '5',
    }
    if (continueToken) {
      params.cmcontinue = continueToken
    }

    const data = (await apiRequest(params)) as {
      query?: { categorymembers?: WikiPage[] }
      continue?: { cmcontinue?: string }
    }

    if (data.query?.categorymembers) {
      members.push(...data.query.categorymembers)
    }
    continueToken = data.continue?.cmcontinue
  } while (continueToken)

  return members
}

/** Walk subcategories and collect leaf pages with wikitext. */
export async function getCategoryPagesRecursive(
  category: string,
  maxDepth = 2,
): Promise<WikiPage[]> {
  const pageByTitle = new Map<string, WikiPage>()
  const visitedCats = new Set<string>()

  async function walk(cat: string, depth: number): Promise<void> {
    if (depth < 0 || visitedCats.has(cat)) return
    visitedCats.add(cat)

    const members = await getCategoryMembersIncludingSubcats(cat)
    const pages: WikiPage[] = []
    const subcats: string[] = []

    for (const member of members) {
      if (member.title.startsWith('Category:')) {
        subcats.push(member.title.replace(/^Category:/, ''))
      } else {
        pages.push(member)
      }
    }

    if (pages.length > 0) {
      const withText = await getPageWikitext(pages.map((p) => p.title))
      const textByTitle = new Map(withText.map((p) => [p.title, p]))
      for (const page of pages) {
        const full = textByTitle.get(page.title)
        pageByTitle.set(page.title, {
          pageid: full?.pageid ?? page.pageid,
          title: page.title,
          wikitext: full?.wikitext,
        })
      }
    }

    for (const sub of subcats) {
      await walk(sub, depth - 1)
    }
  }

  await walk(category, maxDepth)
  return [...pageByTitle.values()]
}

export async function getPageWikitext(titles: string[]): Promise<WikiPage[]> {
  if (titles.length === 0) return []

  const pages: WikiPage[] = []
  const batchSize = 50

  for (let i = 0; i < titles.length; i += batchSize) {
    const batch = titles.slice(i, i + batchSize)
    const params: Record<string, string> = {
      action: 'query',
      prop: 'revisions',
      rvprop: 'content',
      rvslots: 'main',
      titles: batch.join('|'),
      maxlag: '5',
    }

    const data = (await apiRequest(params)) as {
      query?: {
        pages?: Array<{
          pageid: number
          title: string
          missing?: boolean
          revisions?: Array<{ slots?: { main?: { content?: string } } }>
        }>
      }
    }

    for (const page of data.query?.pages ?? []) {
      if (page.missing) continue
      const wikitext = page.revisions?.[0]?.slots?.main?.content
      pages.push({
        pageid: page.pageid,
        title: page.title,
        wikitext,
      })
    }
  }

  return pages
}

export async function getCategoryPagesWithWikitext(
  category: string,
): Promise<WikiPage[]> {
  const members = await getCategoryMembers(category)
  const titles = members.map((m) => m.title)
  const pagesWithText = await getPageWikitext(titles)

  const textByTitle = new Map(pagesWithText.map((p) => [p.title, p.wikitext]))
  const pageIdByTitle = new Map(members.map((m) => [m.title, m.pageid]))

  return members.map((m) => ({
    pageid: m.pageid ?? pageIdByTitle.get(m.title) ?? 0,
    title: m.title,
    wikitext: textByTitle.get(m.title),
  }))
}

export function wikiPageUrl(title: string): string {
  return `https://xenoblade.fandom.com/wiki/${encodeURIComponent(title.replace(/ /g, '_'))}`
}

/** Build a Fandom file URL from an infobox image filename. */
export function wikiFileUrl(filename: string, width = 360): string {
  const clean = filename
    .replace(/^File:/i, '')
    .replace(/^Image:/i, '')
    .trim()
  return `https://xenoblade.fandom.com/wiki/Special:FilePath/${encodeURIComponent(clean)}?width=${width}`
}

/** Pull a usable image filename out of infobox fields. */
export function extractWikiImageFilename(
  fields: Record<string, string>,
): string | undefined {
  const raw =
    fields.image ||
    fields.image1 ||
    fields.portrait ||
    fields.icon ||
    fields.img ||
    ''
  if (!raw) return undefined
  const match = raw.match(
    /(?:File:|Image:)?\s*([^|\][/\\]+\.(?:png|jpe?g|gif|webp|PNG|JPE?G|GIF|WEBP))/i,
  )
  if (!match) return undefined
  return match[1].trim()
}

export function imageUrlFromInfobox(
  fields: Record<string, string>,
  width = 360,
): string | undefined {
  const filename = extractWikiImageFilename(fields)
  if (!filename) return undefined
  return wikiFileUrl(filename, width)
}

/**
 * Resolve page thumbnail URLs via the MediaWiki pageimages API.
 * Keys are page titles as requested.
 */
export async function getPageThumbnails(
  titles: string[],
  thumbSize = 360,
): Promise<Map<string, string>> {
  const result = new Map<string, string>()
  if (titles.length === 0) return result

  const batchSize = 50
  for (let i = 0; i < titles.length; i += batchSize) {
    const batch = titles.slice(i, i + batchSize)
    const data = (await apiRequest({
      action: 'query',
      prop: 'pageimages',
      piprop: 'thumbnail',
      pithumbsize: String(thumbSize),
      titles: batch.join('|'),
      maxlag: '5',
    })) as {
      query?: {
        pages?: Array<{
          title: string
          missing?: boolean
          thumbnail?: { source?: string }
        }>
      }
    }

    for (const page of data.query?.pages ?? []) {
      if (page.missing || !page.thumbnail?.source) continue
      result.set(page.title, page.thumbnail.source)
    }
  }

  return result
}

export function titleFromWikiUrl(wikiUrl: string): string | undefined {
  try {
    const match = wikiUrl.match(/\/wiki\/([^?#]+)/)
    if (!match) return undefined
    return decodeURIComponent(match[1].replace(/_/g, ' '))
  } catch {
    return undefined
  }
}

export async function expandWikiTemplates(texts: string[]): Promise<string[]> {
  if (texts.length === 0) return []

  const results: string[] = []
  const batchSize = 20

  for (let i = 0; i < texts.length; i += batchSize) {
    const batch = texts.slice(i, i + batchSize)
    for (const text of batch) {
      const data = (await apiRequest({
        action: 'expandtemplates',
        text,
        maxlag: '5',
      })) as { expandtemplates?: { wikitext?: string } }
      results.push(data.expandtemplates?.wikitext ?? '')
    }
  }

  return results
}
