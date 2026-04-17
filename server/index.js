import express from 'express'
import path from 'path'
import { fileURLToPath } from 'url'
import 'dotenv/config'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const PORT = Number(process.env.PORT) || 8787
const CACHE_MS = 15 * 60 * 1000   // 15 minutes

/** In-memory cache: key → { data, time } */
const cache = new Map()

const app = express()

function mapArticle(a) {
  return {
    title: a.title ?? '',
    description: a.description ?? '',
    urlToImage: a.urlToImage ?? '',
    publishedAt: a.publishedAt ?? '',
    source: a.source?.name ?? '',
    url: a.url ?? '',
  }
}

/** Return cached payload, or null if missing/expired/busted */
function getCached(key, bust) {
  if (bust) return null
  const hit = cache.get(key)
  if (hit && Date.now() - hit.time < CACHE_MS) return hit.data
  return null
}

function setCached(key, data) {
  cache.set(key, { data, time: Date.now() })
}

function getApiKey(res) {
  const apiKey = process.env.NEWS_API_KEY
  console.log(process.env.NEWS_API_KEY);
  if (!apiKey) {
    res.status(500).json({
      success: false,
      error: 'Server is missing NEWS_API_KEY — add it to your .env file',
      articles: [],
    })
    return null
  }
  return apiKey
}

/**
 * GET /api/news
 * GET /api/news/top-headlines
 *
 * Fetches India headlines (country=in) AND global English headlines (language=en)
 * in parallel, merges them (India first), deduplicates by URL, returns combined list.
 * NOTE: NewsAPI does not allow mixing country + language in one call, so we make two.
 *
 * Query params:
 *   category  — general | business | technology | science | health | sports | entertainment
 *   q         — extra keyword filter
 *   pageSize  — per-source request size, default 30 (returned list may be up to 2×)
 *   bust      — any truthy value skips the server cache
 */
async function handleTopHeadlines(req, res) {
  const category = typeof req.query.category === 'string' ? req.query.category.trim() : ''
  const q = typeof req.query.q === 'string' ? req.query.q.trim() : ''
  const pageSize = Math.min(Number(req.query.pageSize) || 30, 100)
  const bust = !!req.query.bust

  const cacheKey = `headlines::${category}::${q}::${pageSize}`
  const cached = getCached(cacheKey, bust)
  if (cached) return res.json({ ...cached, cached: true })

  const apiKey = getApiKey(res)
  if (!apiKey) return

  /** Build a NewsAPI top-headlines URL for a given country or language */
  function buildUrl({ country, language }) {
    const u = new URL('https://newsapi.org/v2/top-headlines')
    u.searchParams.set('apiKey', apiKey)
    u.searchParams.set('pageSize', String(pageSize))
    if (country) u.searchParams.set('country', country)
    if (language) u.searchParams.set('language', language)
    if (category) u.searchParams.set('category', category)
    if (q) u.searchParams.set('q', q)
    // NewsAPI requires at least one filter other than apiKey
    if (!country && !language && !category && !q) u.searchParams.set('q', 'news')
    return u
  }

  // India keyword queries per category (used as fallback when country=in returns 0)
  const INDIA_QUERIES = {
    sports: 'IPL OR cricket OR India sports OR kabaddi OR hockey India',
    technology: 'India technology OR Indian startup OR ISRO OR Indian AI',
    business: 'India economy OR BSE OR NSE OR RBI OR Indian markets',
    health: 'India health OR Indian hospital OR AIIMS OR Indian medicine',
    science: 'India science OR ISRO OR Indian research OR DRDO',
    entertainment: 'Bollywood OR Indian cinema OR OTT India OR Indian music',
    general: 'India news OR Indian government OR BJP OR Congress',
    '': 'India OR IPL OR cricket OR Bollywood OR ISRO OR Indian',
  }

  try {
    // Fetch India (country=in) + global English in parallel
    const [indiaRes, globalRes] = await Promise.allSettled([
      fetch(buildUrl({ country: 'in' })),
      fetch(buildUrl({ language: 'en' })),
    ])

    const parseArticles = async (settled) => {
      if (settled.status !== 'fulfilled') return []
      const json = await settled.value.json().catch(() => ({}))
      if (json.status !== 'ok') {
        console.warn('[top-headlines] partial error:', json.code, json.message)
        return []
      }
      return (json.articles || [])
        .filter(a => a.title && a.title !== '[Removed]')
        .map(mapArticle)
    }

    let [indiaArticles, globalArticles] = await Promise.all([
      parseArticles(indiaRes),
      parseArticles(globalRes),
    ])

    // If country=in returned nothing (free-tier restriction), supplement with /everything India keywords
    if (indiaArticles.length === 0) {
      const indiaQ = (q ? `${q} India` : INDIA_QUERIES[category] || INDIA_QUERIES[''])
      try {
        const indiaEverythingUrl = new URL('https://newsapi.org/v2/everything')
        indiaEverythingUrl.searchParams.set('apiKey', apiKey)
        indiaEverythingUrl.searchParams.set('q', indiaQ)
        indiaEverythingUrl.searchParams.set('language', 'en')
        indiaEverythingUrl.searchParams.set('sortBy', 'publishedAt')
        indiaEverythingUrl.searchParams.set('pageSize', String(pageSize))
        const indiaEr = await fetch(indiaEverythingUrl)
        const indiaEj = await indiaEr.json().catch(() => ({}))
        if (indiaEj.status === 'ok') {
          indiaArticles = (indiaEj.articles || [])
            .filter(a => a.title && a.title !== '[Removed]')
            .map(mapArticle)
          console.log(`[top-headlines] India fallback via /everything q="${indiaQ.slice(0, 50)}" → ${indiaArticles.length}`)
        }
      } catch (ie) {
        console.warn('[top-headlines] India keyword fallback failed:', ie.message)
      }
    }

    // Merge: India first (so IPL / local news appears at top), then global — deduplicate by URL
    const seen = new Set()
    const articles = []
    for (const a of [...indiaArticles, ...globalArticles]) {
      if (a.url && !seen.has(a.url)) {
        seen.add(a.url)
        articles.push(a)
      }
    }

    console.log(`[top-headlines] India:${indiaArticles.length} Global:${globalArticles.length} → Merged:${articles.length} (category="${category || 'all'}")`)

    if (!articles.length) {
      return res.status(502).json({ success: false, error: 'No articles returned from NewsAPI', articles: [] })
    }

    const payload = { success: true, articles, total: articles.length, cached: false }
    setCached(cacheKey, payload)
    res.json(payload)
  } catch (e) {
    console.error('[top-headlines]', e.message)
    res.status(500).json({ success: false, error: 'Failed to fetch top headlines', articles: [] })
  }
}

/**
 * GET /api/news/everything
 *
 * Query params:
 *   q         — search query (required by NewsAPI for /everything)
 *   language  — default en
 *   sortBy    — relevant | popularity | publishedAt (default publishedAt)
 *   pageSize  — max 100, default 12
 *   bust      — any truthy value skips cache
 */
async function handleEverything(req, res) {
  const q = typeof req.query.q === 'string' ? req.query.q.trim() : ''
  const language = typeof req.query.language === 'string' ? req.query.language.trim() : 'en'
  const sortBy = typeof req.query.sortBy === 'string' ? req.query.sortBy.trim() : 'publishedAt'
  const pageSize = Math.min(Number(req.query.pageSize) || 12, 100)
  const bust = !!req.query.bust

  if (!q) {
    return res.status(400).json({ success: false, error: 'q parameter is required for /everything', articles: [] })
  }

  const cacheKey = `everything::${q}::${language}::${sortBy}::${pageSize}`
  const cached = getCached(cacheKey, bust)
  if (cached) return res.json({ ...cached, cached: true })

  const apiKey = getApiKey(res)
  if (!apiKey) return

  try {
    const url = new URL('https://newsapi.org/v2/everything')
    url.searchParams.set('apiKey', apiKey)
    url.searchParams.set('q', q)
    url.searchParams.set('language', language)
    url.searchParams.set('sortBy', sortBy)
    url.searchParams.set('pageSize', String(pageSize))

    console.log(`[everything] → q="${q.slice(0, 60)}..." pageSize=${pageSize}`)
    const r = await fetch(url)
    const json = await r.json()

    if (json.status !== 'ok') {
      console.error('[everything] NewsAPI error:', json.code, json.message)
      // Graceful fallback: /everything fails (e.g. free-tier restrictions) → try top-headlines
      console.log('[everything] Falling back to /top-headlines...')
      return handleTopHeadlines({ ...req, query: { pageSize, bust } }, res)
    }

    const articles = (json.articles || [])
      .filter(a => a.title && a.title !== '[Removed]')
      .map(mapArticle)

    const payload = { success: true, articles, total: json.totalResults ?? articles.length, cached: false }
    setCached(cacheKey, payload)
    res.json(payload)
  } catch (e) {
    console.error('[everything]', e.message)
    res.status(500).json({ success: false, error: 'Failed to fetch articles', articles: [] })
  }
}

// ── Routes ──────────────────────────────────────────────────────
app.get('/api/news', handleTopHeadlines)
app.get('/api/news/top-headlines', handleTopHeadlines)
app.get('/api/news/everything', handleEverything)

/**
 * GET /api/article?url=<encoded-url>
 *
 * Fetches the full article HTML server-side (no CORS limits) and extracts
 * meaningful paragraph text. Cached for 30 minutes per URL.
 *
 * Returns: { success, text, paragraphs, wordCount, url }
 */
const ARTICLE_CACHE_MS = 30 * 60 * 1000
const articleCache = new Map()

app.get('/api/article', async (req, res) => {
  const rawUrl = typeof req.query.url === 'string' ? req.query.url.trim() : ''
  if (!rawUrl) {
    return res.status(400).json({ success: false, error: 'url parameter is required', text: '' })
  }

  try { new URL(rawUrl) } catch {
    return res.status(400).json({ success: false, error: 'Invalid URL', text: '' })
  }

  // Cache check
  const cacheHit = articleCache.get(rawUrl)
  if (cacheHit && Date.now() - cacheHit.time < ARTICLE_CACHE_MS) {
    return res.json({ ...cacheHit.data, cached: true })
  }

  try {
    console.log(`[article] Fetching → ${rawUrl.slice(0, 80)}`)
    const r = await fetch(rawUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9,hi;q=0.8',
        'Accept-Encoding': 'identity',
      },
      signal: AbortSignal.timeout(12000),
      redirect: 'follow',
    })

    if (!r.ok) {
      return res.status(502).json({ success: false, error: `Site returned ${r.status}`, text: '' })
    }

    const html = await r.text()

    // ── Helper: clean HTML string to plain text ────────────────
    function htmlToText(h) {
      return (h || '')
        .replace(/<br\s*\/?>/gi, '\n')
        .replace(/<[^>]+>/g, ' ')
        .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
        .replace(/&nbsp;/g, ' ').replace(/&quot;/g, '"').replace(/&apos;/g, "'")
        .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(n))
        .replace(/&[a-z]+;/gi, '')
        .replace(/\s+/g, ' ')
        .trim()
    }

    function isJunk(t) {
      if (t.length < 40) return true
      if (/^(advertisement|subscribe|sign in|sign up|cookie|follow us|share this|read more|related|you may also)/i.test(t)) return true
      if (/©|copyright|\bads?\b|newsletter|unsubscribe|terms of use|privacy policy/i.test(t)) return true
      if (/^\s*(image|photo|video|caption|credit|getty|reuters|ap photo)/i.test(t)) return true
      return false
    }

    function dedupe(arr) {
      const seen = new Set()
      return arr.filter(p => {
        const key = p.toLowerCase().replace(/\s+/g, ' ').slice(0, 100)
        if (seen.has(key)) return false
        seen.add(key)
        return true
      })
    }

    // Strip junk sections
    const stripped = html
      .replace(/<!--[\s\S]*?-->/g, '')
      .replace(/<script[\s\S]*?<\/script>/gi, '')
      .replace(/<style[\s\S]*?<\/style>/gi, '')
      .replace(/<(nav|header|footer|aside|figcaption|menu|form|iframe|noscript|svg)[^>]*>[\s\S]*?<\/\1>/gi, '')

    let paragraphs = []
    let method = ''

    // ── Strategy 1: JSON-LD structured data ─────────────────────
    //    Many news sites embed full article text in <script type="application/ld+json">
    if (!paragraphs.length) {
      const ldMatches = html.match(/<script[^>]*type\s*=\s*["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi) || []
      for (const block of ldMatches) {
        try {
          const json = block.replace(/<\/?script[^>]*>/gi, '').trim()
          const parsed = JSON.parse(json)
          const items = Array.isArray(parsed) ? parsed : [parsed]
          for (const item of items) {
            const body = item.articleBody || item.text || ''
            if (body.length > 200) {
              const candidate = dedupe(body.split(/\n{2,}|\. (?=[A-Z])/).map(s => s.trim()).filter(s => !isJunk(s)))
              const wc = candidate.join(' ').split(/\s+/).length
              if (candidate.length >= 2 && wc >= 100) {
                paragraphs = candidate
                method = 'JSON-LD'
                break
              }
            }
          }
        } catch { /* malformed JSON-LD, skip */ }
        if (method) break
      }
    }

    // ── Strategy 2: <article> tag content ───────────────────────
    if (!paragraphs.length) {
      const articleMatch = stripped.match(/<article[^>]*>([\s\S]*?)<\/article>/i)
      if (articleMatch) {
        const artHtml = articleMatch[1]
        const pTags = artHtml.match(/<p[^>]*>[\s\S]*?<\/p>/gi) || []
        const extracted = pTags.map(p => htmlToText(p)).filter(t => !isJunk(t))
        if (extracted.length >= 2) {
          paragraphs = dedupe(extracted)
          method = '<article> tag'
        }
      }
    }

    // ── Strategy 3: <p> tags from content/main/body containers ──
    if (!paragraphs.length) {
      // Try content containers first
      const containerRegex = /<(div|section|main)[^>]*(?:class|id)\s*=\s*["'][^"']*(?:content|article|story|post|entry|body|text)[^"']*["'][^>]*>([\s\S]*?)<\/\1>/gi
      let containerMatch
      let bestParagraphs = []
      while ((containerMatch = containerRegex.exec(stripped)) !== null) {
        const pTags = containerMatch[2].match(/<p[^>]*>[\s\S]*?<\/p>/gi) || []
        const extracted = pTags.map(p => htmlToText(p)).filter(t => !isJunk(t))
        if (extracted.length > bestParagraphs.length) {
          bestParagraphs = extracted
        }
      }
      if (bestParagraphs.length >= 2) {
        paragraphs = dedupe(bestParagraphs)
        method = 'content container'
      }
    }

    // ── Strategy 4: All <p> tags globally ───────────────────────
    if (!paragraphs.length) {
      const pTags = stripped.match(/<p[^>]*>[\s\S]*?<\/p>/gi) || []
      const extracted = pTags.map(p => htmlToText(p)).filter(t => !isJunk(t))
      if (extracted.length >= 2) {
        paragraphs = dedupe(extracted)
        method = 'all <p> tags'
      }
    }

    // ── Strategy 5: <div> and <li> tags as fallback ─────────────
    if (!paragraphs.length) {
      const divTags = stripped.match(/<(?:div|li|td|span)[^>]*>([^<]{80,})<\/(?:div|li|td|span)>/gi) || []
      const extracted = divTags.map(d => htmlToText(d)).filter(t => !isJunk(t) && t.length > 80)
      if (extracted.length >= 1) {
        paragraphs = dedupe(extracted)
        method = 'div/li fallback'
      }
    }

    // ── Strategy 6: meta tags as absolute last resort ───────────
    if (!paragraphs.length) {
      const ogDesc = html.match(/<meta[^>]*property\s*=\s*["']og:description["'][^>]*content\s*=\s*["']([^"']+)["']/i)
      const metaDesc = html.match(/<meta[^>]*name\s*=\s*["']description["'][^>]*content\s*=\s*["']([^"']+)["']/i)
      const desc = htmlToText(ogDesc?.[1] || metaDesc?.[1] || '')
      if (desc.length > 50) {
        paragraphs = [desc]
        method = 'meta description'
      }
    }

    if (!paragraphs.length) {
      return res.status(422).json({
        success: false,
        error: 'Could not extract article — site may be JavaScript-rendered or paywalled',
        text: '',
      })
    }

    const text = paragraphs.join('\n\n')
    const wordCount = text.split(/\s+/).length

    console.log(`[article] ✓ ${method}: ${paragraphs.length} paragraphs, ~${wordCount} words`)

    const data = { success: true, text, paragraphs, wordCount, method, url: rawUrl, cached: false }
    articleCache.set(rawUrl, { data, time: Date.now() })
    res.json(data)
  } catch (e) {
    const msg = e.name === 'TimeoutError' ? 'Article fetch timed out (12s)' : e.message
    console.error('[article]', msg)
    res.status(500).json({ success: false, error: msg, text: '' })
  }
})


// Health check
app.get('/api/health', (_req, res) => {
  res.json({
    ok: true,
    keyConfigured: !!process.env.NEWS_API_KEY,
    cacheEntries: cache.size,
    uptime: Math.round(process.uptime()) + 's',
  })
})

// ── Production: serve the Vite build ────────────────────────────
if (process.env.NODE_ENV === 'production') {
  const dist = path.join(__dirname, '../dist')
  app.use(express.static(dist))
  app.get(/^(?!\/api).*/, (_req, res) => {
    res.sendFile(path.join(dist, 'index.html'))
  })
}

app.listen(PORT, () => {
  const key = process.env.NEWS_API_KEY
  console.log(`\n✅ NewsThread API server → http://localhost:${PORT}`)
  console.log(`   API key : ${key ? `${key.slice(0, 6)}…${key.slice(-4)} (loaded)` : '❌ NOT SET — add NEWS_API_KEY to .env'}`)
  console.log(`   Routes  : GET /api/news  (top-headlines, cached 15 min)`)
  console.log(`             GET /api/news/top-headlines`)
  console.log(`             GET /api/news/everything  (with /top-headlines fallback)`)
  console.log(`             GET /api/health\n`)
})
