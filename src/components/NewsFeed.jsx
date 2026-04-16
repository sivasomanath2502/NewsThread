import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { load, save, relTime, cs, analyzeSentiment, estimateReadTime, timeAgo, detectTopic, updateStreak } from '../utils/helpers.js';
import { COMMON_WORDS, LS, NEWS_CATEGORIES, INTERESTS, TRENDING_STOP } from '../utils/constants.js';
import { generateSmartQuestion, generateInsights } from '../smartEngage.js';
import { summarizeTimelineWithLocalModel } from '../localRecap.js';
import { fetchRelatedTimeline } from '../newsApi.js';
import JargonText from '../JargonText.jsx';
import { JargonWord } from '../JargonWord.jsx';
import { JARGON_GLOSSARY } from '../glossary.js';
import { CategoryBar, NewsCategoryBar } from './CategoryBar.jsx';
import { StoryCard } from './StoryCard.jsx';

export function NewsFeed({articles,loading,error,searchQuery,onOpen,newsBookmarks,onToggleBookmark,activeTab,onTabChange,newsCategory,onNewsCategory,onRefresh,refreshing,onSearchQuery}){
  const matchSearch=a=>{
    const q=searchQuery.trim().toLowerCase()
    if(!q)return true
    return`${a.title} ${a.description} ${a.source}`.toLowerCase().includes(q)
  }
  const fromFeed=[...articles.filter(matchSearch)].sort((a,b)=>new Date(b.publishedAt||0)-new Date(a.publishedAt||0))
  const fromSaved=[...newsBookmarks.filter(matchSearch)].sort((a,b)=>new Date(b.publishedAt||0)-new Date(a.publishedAt||0))
  const list=activeTab==='bookmarks'?fromSaved:fromFeed

  return(
    <div className="mx-auto max-w-3xl px-4 pb-24 pt-4">
      {!searchQuery&&(
        <header className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-indigo-500 mb-1">Live headlines</p>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white" style={{fontFamily:'Georgia,serif'}}>Latest news</h1>
            <p className="mt-1 text-[13px] text-slate-400">Updates from NewsAPI ┬╖ cached 15 min on the server</p>
          </div>
          <button type="button" onClick={onRefresh} disabled={loading||refreshing} className="shrink-0 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-4 py-2.5 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-50 transition active:scale-[0.98]">
            {loading||refreshing?'RefreshingΓÇª':'≡ƒöä Refresh news'}
          </button>
        </header>
      )}

      {/* Breaking news + Trending keywords */}
      {!searchQuery&&activeTab==='feed'&&articles.length>0&&(
        <>
          <BreakingNewsBanner articles={articles} onOpen={onOpen}/>
          <TrendingTopics articles={articles} onSearch={(w)=>onSearchQuery&&onSearchQuery(w)}/>
        </>
      )}

      {!searchQuery&&(
        <div className="flex gap-2 mb-5">
          {[['feed','Latest'],['bookmarks','Bookmarks']].map(([tab,label])=>(
            <button key={tab} type="button" onClick={()=>onTabChange(tab)} className={`rounded-full px-4 py-1.5 text-xs font-bold transition border ${activeTab===tab?'bg-slate-900 dark:bg-white text-white dark:text-slate-900 border-transparent':'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'}`}>
              {label}{tab==='bookmarks'&&newsBookmarks.length>0&&<span className="ml-1 text-indigo-400">({newsBookmarks.length})</span>}
            </button>
          ))}
        </div>
      )}

      {!searchQuery&&activeTab==='feed'&&<div className="mb-5"><NewsCategoryBar active={newsCategory} onChange={onNewsCategory}/></div>}

      {searchQuery&&(
        <div className="mb-5 flex items-center gap-3">
          <p className="text-sm text-slate-500 dark:text-slate-400">{list.length===0?'No results for ':`${list.length} result${list.length!==1?'s':''} for `}</p>
          <button onClick={()=>onSearchQuery&&onSearchQuery('')} className="inline-flex items-center gap-1.5 rounded-full bg-indigo-50 dark:bg-indigo-900/30 border border-indigo-200 dark:border-indigo-800 px-3 py-1 text-xs font-bold text-indigo-700 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition">
            "{searchQuery}"
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
          </button>
        </div>
      )}

      {error&&(
        <div className="rounded-2xl border border-rose-200 dark:border-rose-900 bg-rose-50 dark:bg-rose-950/40 px-4 py-3 text-sm text-rose-800 dark:text-rose-200 mb-6">
          <p className="font-bold">Could not load headlines</p>
          <p className="mt-1 text-rose-700/90 dark:text-rose-300/90">{error}</p>
          <p className="mt-2 text-xs text-rose-600 dark:text-rose-400">Add <code className="rounded bg-rose-100 dark:bg-rose-900/60 px-1">NEWS_API_KEY</code> to <code className="rounded bg-rose-100 dark:bg-rose-900/60 px-1">.env</code> and restart <code className="rounded bg-rose-100 dark:bg-rose-900/60 px-1">npm run dev</code>.</p>
        </div>
      )}

      {activeTab==='bookmarks'&&newsBookmarks.length===0&&(
        <div className="py-20 text-center">
          <p className="text-4xl mb-3">≡ƒöû</p>
          <p className="font-semibold text-slate-700 dark:text-slate-300">No bookmarks yet</p>
          <p className="text-sm text-slate-400 mt-1">Save articles from Latest to read them later</p>
        </div>
      )}

      {loading&&articles.length===0&&!error&&(
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[1,2,3,4].map(i=>(
            <div key={i} className="rounded-3xl border border-slate-200 dark:border-slate-800 overflow-hidden animate-pulse">
              <div className="aspect-[16/10] bg-slate-200 dark:bg-slate-800"/>
              <div className="p-5 space-y-2">
                <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded w-1/3"/>
                <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-full"/>
                <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-5/6"/>
              </div>
            </div>
          ))}
        </div>
      )}

      {!loading||articles.length>0?(
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {list.map((a,i)=>(
            <NewsCard key={a.url||`card-${i}-${a.title?.slice(0,24)}`} article={a} onOpen={onOpen} isBookmarked={newsBookmarks.some(b=>b.url===a.url)} onToggleBookmark={onToggleBookmark}/>
          ))}
        </div>
      ):null}

      {!loading&&activeTab!=='bookmarks'&&fromFeed.length===0&&!error&&(
        <div className="py-24 text-center">
          <p className="text-5xl mb-4">≡ƒöì</p>
          <p className="text-slate-500 dark:text-slate-400">No headlines match your filters</p>
        </div>
      )}
    </div>
  )
}
