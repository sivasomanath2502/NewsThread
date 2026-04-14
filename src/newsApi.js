import { stories as fallbackStories } from './stories.js'

const CACHE_PREFIX = 'nt_daily_news_v3'
const DEFAULT_INTERESTS = ['Politics', 'Technology', 'Health', 'Science', 'Climate']

const INTEREST_QUERY_MAP = {
  Politics: 'india politics OR election OR government policy',
  Finance: 'india finance OR markets OR RBI OR banking',
  Technology: 'india technology OR AI OR startup OR software',
  Climate: 'climate change OR renewable energy OR environment india',
  Health: 'public health OR healthcare india OR medicine',
  Urban: 'city infrastructure OR transport OR water crisis OR housing india',
  Science: 'science discovery OR space OR research india',
  Economy: 'india economy OR inflation OR jobs OR trade',
}

const QUESTION_BANK = {
  Politics: ['Tighter regulation', 'More public debate', 'Slow implementation'],
  Finance: ['Markets rise', 'Markets fall', 'Little immediate change'],
  Technology: ['Faster adoption', 'Stricter oversight', 'Mixed rollout'],
  Climate: ['Policy action increases', 'Impact worsens first', 'Progress stays uneven'],
  Health: ['Public concern rises', 'Officials add support', 'The issue fades quickly'],
  Urban: ['Services improve', 'Disruptions continue', 'Change remains uneven'],
  Science: ['Breakthrough accelerates', 'Caution slows rollout', 'Interest grows steadily'],
  Economy: ['Growth picks up', 'Pressure on households rises', 'Conditions stay mixed'],
}

const DEFAULT_QUESTION = ['Positive turn', 'Negative turn', 'Mixed outcome']

function getTodayKey(interests) {
  const day = new Date().toISOString().slice(0, 10)
  const topicKey = [...interests].sort().join('|') || 'general'
  return `${CACHE_PREFIX}:${day}:${topicKey}`
}

function inferCategory(article, selectedInterests) {
  const title = `${article.title ?? ''}`.toLowerCase()
  const body = `${article.description ?? ''} ${article.content ?? ''}`.toLowerCase()
  const entertainmentMarkers = [
    'ott', 'season', 'episode', 'series', 'trailer', 'box office', 'movie',
    'film', 'showrunner', 'streaming', 'celebrity', 'cast', 'release date',
  ]

  if (entertainmentMarkers.some((k) => title.includes(k) || body.includes(k))) {
    return 'General'
  }

  const checks = [
    ['Technology', ['ai', 'tech', 'software', 'startup', 'semiconductor', 'cyber']],
    ['Finance', ['market', 'rbi', 'bank', 'stock', 'loan', 'fund', 'rupee']],
    ['Economy', ['economy', 'inflation', 'gdp', 'trade', 'manufacturing', 'jobs']],
    ['Climate', ['climate', 'emission', 'renewable', 'heatwave', 'flood', 'pollution']],
    ['Health', ['health', 'hospital', 'medical', 'disease', 'vaccine', 'mental health']],
    ['Urban', ['metro', 'traffic', 'transit', 'water', 'city', 'infrastructure']],
    ['Science', ['science', 'research', 'space', 'nasa', 'isro', 'study']],
    ['Politics', ['election', 'minister', 'parliament', 'policy', 'government', 'court']],
  ]

  let bestCategory = 'General'
  let bestScore = 0

  for (const [category, keywords] of checks) {
    let score = 0
    for (const keyword of keywords) {
      if (title.includes(keyword)) score += 2
      else if (body.includes(keyword)) score += 1
    }
    if (score > bestScore) {
      bestScore = score
      bestCategory = category
    }
  }

  // Be conservative: only assign a specific category for stronger signals.
  if (bestScore >= 2) return bestCategory

  return 'General'
}

function buildTimeline(article) {
  const published = article.publishedAt ? new Date(article.publishedAt) : new Date()
  const publishedDate = published.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })

  return [
    {
      date: publishedDate,
      event: 'Article published',
      details: article.description || 'This story was published and added to your daily feed.',
    },
    {
      date: publishedDate,
      event: `Reported by ${article.source?.name || 'News source'}`,
      details: article.title || 'The article is being tracked in your feed.',
    },
    {
      date: 'Today',
      event: 'Latest update in your feed',
      details: article.content || article.description || 'Open the full article to read the latest summary.',
    },
  ]
}

function buildRecap(article) {
  // Local heuristic recap generation (no LLM/API call), with de-duplication.
  const title = String(article.title || '').trim()
  const description = String(article.description || '').trim()
  const content = String(article.content || '').replace(/\[\+\d+\s+chars\]$/i, '').trim()

  const hasTruncation = (text) => /(\.\.\.|…)\s*$/.test(String(text || '').trim())
  const cleanSentence = (text) => String(text || '').replace(/\s+/g, ' ').trim()
  const isCompleteSentence = (text) => /[.!?]["')\]]?\s*$/.test(String(text || '').trim()) && !hasTruncation(text)

  const sentenceCandidates = [
    ...content.split(/(?<=[.!?])\s+/).map((s) => cleanSentence(s)),
    cleanSentence(description),
    cleanSentence(title),
  ]
    .filter(Boolean)
    .filter((s) => s.length > 30)
    .filter((s) => !hasTruncation(s))

  const normalise = (text) =>
    text
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
  const tokenSet = (text) => new Set(normalise(text).split(' ').filter(Boolean))
  const jaccard = (a, b) => {
    const inter = [...a].filter((t) => b.has(t)).length
    const union = new Set([...a, ...b]).size || 1
    return inter / union
  }

  const picked = []
  const seen = new Set()

  for (const sentence of sentenceCandidates) {
    const finalSentence = isCompleteSentence(sentence) ? sentence : `${sentence.replace(/[.]+$/,'').trim()}.`
    if (!isCompleteSentence(finalSentence)) continue

    const n = normalise(finalSentence)
    if (!n || seen.has(n)) continue

    // Skip near-duplicates (prefix overlap both ways).
    const isNearDuplicate = [...seen].some((prev) => prev.startsWith(n) || n.startsWith(prev))
    if (isNearDuplicate) continue

    // Skip high-overlap paraphrases/truncated repeats.
    const currTokens = tokenSet(finalSentence)
    const isHighOverlap = picked.some((prevSentence) => jaccard(currTokens, tokenSet(prevSentence)) >= 0.72)
    if (isHighOverlap) continue

    seen.add(n)
    picked.push(finalSentence)
    if (picked.length === 2) break
  }

  while (picked.length < 2) {
    picked.push(picked.length === 0 ? 'A fresh article matched your selected interests.' : 'Open the linked sources for evolving updates in this story.')
  }

  return [
    picked[0],
    picked[1],
    `Source: ${article.source?.name || 'Unknown source'}. Updated ${new Date(article.publishedAt || Date.now()).toLocaleString()}.`,
  ]
}

function toStory(article, index, selectedInterests) {
  const category = inferCategory(article, selectedInterests)
  const questionOptions = QUESTION_BANK[category] || DEFAULT_QUESTION
  const articleBody = [article.description, article.content, article.url && `Read the original article: ${article.url}`]
    .filter(Boolean)
    .join('\n\n')

  return {
    id: `newsapi-${index}-${article.publishedAt || Date.now()}`,
    title: article.title || 'Untitled article',
    category,
    description: article.description || 'Latest article from your selected topics.',
    tag: article.source?.name || 'Live update',
    readTime: '3 min',
    imageUrl: article.urlToImage || '',
    timeline: buildTimeline(article),
    recap: buildRecap(article),
    article: articleBody,
    question: {
      text: 'What do you think happens next?',
      options: questionOptions,
    },
    simulatedUpdate: null,
    sourceUrl: article.url || '',
    publishedAt: article.publishedAt || new Date().toISOString(),
  }
}

function getQuery(interests) {
  const topics = interests.length ? interests : DEFAULT_INTERESTS
  return topics
    .map((interest) => `(${INTEREST_QUERY_MAP[interest] || interest})`)
    .join(' OR ')
}

export async function fetchDailyStories(interests = []) {
  const cacheKey = getTodayKey(interests)
  const cached = localStorage.getItem(cacheKey)

  if (cached) {
    try {
      const parsed = JSON.parse(cached)
      if (Array.isArray(parsed) && parsed.length) return parsed
    } catch {
      localStorage.removeItem(cacheKey)
    }
  }

  const params = new URLSearchParams({
    q: getQuery(interests),
    language: 'en',
    sortBy: 'publishedAt',
    pageSize: '12',
  })

  const response = await fetch(`/api/news/everything?${params.toString()}`)

  if (!response.ok) {
    let details = ''
    try {
      const errJson = await response.json()
      details = errJson?.message || errJson?.error || ''
    } catch {
      // ignore
    }
    throw new Error(`NewsAPI error (${response.status})${details ? `: ${details}` : ''}`)
  }

  const data = await response.json()
  const articles = Array.isArray(data.articles) ? data.articles : []

  const stories = articles
    .filter((article) => article.title && article.title !== '[Removed]')
    .map((article, index) => toStory(article, index, interests))

  if (!stories.length) {
    throw new Error('No articles returned from News API')
  }

  localStorage.setItem(cacheKey, JSON.stringify(stories))
  return stories
}

function keywordQueryFromTitle(title) {
  const raw = String(title || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(Boolean)

  const stop = new Set([
    'the','a','an','and','or','to','of','in','on','for','with','as','at','by','from',
    'is','are','was','were','be','been','being','it','this','that','these','those',
    'after','before','over','into','across','amid','new','says','report',
  ])

  const keywords = raw.filter(w => w.length >= 4 && !stop.has(w)).slice(0, 7)
  return keywords.length ? keywords.join(' ') : raw.slice(0, 60)
}

function tokenise(text) {
  return String(text || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(Boolean)
}

function significantTokens(text) {
  const stop = new Set([
    'the','a','an','and','or','to','of','in','on','for','with','as','at','by','from',
    'is','are','was','were','be','been','being','it','this','that','these','those',
    'after','before','over','into','across','amid','new','says','report','news','day',
  ])
  return tokenise(text).filter((t) => t.length >= 4 && !stop.has(t))
}

function isLikelyRelated(baseStory, candidate) {
  const baseText = `${baseStory?.title || ''} ${baseStory?.description || ''}`
  const candidateText = `${candidate?.title || ''} ${candidate?.description || ''} ${candidate?.content || ''}`

  const baseTokens = significantTokens(baseText)
  const candidateTokens = new Set(significantTokens(candidateText))

  if (!baseTokens.length) return true

  // Require at least two meaningful token overlaps to reduce noisy matches.
  const overlapCount = baseTokens.filter((t) => candidateTokens.has(t)).length
  if (overlapCount >= 2) return true

  // If story title has a two-word proper-name pattern, require exact phrase mention.
  const words = tokenise(baseStory?.title || '')
  if (words.length >= 2) {
    const phrase = `${words[0]} ${words[1]}`.trim()
    if (phrase.length >= 7 && candidateText.toLowerCase().includes(phrase)) return true
  }

  return false
}

function normaliseHeadline(text) {
  return String(text || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function articleToTimelineItem(a) {
  const d = a.publishedAt ? new Date(a.publishedAt) : new Date()
  const date = d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
  const source = a.source?.name || ''
  return {
    date,
    event: a.title,
    details: a.description || source || 'Related coverage',
    url: a.url || '',
    source,
    links: a.url
      ? [{ source: source || 'Source', url: a.url }]
      : [],
  }
}

function dedupeTimeline(items) {
  const grouped = new Map()

  for (const item of items) {
    const key = `${item.date}::${normaliseHeadline(item.event)}`
    const existing = grouped.get(key)
    if (!existing) {
      grouped.set(key, { ...item })
      continue
    }

    const sources = new Set(
      [existing.source, item.source]
        .filter(Boolean)
        .flatMap((s) => String(s).split(',').map((v) => v.trim()).filter(Boolean)),
    )
    existing.source = Array.from(sources).slice(0, 3).join(', ')

    const allLinks = [...(existing.links || []), ...(item.links || [])]
    const uniqByUrl = new Map()
    for (const link of allLinks) {
      if (link?.url && !uniqByUrl.has(link.url)) uniqByUrl.set(link.url, link)
    }
    existing.links = Array.from(uniqByUrl.values()).slice(0, 3)
  }

  return Array.from(grouped.values())
}

export async function fetchRelatedTimeline(story) {
  const storyId = String(story?.id ?? '')
  const title = story?.title || ''
  const q = keywordQueryFromTitle(title)
  const day = new Date().toISOString().slice(0, 10)
  const cacheKey = `nt_related:v2:${day}:${storyId}`

  const cached = localStorage.getItem(cacheKey)
  if (cached) {
    try {
      const parsed = JSON.parse(cached)
      if (Array.isArray(parsed)) return parsed
    } catch {
      localStorage.removeItem(cacheKey)
    }
  }

  const params = new URLSearchParams({
    q,
    language: 'en',
    sortBy: 'publishedAt',
    pageSize: '10',
  })

  const res = await fetch(`/api/news/everything?${params.toString()}`)
  if (!res.ok) {
    let details = ''
    try {
      const errJson = await res.json()
      details = errJson?.message || errJson?.error || ''
    } catch {
      // ignore
    }
    throw new Error(`NewsAPI related error (${res.status})${details ? `: ${details}` : ''}`)
  }

  const data = await res.json()
  const articles = Array.isArray(data.articles) ? data.articles : []

  const timeline = dedupeTimeline(
    articles
    .filter(a => a?.title && a.title !== '[Removed]')
    .filter((a) => isLikelyRelated(story, a))
    .map(articleToTimelineItem),
  )

  // Fallback gracefully if filtering is too strict for a niche topic.
  const finalTimeline = timeline.length
    ? timeline
    : dedupeTimeline(articles
        .filter(a => a?.title && a.title !== '[Removed]')
        .slice(0, 6)
        .map(articleToTimelineItem))

  localStorage.setItem(cacheKey, JSON.stringify(finalTimeline))
  return finalTimeline
}

export { fallbackStories }
