/**
 * Vercel Serverless Function: /api/article
 *
 * Fetches full article HTML server-side (no CORS) and extracts paragraph text.
 * Query params:
 *   url — the article URL to fetch and parse
 *
 * Returns: { success, text, paragraphs, wordCount, method, url }
 */

export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  if (req.method === 'OPTIONS') return res.status(200).end()

  const rawUrl = typeof req.query.url === 'string' ? req.query.url.trim() : ''
  if (!rawUrl) {
    return res.status(400).json({ success: false, error: 'url parameter is required', text: '' })
  }

  try { new URL(rawUrl) } catch {
    return res.status(400).json({ success: false, error: 'Invalid URL', text: '' })
  }

  try {
    const r = await fetch(rawUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9,hi;q=0.8',
        'Accept-Encoding': 'identity',
      },
      signal: AbortSignal.timeout(10000),
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

    return res.json({ success: true, text, paragraphs, wordCount, method, url: rawUrl, cached: false })
  } catch (e) {
    const msg = e.name === 'TimeoutError' ? 'Article fetch timed out (10s)' : e.message
    return res.status(500).json({ success: false, error: msg, text: '' })
  }
}
