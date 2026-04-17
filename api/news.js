/**
 * Vercel Serverless Function: /api/news
 *
 * Handles both top-headlines and everything queries.
 * Query params:
 *   q         — search query (if provided, uses /everything endpoint)
 *   category  — headline category filter
 *   language  — default "en"
 *   sortBy    — publishedAt | relevancy | popularity
 *   pageSize  — max 100, default 30
 *   bust      — skip cache (no-op for serverless, kept for compat)
 */

// In-memory cache (survives within a single warm function instance)
const cache = new Map()
const CACHE_MS = 10 * 60 * 1000 // 10 minutes

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

function getCached(key) {
  const hit = cache.get(key)
  if (hit && Date.now() - hit.time < CACHE_MS) return hit.data
  return null
}

function setCached(key, data) {
  cache.set(key, { data, time: Date.now() })
}

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

export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  if (req.method === 'OPTIONS') return res.status(200).end()

  const API_KEY = process.env.NEWS_API_KEY
  if (!API_KEY) {
    return res.status(500).json({
      success: false,
      error: 'Server is missing NEWS_API_KEY — set it in Vercel Environment Variables',
      articles: [],
    })
  }

  const q = typeof req.query.q === 'string' ? req.query.q.trim() : ''
  const category = typeof req.query.category === 'string' ? req.query.category.trim() : ''
  const language = typeof req.query.language === 'string' ? req.query.language.trim() : 'en'
  const sortBy = typeof req.query.sortBy === 'string' ? req.query.sortBy.trim() : 'publishedAt'
  const pageSize = Math.min(Number(req.query.pageSize) || 30, 100)
  const bust = !!req.query.bust

  // ---------- If `q` is provided → /everything endpoint ----------
  if (q) {
    const cacheKey = `everything::${q}::${language}::${sortBy}::${pageSize}`
    if (!bust) {
      const cached = getCached(cacheKey)
      if (cached) return res.json({ ...cached, cached: true })
    }

    try {
      const url = new URL('https://newsapi.org/v2/everything')
      url.searchParams.set('apiKey', API_KEY)
      url.searchParams.set('q', q)
      url.searchParams.set('language', language)
      url.searchParams.set('sortBy', sortBy)
      url.searchParams.set('pageSize', String(pageSize))

      const r = await fetch(url)
      const json = await r.json()

      if (json.status !== 'ok') {
        // Fallback to top-headlines if /everything fails (free-tier)
        return await handleTopHeadlines(req, res, API_KEY, pageSize, category, bust)
      }

      const articles = (json.articles || [])
        .filter(a => a.title && a.title !== '[Removed]')
        .map(mapArticle)

      const payload = { success: true, articles, total: json.totalResults ?? articles.length, cached: false }
      setCached(cacheKey, payload)
      return res.json(payload)
    } catch (e) {
      // Fallback
      return await handleTopHeadlines(req, res, API_KEY, pageSize, category, bust)
    }
  }

  // ---------- No `q` → top-headlines (India + Global merge) ----------
  return await handleTopHeadlines(req, res, API_KEY, pageSize, category, bust)
}

async function handleTopHeadlines(req, res, apiKey, pageSize, category, bust) {
  const q = typeof req.query.q === 'string' ? req.query.q.trim() : ''
  const cat = category || (typeof req.query.category === 'string' ? req.query.category.trim() : '')

  const cacheKey = `headlines::${cat}::${q}::${pageSize}`
  if (!bust) {
    const cached = getCached(cacheKey)
    if (cached) return res.json({ ...cached, cached: true })
  }

  function buildUrl({ country, language }) {
    const u = new URL('https://newsapi.org/v2/top-headlines')
    u.searchParams.set('apiKey', apiKey)
    u.searchParams.set('pageSize', String(pageSize))
    if (country) u.searchParams.set('country', country)
    if (language) u.searchParams.set('language', language)
    if (cat) u.searchParams.set('category', cat)
    if (q) u.searchParams.set('q', q)
    if (!country && !language && !cat && !q) u.searchParams.set('q', 'news')
    return u
  }

  try {
    const [indiaRes, globalRes] = await Promise.allSettled([
      fetch(buildUrl({ country: 'in' })),
      fetch(buildUrl({ language: 'en' })),
    ])

    const parseArticles = async (settled) => {
      if (settled.status !== 'fulfilled') return []
      const json = await settled.value.json().catch(() => ({}))
      if (json.status !== 'ok') return []
      return (json.articles || [])
        .filter(a => a.title && a.title !== '[Removed]')
        .map(mapArticle)
    }

    let [indiaArticles, globalArticles] = await Promise.all([
      parseArticles(indiaRes),
      parseArticles(globalRes),
    ])

    // Fallback: try /everything with India keywords
    if (indiaArticles.length === 0) {
      const indiaQ = q ? `${q} India` : (INDIA_QUERIES[cat] || INDIA_QUERIES[''])
      try {
        const indiaUrl = new URL('https://newsapi.org/v2/everything')
        indiaUrl.searchParams.set('apiKey', apiKey)
        indiaUrl.searchParams.set('q', indiaQ)
        indiaUrl.searchParams.set('language', 'en')
        indiaUrl.searchParams.set('sortBy', 'publishedAt')
        indiaUrl.searchParams.set('pageSize', String(pageSize))
        const ir = await fetch(indiaUrl)
        const ij = await ir.json().catch(() => ({}))
        if (ij.status === 'ok') {
          indiaArticles = (ij.articles || [])
            .filter(a => a.title && a.title !== '[Removed]')
            .map(mapArticle)
        }
      } catch { /* ignore */ }
    }

    // Merge India-first, dedupe by URL
    const seen = new Set()
    const articles = []
    for (const a of [...indiaArticles, ...globalArticles]) {
      if (a.url && !seen.has(a.url)) {
        seen.add(a.url)
        articles.push(a)
      }
    }

    if (!articles.length) {
      return res.status(502).json({ success: false, error: 'No articles returned from NewsAPI', articles: [] })
    }

    const payload = { success: true, articles, total: articles.length, cached: false }
    setCached(cacheKey, payload)
    return res.json(payload)
  } catch (e) {
    return res.status(500).json({ success: false, error: 'Failed to fetch top headlines', articles: [] })
  }
}