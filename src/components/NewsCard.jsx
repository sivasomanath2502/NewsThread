import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';

import { load, save, relTime, cs, analyzeSentiment, estimateReadTime, timeAgo, detectTopic, updateStreak } from '../utils/helpers.js';


export function NewsCard({ article, onOpen, isBookmarked, onToggleBookmark }) {
  const [imgOk, setImgOk] = useState(true)
  const hasImg = article.urlToImage && imgOk
  const sentiment = useMemo(() => analyzeSentiment(`${article.title} ${article.description}`), [article.title])
  const topic = useMemo(() => detectTopic(`${article.title} ${article.description}`), [article.title])
  const readTime = useMemo(() => estimateReadTime(`${article.title} ${article.description}`), [article.title])
  const ago = useMemo(() => timeAgo(article.publishedAt), [article.publishedAt])
  const ss = SENTIMENT_STYLES[sentiment.color] || SENTIMENT_STYLES.slate

  const sentimentBadge = (
    <div className={`absolute top-2.5 left-2.5 flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-bold backdrop-blur-md bg-white/80 dark:bg-slate-900/80 border ${ss.badge}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${ss.dot} sentiment-dot`} />{sentiment.label}
    </div>
  )

  return (
    <div className="relative group">
      <button type="button" onClick={() => onOpen(article)} className="w-full text-left rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm card-glow hover:shadow-lg hover:border-indigo-200 dark:hover:border-indigo-700 transition-all duration-200 overflow-hidden active:scale-[0.99]">
        {hasImg ? (
          <div className="relative aspect-[16/10] w-full overflow-hidden bg-slate-100 dark:bg-slate-800">
            <img src={article.urlToImage} alt="" className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.03]" onError={() => setImgOk(false)} />
            {sentimentBadge}
          </div>
        ) : (
          <div className="relative aspect-[16/10] w-full bg-gradient-to-br from-slate-100 via-indigo-50 to-violet-100 dark:from-slate-800 dark:via-indigo-950 dark:to-slate-900 flex items-center justify-center text-4xl">
            ≡ƒô░
            {sentimentBadge}
          </div>
        )}
        <div className="p-4 sm:p-5">
          <div className="flex items-center gap-2 mb-1.5 flex-wrap">
            <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 dark:bg-slate-800 px-2 py-0.5 text-[10px] font-bold text-slate-600 dark:text-slate-400 shrink-0">
              {topic.emoji} {topic.label}
            </span>
            <p className="text-[11px] font-bold uppercase tracking-wide text-indigo-500 dark:text-indigo-400 truncate">{article.source || 'News'}</p>
            <span className="text-[10px] text-slate-300 dark:text-slate-600">┬╖</span>
            <span className="text-[10px] text-slate-400 dark:text-slate-500 flex items-center gap-1 shrink-0">
              <svg width="10" height="10" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" /><path d="M12 6v6l4 2" /></svg>
              {readTime}
            </span>
          </div>
          <h2 className="text-[16px] sm:text-[17px] font-bold leading-snug text-slate-900 dark:text-white line-clamp-3 pr-6" style={{ fontFamily: 'Georgia,serif' }}>{article.title}</h2>
          {article.description && <p className="mt-2 text-sm leading-relaxed text-slate-500 dark:text-slate-400 line-clamp-2">{article.description}</p>}
          <div className="mt-4 flex items-center justify-between gap-2">
            <time className="text-[11px] text-slate-400 dark:text-slate-500 shrink-0">{ago}</time>
            <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 flex items-center gap-1 group-hover:gap-2 transition-all">Open <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M2 6h8M7 3l3 3-3 3" /></svg></span>
          </div>
        </div>
      </button>
      <button type="button" onClick={e => { e.stopPropagation(); onToggleBookmark(article) }}
        className="absolute top-3 right-3 w-8 h-8 flex items-center justify-center rounded-full bg-white/90 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-700 shadow-sm transition-all hover:scale-110 active:scale-95"
        title={isBookmarked ? 'Remove bookmark' : 'Bookmark'}>
        <svg width="15" height="15" viewBox="0 0 24 24" fill={isBookmarked ? '#6366f1' : 'none'} stroke={isBookmarked ? '#6366f1' : '#cbd5e1'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2z" />
        </svg>
      </button>
    </div>
  )
}
