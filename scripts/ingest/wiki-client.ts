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
