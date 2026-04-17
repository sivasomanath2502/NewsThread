/**
 * ArticleView — editorial magazine-style article renderer.
 * Drop this component into StoryView to replace the existing article section.
 *
 * Usage:
 *   import ArticleView from './ArticleView.jsx'
 *
 *   Replace the existing "FULL ARTICLE" section block with:
 *   <ArticleView
 *     story={story}
 *     rawArticleStr={rawArticleStr}
 *     articleIsJSX={articleIsJSX}
 *     articleFetching={articleFetching}
 *     articleFetchErr={articleFetchErr}
 *     JargonParagraph={JargonParagraph}
 *   />
 */

import { useState, useRef } from 'react'

/* ── Estimate reading progress through article ───────────────── */
function useArticleProgress(ref) {
  const [pct, setPct] = useState(0)
  if (typeof window !== 'undefined') {
    const observer = new IntersectionObserver(
      ([e]) => setPct(e.intersectionRatio * 100),
      { threshold: Array.from({ length: 101 }, (_, i) => i / 100) }
    )
    if (ref?.current) observer.observe(ref.current)
  }
  return pct
}

/* ── Classify paragraph role for richer rendering ────────────── */
function classifyParagraph(text, index) {
  const t = text.trim()
  if (index === 0) return 'lede'

  // Pull quote: short, punchy, often contains a quote or key stat
  if ((t.startsWith('"') || t.startsWith('\u201C')) && t.length < 220) return 'pullquote'
  if (/^\d[\d,.]*\s*(%|crore|lakh|billion|million|km|people)/.test(t) && t.length < 180) return 'stat'

  // Sub-header heuristic: all caps or very short ending with colon
  if (/^[A-Z\s]{10,50}:?\s*$/.test(t)) return 'subhead'

  return 'body'
}

/* ── Small decorative divider ────────────────────────────────── */
function Divider() {
  return (
    <div className="flex items-center justify-center gap-3 py-2">
      <div className="h-px w-16 bg-slate-200 dark:bg-slate-700" />
      <div className="w-1.5 h-1.5 rounded-full bg-indigo-300 dark:bg-indigo-700" />
      <div className="w-1 h-1 rounded-full bg-slate-200 dark:bg-slate-700" />
      <div className="w-1.5 h-1.5 rounded-full bg-indigo-300 dark:bg-indigo-700" />
      <div className="h-px w-16 bg-slate-200 dark:bg-slate-700" />
    </div>
  )
}

/* ── Skeleton loader ─────────────────────────────────────────── */
function ArticleSkeleton() {
  return (
    <div className="space-y-5 animate-pulse">
      {/* Drop-cap block */}
      <div className="flex gap-4">
        <div className="w-16 h-16 shrink-0 rounded-xl bg-slate-200 dark:bg-slate-700" />
        <div className="flex-1 space-y-2 pt-1">
          <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded-full w-full" />
          <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded-full w-5/6" />
          <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded-full w-full" />
        </div>
      </div>
      {/* Body paragraphs */}
      {[1, 2, 3].map(i => (
        <div key={i} className="space-y-2">
          <div className="h-4 bg-slate-100 dark:bg-slate-800 rounded-full w-full" />
          <div className="h-4 bg-slate-100 dark:bg-slate-800 rounded-full w-11/12" />
          <div className="h-4 bg-slate-100 dark:bg-slate-800 rounded-full w-4/5" />
        </div>
      ))}
      {/* Pull-quote block */}
      <div className="border-l-4 border-slate-200 dark:border-slate-700 pl-4 space-y-2">
        <div className="h-5 bg-slate-100 dark:bg-slate-800 rounded-full w-3/4" />
        <div className="h-5 bg-slate-100 dark:bg-slate-800 rounded-full w-2/3" />
      </div>
      {[1, 2].map(i => (
        <div key={`b${i}`} className="space-y-2">
          <div className="h-4 bg-slate-100 dark:bg-slate-800 rounded-full w-full" />
          <div className="h-4 bg-slate-100 dark:bg-slate-800 rounded-full w-10/12" />
        </div>
      ))}
    </div>
  )
}

/* ── Lede (first paragraph) with editorial drop-cap ─────────── */
function LedeParagraph({ text, JargonParagraph }) {
  if (!text) return null
  const first = text[0] || ''
  const rest = text.slice(1)
  return (
    <p className="text-[16.5px] leading-[1.85] text-slate-900 dark:text-white font-medium">
      {/* Drop cap */}
      <span
        className="float-left text-[5rem] font-black leading-[0.72] pr-3 pt-2 text-indigo-600 dark:text-indigo-400 select-none"
        style={{ fontFamily: 'Georgia, serif', lineHeight: 0.72 }}
        aria-hidden="true"
      >
        {first}
      </span>
      <JargonParagraph text={rest} />
    </p>
  )
}

/* ── Pull-quote block ────────────────────────────────────────── */
function PullQuote({ text }) {
  return (
    <blockquote className="relative my-2 pl-5 border-l-[3px] border-indigo-500 dark:border-indigo-400">
      <span
        className="absolute -top-4 left-3 text-6xl text-indigo-200 dark:text-indigo-800 leading-none select-none"
        aria-hidden="true"
        style={{ fontFamily: 'Georgia, serif' }}
      >
        "
      </span>
      <p
        className="text-[17px] leading-[1.7] text-indigo-900 dark:text-indigo-100 font-medium italic"
        style={{ fontFamily: 'Lora, Georgia, serif' }}
      >
        {text}
      </p>
    </blockquote>
  )
}

/* ── Stat callout block ──────────────────────────────────────── */
function StatCallout({ text, JargonParagraph }) {
  return (
    <div className="flex items-start gap-4 rounded-2xl bg-gradient-to-r from-slate-50 to-indigo-50/30 dark:from-slate-800/60 dark:to-indigo-950/30 border border-indigo-100 dark:border-indigo-900/50 px-5 py-4">
      <div className="shrink-0 w-10 h-10 rounded-xl bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="text-indigo-600 dark:text-indigo-400">
          <path d="M3 3v18h18M18 9l-5 5-4-4-3 3" />
        </svg>
      </div>
      <p className="text-[14px] leading-relaxed text-slate-700 dark:text-slate-300 font-medium">
        <JargonParagraph text={text} />
      </p>
    </div>
  )
}

/* ── Body paragraph ──────────────────────────────────────────── */
function BodyParagraph({ text, index, JargonParagraph }) {
  return (
    <p className="text-[15.5px] leading-[1.85] text-slate-700 dark:text-slate-300">
      <JargonParagraph text={text} />
    </p>
  )
}

/* ── Read-more expander for long articles ────────────────────── */
function ReadMoreWrapper({ children, threshold = 4 }) {
  const [expanded, setExpanded] = useState(false)
  const arr = Array.isArray(children) ? children : [children]
  const visible = expanded ? arr : arr.slice(0, threshold)
  const hidden = arr.length - threshold

  return (
    <>
      {visible}
      {!expanded && hidden > 0 && (
        <div className="relative">
          {/* fade gradient */}
          <div className="pointer-events-none absolute -top-24 inset-x-0 h-24 bg-gradient-to-b from-transparent to-white dark:to-slate-900" />
          <button
            onClick={() => setExpanded(true)}
            className="mt-2 w-full rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 py-3 text-sm font-bold text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 transition active:scale-[0.99]"
          >
            Continue reading — {hidden} more paragraph{hidden !== 1 ? 's' : ''} ↓
          </button>
        </div>
      )}
    </>
  )
}

/* ─────────────────────────────────────────────────────────────── 
   MAIN EXPORT
─────────────────────────────────────────────────────────────── */
export default function ArticleView({
  story,
  rawArticleStr,
  articleIsJSX,
  articleFetching,
  articleFetchErr,
  JargonParagraph,
}) {
  const [fontScale, setFontScale] = useState('md') // sm | md | lg
  const scales = { sm: 'text-sm', md: '', lg: 'text-lg' }

  const paragraphs = (rawArticleStr || '')
    .split('\n\n')
    .map(p => p.trim())
    .filter(Boolean)

  const publishedDate = story?.publishedAt
    ? new Date(story.publishedAt).toLocaleDateString('en-IN', {
        day: 'numeric', month: 'long', year: 'numeric',
      })
    : null

  return (
    <section className="scroll-mt-20">
      {/* ── Section header ── */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-1 h-5 rounded-full bg-blue-500" />
          <span className="text-[11px] font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">
            📰 Full Article
          </span>
          {articleFetching && (
            <span className="flex items-center gap-1 text-[11px] text-slate-400 ml-1">
              <span className="w-3 h-3 rounded-full border-2 border-blue-400 border-t-transparent animate-spin inline-block" />
              Loading…
            </span>
          )}
          {!articleFetching && rawArticleStr && (
            <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold">✓ Loaded</span>
          )}
        </div>
        {/* Font size controls */}
        <div className="flex items-center gap-1 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-0.5">
          {[['sm', 'A', 'text-[10px]'], ['md', 'A', 'text-[12px]'], ['lg', 'A', 'text-[15px]']].map(([s, label, cls]) => (
            <button
              key={s}
              onClick={() => setFontScale(s)}
              className={`rounded-lg px-2.5 py-1 font-bold transition-all ${cls} ${
                fontScale === s
                  ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Article card ── */}
      <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm overflow-hidden">

        {/* Article header stripe */}
        <div className="border-b border-slate-100 dark:border-slate-800 px-6 pt-6 pb-4">
          <h2
            className="text-xl sm:text-2xl font-bold leading-snug text-slate-900 dark:text-white"
            style={{ fontFamily: 'Lora, Georgia, serif' }}
          >
            {story.title}
          </h2>
          {story.description && (
            <p className="mt-2 text-[15px] leading-relaxed text-slate-500 dark:text-slate-400 italic" style={{ fontFamily: 'Lora, Georgia, serif' }}>
              {story.description}
            </p>
          )}
          <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-slate-400 dark:text-slate-500">
            {publishedDate && (
              <span className="flex items-center gap-1">
                <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>
                {publishedDate}
              </span>
            )}
            {story.source && (
              <span className="flex items-center gap-1">
                <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M12 2a10 10 0 100 20A10 10 0 0012 2z"/><path d="M12 6v6l4 2"/></svg>
                {story.source}
              </span>
            )}
            {story.readTime && (
              <span className="flex items-center gap-1">
                <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>
                {story.readTime} read
              </span>
            )}
          </div>
        </div>

        {/* ── Article body ── */}
        <div className={`px-6 py-7 ${scales[fontScale]}`}>
          {articleIsJSX ? (
            /* Render pre-composed JSX articles (from stories.jsx) */
            <div className="prose-style">{story.article}</div>
          ) : articleFetching && !rawArticleStr ? (
            <ArticleSkeleton />
          ) : (
            <ReadMoreWrapper threshold={5}>
              {paragraphs.map((para, i) => {
                const role = classifyParagraph(para, i)

                if (i > 0 && i % 4 === 0) {
                  return [
                    <Divider key={`div-${i}`} />,
                    role === 'lede' ? (
                      <LedeParagraph key={i} text={para} JargonParagraph={JargonParagraph} />
                    ) : role === 'pullquote' ? (
                      <PullQuote key={i} text={para} />
                    ) : role === 'stat' ? (
                      <StatCallout key={i} text={para} JargonParagraph={JargonParagraph} />
                    ) : (
                      <BodyParagraph key={i} text={para} index={i} JargonParagraph={JargonParagraph} />
                    ),
                  ]
                }

                if (role === 'lede') return <LedeParagraph key={i} text={para} JargonParagraph={JargonParagraph} />
                if (role === 'pullquote') return <PullQuote key={i} text={para} />
                if (role === 'stat') return <StatCallout key={i} text={para} JargonParagraph={JargonParagraph} />
                return <BodyParagraph key={i} text={para} index={i} JargonParagraph={JargonParagraph} />
              })}
            </ReadMoreWrapper>
          )}

          {/* fetch error */}
          {articleFetchErr && !rawArticleStr && (
            <div className="mt-4 rounded-2xl border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/40 px-4 py-3 text-sm text-amber-800 dark:text-amber-300">
              <p className="font-semibold">Couldn't load the full article automatically</p>
              <p className="mt-0.5 text-xs opacity-80">{articleFetchErr}</p>
            </div>
          )}
        </div>

        {/* ── Footer: original source link ── */}
        {(story.sourceUrl || story.url) && (
          <div className="border-t border-slate-100 dark:border-slate-800 px-6 py-4 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/20">
            <p className="text-xs text-slate-400 dark:text-slate-500">Read the full story at the original source</p>
            <a
              href={story.sourceUrl || story.url}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 rounded-full border border-indigo-200 dark:border-indigo-800 bg-white dark:bg-slate-900 px-4 py-1.5 text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 transition"
            >
              Original source
              <svg width="11" height="11" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M5 3h4v4M9 3L3 9" /></svg>
            </a>
          </div>
        )}
      </div>
    </section>
  )
}
