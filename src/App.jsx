import { useState, useEffect, useRef } from 'react'
import { fallbackStories, fetchDailyStories, fetchRelatedTimeline } from './newsApi.js'
import { summarizeTimelineWithLocalModel } from './localRecap.js'
import JargonText from './JargonText.jsx'

/* ─── storage helpers ───────────────────────────────────────── */
const LS = {
  FOLLOWED:'nt_followed', ANSWERS:'nt_answers', HISTORY:'nt_history',
  SIMULATED:'nt_simulated', ONBOARDED:'nt_onboarded', INTERESTS:'nt_interests',
  DARK:'nt_dark', FEEDBACK:'nt_feedback', ANNOTATIONS:'nt_annotations',
  BOOKMARKS:'nt_bookmarks', STREAK:'nt_streak', NOTIFS:'nt_notifs',
}
const load=(k,fb)=>{try{const r=localStorage.getItem(k);return r==null?fb:JSON.parse(r)}catch{return fb}}
const save=(k,v)=>{try{localStorage.setItem(k,JSON.stringify(v))}catch{}}
const relTime=ts=>{
  const s=Math.floor((Date.now()-ts)/1000)
  if(s<60)return'just now';const m=Math.floor(s/60)
  if(m<60)return`${m}m ago`;const h=Math.floor(m/60)
  if(h<24)return`${h}h ago`;return new Date(ts).toLocaleDateString()
}

const INTERESTS=['Politics','Finance','Technology','Climate','Health','Urban','Science','Economy']
const CAT={
  Finance:   {pill:'bg-amber-100 text-amber-800',  dpill:'dark:bg-amber-900/40 dark:text-amber-300',   dot:'bg-amber-400'},
  Technology:{pill:'bg-sky-100 text-sky-800',      dpill:'dark:bg-sky-900/40 dark:text-sky-300',       dot:'bg-sky-400'},
  Economy:   {pill:'bg-violet-100 text-violet-800',dpill:'dark:bg-violet-900/40 dark:text-violet-300', dot:'bg-violet-400'},
  Health:    {pill:'bg-rose-100 text-rose-800',    dpill:'dark:bg-rose-900/40 dark:text-rose-300',     dot:'bg-rose-400'},
  Urban:     {pill:'bg-teal-100 text-teal-800',    dpill:'dark:bg-teal-900/40 dark:text-teal-300',     dot:'bg-teal-400'},
  Science:   {pill:'bg-indigo-100 text-indigo-800',dpill:'dark:bg-indigo-900/40 dark:text-indigo-300', dot:'bg-indigo-400'},
  Politics:  {pill:'bg-orange-100 text-orange-800',dpill:'dark:bg-orange-900/40 dark:text-orange-300', dot:'bg-orange-400'},
  Climate:   {pill:'bg-emerald-100 text-emerald-800',dpill:'dark:bg-emerald-900/40 dark:text-emerald-300',dot:'bg-emerald-400'},
}
const cs=cat=>CAT[cat]??{pill:'bg-slate-100 text-slate-700',dpill:'dark:bg-slate-800 dark:text-slate-300',dot:'bg-slate-400'}

/* ─── Onboarding ─────────────────────────────────────────────── */
function Onboarding({onDone}){
  const[step,setStep]=useState(0)
  const[sel,setSel]=useState([])
  const toggle=t=>setSel(p=>p.includes(t)?p.filter(x=>x!==t):[...p,t])
  return(
    <div className="fixed inset-0 z-50 bg-white dark:bg-slate-950 flex items-center justify-center">
      <div className="w-full max-w-sm px-6">
        <div className="flex justify-center gap-1.5 mb-8">
          {[0,1].map(i=><div key={i} className={`h-1 rounded-full transition-all duration-300 ${i===step?'w-8 bg-indigo-600':'w-2 bg-slate-200 dark:bg-slate-700'}`}/>)}
        </div>
        {step===0?(
          <div className="text-center">
            <div className="mx-auto w-20 h-20 rounded-3xl bg-gradient-to-br from-indigo-500 via-violet-500 to-purple-600 flex items-center justify-center mb-6 shadow-xl shadow-indigo-200 dark:shadow-indigo-900">
              <svg width="38" height="38" viewBox="0 0 38 38" fill="none"><path d="M7 10h24M7 17h18M7 24h24M7 31h13" stroke="white" strokeWidth="3" strokeLinecap="round"/></svg>
            </div>
            <h1 className="text-4xl font-bold text-slate-900 dark:text-white" style={{fontFamily:'Georgia,serif'}}>NewsThread</h1>
            <p className="mt-3 text-slate-500 dark:text-slate-400 leading-relaxed">News that actually sticks. Every story as a living thread — with context, recap, and a reason to remember.</p>
            <div className="mt-8 space-y-3 text-left">
              {[['🧵','Thread','See how every story evolved, step by step'],['🤖','Recap','AI catch-up tailored to what you already know'],['🎯','Engage','Predict what happens next — then find out']].map(([icon,title,desc])=>(
                <div key={title} className="flex gap-4 rounded-2xl border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 px-4 py-3.5">
                  <span className="text-2xl mt-0.5">{icon}</span>
                  <div><p className="font-semibold text-slate-900 dark:text-white text-sm">{title}</p><p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{desc}</p></div>
                </div>
              ))}
            </div>
            <button onClick={()=>setStep(1)} className="mt-8 w-full rounded-2xl bg-slate-900 dark:bg-white py-4 text-sm font-bold text-white dark:text-slate-900 hover:opacity-90 transition active:scale-[0.98]">Get started →</button>
            <p className="mt-3 text-xs text-slate-400">No account needed · stays on your device</p>
          </div>
        ):(
          <div className="text-center">
            <p className="text-xs font-bold uppercase tracking-widest text-indigo-500 mb-2">Step 2 of 2</p>
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white" style={{fontFamily:'Georgia,serif'}}>What interests you?</h2>
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">Personalise your thread feed.</p>
            <div className="mt-7 flex flex-wrap justify-center gap-2.5">
              {INTERESTS.map(t=>{const on=sel.includes(t);return(
                <button key={t} onClick={()=>toggle(t)} className={`rounded-full px-5 py-2.5 text-sm font-semibold border-2 transition-all active:scale-95 ${on?'border-indigo-500 bg-indigo-600 text-white shadow-md':'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:border-indigo-300'}`}>{t}</button>
              )})}
            </div>
            <button onClick={()=>onDone(sel)} className="mt-8 w-full rounded-2xl bg-slate-900 dark:bg-white py-4 text-sm font-bold text-white dark:text-slate-900 hover:opacity-90 transition active:scale-[0.98]">
              {sel.length===0?'Skip for now':`Start reading (${sel.length} topic${sel.length>1?'s':''})`}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

/* ─── Notification banner ────────────────────────────────────── */
function NotifBanner({notifs,onDismiss,onOpenStory}){
  if(!notifs.length)return null
  const n=notifs[0]
  return(
    <div className="fixed top-[54px] inset-x-0 z-40 flex justify-center px-4 pt-2 pointer-events-none">
      <div className="pointer-events-auto max-w-lg w-full rounded-2xl border border-sky-200 dark:border-sky-800 bg-sky-50 dark:bg-sky-950/80 shadow-lg px-4 py-3 flex items-center gap-3 animate-in slide-in-from-top-2 duration-300">
        <span className="text-lg shrink-0">⚡</span>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-bold text-sky-800 dark:text-sky-300">Story updated</p>
          <p className="text-sm text-slate-700 dark:text-slate-300 truncate font-medium">{n.title}</p>
        </div>
        <button onClick={()=>onOpenStory(n.storyId)} className="shrink-0 rounded-full bg-sky-600 text-white text-xs font-bold px-3 py-1.5 hover:bg-sky-700 transition">Read</button>
        <button onClick={()=>onDismiss(n.storyId)} className="shrink-0 text-sky-400 hover:text-sky-700 text-lg leading-none">×</button>
      </div>
    </div>
  )
}

/* ─── Feedback modal ─────────────────────────────────────────── */
function FeedbackModal({onClose,onSubmit}){
  const[rating,setRating]=useState(0)
  const[hov,setHov]=useState(0)
  const[text,setText]=useState('')
  const[aspect,setAspect]=useState('')
  const[done,setDone]=useState(false)
  const aspects=['Thread timeline','AI Recap','Predict & reflect','Story variety','Overall design']
  const submit=()=>{if(!rating)return;onSubmit({rating,aspect,text,ts:Date.now()});setDone(true);setTimeout(onClose,1800)}
  return(
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-[2px]"/>
      <div className="relative z-10 w-full max-w-md rounded-t-3xl sm:rounded-3xl bg-white dark:bg-slate-900 shadow-2xl overflow-hidden" onClick={e=>e.stopPropagation()}>
        {done?(
          <div className="px-6 py-12 text-center"><p className="text-4xl mb-3">🙏</p><p className="font-bold text-slate-900 dark:text-white text-lg">Thank you!</p><p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Your feedback helps us improve.</p></div>
        ):(
          <>
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-800">
              <div><h2 className="font-bold text-slate-900 dark:text-white">Share your feedback</h2><p className="text-xs text-slate-400 mt-0.5">Prototype v1 · Design Thinking Project</p></div>
              <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 text-xs font-bold hover:bg-slate-200 transition">✕</button>
            </div>
            <div className="px-5 py-5 space-y-5">
              <div>
                <p className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">Overall experience</p>
                <div className="flex gap-2">{[1,2,3,4,5].map(n=>(
                  <button key={n} onMouseEnter={()=>setHov(n)} onMouseLeave={()=>setHov(0)} onClick={()=>setRating(n)} className="text-3xl transition-transform hover:scale-110 active:scale-95">{n<=(hov||rating)?'⭐':'☆'}</button>
                ))}</div>
                {rating>0&&<p className="text-xs text-slate-400 mt-1.5">{['','Poor','Fair','Good','Great','Excellent'][rating]}</p>}
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2.5">What stood out most?</p>
                <div className="flex flex-wrap gap-2">{aspects.map(a=>(
                  <button key={a} onClick={()=>setAspect(a===aspect?'':a)} className={`rounded-full px-3.5 py-1.5 text-xs font-semibold border transition-all ${a===aspect?'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300':'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-indigo-300'}`}>{a}</button>
                ))}</div>
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Thoughts? <span className="font-normal text-slate-400">(optional)</span></p>
                <textarea value={text} onChange={e=>setText(e.target.value)} rows={3} placeholder="What worked? What should change?" className="w-full rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-4 py-3 text-sm text-slate-800 dark:text-slate-200 placeholder:text-slate-400 resize-none outline-none focus:ring-2 focus:ring-indigo-400"/>
              </div>
              <button onClick={submit} disabled={!rating} className="w-full rounded-2xl bg-indigo-600 py-3.5 text-sm font-bold text-white hover:bg-indigo-700 transition disabled:bg-slate-200 dark:disabled:bg-slate-700 disabled:text-slate-400 disabled:cursor-not-allowed active:scale-[0.99]">Submit feedback</button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

/* ─── Navbar ─────────────────────────────────────────────────── */
function Navbar({onGoHome,onToggleProfile,onToggleHistory,profileOpen,historyOpen,darkMode,onToggleDark,searchQuery,onSearch,onFeedback,streak,notifCount}){
  const[searchOpen,setSearchOpen]=useState(false)
  const ref=useRef(null)
  const openSearch=()=>{setSearchOpen(true);setTimeout(()=>ref.current?.focus(),50)}
  const closeSearch=()=>{setSearchOpen(false);onSearch('')}
  return(
    <nav className="fixed inset-x-0 top-0 z-50 bg-white/95 dark:bg-slate-950/95 backdrop-blur-md border-b border-slate-100 dark:border-slate-800">
      <div className="mx-auto flex max-w-3xl items-center gap-3 px-4 h-[54px]">
        {searchOpen?(
          <div className="flex flex-1 items-center gap-2">
            <input ref={ref} type="search" value={searchQuery} onChange={e=>onSearch(e.target.value)} placeholder="Search stories, topics…" className="flex-1 rounded-xl border border-indigo-300 dark:border-indigo-600 bg-indigo-50 dark:bg-indigo-950/50 px-4 py-2 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-indigo-400"/>
            <button onClick={closeSearch} className="shrink-0 text-sm font-semibold text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white px-1 transition">Cancel</button>
          </div>
        ):(
          <>
            <button onClick={onGoHome} className="shrink-0 text-[17px] font-bold text-slate-900 dark:text-white hover:text-indigo-600 dark:hover:text-indigo-400 transition" style={{fontFamily:'Georgia,serif',fontStyle:'italic'}}>NewsThread</button>
            {streak>1&&<span className="hidden sm:inline-flex items-center gap-1 rounded-full bg-orange-50 dark:bg-orange-900/30 border border-orange-200 dark:border-orange-800 px-2 py-0.5 text-[11px] font-bold text-orange-600 dark:text-orange-400">🔥 {streak}d</span>}
            <div className="flex-1"/>
            <div className="flex items-center gap-0.5">
              <button onClick={openSearch} title="Search" className="p-2 rounded-xl text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white transition">
                <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="7" cy="7" r="5"/><path d="M12 12l3 3"/></svg>
              </button>
              <button onClick={onFeedback} title="Feedback" className="p-2 rounded-xl text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white transition">
                <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>
              </button>
              <button onClick={onToggleDark} title="Toggle theme" className="p-2 rounded-xl text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white transition">
                {darkMode
                  ?<svg width="16" height="16" fill="currentColor" viewBox="0 0 20 20"><path d="M10 2a1 1 0 011 1v1a1 1 0 01-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z"/></svg>
                  :<svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/></svg>}
              </button>
              <button onClick={onToggleHistory} title="History" className={`relative p-2 rounded-xl transition ${historyOpen?'bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300':'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white'}`}>
                <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                {notifCount>0&&<span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-red-500"/>}
              </button>
              <button onClick={onToggleProfile} title="Profile" className={`p-2 rounded-xl transition ${profileOpen?'bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300':'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white'}`}>
                <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" viewBox="0 0 24 24"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/></svg>
              </button>
            </div>
          </>
        )}
      </div>
    </nav>
  )
}

/* ─── Category filter bar ────────────────────────────────────── */
function CategoryBar({categories,active,onChange}){
  return(
    <div className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      <button onClick={()=>onChange('')} className={`shrink-0 rounded-full px-4 py-1.5 text-xs font-bold transition border ${!active?'bg-slate-900 dark:bg-white text-white dark:text-slate-900 border-transparent':'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-slate-400'}`}>All</button>
      {categories.map(c=>{const st=cs(c);const isA=active===c;return(
        <button key={c} onClick={()=>onChange(c===active?'':c)} className={`shrink-0 rounded-full px-4 py-1.5 text-xs font-bold transition border ${isA?`${st.pill} ${st.dpill} border-transparent`:'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-slate-400'}`}>{c}</button>
      )})}
    </div>
  )
}

/* ─── Story card ─────────────────────────────────────────────── */
function StoryCard({story,onOpen,isFollowing,isRead,isBookmarked,onToggleBookmark}){
  const st=cs(story.category)
  return(
    <div className="relative group">
      <button type="button" onClick={()=>onOpen(story.id)} className="w-full text-left rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm hover:shadow-lg hover:border-indigo-200 dark:hover:border-indigo-700 transition-all duration-200 active:scale-[0.99]">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex flex-wrap gap-1.5">
            <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ${st.pill} ${st.dpill}`}>{story.category}</span>
            {isFollowing&&<span className="rounded-full border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-900/30 px-2.5 py-0.5 text-[11px] font-bold text-emerald-700 dark:text-emerald-400">Following</span>}
            {isRead&&<span className="rounded-full bg-slate-100 dark:bg-slate-800 px-2.5 py-0.5 text-[11px] font-bold text-slate-400">Read</span>}
          </div>
          <span className="shrink-0 text-[11px] text-slate-300 dark:text-slate-600 mt-0.5">{story.readTime}</span>
        </div>

        {story.imageUrl&&(
          <div className="mb-3 overflow-hidden rounded-2xl border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950">
            <img
              src={story.imageUrl}
              alt=""
              loading="lazy"
              className="h-36 w-full object-cover"
              onError={(e)=>{e.currentTarget.style.display='none'}}
            />
          </div>
        )}

        <h2 className="text-[17px] font-bold leading-snug text-slate-900 dark:text-white pr-8" style={{fontFamily:'Georgia,serif'}}>{story.title}</h2>
        <p className="mt-1.5 text-sm leading-relaxed text-slate-500 dark:text-slate-400 line-clamp-2">{story.description}</p>
        <div className="mt-4 flex items-center gap-0.5 overflow-hidden">
          {story.timeline.map((_,i)=>(
            <div key={i} className="flex items-center">
              <div className={`shrink-0 w-1.5 h-1.5 rounded-full ${st.dot}`}/>
              {i<story.timeline.length-1&&<div className="w-5 h-px bg-slate-200 dark:bg-slate-700 mx-0.5 shrink-0"/>}
            </div>
          ))}
          <span className="ml-2 text-[11px] text-slate-400 dark:text-slate-500 truncate">{story.timeline[story.timeline.length-1].event}</span>
        </div>
        <div className="mt-4 flex items-center justify-between">
          <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 flex items-center gap-1 group-hover:gap-2 transition-all">
            Read with context <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M2 6h8M7 3l3 3-3 3"/></svg>
          </span>
          <span className="text-[11px] text-slate-300 dark:text-slate-600">{story.timeline.length} events</span>
        </div>
      </button>
      {/* bookmark button overlaid */}
      <button onClick={e=>{e.stopPropagation();onToggleBookmark(story.id)}}
        className="absolute top-4 right-4 w-7 h-7 flex items-center justify-center rounded-full transition-all hover:scale-110 active:scale-95"
        title={isBookmarked?'Remove bookmark':'Bookmark'}>
        <svg width="15" height="15" viewBox="0 0 24 24" fill={isBookmarked?'#6366f1':'none'} stroke={isBookmarked?'#6366f1':'#cbd5e1'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2z"/>
        </svg>
      </button>
    </div>
  )
}

/* ─── Feed ───────────────────────────────────────────────────── */
function Feed({stories,followedIds,readingHistory,onOpen,searchQuery,bookmarks,onToggleBookmark,activeTab,onTabChange}){
  const[activeCat,setActiveCat]=useState('')
  const readIds=new Set(readingHistory.map(h=>h.storyId))
  const categories=[...new Set(stories.map(s=>s.category))]

  const filtered=stories
    .filter(s=>!searchQuery.trim()||s.title.toLowerCase().includes(searchQuery.toLowerCase())||s.description.toLowerCase().includes(searchQuery.toLowerCase())||s.category.toLowerCase().includes(searchQuery.toLowerCase()))
    .filter(s=>!activeCat||s.category===activeCat)
    .filter(s=>activeTab==='bookmarks'?bookmarks.includes(s.id):true)

  const following=filtered.filter(s=>followedIds.includes(s.id))
  const rest=filtered.filter(s=>!followedIds.includes(s.id))

  return(
    <div className="mx-auto max-w-3xl px-4 pb-24 pt-4">
      {!searchQuery&&(
        <header className="mb-5">
          <p className="text-xs font-bold uppercase tracking-widest text-indigo-500 mb-1">Today's threads</p>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white" style={{fontFamily:'Georgia,serif'}}>For you</h1>
          <p className="mt-1 text-[13px] text-slate-400">Thread · Recap · Engage — every story</p>
        </header>
      )}

      {/* tab bar */}
      {!searchQuery&&(
        <div className="flex gap-2 mb-5">
          {[['feed','Feed'],['bookmarks','Bookmarks']].map(([tab,label])=>(
            <button key={tab} onClick={()=>onTabChange(tab)} className={`rounded-full px-4 py-1.5 text-xs font-bold transition border ${activeTab===tab?'bg-slate-900 dark:bg-white text-white dark:text-slate-900 border-transparent':'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'}`}>
              {label}{tab==='bookmarks'&&bookmarks.length>0&&<span className="ml-1 text-indigo-400">({bookmarks.length})</span>}
            </button>
          ))}
        </div>
      )}

      {!searchQuery&&activeTab==='feed'&&<div className="mb-5"><CategoryBar categories={categories} active={activeCat} onChange={setActiveCat}/></div>}

      {searchQuery&&<p className="mb-5 text-sm text-slate-500 dark:text-slate-400">{filtered.length===0?'No results for ':`${filtered.length} result${filtered.length!==1?'s':''} for `}<span className="font-semibold text-slate-800 dark:text-white">"{searchQuery}"</span></p>}

      {/* bookmarks empty state */}
      {activeTab==='bookmarks'&&bookmarks.length===0&&(
        <div className="py-20 text-center">
          <p className="text-4xl mb-3">🔖</p>
          <p className="font-semibold text-slate-700 dark:text-slate-300">No bookmarks yet</p>
          <p className="text-sm text-slate-400 mt-1">Tap the bookmark icon on any story card</p>
        </div>
      )}

      {following.length>0&&!searchQuery&&activeTab==='feed'&&!activeCat&&(
        <div className="mb-8">
          <p className="text-[11px] font-bold uppercase tracking-widest text-emerald-600 dark:text-emerald-500 mb-3 flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block"/>Following</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">{following.map(s=><StoryCard key={s.id} story={s} onOpen={onOpen} isFollowing isRead={readIds.has(s.id)} isBookmarked={bookmarks.includes(s.id)} onToggleBookmark={onToggleBookmark}/>)}</div>
          {rest.length>0&&<div className="mt-8 mb-5 border-t border-slate-100 dark:border-slate-800 pt-6"><p className="text-[11px] font-bold uppercase tracking-widest text-slate-400 mb-4">More stories</p></div>}
        </div>
      )}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">{rest.map(s=><StoryCard key={s.id} story={s} onOpen={onOpen} isFollowing={false} isRead={readIds.has(s.id)} isBookmarked={bookmarks.includes(s.id)} onToggleBookmark={onToggleBookmark}/>)}</div>
      {filtered.length===0&&activeTab!=='bookmarks'&&<div className="py-24 text-center"><p className="text-5xl mb-4">🔍</p><p className="text-slate-500 dark:text-slate-400">No stories found</p><button onClick={()=>setActiveCat('')} className="mt-4 text-sm text-indigo-500 font-semibold hover:underline">Clear filters</button></div>}
    </div>
  )
}

/* ─── Story view ─────────────────────────────────────────────── */
function StoryView({story,isFollowing,onToggleFollow,savedAnswer,onSaveAnswer,showSimulatedUpdate,onSimulateUpdate,onBack,onFeedback,annotations,onSaveAnnotation,isBookmarked,onToggleBookmark}){
  const[expandedIndex,setExpandedIndex]=useState(null)
  const[annotatingIndex,setAnnotatingIndex]=useState(null)
  const[annotationDraft,setAnnotationDraft]=useState('')
  const[selectedOption,setSelectedOption]=useState(null)
  const[submitted,setSubmitted]=useState(false)
  const[progress,setProgress]=useState(0)
  const[copied,setCopied]=useState(false)
  const[relatedTimeline,setRelatedTimeline]=useState([])
  const[relErr,setRelErr]=useState('')
  const[recapLines,setRecapLines]=useState([
    'This thread is still building and has limited updates so far.',
    'As more related coverage is added, this recap will evolve automatically.',
    'Follow the story to track how the timeline changes day by day.',
  ])

  useEffect(()=>{
    if(savedAnswer){setSelectedOption(savedAnswer.optionIndex);setSubmitted(true)}
    else{setSelectedOption(null);setSubmitted(false)}
  },[story.id,savedAnswer])
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
  const handleShare=()=>{const t=`${story.title} — NewsThread`;if(navigator.share)navigator.share({title:story.title,text:t}).catch(()=>{});else navigator.clipboard.writeText(t).then(()=>{setCopied(true);setTimeout(()=>setCopied(false),2000)})}

  const saveAnnotation=(eventIndex)=>{
    if(!annotationDraft.trim())return
    onSaveAnnotation(story.id,eventIndex,annotationDraft.trim())
    setAnnotationDraft('')
    setAnnotatingIndex(null)
  }

  const predictedLabel=savedAnswer?.optionLabel??(selectedOption!==null?story.question.options[selectedOption]:null)
  const st=cs(story.category)
  const timelineToShow = relatedTimeline.length ? relatedTimeline : story.timeline

  return(
    <div className="pb-24">
      <div className="fixed top-[54px] inset-x-0 z-40 h-0.5 bg-slate-100 dark:bg-slate-800">
        <div className="h-full bg-indigo-500 transition-all duration-75" style={{width:`${progress}%`}}/>
      </div>
      <div className="bg-white dark:bg-slate-950 border-b border-slate-100 dark:border-slate-800">
        <div className="mx-auto max-w-3xl px-4 pt-6 pb-7">
          <button onClick={onBack} className="mb-5 inline-flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition">
            <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M9 3L4 8l5 5"/></svg>Back to feed
          </button>
          <div className="flex items-center gap-2 mb-3">
            <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ${st.pill} ${st.dpill}`}>{story.category}</span>
            <span className="text-xs text-slate-400 dark:text-slate-500">{story.readTime} · {story.timeline.length} events</span>
          </div>
          <h1 className="text-lg sm:text-xl font-bold leading-snug text-slate-900 dark:text-white" style={{fontFamily:'Georgia,serif'}}><JargonText text={story.title}/></h1>
          <p className="mt-1.5 text-sm text-slate-500 dark:text-slate-400 leading-relaxed"><JargonText text={story.description}/></p>
        </div>
      </div>

      <div className="mx-auto max-w-3xl px-4 pt-8 space-y-10">

        {/* ── THREAD with LINKS (shown first) ── */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2"><div className="w-1 h-5 rounded-full bg-amber-500"/><span className="text-[11px] font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">🧵 Thread — timeline</span></div>
            <span className="text-[11px] text-slate-400 dark:text-slate-500">Tap an event · add a note</span>
          </div>
          {relErr&&<div className="mb-4 rounded-2xl border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/40 px-4 py-3 text-sm text-amber-800 dark:text-amber-300">Couldn't load related coverage. ({relErr})</div>}
          <div className="rounded-3xl border border-amber-200 dark:border-amber-900/50 bg-amber-50/40 dark:bg-amber-950/20 p-5">
            <div className="relative pl-6">
              <div className="absolute left-[5px] top-3 bottom-3 w-px bg-amber-200 dark:bg-amber-800"/>
              <div className="space-y-2">
                {timelineToShow.map((item,i)=>{
                  const isOpen=expandedIndex===i
                  const note=annotations[`${story.id}_${i}`]
                  const isAnnotating=annotatingIndex===i
                  return(
                    <div key={i}>
                      <button type="button" onClick={()=>{setExpandedIndex(p=>p===i?null:i);setAnnotatingIndex(null)}}
                        className={`relative w-full text-left pl-5 pr-4 py-3 rounded-2xl border transition-all ${isOpen?'border-amber-300 dark:border-amber-700 bg-white dark:bg-slate-900 shadow-sm':'border-transparent hover:border-amber-200 dark:hover:border-amber-800 hover:bg-white/60 dark:hover:bg-slate-900/60'}`}>
                        <div className={`absolute left-[-17px] top-1/2 -translate-y-1/2 w-3 h-3 rounded-full border-2 transition-colors ${isOpen?'border-amber-500 bg-amber-400':'border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-950'}`}/>
                        {note&&<div className="absolute right-3 top-3 w-2 h-2 rounded-full bg-indigo-400" title="Has annotation"/>}
                        <div className="flex items-center justify-between gap-2">
                          <time className="text-[11px] font-bold text-amber-700 dark:text-amber-500">{item.date}</time>
                          <svg className={`shrink-0 text-amber-400 dark:text-amber-600 transition-transform ${isOpen?'rotate-180':''}`} width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 5l5 5 5-5"/></svg>
                        </div>
                        <p className="mt-0.5 text-[13px] font-medium text-slate-800 dark:text-slate-200 leading-snug"><JargonText text={item.event}/></p>
                        {isOpen&&(
                          <div className="mt-2.5 border-t border-amber-100 dark:border-amber-900 pt-2.5 space-y-2">
                            <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-400"><JargonText text={item.details}/></p>
                            {Array.isArray(item.links)&&item.links.length>0?(
                              <div className="space-y-1.5">
                                {item.links.map((link, idx)=>(
                                  <a key={`${link.url}-${idx}`} href={link.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 mr-3 text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline">
                                    {link.source||`Source ${idx+1}`}
                                    <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 3h4v4"/><path d="M9 3L3 9"/></svg>
                                  </a>
                                ))}
                              </div>
                            ):item.url&&(
                              <a href={item.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline">
                                {item.source||'Source'}
                                <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 3h4v4"/><path d="M9 3L3 9"/></svg>
                              </a>
                            )}
                          </div>
                        )}
                      </button>

                      {/* annotation area */}
                      {isOpen&&(
                        <div className="ml-0 mt-1.5 rounded-2xl border border-indigo-100 dark:border-indigo-900/50 bg-indigo-50/50 dark:bg-indigo-950/20 p-3">
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
                              <textarea value={annotationDraft} onChange={e=>setAnnotationDraft(e.target.value)} rows={2} placeholder="Write your thoughts on this event…" className="w-full rounded-xl border border-indigo-200 dark:border-indigo-800 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-slate-800 dark:text-slate-200 placeholder:text-slate-400 resize-none outline-none focus:ring-2 focus:ring-indigo-400"/>
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

        {/* ── RECAP ── */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2"><div className="w-1 h-5 rounded-full bg-emerald-500"/><span className="text-[11px] font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">🤖 AI Recap</span></div>
            <span className="text-[11px] font-bold text-slate-400 dark:text-slate-500">3-line catch-up</span>
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

        <section>
          <div className="flex items-center justify-between">
            <div className="flex flex-wrap gap-2">
              <button onClick={onToggleFollow} className={`rounded-full px-4 py-2 text-sm font-bold border-2 transition-all active:scale-95 ${isFollowing?'border-emerald-400 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-800 dark:text-emerald-400':'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:border-indigo-300 hover:text-indigo-700'}`}>{isFollowing?'✓ Following':'+ Follow'}</button>
              <button onClick={()=>onToggleBookmark(story.id)} className={`rounded-full px-4 py-2 text-sm font-bold border-2 transition-all active:scale-95 ${isBookmarked?'border-indigo-400 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-800 dark:text-indigo-400':'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:border-indigo-300'}`}>{isBookmarked?'🔖 Saved':'🔖 Save'}</button>
              {story.simulatedUpdate&&<button onClick={onSimulateUpdate} disabled={showSimulatedUpdate} className="rounded-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-4 py-2 text-sm font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition-all active:scale-95">{showSimulatedUpdate?'Updated ✓':'⚡ Simulate update'}</button>}
              <button onClick={handleShare} className="rounded-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-4 py-2 text-sm font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all active:scale-95">{copied?'Copied!':'↗ Share'}</button>
            </div>
            {story.sourceUrl&&(
              <a href={story.sourceUrl} target="_blank" rel="noreferrer" className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline">
                View original
              </a>
            )}
          </div>
        </section>

        {/* ── ENGAGE ── */}
        <section>
          <div className="flex items-center gap-2 mb-4"><div className="w-1 h-5 rounded-full bg-violet-500"/><span className="text-[11px] font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">🎯 Engage</span></div>
          <div className="rounded-3xl border border-violet-200 dark:border-violet-900/50 bg-violet-50/40 dark:bg-violet-950/20 p-5">
            {savedAnswer&&<div className="mb-4 rounded-2xl border border-violet-200 dark:border-violet-800 bg-violet-50 dark:bg-violet-900/30 px-4 py-3 text-sm text-violet-900 dark:text-violet-300"><span className="font-bold">Your answer:</span>{' '}{String.fromCharCode(65+savedAnswer.optionIndex)}. {savedAnswer.optionLabel}</div>}
            <p className="text-base font-bold text-slate-900 dark:text-white leading-snug" style={{fontFamily:'Georgia,serif'}}>{story.question.text}</p>
            <form onSubmit={handleSubmit} className="mt-4 space-y-2.5">
              {story.question.options.map((opt,i)=>{const checked=selectedOption===i;return(
                <label key={i} className={`flex items-center gap-3.5 rounded-2xl border-2 px-4 py-3 cursor-pointer transition-all ${checked?'border-violet-500 bg-violet-50 dark:bg-violet-900/40 shadow-sm':'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:border-violet-300 dark:hover:border-violet-700'}`}>
                  <input type="radio" name={`q-${story.id}`} className="accent-violet-600 w-4 h-4 shrink-0" checked={checked} onChange={()=>{setSelectedOption(i);setSubmitted(false)}}/>
                  <span className="text-sm text-slate-800 dark:text-slate-200"><span className="font-bold text-violet-600 dark:text-violet-400">{String.fromCharCode(65+i)}.</span>{' '}{opt}</span>
                </label>
              )})}
              <button type="submit" disabled={selectedOption===null||submitted} className="mt-2 w-full rounded-2xl bg-violet-600 py-3.5 text-sm font-bold text-white hover:bg-violet-700 transition disabled:bg-slate-200 dark:disabled:bg-slate-800 disabled:text-slate-400 disabled:cursor-not-allowed active:scale-[0.99]">{submitted?'Prediction saved ✓':'Submit prediction'}</button>
            </form>
          </div>
        </section>

        {/* ── SIMULATED UPDATE ── */}
        {showSimulatedUpdate&&story.simulatedUpdate&&(
          <section>
            <div className="rounded-3xl border-2 border-sky-300 dark:border-sky-700 bg-sky-50/50 dark:bg-sky-950/30 p-5">
              <span className="rounded-full bg-sky-100 dark:bg-sky-900/50 px-3 py-1 text-[11px] font-bold text-sky-800 dark:text-sky-300">⚡ Story updated</span>
              <h3 className="mt-3 font-bold text-slate-900 dark:text-white" style={{fontFamily:'Georgia,serif'}}>What actually happened</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-700 dark:text-slate-300">{story.simulatedUpdate.actualOutcome}</p>
              {predictedLabel&&(
                <div className="mt-4 rounded-2xl border border-sky-200 dark:border-sky-800 bg-white dark:bg-slate-900 p-4 space-y-2 text-sm">
                  <div className="flex items-start gap-2"><span className="font-semibold text-slate-500 dark:text-slate-400 shrink-0 w-28">You predicted:</span><span className="text-slate-800 dark:text-slate-200">{predictedLabel}</span></div>
                  <div className="flex items-start gap-2"><span className="font-semibold text-slate-500 dark:text-slate-400 shrink-0 w-28">Actual outcome:</span><span className="text-slate-800 dark:text-slate-200">{story.simulatedUpdate.outcomeSummary}</span></div>
                  <span className={`inline-flex mt-1 rounded-full px-3 py-1 text-[11px] font-bold ${predictedLabel===story.simulatedUpdate.outcomeSummary?'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400':'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'}`}>{predictedLabel===story.simulatedUpdate.outcomeSummary?'🎯 Correct!':'Outcome was different'}</span>
                </div>
              )}
            </div>
          </section>
        )}

        {/* ── FEEDBACK CTA ── */}
        <section className="rounded-3xl border border-indigo-100 dark:border-indigo-900/50 bg-gradient-to-br from-indigo-50 to-white dark:from-indigo-950/30 dark:to-slate-950 p-5 text-center">
          <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">Found this useful?</p>
          <p className="text-xs text-slate-400 mt-0.5 mb-4">Help us improve NewsThread</p>
          <button onClick={onFeedback} className="rounded-full bg-indigo-600 text-white px-6 py-2.5 text-sm font-bold hover:bg-indigo-700 transition active:scale-95">Share feedback</button>
        </section>
      </div>
    </div>
  )
}

/* ─── Predictions history screen ─────────────────────────────── */
function PredictionsScreen({stories,userAnswers,simulatedByStory,onOpenStory,onBack}){
  const answered=stories.filter(s=>userAnswers[String(s.id)])
  return(
    <div className="mx-auto max-w-3xl px-4 pb-24 pt-4">
      <button onClick={onBack} className="mb-5 inline-flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition">
        <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M9 3L4 8l5 5"/></svg>Back
      </button>
      <p className="text-xs font-bold uppercase tracking-widest text-violet-500 mb-1">Your predictions</p>
      <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-6" style={{fontFamily:'Georgia,serif'}}>Prediction tracker</h1>
      {answered.length===0&&(
        <div className="py-20 text-center rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
          <p className="text-4xl mb-3">🎯</p>
          <p className="font-semibold text-slate-700 dark:text-slate-300">No predictions yet</p>
          <p className="text-sm text-slate-400 mt-1">Read a story and submit your prediction to track it here</p>
        </div>
      )}
      <div className="space-y-4">
        {answered.map(s=>{
          const ans=userAnswers[String(s.id)]
          const revealed=simulatedByStory[String(s.id)]
          const correct=revealed&&ans.optionLabel===s.simulatedUpdate?.outcomeSummary
          return(
            <button key={s.id} onClick={()=>onOpenStory(s.id)} className="w-full text-left rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 hover:shadow-md hover:border-indigo-200 dark:hover:border-indigo-700 transition-all">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400 mb-1">{s.category}</p>
                  <p className="font-bold text-slate-900 dark:text-white text-[15px] leading-snug" style={{fontFamily:'Georgia,serif'}}>{s.title}</p>
                  <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">Your prediction: <span className="font-semibold text-violet-600 dark:text-violet-400">{ans.optionLabel}</span></p>
                  {revealed&&<p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">Actual: <span className="font-semibold text-slate-700 dark:text-slate-300">{s.simulatedUpdate?.outcomeSummary}</span></p>}
                </div>
                <div className="shrink-0 mt-1">
                  {!revealed&&<span className="rounded-full bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400 px-3 py-1 text-[11px] font-bold">Pending</span>}
                  {revealed&&correct&&<span className="rounded-full bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400 px-3 py-1 text-[11px] font-bold">🎯 Correct</span>}
                  {revealed&&!correct&&<span className="rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 px-3 py-1 text-[11px] font-bold">Incorrect</span>}
                </div>
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}

/* ─── Drawers ─────────────────────────────────────────────────── */
function Drawer({onClose,children}){
  return(
    <div className="fixed inset-0 z-40 flex items-end sm:items-center justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-[2px]"/>
      <div className="relative z-10 w-full max-w-md rounded-t-3xl sm:rounded-3xl bg-white dark:bg-slate-900 shadow-2xl overflow-hidden" onClick={e=>e.stopPropagation()}>{children}</div>
    </div>
  )
}
function DHead({title,sub,onClose}){
  return(
    <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-800">
      <div><h2 className="font-bold text-slate-900 dark:text-white">{title}</h2>{sub&&<p className="text-xs text-slate-400 mt-0.5">{sub}</p>}</div>
      <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 text-xs font-bold hover:bg-slate-200 dark:hover:bg-slate-700 transition">✕</button>
    </div>
  )
}

function HistoryDrawer({items,onClose,onPickStory}){
  return(
    <Drawer onClose={onClose}>
      <DHead title="Reading history" sub={`${items.length} ${items.length===1?'story':'stories'} read`} onClose={onClose}/>
      <ul className="max-h-72 overflow-y-auto divide-y divide-slate-50 dark:divide-slate-800 p-2">
        {items.length===0?<li className="py-10 text-center text-sm text-slate-400">No stories read yet</li>:
        items.map(row=>(
          <li key={row.storyId}>
            <button onClick={()=>onPickStory(row.storyId)} className="flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left hover:bg-slate-50 dark:hover:bg-slate-800 transition">
              <div className="w-9 h-9 rounded-xl bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center shrink-0"><span className="text-indigo-600 dark:text-indigo-400 text-xs font-bold">{row.title[0]}</span></div>
              <div className="min-w-0 flex-1"><p className="text-sm font-semibold text-slate-900 dark:text-white truncate">{row.title}</p><p className="text-xs text-slate-400">{relTime(row.lastOpened)}</p></div>
              <svg className="shrink-0 text-slate-300 dark:text-slate-600" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 3l5 5-5 5"/></svg>
            </button>
          </li>
        ))}
      </ul>
    </Drawer>
  )
}

function ProfilePanel({onClose,followedIds,readingHistory,interests,allFeedback,streak,onShowPredictions}){
  const avg=allFeedback.length?(allFeedback.reduce((s,f)=>s+f.rating,0)/allFeedback.length).toFixed(1):null
  const annotatedCount=Object.keys(load(LS.ANNOTATIONS,{})).length
  return(
    <Drawer onClose={onClose}>
      <div className="px-5 pt-6 pb-5 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-4">
          <div className="relative w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-400 to-violet-500 flex items-center justify-center text-white text-2xl font-bold shadow-sm">N
            {streak>1&&<span className="absolute -bottom-1 -right-1 rounded-full bg-orange-500 text-white text-[9px] font-bold px-1.5 py-0.5">{streak}d🔥</span>}
          </div>
          <div><p className="font-bold text-slate-900 dark:text-white text-base">Demo Reader</p><p className="text-xs text-slate-400 mt-0.5">All data local · Bengaluru</p></div>
          <button onClick={onClose} className="ml-auto w-8 h-8 flex items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 text-xs font-bold hover:bg-slate-200 transition">✕</button>
        </div>
      </div>
      <div className="px-5 py-4 grid grid-cols-4 gap-2 border-b border-slate-100 dark:border-slate-800">
        {[{label:'Read',value:readingHistory.length},{label:'Following',value:followedIds.length},{label:'Notes',value:annotatedCount},{label:'Avg ★',value:avg||'—'}].map(s=>(
          <div key={s.label} className="rounded-2xl bg-slate-50 dark:bg-slate-800 px-2 py-3 text-center">
            <p className="text-lg font-bold text-slate-900 dark:text-white">{s.value}</p>
            <p className="text-[10px] text-slate-500 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* predictions CTA */}
      <div className="px-5 py-3 border-b border-slate-100 dark:border-slate-800">
        <button onClick={onShowPredictions} className="w-full flex items-center justify-between rounded-2xl bg-violet-50 dark:bg-violet-900/20 border border-violet-200 dark:border-violet-800 px-4 py-3 hover:bg-violet-100 dark:hover:bg-violet-900/40 transition">
          <div className="flex items-center gap-3">
            <span className="text-xl">🎯</span>
            <div className="text-left"><p className="text-sm font-bold text-violet-900 dark:text-violet-300">Prediction tracker</p><p className="text-xs text-violet-500 dark:text-violet-400">See all your predictions</p></div>
          </div>
          <svg className="text-violet-400" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 3l5 5-5 5"/></svg>
        </button>
      </div>

      {interests.length>0&&(
        <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2.5">Topics</p>
          <div className="flex flex-wrap gap-2">{interests.map(t=><span key={t} className="rounded-full bg-indigo-50 dark:bg-indigo-900/40 border border-indigo-200 dark:border-indigo-800 px-3 py-1 text-xs font-bold text-indigo-700 dark:text-indigo-400">{t}</span>)}</div>
        </div>
      )}
      <div className="px-5 py-4"><p className="text-[11px] text-slate-400 text-center">NewsThread · Prototype v1 · Design Thinking Project · Bengaluru</p></div>
    </Drawer>
  )
}

/* ─── streak helper ──────────────────────────────────────────── */
function updateStreak(){
  const today=new Date().toDateString()
  const data=load(LS.STREAK,{streak:0,lastDay:''})
  const yesterday=new Date(Date.now()-86400000).toDateString()
  if(data.lastDay===today)return data.streak
  const newStreak=data.lastDay===yesterday?data.streak+1:1
  save(LS.STREAK,{streak:newStreak,lastDay:today})
  return newStreak
}

/* ─── App ────────────────────────────────────────────────────── */
export default function App(){
  const[ready,setReady]=useState(false)
  const[onboarded,setOnboarded]=useState(false)
  const[screen,setScreen]=useState('feed') // 'feed' | 'story' | 'predictions'
  const[activeId,setActiveId]=useState(null)
  const[activeTab,setActiveTab]=useState('feed')
  const[profileOpen,setProfileOpen]=useState(false)
  const[historyOpen,setHistoryOpen]=useState(false)
  const[feedbackOpen,setFeedbackOpen]=useState(false)
  const[followedIds,setFollowedIds]=useState([])
  const[userAnswers,setUserAnswers]=useState({})
  const[readingHistory,setReadingHistory]=useState([])
  const[simulatedByStory,setSimulatedByStory]=useState({})
  const[interests,setInterests]=useState([])
  const[darkMode,setDarkMode]=useState(false)
  const[searchQuery,setSearchQuery]=useState('')
  const[allFeedback,setAllFeedback]=useState([])
  const[annotations,setAnnotations]=useState({})
  const[bookmarks,setBookmarks]=useState([])
  const[streak,setStreak]=useState(0)
  const[notifs,setNotifs]=useState([])
  const[storiesData,setStoriesData]=useState(fallbackStories)
  const[storiesLoading,setStoriesLoading]=useState(false)
  const[storiesError,setStoriesError]=useState('')

  useEffect(()=>{
    const dm=load(LS.DARK,false);setDarkMode(dm);document.documentElement.classList.toggle('dark',dm)
    setOnboarded(load(LS.ONBOARDED,false))
    setFollowedIds(load(LS.FOLLOWED,[]))
    setUserAnswers(load(LS.ANSWERS,{}))
    setReadingHistory(load(LS.HISTORY,[]))
    setSimulatedByStory(load(LS.SIMULATED,{}))
    setInterests(load(LS.INTERESTS,[]))
    setAllFeedback(load(LS.FEEDBACK,[]))
    setAnnotations(load(LS.ANNOTATIONS,{}))
    setBookmarks(load(LS.BOOKMARKS,[]))
    setStreak(updateStreak())
    setReady(true)
  },[])

  useEffect(()=>{
    if(!ready||!onboarded)return

    let cancelled=false

    const loadStories=async()=>{
      setStoriesLoading(true)
      setStoriesError('')
      try{
        const nextStories=await fetchDailyStories(interests)
        if(!cancelled)setStoriesData(nextStories)
      }catch(err){
        if(cancelled)return
        setStoriesData(fallbackStories)
        const msg = err instanceof Error ? err.message : String(err)
        setStoriesError(`Unable to load fresh news right now. Showing saved demo stories instead. (${msg})`)
      }finally{
        if(!cancelled)setStoriesLoading(false)
      }
    }

    loadStories()
    return()=>{cancelled=true}
  },[ready,onboarded,interests])

  // simulate notifications for followed stories that were "updated"
  useEffect(()=>{
    if(!ready)return
    const dismissed=load(LS.NOTIFS,[])
    const pending=storiesData
      .filter(s=>followedIds.includes(s.id)&&!simulatedByStory[String(s.id)]&&!dismissed.includes(s.id))
      .slice(0,2)
      .map(s=>({storyId:s.id,title:s.title}))
    setNotifs(pending)
  },[ready,followedIds,simulatedByStory,storiesData])

  const toggleDark=()=>setDarkMode(p=>{const n=!p;document.documentElement.classList.toggle('dark',n);save(LS.DARK,n);return n})
  const activeStory=storiesData.find(s=>s.id===activeId)

  const finishOnboarding=chosen=>{setInterests(chosen);save(LS.INTERESTS,chosen);setOnboarded(true);save(LS.ONBOARDED,true)}
  const restartOnboarding=()=>{
    setProfileOpen(false);setHistoryOpen(false);setSearchQuery('')
    setScreen('feed');setActiveId(null)
    setOnboarded(false);save(LS.ONBOARDED,false)
  }

  const openStory=id=>{
    setProfileOpen(false);setHistoryOpen(false)
    setScreen('story');setActiveId(id)
    const s=storiesData.find(x=>x.id===id);if(!s)return
    setReadingHistory(prev=>{const next=[{storyId:s.id,title:s.title,lastOpened:Date.now()},...prev.filter(h=>h.storyId!==s.id)];save(LS.HISTORY,next);return next})
    window.scrollTo(0,0)
  }
  const goHome=()=>{setScreen('feed');setActiveId(null);setProfileOpen(false);setHistoryOpen(false);setSearchQuery('')}
  const toggleFollow=id=>setFollowedIds(prev=>{const next=prev.includes(id)?prev.filter(x=>x!==id):[...prev,id];save(LS.FOLLOWED,next);return next})
  const toggleBookmark=id=>setBookmarks(prev=>{const next=prev.includes(id)?prev.filter(x=>x!==id):[...prev,id];save(LS.BOOKMARKS,next);return next})
  const saveAnswer=(storyId,optIdx,optLabel)=>setUserAnswers(prev=>{const next={...prev,[String(storyId)]:{optionIndex:optIdx,optionLabel:optLabel,savedAt:Date.now()}};save(LS.ANSWERS,next);return next})
  const revealSimulated=storyId=>setSimulatedByStory(prev=>{const next={...prev,[String(storyId)]:true};save(LS.SIMULATED,next);return next})
  const submitFeedback=fb=>setAllFeedback(prev=>{const next=[...prev,fb];save(LS.FEEDBACK,next);return next})
  const saveAnnotation=(storyId,eventIdx,text)=>{
    const key=`${storyId}_${eventIdx}`
    setAnnotations(prev=>{const next={...prev,[key]:text};save(LS.ANNOTATIONS,next);return next})
  }
  const dismissNotif=storyId=>{
    setNotifs(p=>p.filter(n=>n.storyId!==storyId))
    const dismissed=load(LS.NOTIFS,[])
    save(LS.NOTIFS,[...dismissed,storyId])
  }

  const savedForActive=activeStory?(userAnswers[String(activeStory.id)]??null):null

  if(!ready)return<div className="fixed inset-0 flex items-center justify-center bg-white dark:bg-slate-950"><div className="w-7 h-7 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin"/></div>
  if(!onboarded)return<Onboarding onDone={finishOnboarding}/>

  return(
    <div className="min-h-dvh bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white transition-colors">
      <Navbar
        onGoHome={goHome}
        onToggleProfile={()=>{setProfileOpen(p=>!p);setHistoryOpen(false)}}
        onToggleHistory={()=>{setHistoryOpen(p=>!p);setProfileOpen(false)}}
        profileOpen={profileOpen} historyOpen={historyOpen}
        darkMode={darkMode} onToggleDark={toggleDark}
        searchQuery={searchQuery} onSearch={q=>{setSearchQuery(q);setScreen('feed');setActiveId(null)}}
        onFeedback={()=>setFeedbackOpen(true)}
        streak={streak}
        notifCount={notifs.length}
      />

      <NotifBanner notifs={notifs} onDismiss={dismissNotif} onOpenStory={id=>{dismissNotif(id);openStory(id)}}/>

      {profileOpen&&<ProfilePanel onClose={()=>setProfileOpen(false)} followedIds={followedIds} readingHistory={readingHistory} interests={interests} allFeedback={allFeedback} streak={streak} onShowPredictions={()=>{setProfileOpen(false);setScreen('predictions')}}/>}
      {historyOpen&&<HistoryDrawer items={readingHistory} onClose={()=>setHistoryOpen(false)} onPickStory={id=>{setHistoryOpen(false);openStory(id)}}/>}
      {feedbackOpen&&<FeedbackModal onClose={()=>setFeedbackOpen(false)} onSubmit={submitFeedback}/>}

      {/* quick way to revisit the "Get started" flow */}
      <div className="fixed bottom-5 right-5 z-30">
        <button onClick={restartOnboarding} className="rounded-full bg-slate-900/90 dark:bg-white/90 text-white dark:text-slate-900 px-4 py-2 text-xs font-bold shadow-lg border border-slate-800/20 dark:border-white/30 hover:opacity-95 transition">
          Re-pick topics
        </button>
      </div>

      <main className="pt-[54px]">
        {screen==='story'&&activeStory?(
          <StoryView key={activeStory.id} story={activeStory} isFollowing={followedIds.includes(activeStory.id)} onToggleFollow={()=>toggleFollow(activeStory.id)} savedAnswer={savedForActive} onSaveAnswer={saveAnswer} showSimulatedUpdate={!!simulatedByStory[String(activeStory.id)]} onSimulateUpdate={()=>revealSimulated(activeStory.id)} onBack={goHome} onFeedback={()=>setFeedbackOpen(true)} annotations={annotations} onSaveAnnotation={saveAnnotation} isBookmarked={bookmarks.includes(activeStory.id)} onToggleBookmark={toggleBookmark}/>
        ):screen==='predictions'?(
          <PredictionsScreen stories={storiesData} userAnswers={userAnswers} simulatedByStory={simulatedByStory} onOpenStory={id=>{setScreen('story');openStory(id)}} onBack={goHome}/>
        ):(
          <>
            {storiesError&&<div className="mx-auto max-w-3xl px-4 pt-4"><div className="rounded-2xl border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/40 px-4 py-3 text-sm text-amber-800 dark:text-amber-300">{storiesError}</div></div>}
            {storiesLoading?(
              <div className="mx-auto max-w-3xl px-4 py-24 text-center">
                <div className="mx-auto w-8 h-8 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin"/>
                <p className="mt-4 text-sm text-slate-500 dark:text-slate-400">Loading your daily news feed...</p>
              </div>
            ):(
              <Feed stories={storiesData} followedIds={followedIds} readingHistory={readingHistory} onOpen={openStory} searchQuery={searchQuery} interests={interests} bookmarks={bookmarks} onToggleBookmark={toggleBookmark} activeTab={activeTab} onTabChange={setActiveTab}/>
            )}
          </>
        )}
      </main>
    </div>
  )
}
