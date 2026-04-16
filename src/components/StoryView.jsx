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

export function StoryView({storiesData,isFollowing,onToggleFollow,savedAnswer,onSaveAnswer,showSimulatedUpdate,onSimulateUpdate,onBack,onFeedback,annotations,onSaveAnnotation,isBookmarked,onToggleBookmark}){
  const { storyId } = useParams()
  const story = storiesData.find(s => String(s.id) === String(storyId))
  
  const articleRef=useRef(null)
  const[expandedIndex,setExpandedIndex]=useState(null)
  const[annotatingIndex,setAnnotatingIndex]=useState(null)
  const[annotationDraft,setAnnotationDraft]=useState('')
  const[selectedOption,setSelectedOption]=useState(null)
  const[submitted,setSubmitted]=useState(false)
  const[progress,setProgress]=useState(0)
  const[copied,setCopied]=useState(false)
  const[isPlaying,setIsPlaying]=useState(false)
  const[articleFull,setArticleFull]=useState(null)       // full text from /api/article
  const[articleFetching,setArticleFetching]=useState(false)
  const[articleFetchErr,setArticleFetchErr]=useState('')
  const[relatedTimeline,setRelatedTimeline]=useState([])
  const[relErr,setRelErr]=useState('')
  const[recapLines,setRecapLines]=useState([
    'This thread is still building and has limited updates so far.',
    'As more related coverage is added, this recap will evolve automatically.',
    'Follow the story to track how the timeline changes day by day.',
  ])

  // Generate insights for the engage section
  const insights = useMemo(() => {
    if (!story) return null
    return generateInsights(
      { title: story.title, description: story.description, content: story.article },
      story.question
    )
  }, [story?.id])


  useEffect(() => {
    if (story) {
      window.scrollTo(0, 0)
    } else {
      // Story not in memory (page refresh loses live news state) ΓÇö redirect home after 2s
      const t = setTimeout(() => onBack(), 2000)
      return () => clearTimeout(t)
    }
  }, [storyId])

  if (!story) return (
    <div className="py-24 text-center">
      <p className="text-4xl mb-3">≡ƒô░</p>
      <p className="font-semibold text-slate-700 dark:text-slate-300">This article is no longer in memory</p>
      <p className="text-sm text-slate-400 mt-1">Redirecting you to the feedΓÇª</p>
      <button onClick={onBack} className="mt-4 text-sm font-bold text-indigo-500 hover:underline">Go to Feed now</button>
    </div>
  )

  const currentAnswer = savedAnswer[String(story.id)] || null
  const currentSimulated = showSimulatedUpdate[String(story.id)] || false

  useEffect(()=>{
    if(currentAnswer){setSelectedOption(currentAnswer.optionIndex);setSubmitted(true)}
    else{setSelectedOption(null);setSubmitted(false)}
  },[story.id,currentAnswer])
  useEffect(()=>{
    const fn=()=>{const el=document.documentElement;const total=el.scrollHeight-el.clientHeight;setProgress(total>0?Math.round((el.scrollTop/total)*100):0)}
    window.addEventListener('scroll',fn,{passive:true});return()=>window.removeEventListener('scroll',fn)
  },[])

  useEffect(()=>{
    let cancelled=false
    setRelatedTimeline([])
    setRelErr('')
    if(!story?.sourceUrl)return

    ;(async()=>{
      try{
        const t=await fetchRelatedTimeline(story)
        if(!cancelled)setRelatedTimeline(t)
      }catch(e){
        if(cancelled)return
        const msg=e instanceof Error?e.message:String(e)
        setRelErr(msg)
      }
    })()

    return()=>{cancelled=true}
  },[story.id])

  useEffect(()=>{
    const timelineToShow = relatedTimeline.length ? relatedTimeline : story.timeline
    let cancelled=false

    ;(async()=>{
      const lines = await summarizeTimelineWithLocalModel(timelineToShow)
      if(cancelled)return
      setRecapLines(lines)
    })()

    return()=>{cancelled=true}
  },[story.id,relatedTimeline,story.timeline])

  const handleSubmit=e=>{e.preventDefault();if(selectedOption===null)return;onSaveAnswer(story.id,selectedOption,story.question.options[selectedOption]);setSubmitted(true)}
  const handleShare=()=>{const t=`${story.title} ΓÇö NewsThread`;if(navigator.share)navigator.share({title:story.title,text:t}).catch(()=>{});else navigator.clipboard.writeText(t).then(()=>{setCopied(true);setTimeout(()=>setCopied(false),2000)})}

  const saveAnnotation=(eventIndex)=>{
    if(!annotationDraft.trim())return
    onSaveAnnotation(story.id,eventIndex,annotationDraft.trim())
    setAnnotationDraft('')
    setAnnotatingIndex(null)
  }

  const timelineToShow = relatedTimeline.length ? relatedTimeline : story.timeline

  const handleSpeak = () => {
    if (isPlaying) {
      window.speechSynthesis.cancel()
      setIsPlaying(false)
      return
    }
    const articleText = typeof story.article === 'string' ? story.article : story.description || ''
    const textToSpeak = `
      Title: ${story.title}.
      Thread Timeline: ${timelineToShow.map(t => `${t.date}, ${t.event}. ${t.details}`).join('. ')}.
      AI Recap: ${recapLines.map((l, i) => `Point ${i + 1}. ${l}`).join(' ')}.
      Today's Full Article: ${(articleFull || articleText).replace(/\[\+\d+\s*chars\]/g, '').replace(/Read the original article:\s*https?:\/\/[^\s]+/i, '').replace(/\n/g, '. ')}.
    `;
    const utterance = new SpeechSynthesisUtterance(textToSpeak)
    utterance.onend = () => setIsPlaying(false)
    window.speechSynthesis.speak(utterance)
    setIsPlaying(true)
  }

  useEffect(() => {
    return () => window.speechSynthesis.cancel()
  }, [])

  // Auto-fetch full article via Express server when story URL is available
  useEffect(()=>{
    let cancelled=false
    setArticleFull(null)
    setArticleFetchErr('')
    const url=story?.sourceUrl||story?.url
    // Only fetch for non-JSX articles that have a source URL
    if(!url||typeof story?.article!=='string')return
    setArticleFetching(true)
    ;(async()=>{
      try{
        const res=await fetch(`/api/article?url=${encodeURIComponent(url)}`)
        const data=await res.json()
        if(cancelled)return
        if(data.success&&data.text){
          setArticleFull(data.text)
        }else{
          setArticleFetchErr(data.error||'Could not load full article')
        }
      }catch(e){
        if(!cancelled)setArticleFetchErr(e.message||'Network error')
      }finally{
        if(!cancelled)setArticleFetching(false)
      }
    })()
    return()=>{cancelled=true}
  },[story?.id])

  const predictedLabel=currentAnswer?.optionLabel??(selectedOption!==null?story.question.options[selectedOption]:null)
  const st=cs(story.category)

  // Determine article content ΓÇö could be JSX (from stories.jsx) or string (from newsApi)
  const articleIsJSX = typeof story.article !== 'string' && story.article != null
  // Prefer full fetched text, fallback to story.article (cleaned)
  const rawArticleStr = articleIsJSX ? '' : (
    articleFull ||
    String(story.article||'')
      .replace(/Read the original article:\s*https?:\/\/[^\s]+/i,'')
      .replace(/\[\+\d+\s*chars\]/i,'')
      .trim()
  )

  return(
    <div className="pb-24">
      <div className="fixed top-[54px] inset-x-0 z-40 h-0.5 bg-slate-100 dark:bg-slate-800">
        <div className="h-full bg-indigo-500 transition-all duration-75" style={{width:`${progress}%`}}/>
      </div>
      <div className="bg-white dark:bg-slate-950 border-b border-slate-100 dark:border-slate-800">
        <div className="mx-auto max-w-3xl px-4 pt-6 pb-7">
          <div className="flex items-center justify-between mb-5">
            <button onClick={onBack} className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition">
              <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M9 3L4 8l5 5"/></svg>Back to feed
            </button>
            <button onClick={handleSpeak} className={`inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full transition-all active:scale-95 ${isPlaying ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-400' : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'}`}>
              {isPlaying ? 'ΓÅ╕ Stop Audio' : '≡ƒöè Listen to Page'}
            </button>
          </div>
          <div className="flex items-center gap-2 mb-3">
            <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ${st.pill} ${st.dpill}`}>{story.category}</span>
            <span className="text-xs text-slate-400 dark:text-slate-500">{story.readTime} ┬╖ {story.timeline.length} events</span>
          </div>
          <h1 className="text-lg sm:text-xl font-bold leading-snug text-slate-900 dark:text-white" style={{fontFamily:'Georgia,serif'}}><JargonText text={story.title}/></h1>
          <p className="mt-2 text-slate-500 dark:text-slate-400 leading-relaxed">{story.description}</p>
        </div>
      </div>

      <div className="mx-auto max-w-3xl px-4 pt-8 space-y-10">

        {/* ΓöÇΓöÇ THREAD with LINKS ΓÇö revamped timeline ΓöÇΓöÇ */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2"><div className="w-1 h-5 rounded-full bg-amber-500"/><span className="text-[11px] font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">≡ƒº╡ Thread ΓÇö timeline</span></div>
            <div className="flex items-center gap-3">
              <span className="text-[11px] text-slate-400 dark:text-slate-500">{timelineToShow.length} events</span>
              <span className="text-[11px] text-slate-300 dark:text-slate-600">┬╖</span>
              <span className="text-[11px] text-slate-400 dark:text-slate-500">Tap to expand</span>
            </div>
          </div>
          {relErr&&<div className="mb-4 rounded-2xl border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/40 px-4 py-3 text-sm text-amber-800 dark:text-amber-300">Couldn't load related coverage. ({relErr})</div>}

          {/* Timeline progress overview */}
          <div className="mb-5 flex items-center gap-3">
            <div className="flex-1 h-2.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
              <div className="h-full rounded-full bg-gradient-to-r from-amber-400 via-orange-400 to-red-400 transition-all duration-500" style={{width:`${Math.min(100, ((expandedIndex??-1)+1)/timelineToShow.length*100)}%`}}/>
            </div>
            <span className="text-xs font-bold text-amber-600 dark:text-amber-400 shrink-0">{expandedIndex!==null?`${expandedIndex+1}/${timelineToShow.length}`:`0/${timelineToShow.length}`}</span>
          </div>

          <div className="rounded-3xl border border-amber-200 dark:border-amber-900/50 bg-amber-50/40 dark:bg-amber-950/20 p-6 sm:p-8">
            <div className="relative pl-10">
              {/* Gradient timeline connector */}
              <div className="absolute left-[14px] top-4 bottom-4 w-1 rounded-full bg-gradient-to-b from-amber-400 via-orange-300 to-red-300 dark:from-amber-600 dark:via-orange-700 dark:to-red-800"/>
              <div className="space-y-2">
                {timelineToShow.map((item,i)=>{
                  const isOpen=expandedIndex===i
                  const isLast=i===timelineToShow.length-1
                  const note=annotations[`${story.id}_${i}`]
                  const isAnnotating=annotatingIndex===i
                  return(
                    <div key={i} className="tl-item" style={{animationDelay:`${i*80}ms`}}>
                      <button type="button" onClick={()=>{setExpandedIndex(p=>p===i?null:i);setAnnotatingIndex(null)}}
                        className={`relative w-full text-left pl-8 pr-5 py-5 rounded-2xl border transition-all duration-200 ${isOpen?'border-amber-300 dark:border-amber-700 bg-white dark:bg-slate-900 shadow-lg shadow-amber-100/50 dark:shadow-amber-900/30':'border-transparent hover:border-amber-200 dark:hover:border-amber-800 hover:bg-white/70 dark:hover:bg-slate-900/70'}`}>
                        {/* Timeline node */}
                        <div className={`absolute left-[-28px] top-1/2 -translate-y-1/2 flex items-center justify-center rounded-full transition-all duration-300 ${isOpen?'w-10 h-10 border-[3px] border-amber-500 bg-amber-400 shadow-lg shadow-amber-200 dark:shadow-amber-900 tl-node-active':'w-7 h-7 border-[3px] border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-950 hover:border-amber-400'}`}>
                          {isOpen&&<span className="text-xs font-black text-white">{i+1}</span>}
                          {!isOpen&&<span className="text-[9px] font-bold text-amber-400 dark:text-amber-600">{i+1}</span>}
                        </div>
                        {/* Last event indicator */}
                        {isLast&&!isOpen&&<div className="absolute left-[-22px] top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-red-400 animate-pulse"/>}
                        {note&&<div className="absolute right-4 top-4 flex items-center gap-1"><div className="w-2.5 h-2.5 rounded-full bg-indigo-400"/><span className="text-[10px] text-indigo-400 font-bold">note</span></div>}
                        <div className="flex items-center gap-2.5 mb-2">
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 dark:bg-amber-900/40 px-3 py-1 text-xs font-bold text-amber-700 dark:text-amber-400">
                            <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>
                            {item.date}
                          </span>
                          {isLast&&<span className="rounded-full bg-red-100 dark:bg-red-900/30 px-2.5 py-1 text-[11px] font-bold text-red-600 dark:text-red-400">Latest</span>}
                          <div className="flex-1"/>
                          <svg className={`shrink-0 text-amber-400 dark:text-amber-600 transition-transform duration-200 ${isOpen?'rotate-180':''}`} width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 5l5 5 5-5"/></svg>
                        </div>
                        <p className={`text-[15px] sm:text-base font-semibold leading-snug ${isOpen?'text-slate-900 dark:text-white':'text-slate-700 dark:text-slate-300'}`}><JargonText text={item.event}/></p>

                        {/* Expanded details with animation */}
                        {isOpen&&(
                          <div className="tl-details-enter mt-4 border-t border-amber-100 dark:border-amber-900 pt-4 space-y-4">
                            <p className="text-[14px] leading-relaxed text-slate-600 dark:text-slate-400"><JargonText text={item.details}/></p>
                            {Array.isArray(item.links)&&item.links.length>0?(
                              <div className="flex flex-wrap gap-2">
                                {item.links.map((link, idx)=>(
                                  <a key={`${link.url}-${idx}`} href={link.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 rounded-full bg-indigo-50 dark:bg-indigo-900/30 border border-indigo-200 dark:border-indigo-800 px-3.5 py-2 text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition">
                                    {link.source||`Source ${idx+1}`}
                                    <svg width="11" height="11" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 2h4v4"/><path d="M8 2L2 8"/></svg>
                                  </a>
                                ))}
                              </div>
                            ):item.url&&(
                              <a href={item.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 rounded-full bg-indigo-50 dark:bg-indigo-900/30 border border-indigo-200 dark:border-indigo-800 px-3.5 py-2 text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition">
                                {item.source||'Source'}
                                <svg width="11" height="11" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 2h4v4"/><path d="M8 2L2 8"/></svg>
                              </a>
                            )}

                            {/* Navigation between events */}
                            <div className="flex items-center justify-between pt-2">
                              <button type="button" disabled={i===0} onClick={(e)=>{e.stopPropagation();setExpandedIndex(i-1);setAnnotatingIndex(null)}} className="text-xs font-bold text-amber-600 dark:text-amber-400 disabled:opacity-30 disabled:cursor-not-allowed hover:text-amber-800 transition flex items-center gap-1.5">
                                <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2"><path d="M8 2L4 6l4 4"/></svg>Previous
                              </button>
                              <span className="text-xs text-slate-400 font-bold">{i+1} of {timelineToShow.length}</span>
                              <button type="button" disabled={isLast} onClick={(e)=>{e.stopPropagation();setExpandedIndex(i+1);setAnnotatingIndex(null)}} className="text-xs font-bold text-amber-600 dark:text-amber-400 disabled:opacity-30 disabled:cursor-not-allowed hover:text-amber-800 transition flex items-center gap-1.5">
                                Next<svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 2l4 4-4 4"/></svg>
                              </button>
                            </div>
                          </div>
                        )}
                      </button>

                      {/* annotation area */}
                      {isOpen&&(
                        <div className="ml-4 mt-1.5 rounded-2xl border border-indigo-100 dark:border-indigo-900/50 bg-indigo-50/50 dark:bg-indigo-950/20 p-3 tl-details-enter">
                          {note&&!isAnnotating&&(
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <p className="text-[10px] font-bold uppercase tracking-widest text-indigo-400 mb-1">Your note</p>
                                <p className="text-sm text-slate-700 dark:text-slate-300 italic">"{note}"</p>
                              </div>
                              <button onClick={()=>{setAnnotatingIndex(i);setAnnotationDraft(note)}} className="text-[11px] font-bold text-indigo-500 hover:text-indigo-700 shrink-0">Edit</button>
                            </div>
                          )}
                          {!note&&!isAnnotating&&(
                            <button onClick={()=>setAnnotatingIndex(i)} className="text-[11px] font-bold text-indigo-500 hover:text-indigo-700 flex items-center gap-1">
                              <svg width="11" height="11" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 9L5 5l4-4m-4 4l1 4M5 5l-4 0"/></svg>Add a note to this event
                            </button>
                          )}
                          {isAnnotating&&(
                            <div>
                              <p className="text-[10px] font-bold uppercase tracking-widest text-indigo-400 mb-2">Your note</p>
                              <textarea value={annotationDraft} onChange={e=>setAnnotationDraft(e.target.value)} rows={2} placeholder="Write your thoughts on this eventΓÇª" className="w-full rounded-xl border border-indigo-200 dark:border-indigo-800 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-slate-800 dark:text-slate-200 placeholder:text-slate-400 resize-none outline-none focus:ring-2 focus:ring-indigo-400"/>
                              <div className="flex gap-2 mt-2">
                                <button onClick={()=>saveAnnotation(i)} className="rounded-xl bg-indigo-600 text-white px-3 py-1.5 text-xs font-bold hover:bg-indigo-700 transition">Save note</button>
                                <button onClick={()=>{setAnnotatingIndex(null);setAnnotationDraft('')}} className="rounded-xl border border-slate-200 dark:border-slate-700 px-3 py-1.5 text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-50 transition">Cancel</button>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        </section>

        {/* ΓöÇΓöÇ RECAP ΓöÇΓöÇ */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2"><div className="w-1 h-5 rounded-full bg-emerald-500"/><span className="text-[11px] font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">≡ƒñû AI Recap</span></div>
            <button onClick={()=>articleRef.current?.scrollIntoView({behavior:'smooth',block:'start'})} className="text-[11px] font-bold text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition">Skip to article Γåô</button>
          </div>
          <div className="rounded-3xl border border-emerald-200 dark:border-emerald-900/50 bg-emerald-50/40 dark:bg-emerald-950/20 p-5">
            <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-600 dark:text-emerald-500 mb-4">3-line personalised catch-up</p>
            <ol className="space-y-3">{recapLines.map((line,i)=>(
              <li key={i} className="flex gap-3 text-sm leading-relaxed text-slate-700 dark:text-slate-300">
                <span className="shrink-0 w-5 h-5 rounded-full bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-400 text-[11px] font-bold flex items-center justify-center mt-0.5">{i+1}</span><JargonText text={line}/>
              </li>
            ))}</ol>
          </div>
        </section>

        {/* ΓöÇΓöÇ FULL ARTICLE ΓöÇΓöÇ */}
        <section ref={articleRef} className="scroll-mt-20">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="w-1 h-5 rounded-full bg-blue-500"/>
              <span className="text-[11px] font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">≡ƒô░ Today's Full Article</span>
            </div>
            {articleFetching&&(
              <span className="text-[11px] text-slate-400 flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full border-2 border-blue-400 border-t-transparent animate-spin inline-block"/>
                Loading full articleΓÇª
              </span>
            )}
            {articleFull&&!articleFetching&&(
              <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold">Γ£ô Full article loaded</span>
            )}
          </div>
          <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm p-5 space-y-4">
            {articleIsJSX ? (
              /* Render JSX articles from stories.jsx (with embedded JargonWord components) */
              <div>{story.article}</div>
            ) : articleFetching && !rawArticleStr ? (
              /* Skeleton while fetching */
              <div className="space-y-3 animate-pulse">
                {[1,2,3,4,5].map(i=>(
                  <div key={i} className={`h-4 bg-slate-200 dark:bg-slate-700 rounded-full ${i===5?'w-2/3':'w-full'}`}/>
                ))}
                <div className="h-4 w-full bg-slate-200 dark:bg-slate-700 rounded-full"/>
                <div className="h-4 w-5/6 bg-slate-200 dark:bg-slate-700 rounded-full"/>
                <div className="h-4 w-full bg-slate-200 dark:bg-slate-700 rounded-full"/>
                <div className="h-4 w-3/4 bg-slate-200 dark:bg-slate-700 rounded-full"/>
              </div>
            ) : (
              <>
                {rawArticleStr.split('\n\n').filter(Boolean).map((para,i)=>(
                  <p key={i} className="text-[15px] leading-relaxed text-slate-800 dark:text-slate-200">
                    <JargonParagraph text={para}/>
                  </p>
                ))}
                {articleFetchErr&&!articleFull&&(
                  <div className="mt-3 rounded-2xl border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/40 px-4 py-3 text-sm text-amber-800 dark:text-amber-300">
                    <p className="font-semibold">Couldn't load the full article automatically</p>
                    <p className="mt-0.5 text-xs opacity-80">{articleFetchErr}</p>
                    <p className="mt-1 text-xs">The site may require a subscription or block automated access. Use the link below to read it directly.</p>
                  </div>
                )}
              </>
            )}
            {(story.sourceUrl||story.url)&&(
              <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                <a href={story.sourceUrl||story.url} target="_blank" rel="noreferrer" className="text-sm font-bold text-indigo-600 dark:text-indigo-400 hover:underline inline-flex items-center gap-1.5">
                  Read on original source
                  <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M5 3h6v6M11 3L3 11"/></svg>
                </a>
              </div>
            )}
          </div>
        </section>

        <section>
          <div className="flex items-center justify-between">
            <div className="flex flex-wrap gap-2">
              <button onClick={() => onToggleFollow(story.id)} className={`rounded-full px-4 py-2 text-sm font-bold border-2 transition-all active:scale-95 ${isFollowing.includes(story.id)?'border-emerald-400 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-800 dark:text-emerald-400':'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:border-indigo-300 hover:text-indigo-700'}`}>{isFollowing.includes(story.id)?'Γ£ô Following':'+ Follow'}</button>
              <button onClick={()=>onToggleBookmark(story.id)} className={`rounded-full px-4 py-2 text-sm font-bold border-2 transition-all active:scale-95 ${isBookmarked.includes(story.id)?'border-indigo-400 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-800 dark:text-indigo-400':'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:border-indigo-300'}`}>{isBookmarked.includes(story.id)?'≡ƒöû Saved':'≡ƒöû Save'}</button>
              {story.simulatedUpdate&&<button onClick={() => onSimulateUpdate(story.id)} disabled={currentSimulated} className="rounded-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-4 py-2 text-sm font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition-all active:scale-95">{currentSimulated?'Updated Γ£ô':'ΓÜí Simulate update'}</button>}
              <button onClick={handleShare} className="rounded-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-4 py-2 text-sm font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all active:scale-95">{copied?'Copied!':'Γåù Share'}</button>
            </div>
            {story.sourceUrl&&(
              <a href={story.sourceUrl} target="_blank" rel="noreferrer" className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline">
                View original
              </a>
            )}
          </div>
        </section>

        {/* ΓöÇΓöÇ INSIGHTS + ENGAGE ΓöÇΓöÇ */}
        <section>
          <div className="flex items-center gap-2 mb-4"><div className="w-1 h-5 rounded-full bg-violet-500"/><span className="text-[11px] font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">≡ƒÄ» Engage</span></div>

          {/* ΓöÇΓöÇ Insights Panel (contextual background before the question) ΓöÇΓöÇ */}
          {insights&&(
            <div className="rounded-3xl border border-indigo-200 dark:border-indigo-900/50 bg-indigo-50/30 dark:bg-indigo-950/20 p-5 mb-4 space-y-4">
              <p className="text-[10px] font-bold uppercase tracking-widest text-indigo-500 dark:text-indigo-400">≡ƒÆí Context & Insights</p>

              {/* Why it matters */}
              <div className="rounded-2xl border border-indigo-100 dark:border-indigo-900 bg-white dark:bg-slate-900 px-4 py-3">
                <p className="text-[10px] font-bold uppercase tracking-widest text-indigo-400 dark:text-indigo-500 mb-1">Why this matters</p>
                <p className="text-sm leading-relaxed text-slate-700 dark:text-slate-300">{insights.whyMatters}</p>
              </div>

              {/* Key facts extracted from the article */}
              {insights.keyFacts.length>0&&(
                <div className="space-y-2">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-indigo-400 dark:text-indigo-500">≡ƒôî Key numbers</p>
                  {insights.keyFacts.map((fact,i)=>(
                    <div key={i} className="rounded-2xl border border-indigo-100 dark:border-indigo-900 bg-white dark:bg-slate-900 px-4 py-2.5 flex items-start gap-3">
                      <span className="shrink-0 mt-0.5 w-6 h-6 rounded-lg bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 text-[11px] font-bold flex items-center justify-center">{fact.type==='percentage'?'%':fact.type==='amount'?'Γé╣':'#'}</span>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-slate-900 dark:text-white">{fact.value}</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed mt-0.5">{fact.context}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Community pulse ΓÇö simulated poll */}
              {insights.poll&&insights.poll.length>0&&(
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-indigo-400 dark:text-indigo-500 mb-2">≡ƒôè Community pulse ΓÇö how others leaned</p>
                  <div className="space-y-2">
                    {insights.poll.map((p,i)=>(
                      <div key={i} className="rounded-xl overflow-hidden">
                        <div className="flex items-center justify-between text-xs mb-1">
                          <span className="text-slate-600 dark:text-slate-400 font-medium truncate pr-2">{p.label}</span>
                          <span className="text-indigo-600 dark:text-indigo-400 font-bold shrink-0">{p.pct}%</span>
                        </div>
                        <div className="h-2 rounded-full bg-slate-100 dark:bg-slate-800">
                          <div className="h-full rounded-full bg-gradient-to-r from-indigo-400 to-violet-500 transition-all duration-700" style={{width:`${p.pct}%`}}/>
                        </div>
                      </div>
                    ))}
                  </div>
                  <p className="text-[10px] text-slate-400 mt-2 italic">Based on reader engagement patterns</p>
                </div>
              )}
            </div>
          )}

          {/* ΓöÇΓöÇ Engage Question ΓöÇΓöÇ */}
          <div className="rounded-3xl border border-violet-200 dark:border-violet-900/50 bg-violet-50/40 dark:bg-violet-950/20 p-5">
            {currentAnswer&&<div className="mb-4 rounded-2xl border border-violet-200 dark:border-violet-800 bg-violet-50 dark:bg-violet-900/30 px-4 py-3 text-sm text-violet-900 dark:text-violet-300"><span className="font-bold">Your answer:</span>{' '}{String.fromCharCode(65+currentAnswer.optionIndex)}. {currentAnswer.optionLabel}</div>}
            <p className="text-base font-bold text-slate-900 dark:text-white leading-snug" style={{fontFamily:'Georgia,serif'}}>{story.question.text}</p>
            <form onSubmit={handleSubmit} className="mt-4 space-y-2.5">
              {story.question.options.map((opt,i)=>{const checked=selectedOption===i;return(
                <label key={i} className={`flex items-center gap-3.5 rounded-2xl border-2 px-4 py-3 cursor-pointer transition-all ${checked?'border-violet-500 bg-violet-50 dark:bg-violet-900/40 shadow-sm':'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:border-violet-300 dark:hover:border-violet-700'}`}>
                  <input type="radio" name={`q-${story.id}`} className="accent-violet-600 w-4 h-4 shrink-0" checked={checked} onChange={()=>{setSelectedOption(i);setSubmitted(false)}}/>
                  <span className="text-sm text-slate-800 dark:text-slate-200"><span className="font-bold text-violet-600 dark:text-violet-400">{String.fromCharCode(65+i)}.</span>{' '}{opt}</span>
                </label>
              )})}
              <button type="submit" disabled={selectedOption===null||submitted} className="mt-2 w-full rounded-2xl bg-violet-600 py-3.5 text-sm font-bold text-white hover:bg-violet-700 transition disabled:bg-slate-200 dark:disabled:bg-slate-800 disabled:text-slate-400 disabled:cursor-not-allowed active:scale-[0.99]">{submitted?'Prediction saved Γ£ô':'Submit prediction'}</button>
            </form>
          </div>
        </section>


        {/* ΓöÇΓöÇ SIMULATED UPDATE ΓöÇΓöÇ */}
        {currentSimulated&&story.simulatedUpdate&&(
          <section>
            <div className="rounded-3xl border-2 border-sky-300 dark:border-sky-700 bg-sky-50/50 dark:bg-sky-950/30 p-5">
              <span className="rounded-full bg-sky-100 dark:bg-sky-900/50 px-3 py-1 text-[11px] font-bold text-sky-800 dark:text-sky-300">ΓÜí Story updated</span>
              <h3 className="mt-3 font-bold text-slate-900 dark:text-white" style={{fontFamily:'Georgia,serif'}}>What actually happened</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-700 dark:text-slate-300">{story.simulatedUpdate.actualOutcome}</p>
              {predictedLabel&&(
                <div className="mt-4 rounded-2xl border border-sky-200 dark:border-sky-800 bg-white dark:bg-slate-900 p-4 space-y-2 text-sm">
                  <div className="flex items-start gap-2"><span className="font-semibold text-slate-500 dark:text-slate-400 shrink-0 w-28">You predicted:</span><span className="text-slate-800 dark:text-slate-200">{predictedLabel}</span></div>
                  <div className="flex items-start gap-2"><span className="font-semibold text-slate-500 dark:text-slate-400 shrink-0 w-28">Actual outcome:</span><span className="text-slate-800 dark:text-slate-200">{story.simulatedUpdate.outcomeSummary}</span></div>
                  <span className={`inline-flex mt-1 rounded-full px-3 py-1 text-[11px] font-bold ${predictedLabel===story.simulatedUpdate.outcomeSummary?'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400':'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'}`}>{predictedLabel===story.simulatedUpdate.outcomeSummary?'≡ƒÄ» Correct!':'Outcome was different'}</span>
                </div>
              )}
            </div>
          </section>
        )}

        {/* ΓöÇΓöÇ FEEDBACK CTA ΓöÇΓöÇ */}
        <section className="rounded-3xl border border-indigo-100 dark:border-indigo-900/50 bg-gradient-to-br from-indigo-50 to-white dark:from-indigo-950/30 dark:to-slate-950 p-5 text-center">
          <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">Found this useful?</p>
          <p className="text-xs text-slate-400 mt-0.5 mb-4">Help us improve NewsThread</p>
          <button onClick={onFeedback} className="rounded-full bg-indigo-600 text-white px-6 py-2.5 text-sm font-bold hover:bg-indigo-700 transition active:scale-95">Share feedback</button>
        </section>
      </div>
    </div>
  )
}
