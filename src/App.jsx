import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { BrowserRouter, Routes, Route, useNavigate, useParams, useLocation } from 'react-router-dom'
import { fallbackStories, fetchDailyStories, fetchRelatedTimeline } from './newsApi.js'
import { summarizeTimelineWithLocalModel } from './localRecap.js'
import { generateSmartQuestion, generateInsights } from './smartEngage.js'
import JargonText from './JargonText.jsx'
import { JargonWord } from './JargonWord.jsx'
import { JARGON_GLOSSARY } from './glossary.js'
import { stories as protoStories } from './stories.jsx'


/* ─── Common-words filter for inline jargon detection ────────── */
const COMMON_WORDS = new Set([
  'everything', 'themselves', 'completely', 'understanding', 'government', 'afternoon',
  'development', 'information', 'technology', 'experience', 'especially',
  'important', 'something', 'sometimes', 'generation', 'community', 'beautiful',
  'different', 'available', 'therefore', 'investigate', 'department', 'performance',
  'significant', 'management', 'situation', 'developing', 'developments',
  'predict', 'prediction', 'predicting', 'happened', 'happening', 'actually',
  'outcomes', 'outcome', 'resolved', 'escalates', 'escalated', 'timeline', 'emerging',
  'headline', 'headlines', 'description', 'published', 'publishedat', 'yesterday', 'tomorrow'
]);

function JargonParagraph({ text }) {
  const tokens = String(text || '').split(/([a-zA-Z]+)/);
  return (
    <>
      {tokens.map((tok, i) => {
        if (!/^[a-zA-Z]+$/.test(tok)) return <span key={i}>{tok}</span>;
        const low = tok.toLowerCase();
        if (JARGON_GLOSSARY[low] || (low.length >= 9 && !COMMON_WORDS.has(low))) {
          return <JargonWord key={i} word={tok} />
        }
        return <span key={i}>{tok}</span>;
      })}
    </>
  )
}

/* ─── storage helpers ───────────────────────────────────────── */
const LS = {
  FOLLOWED: 'nt_followed', ANSWERS: 'nt_answers', HISTORY: 'nt_history',
  SIMULATED: 'nt_simulated', ONBOARDED: 'nt_onboarded', INTERESTS: 'nt_interests',
  DARK: 'nt_dark', FEEDBACK: 'nt_feedback', ANNOTATIONS: 'nt_annotations',
  BOOKMARKS: 'nt_bookmarks', STREAK: 'nt_streak', NOTIFS: 'nt_notifs',
  NEWS_BOOKMARKS: 'nt_news_bookmarks',
}

const NEWS_CATEGORIES = [
  { id: '', label: 'All' },
  { id: 'general', label: 'General' },
  { id: 'business', label: 'Business' },
  { id: 'technology', label: 'Technology' },
  { id: 'science', label: 'Science' },
  { id: 'health', label: 'Health' },
  { id: 'sports', label: 'Sports' },
  { id: 'entertainment', label: 'Entertainment' },
]

const load = (k, fb) => { try { const r = localStorage.getItem(k); return r == null ? fb : JSON.parse(r) } catch { return fb } }
const save = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)) } catch { } }
const relTime = ts => {
  const s = Math.floor((Date.now() - ts) / 1000)
  if (s < 60) return 'just now'; const m = Math.floor(s / 60)
  if (m < 60) return `${m}m ago`; const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`; return new Date(ts).toLocaleDateString()
}

const INTERESTS = ['Politics', 'Finance', 'Technology', 'Climate', 'Health', 'Urban', 'Science', 'Economy']
const CAT = {
  Finance: { pill: 'bg-amber-100 text-amber-800', dpill: 'dark:bg-amber-900/40 dark:text-amber-300', dot: 'bg-amber-400' },
  Technology: { pill: 'bg-sky-100 text-sky-800', dpill: 'dark:bg-sky-900/40 dark:text-sky-300', dot: 'bg-sky-400' },
  Economy: { pill: 'bg-violet-100 text-violet-800', dpill: 'dark:bg-violet-900/40 dark:text-violet-300', dot: 'bg-violet-400' },
  Health: { pill: 'bg-rose-100 text-rose-800', dpill: 'dark:bg-rose-900/40 dark:text-rose-300', dot: 'bg-rose-400' },
  Urban: { pill: 'bg-teal-100 text-teal-800', dpill: 'dark:bg-teal-900/40 dark:text-teal-300', dot: 'bg-teal-400' },
  Science: { pill: 'bg-indigo-100 text-indigo-800', dpill: 'dark:bg-indigo-900/40 dark:text-indigo-300', dot: 'bg-indigo-400' },
  Politics: { pill: 'bg-orange-100 text-orange-800', dpill: 'dark:bg-orange-900/40 dark:text-orange-300', dot: 'bg-orange-400' },
  Climate: { pill: 'bg-emerald-100 text-emerald-800', dpill: 'dark:bg-emerald-900/40 dark:text-emerald-300', dot: 'bg-emerald-400' },
}
const cs = cat => CAT[cat] ?? { pill: 'bg-slate-100 text-slate-700', dpill: 'dark:bg-slate-800 dark:text-slate-300', dot: 'bg-slate-400' }

/* ─── Onboarding ─────────────────────────────────────────────── */
function Onboarding({ onDone }) {
  const [step, setStep] = useState(0)
  const [sel, setSel] = useState([])
  const toggle = t => setSel(p => p.includes(t) ? p.filter(x => x !== t) : [...p, t])
  return (
    <div className="fixed inset-0 z-50 bg-white dark:bg-slate-950 flex items-center justify-center">
      <div className="w-full max-w-sm px-6">
        <div className="flex justify-center gap-1.5 mb-8">
          {[0, 1].map(i => <div key={i} className={`h-1 rounded-full transition-all duration-300 ${i === step ? 'w-8 bg-indigo-600' : 'w-2 bg-slate-200 dark:bg-slate-700'}`} />)}
        </div>
        {step === 0 ? (
          <div className="text-center">
            <div className="mx-auto w-20 h-20 rounded-3xl bg-gradient-to-br from-indigo-500 via-violet-500 to-purple-600 flex items-center justify-center mb-6 shadow-xl shadow-indigo-200 dark:shadow-indigo-900">
              <svg width="38" height="38" viewBox="0 0 38 38" fill="none"><path d="M7 10h24M7 17h18M7 24h24M7 31h13" stroke="white" strokeWidth="3" strokeLinecap="round" /></svg>
            </div>
            <h1 className="text-4xl font-bold text-slate-900 dark:text-white" style={{ fontFamily: 'Georgia,serif' }}>NewsThread</h1>
            <p className="mt-3 text-slate-500 dark:text-slate-400 leading-relaxed">News that actually sticks. Every story as a living thread — with context, recap, and a reason to remember.</p>
            <div className="mt-8 space-y-3 text-left">
              {[['🧵', 'Thread', 'See how every story evolved, step by step'], ['🤖', 'Recap', 'AI catch-up tailored to what you already know'], ['🎯', 'Engage', 'Predict what happens next — then find out']].map(([icon, title, desc]) => (
                <div key={title} className="flex gap-4 rounded-2xl border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 px-4 py-3.5">
                  <span className="text-2xl mt-0.5">{icon}</span>
                  <div><p className="font-semibold text-slate-900 dark:text-white text-sm">{title}</p><p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{desc}</p></div>
                </div>
              ))}
            </div>
            <button onClick={() => setStep(1)} className="mt-8 w-full rounded-2xl bg-slate-900 dark:bg-white py-4 text-sm font-bold text-white dark:text-slate-900 hover:opacity-90 transition active:scale-[0.98]">Get started →</button>
            <p className="mt-3 text-xs text-slate-400">No account needed · stays on your device</p>
          </div>
        ) : (
          <div className="text-center">
            <p className="text-xs font-bold uppercase tracking-widest text-indigo-500 mb-2">Step 2 of 2</p>
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white" style={{ fontFamily: 'Georgia,serif' }}>What interests you?</h2>
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">Personalise your thread feed.</p>
            <div className="mt-7 flex flex-wrap justify-center gap-2.5">
              {INTERESTS.map(t => {
                const on = sel.includes(t); return (
                  <button key={t} onClick={() => toggle(t)} className={`rounded-full px-5 py-2.5 text-sm font-semibold border-2 transition-all active:scale-95 ${on ? 'border-indigo-500 bg-indigo-600 text-white shadow-md' : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:border-indigo-300'}`}>{t}</button>
                )
              })}
            </div>
            <button onClick={() => onDone(sel)} className="mt-8 w-full rounded-2xl bg-slate-900 dark:bg-white py-4 text-sm font-bold text-white dark:text-slate-900 hover:opacity-90 transition active:scale-[0.98]">
              {sel.length === 0 ? 'Skip for now' : `Start reading (${sel.length} topic${sel.length > 1 ? 's' : ''})`}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

/* ─── Notification banner ────────────────────────────────────── */
function NotifBanner({ notifs, onDismiss, onOpenStory }) {
  if (!notifs.length) return null
  const n = notifs[0]
  return (
    <div className="fixed top-[54px] inset-x-0 z-40 flex justify-center px-4 pt-2 pointer-events-none">
      <div className="pointer-events-auto max-w-lg w-full rounded-2xl border border-sky-200 dark:border-sky-800 bg-sky-50 dark:bg-sky-950/80 shadow-lg px-4 py-3 flex items-center gap-3 animate-in slide-in-from-top-2 duration-300">
        <span className="text-lg shrink-0">⚡</span>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-bold text-sky-800 dark:text-sky-300">Story updated</p>
          <p className="text-sm text-slate-700 dark:text-slate-300 truncate font-medium">{n.title}</p>
        </div>
        <button onClick={() => onOpenStory(n.storyId)} className="shrink-0 rounded-full bg-sky-600 text-white text-xs font-bold px-3 py-1.5 hover:bg-sky-700 transition">Read</button>
        <button onClick={() => onDismiss(n.storyId)} className="shrink-0 text-sky-400 hover:text-sky-700 text-lg leading-none">×</button>
      </div>
    </div>
  )
}

/* ─── Feedback modal ─────────────────────────────────────────── */
function FeedbackModal({ onClose, onSubmit }) {
  const [rating, setRating] = useState(0)
  const [hov, setHov] = useState(0)
  const [text, setText] = useState('')
  const [aspect, setAspect] = useState('')
  const [done, setDone] = useState(false)
  const aspects = ['Thread timeline', 'AI Recap', 'Predict & reflect', 'Story variety', 'Overall design']
  const submit = () => { if (!rating) return; onSubmit({ rating, aspect, text, ts: Date.now() }); setDone(true); setTimeout(onClose, 1800) }
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-[2px]" />
      <div className="relative z-10 w-full max-w-md rounded-t-3xl sm:rounded-3xl bg-white dark:bg-slate-900 shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
        {done ? (
          <div className="px-6 py-12 text-center"><p className="text-4xl mb-3">🙏</p><p className="font-bold text-slate-900 dark:text-white text-lg">Thank you!</p><p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Your feedback helps us improve.</p></div>
        ) : (
          <>
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-800">
              <div><h2 className="font-bold text-slate-900 dark:text-white">Share your feedback</h2><p className="text-xs text-slate-400 mt-0.5">Prototype v1 · Design Thinking Project</p></div>
              <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 text-xs font-bold hover:bg-slate-200 transition">✕</button>
            </div>
            <div className="px-5 py-5 space-y-5">
              <div>
                <p className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">Overall experience</p>
                <div className="flex gap-2">{[1, 2, 3, 4, 5].map(n => (
                  <button key={n} onMouseEnter={() => setHov(n)} onMouseLeave={() => setHov(0)} onClick={() => setRating(n)} className="text-3xl transition-transform hover:scale-110 active:scale-95">{n <= (hov || rating) ? '⭐' : '☆'}</button>
                ))}</div>
                {rating > 0 && <p className="text-xs text-slate-400 mt-1.5">{['', 'Poor', 'Fair', 'Good', 'Great', 'Excellent'][rating]}</p>}
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2.5">What stood out most?</p>
                <div className="flex flex-wrap gap-2">{aspects.map(a => (
                  <button key={a} onClick={() => setAspect(a === aspect ? '' : a)} className={`rounded-full px-3.5 py-1.5 text-xs font-semibold border transition-all ${a === aspect ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300' : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-indigo-300'}`}>{a}</button>
                ))}</div>
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Thoughts? <span className="font-normal text-slate-400">(optional)</span></p>
                <textarea value={text} onChange={e => setText(e.target.value)} rows={3} placeholder="What worked? What should change?" className="w-full rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-4 py-3 text-sm text-slate-800 dark:text-slate-200 placeholder:text-slate-400 resize-none outline-none focus:ring-2 focus:ring-indigo-400" />
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
function Navbar({ onGoHome, onToggleProfile, onToggleHistory, profileOpen, historyOpen, darkMode, onToggleDark, searchQuery, onSearch, onFeedback, streak, notifCount, onSubscribe }) {
  const [searchOpen, setSearchOpen] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const ref = useRef(null)
  
  const openSearch = () => { setSearchOpen(true); setTimeout(() => ref.current?.focus(), 50) }
  const closeSearch = () => { setSearchOpen(false); onSearch('') }
  const closeMenu = () => setMobileMenuOpen(false)

  return (
    <nav className="fixed inset-x-0 top-0 z-50 bg-white/95 dark:bg-slate-950/95 backdrop-blur-md border-b border-slate-100 dark:border-slate-800">
      <div className="mx-auto flex max-w-3xl items-center gap-3 px-4 h-[54px]">
        {searchOpen ? (
          <div className="flex flex-1 items-center gap-2">
            <input ref={ref} type="search" value={searchQuery} onChange={e => onSearch(e.target.value)} placeholder="Search stories, topics…" className="flex-1 rounded-xl border border-indigo-300 dark:border-indigo-600 bg-indigo-50 dark:bg-indigo-950/50 px-4 py-2 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-indigo-400" />
            <button onClick={closeSearch} className="shrink-0 text-sm font-semibold text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white px-1 transition">Cancel</button>
          </div>
        ) : (
          <>
            <button onClick={onGoHome} className="shrink-0 text-[17px] font-bold text-slate-900 dark:text-white hover:text-indigo-600 dark:hover:text-indigo-400 transition" style={{ fontFamily: 'Georgia,serif', fontStyle: 'italic' }}>NewsThread</button>
            {streak >= 1 && <span className="hidden sm:inline-flex items-center gap-1 rounded-full bg-orange-50 dark:bg-orange-900/30 border border-orange-200 dark:border-orange-800 px-2 py-0.5 text-[11px] font-bold text-orange-600 dark:text-orange-400">🔥 {streak} day{streak !== 1 ? 's' : ''}</span>}
            <div className="flex-1 min-w-0" />
            <div className="flex items-center gap-1 sm:gap-0.5 relative">
              <button onClick={openSearch} title="Search" className="p-2 rounded-xl text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white transition">
                <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="7" cy="7" r="5" /><path d="M12 12l3 3" /></svg>
              </button>

              {/* Desktop Icons */}
              <div className="hidden sm:flex items-center gap-0.5">
                <button onClick={onFeedback} title="Feedback" className="p-2 rounded-xl text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white transition">
                  <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" /></svg>
                </button>
                <button onClick={onToggleDark} title="Toggle theme" className="p-2 rounded-xl text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white transition">
                  {darkMode
                    ? <svg width="16" height="16" fill="currentColor" viewBox="0 0 20 20"><path d="M10 2a1 1 0 011 1v1a1 1 0 01-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z" /></svg>
                    : <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" /></svg>}
                </button>
                <button onClick={onToggleHistory} title="History" className={`relative p-2 rounded-xl transition ${historyOpen ? 'bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300' : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white'}`}>
                  <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                  {notifCount > 0 && <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-red-500" />}
                </button>
                <button onClick={onToggleProfile} title="Profile" className={`p-2 rounded-xl transition ${profileOpen ? 'bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300' : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white'}`}>
                  <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" viewBox="0 0 24 24"><circle cx="12" cy="8" r="4" /><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" /></svg>
                </button>
              </div>

              {/* Mobile Hamburger Menu Trigger */}
              <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} title="Menu" className={`sm:hidden relative p-2 rounded-xl transition ${mobileMenuOpen ? 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white' : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white'}`}>
                <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M4 6h16M4 12h16M4 18h16" /></svg>
                {notifCount > 0 && <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-red-500" />}
              </button>

              {/* Mobile Dropdown Menu */}
              {mobileMenuOpen && (
                <>
                  <div className="fixed inset-0 z-40 sm:hidden" onClick={closeMenu} />
                  <div className="absolute top-12 right-12 mt-1 w-44 rounded-2xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-xl py-2 z-50 sm:hidden flex flex-col px-2 animate-in fade-in slide-in-from-top-2">
                    <button onClick={() => { closeMenu(); onToggleProfile(); }} className="w-full text-left px-3 py-2.5 text-sm font-semibold rounded-xl text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-3">
                      <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" viewBox="0 0 24 24"><circle cx="12" cy="8" r="4" /><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" /></svg>
                      Profile
                    </button>
                    <button onClick={() => { closeMenu(); onToggleHistory(); }} className="w-full text-left px-3 py-2.5 text-sm font-semibold rounded-xl text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                        History
                      </div>
                      {notifCount > 0 && <span className="w-2 h-2 rounded-full bg-red-500" />}
                    </button>
                    <button onClick={() => { closeMenu(); onToggleDark(); }} className="w-full text-left px-3 py-2.5 text-sm font-semibold rounded-xl text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-3">
                      {darkMode
                        ? <svg width="16" height="16" fill="currentColor" viewBox="0 0 20 20"><path d="M10 2a1 1 0 011 1v1a1 1 0 01-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z" /></svg>
                        : <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" /></svg>}
                      Theme
                    </button>
                    <button onClick={() => { closeMenu(); onFeedback(); }} className="w-full text-left px-3 py-2.5 text-sm font-semibold rounded-xl text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-3">
                      <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" /></svg>
                      Feedback
                    </button>
                  </div>
                </>
              )}

              <button onClick={() => { closeMenu(); onSubscribe(); }} className="flex items-center justify-center rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 px-3 py-1.5 ml-1 sm:ml-2 text-[11px] sm:text-xs font-bold text-white shadow-md shadow-indigo-200 dark:shadow-indigo-900/40 hover:opacity-90 transition active:scale-95 whitespace-nowrap">
                Subscribe ✨
              </button>
            </div>
          </>
        )}
      </div>
    </nav>
  )
}

/* ─── Category filter bar (for story threads) ────────────────── */
function CategoryBar({ categories, active, onChange }) {
  return (
    <div className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      <button onClick={() => onChange('')} className={`shrink-0 rounded-full px-4 py-1.5 text-xs font-bold transition border ${!active ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 border-transparent' : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-slate-400'}`}>All</button>
      {categories.map(c => {
        const st = cs(c); const isA = active === c; return (
          <button key={c} onClick={() => onChange(c === active ? '' : c)} className={`shrink-0 rounded-full px-4 py-1.5 text-xs font-bold transition border ${isA ? `${st.pill} ${st.dpill} border-transparent` : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-slate-400'}`}>{c}</button>
        )
      })}
    </div>
  )
}

/* ─── Sentiment analysis (client-side heuristic) ─────────────── */
const POSITIVE_WORDS = new Set([
  'growth', 'surge', 'record', 'success', 'win', 'wins', 'won', 'breakthrough', 'improve', 'improves', 'improved',
  'boost', 'boosts', 'rise', 'rises', 'rising', 'gain', 'gains', 'profit', 'profits', 'launch', 'launches', 'launched',
  'milestone', 'historic', 'recovery', 'recover', 'strong', 'stronger', 'strongest', 'best', 'achieve', 'achieved',
  'innovation', 'celebrate', 'celebrates', 'positive', 'hope', 'hopes', 'hopeful', 'progress', 'reform', 'reforms',
  'upgrade', 'award', 'awards', 'awarded', 'deal', 'partnership', 'expand', 'expands', 'expansion', 'soar', 'soars',
  'rally', 'rallies', 'approve', 'approved', 'support', 'supports', 'celebrate', 'victory', 'lead', 'leads',
  'develop', 'develops', 'inaugurate', 'inaugurated', 'invest', 'invests', 'empower', 'empowers', 'thrive',
  'shine', 'shines', 'excel', 'excels', 'resolve', 'resolves', 'safe', 'safer', 'safest', 'peace', 'peaceful',
  'benefit', 'benefits', 'opportunity', 'opportunities', 'optimistic', 'optimism', 'encourage', 'encouraged',
  'relief', 'proud', 'proudly', 'hero', 'heroic', 'rescue', 'saved', 'cure', 'cured', 'innovation', 'solve', 'solved'
])
const NEGATIVE_WORDS = new Set([
  'crisis', 'crash', 'crashes', 'fall', 'falls', 'falling', 'drop', 'drops', 'decline', 'declines', 'declining',
  'death', 'deaths', 'dead', 'kill', 'kills', 'killed', 'attack', 'attacks', 'attacked', 'fraud', 'scam', 'scams',
  'scandal', 'scandals', 'collapse', 'collapses', 'collapsed', 'war', 'wars', 'conflict', 'conflicts',
  'disaster', 'disasters', 'emergency', 'threat', 'threatens', 'threatened', 'risk', 'risks', 'risky',
  'loss', 'losses', 'shortage', 'shortages', 'protest', 'protests', 'strike', 'strikes', 'ban', 'bans', 'banned',
  'arrest', 'arrests', 'arrested', 'violence', 'violent', 'fail', 'fails', 'failed', 'failure', 'worst',
  'fear', 'fears', 'concern', 'concerns', 'alarm', 'alarming', 'danger', 'dangerous', 'tension', 'tensions',
  'recession', 'layoff', 'layoffs', 'slash', 'slashes', 'slump', 'slumps', 'plunge', 'plunges', 'deny', 'denies',
  'reject', 'rejects', 'rejected', 'oppose', 'opposes', 'opposed', 'outrage', 'fury', 'angry', 'anger', 'rage',
  'corrupt', 'corruption', 'exploit', 'exploited', 'abuse', 'abused', 'flee', 'flees', 'fled', 'victim', 'victims',
  'devastating', 'devastation', 'suffer', 'suffers', 'suffered', 'struggling', 'struggle', 'catastrophe', 'chaos',
  'damage', 'damages', 'damaged', 'penalty', 'penalize', 'punishment', 'punish', 'warning', 'warn', 'warns', 'toxic'
])

function analyzeSentiment(text) {
  const words = (text || '').toLowerCase().split(/\W+/)
  let pos = 0, neg = 0
  for (const w of words) {
    if (POSITIVE_WORDS.has(w)) pos++
    if (NEGATIVE_WORDS.has(w)) neg++
  }
  if (pos > 0 && pos > neg) return { label: 'Positive', color: 'emerald', emoji: '🟢' }
  if (neg > 0 && neg > pos) return { label: 'Negative', color: 'rose', emoji: '🔴' }
  return { label: 'Neutral', color: 'slate', emoji: '🟡' }
}

function estimateReadTime(text) {
  const words = (text || '').split(/\s+/).filter(Boolean).length
  const mins = Math.max(1, Math.round(words / 200))
  return `${mins} min read`
}

function timeAgo(dateStr) {
  if (!dateStr) return ''
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'Just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return new Date(dateStr).toLocaleDateString(undefined, { dateStyle: 'medium' })
}

/* ─── Breaking News Banner ───────────────────────────────────── */
function BreakingNewsBanner({ articles, onOpen }) {
  const breakingArticle = useMemo(() => {
    const oneHourAgo = Date.now() - 60 * 60 * 1000
    return articles.find(a => a.publishedAt && new Date(a.publishedAt).getTime() > oneHourAgo)
  }, [articles])
  const [dismissed, setDismissed] = useState(false)
  if (!breakingArticle || dismissed) return null
  return (
    <div className="breaking-slide-in mb-4 rounded-2xl overflow-hidden border border-red-200 dark:border-red-900 bg-gradient-to-r from-red-50 via-orange-50 to-amber-50 dark:from-red-950/40 dark:via-orange-950/30 dark:to-amber-950/20">
      <div className="px-4 py-3 flex items-center gap-3">
        <span className="breaking-pulse shrink-0 rounded-full bg-red-500 text-white text-[10px] font-black uppercase tracking-wider px-2.5 py-1">Breaking</span>
        <button type="button" onClick={() => onOpen(breakingArticle)} className="flex-1 min-w-0 text-left">
          <p className="text-sm font-bold text-slate-900 dark:text-white truncate">{breakingArticle.title}</p>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">{timeAgo(breakingArticle.publishedAt)} · {breakingArticle.source}</p>
        </button>
        <button onClick={() => setDismissed(true)} className="shrink-0 text-slate-400 hover:text-slate-600 text-lg leading-none">×</button>
      </div>
    </div>
  )
}

/* ─── Topic detection for cards (score-based, not first-match-wins) ── */
const TOPIC_BUCKETS = [
  {
    id: 'crime', label: 'Crime', emoji: '🚨',
    terms: ['arrest', 'arrested', 'murder', 'murdered', 'robbery', 'theft', 'scam', 'fraud', 'corruption', 'accused', 'suspect', 'verdict', 'sentenced', 'jail', 'jailed', 'prison', 'probe', 'seized', 'smuggling', 'criminal', 'bribery', 'extortion', 'trafficking', 'kidnap', 'assault', 'rape', 'narcotics', 'fir', 'chargesheet', 'bail', 'custody', 'fugitive', 'gangster', 'constable', 'convict', 'acquit', 'detained', 'cop', 'cops'],
  },
  {
    id: 'sports', label: 'Sports', emoji: '⚽',
    terms: ['cricket', 'ipl', 'football', 'soccer', 'tennis', 'match', 'matches', 'championship', 'medal', 'olympics', 'olympic', 'world cup', 'tournament', 'wicket', 'batting', 'bowling', 'goal', 'goals', 'league', 'grand prix', 'formula 1', 'f1', 'hockey', 'kabaddi', 'badminton', 'squash', 'wrestling', 'athlete', 'athletes', 'sports', 'sprinter', 'striker', 'midfielder', 'goalkeeper', 'hat-trick', 'century', 'boundary', 'penalty', 'umpire', 'innings', 'bowler', 'batsman', 'batter', 'coach', 'squad', 'fixture', 'qualifier', 'semifinal', 'final', 'gold medal', 'silver medal', 'bronze'],
  },
  {
    id: 'entertainment', label: 'Entertainment', emoji: '🎬',
    terms: ['movie', 'film', 'bollywood', 'hollywood', 'actor', 'actress', 'singer', 'album', 'streaming', 'netflix', 'disney', 'concert', 'celebrity', 'oscar', 'grammy', 'ott', 'box office', 'sequel', 'premiere', 'trailer', 'cast', 'director', 'producer', 'web series', 'reality show', 'bigg boss', 'standup', 'comedian', 'rap', 'hip hop', 'k-pop', 'anime', 'music video', 'chart', 'billboard', 'playlist', 'award show', 'red carpet', 'debut', 'cameo'],
  },
  {
    id: 'health', label: 'Health', emoji: '🏥',
    terms: ['hospital', 'doctor', 'doctors', 'patient', 'patients', 'disease', 'virus', 'vaccine', 'vaccination', 'treatment', 'cancer', 'surgery', 'mental health', 'wellness', 'icmr', 'pharmaceutical', 'medicine', 'medicines', 'cure', 'symptom', 'symptoms', 'epidemic', 'pandemic', 'outbreak', 'diagnosis', 'chronic', 'diabetes', 'hypertension', 'stroke', 'cardiac', 'obesity', 'malnutrition', 'antibiotics', 'immunization', 'pathogen', 'icu', 'physician', 'surgeon', 'therapist', 'clinical trial', 'drug approval', 'health ministry'],
  },
  {
    id: 'tech', label: 'Tech', emoji: '💻',
    terms: ['artificial intelligence', 'machine learning', 'deep learning', 'neural network', 'chatgpt', 'openai', 'gemini', 'generative ai', 'llm', 'cybersecurity', 'robotics', 'semiconductor', 'chip', 'algorithm', 'automation', '5g', 'quantum computing', 'cloud computing', 'github', 'open source', 'saas', 'data breach', 'ransomware', 'malware', 'phishing', 'blockchain', 'cryptocurrency', 'bitcoin', 'ethereum', 'nft', 'gpu', 'nvidia', 'data center', 'broadband', 'iot', 'internet of things', 'smartphone', 'operating system', 'app store', 'google', 'apple', 'microsoft', 'meta', 'amazon', 'x corp', 'software engineer', 'developer', 'startup valuation', 'tech regulation', 'digital india'],
  },
  {
    id: 'business', label: 'Business', emoji: '📈',
    terms: ['stock market', 'shares', 'sensex', 'nifty', 'gdp', 'inflation', 'rbi', 'repo rate', 'investment', 'profit', 'revenue', 'ipo', 'merger', 'acquisition', 'corporate', 'export', 'import', 'economy', 'economic', 'rupee', 'dollar', 'funding round', 'venture capital', 'private equity', 'fdi', 'forex', 'treasury', 'bond', 'mutual fund', 'equity', 'quarterly results', 'earnings', 'ceo', 'cfo', 'board', 'shareholder', 'dividend', 'buyback', 'sebi', 'credit rating', 'emi', 'trade deficit', 'fiscal', 'current account', 'commodity', 'crude oil', 'gold price', 'silver price'],
  },
  {
    id: 'science', label: 'Science', emoji: '🔬',
    terms: ['scientists', 'research study', 'discovery', 'space mission', 'nasa', 'isro', 'satellite', 'rocket', 'orbit', 'mars', 'moon', 'asteroid', 'fossil', 'physics', 'chemistry', 'biology', 'genome', 'dna', 'rna', 'molecule', 'experiment', 'telescope', 'astronaut', 'observatory', 'quantum physics', 'particle', 'neutron', 'proton', 'enzyme', 'protein', 'mutation', 'evolution', 'extinction', 'biodiversity', 'atmosphere', 'ozone', 'black hole', 'supernova', 'galaxy', 'exoplanet', 'crispr', 'stem cell', 'archaeological', 'geologist', 'oceanography', 'neuroscience', 'climate science'],
  },
  {
    id: 'education', label: 'Education', emoji: '📚',
    terms: ['university', 'students', 'school', 'exam', 'college', 'admission', 'cbse', 'icse', 'neet', 'jee', 'ugc', 'scholarship', 'curriculum', 'campus', 'degree', 'syllabus', 'board exam', 'semester', 'faculty', 'coaching', 'dropout', 'enrollment', 'literacy', 'edtech', 'upsc', 'civil services', 'ias', 'ips', 'result', 'marks', 'academic', 'education ministry', 'school dropout', 'higher education', 'vocational'],
  },
  {
    id: 'world', label: 'World', emoji: '🌍',
    terms: ['united nations', 'nato', 'european union', 'china', 'russia', 'ukraine', 'middle east', 'israel', 'palestine', 'gaza', 'iran', 'iraq', 'syria', 'afghanistan', 'myanmar', 'taiwan', 'north korea', 'ceasefire', 'sanction', 'sanctions', 'war', 'conflict', 'refugee', 'migration', 'migrant', 'humanitarian', 'bilateral', 'multilateral', 'summit', 'coup', 'revolution', 'geopolitical', 'diplomatic relations', 'foreign minister', 'g20', 'g7', 'imf', 'world bank'],
  },
  {
    id: 'politics', label: 'Politics', emoji: '🏛️',
    terms: ['parliament', 'prime minister', 'president', 'election', 'elections', 'vote', 'ballot', 'campaign', 'candidate', 'bjp', 'congress party', 'aap', 'tmc', 'modi', 'kejriwal', 'rahul gandhi', 'chief minister', 'cabinet', 'manifesto', 'legislation', 'bill passed', 'loksabha', 'rajyasabha', 'vidhan sabha', 'governor', 'mla', 'mp', 'opposition', 'ruling party', 'government policy', 'constitution', 'supreme court ruling', 'high court', 'judiciary', 'budget', 'fiscal policy', 'taxation', 'subsidy', 'political party', 'bypolls', 'assembly election'],
  },
]

function detectTopic(text) {
  if (!text) return { label: 'General', emoji: '📰' }
  // Title gets 3× weight, description 1×
  const titlePart = (text.slice(0, text.indexOf('\n') > 0 ? text.indexOf('\n') : 120) || '').toLowerCase()
  const fullLower = text.toLowerCase()

  let best = null, bestScore = 0
  for (const b of TOPIC_BUCKETS) {
    let score = 0
    for (const t of b.terms) {
      if (titlePart.includes(t)) score += 3
      else if (fullLower.includes(t)) score += 1
    }
    if (score > bestScore) { bestScore = score; best = b }
  }
  return bestScore >= 1 ? { label: best.label, emoji: best.emoji } : { label: 'General', emoji: '📰' }
}

/* ─── Trending bar — specific keywords/entities ──────────────── */
const TRENDING_STOP = new Set(['the', 'a', 'an', 'and', 'or', 'to', 'of', 'in', 'on', 'for', 'with', 'as', 'at', 'by', 'from', 'is', 'are', 'was', 'were', 'has', 'have', 'had', 'will', 'be', 'been', 'not', 'but', 'its', 'it', 'this', 'that', 'said', 'says', 'new', 'after', 'over', 'how', 'what', 'all', 'more', 'can', 'could', 'would', 'should', 'about', 'also', 'just', 'like', 'than', 'into', 'their', 'they', 'them', 'your', 'you', 'which', 'when', 'where', 'there', 'here', 'then', 'very', 'most', 'some', 'make', 'made', 'much', 'many', 'being', 'such', 'want', 'look', 'back', 'only', 'come', 'take', 'even', 'give', 'know', 'need', 'find', 'tell', 'help', 'keep', 'think', 'turn', 'work', 'show', 'seem', 'first', 'time', 'year', 'years', 'news', 'report', 'read', 'blog', 'post', 'follow', 'share', 'says', 'going', 'still', 'these', 'those', 'other', 'each', 'every', 'last', 'next', 'well', 'while', 'before', 'under', 'really', 'because', 'during', 'between', 'without', 'though', 'through', 'india', 'world', 'may', 'why', 'gets', 'got'])

function TrendingTopics({ articles, onSearch }) {
  const keywords = useMemo(() => {
    const counts = {}
    for (const a of articles) {
      // Extract capitalized words/names from titles (proper nouns)
      const title = a.title || ''
      const caps = title.match(/\b[A-Z][a-zA-Z]{2,}\b/g) || []
      const seen = new Set()
      for (const w of caps) {
        const low = w.toLowerCase()
        if (TRENDING_STOP.has(low) || seen.has(low)) continue
        seen.add(low)
        counts[w] = (counts[w] || 0) + 1
      }
    }
    return Object.entries(counts)
      .filter(([, c]) => c >= 2)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([word, count], i) => ({ word, count, hot: i < 3 }))
  }, [articles])

  if (!keywords.length) return null
  return (
    <div className="mb-4">
      <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-2 flex items-center gap-1.5"><span>🔥</span> Trending now</p>
      <div className="flex gap-2 overflow-x-auto pb-1 trending-scroll [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {keywords.map(t => (
          <button key={t.word} onClick={() => onSearch(t.word)} className={`shrink-0 rounded-full px-3.5 py-1.5 text-xs font-bold transition border ${t.hot ? 'bg-gradient-to-r from-orange-50 to-amber-50 dark:from-orange-950/30 dark:to-amber-950/20 border-orange-200 dark:border-orange-800 text-orange-700 dark:text-orange-400' : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-indigo-300 bg-white dark:bg-slate-900'}`}>
            {t.hot && <span className="mr-1">🔥</span>}{t.word}
            <span className="ml-1.5 text-[10px] opacity-50">{t.count}</span>
          </button>
        ))}
      </div>
    </div>
  )
}

/* ─── Live news card (from prototype) ────────────────────────── */
const SENTIMENT_STYLES = {
  emerald: { badge: 'border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400', dot: 'bg-emerald-500' },
  rose: { badge: 'border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-400', dot: 'bg-rose-500' },
  slate: { badge: 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400', dot: 'bg-slate-400' },
}

function NewsCard({ article, onOpen, isBookmarked, onToggleBookmark }) {
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
            📰
            {sentimentBadge}
          </div>
        )}
        <div className="p-4 sm:p-5">
          <div className="flex items-center gap-2 mb-1.5 flex-wrap">
            <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 dark:bg-slate-800 px-2 py-0.5 text-[10px] font-bold text-slate-600 dark:text-slate-400 shrink-0">
              {topic.emoji} {topic.label}
            </span>
            <p className="text-[11px] font-bold uppercase tracking-wide text-indigo-500 dark:text-indigo-400 truncate">{article.source || 'News'}</p>
            <span className="text-[10px] text-slate-300 dark:text-slate-600">·</span>
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

/* ─── News category bar ──────────────────────────────────────── */
function NewsCategoryBar({ active, onChange }) {
  return (
    <div className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      {NEWS_CATEGORIES.map(c => {
        const isA = active === c.id
        return (
          <button key={c.id || 'all'} type="button" onClick={() => onChange(c.id)} className={`shrink-0 rounded-full px-4 py-1.5 text-xs font-bold transition border ${isA ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 border-transparent' : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-slate-400'}`}>{c.label}</button>
        )
      })}
    </div>
  )
}

/* ─── Live news feed (from prototype) ────────────────────────── */
function NewsFeed({ articles, loading, error, searchQuery, onOpen, newsBookmarks, onToggleBookmark, activeTab, onTabChange, newsCategory, onNewsCategory, onRefresh, refreshing, onSearchQuery }) {
  const matchSearch = a => {
    const q = searchQuery.trim().toLowerCase()
    if (!q) return true
    return `${a.title} ${a.description} ${a.source}`.toLowerCase().includes(q)
  }
  const fromFeed = [...articles.filter(matchSearch)].sort((a, b) => new Date(b.publishedAt || 0) - new Date(a.publishedAt || 0))
  const fromSaved = [...newsBookmarks.filter(matchSearch)].sort((a, b) => new Date(b.publishedAt || 0) - new Date(a.publishedAt || 0))
  const list = activeTab === 'bookmarks' ? fromSaved : fromFeed

  return (
    <div className="mx-auto max-w-3xl px-4 pb-24 pt-4">
      {!searchQuery && (
        <header className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-indigo-500 mb-1">Live headlines</p>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white" style={{ fontFamily: 'Georgia,serif' }}>Latest news</h1>
            <p className="mt-1 text-[13px] text-slate-400">Updates from NewsAPI · cached 15 min on the server</p>
          </div>
          <button type="button" onClick={onRefresh} disabled={loading || refreshing} className="shrink-0 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-4 py-2.5 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-50 transition active:scale-[0.98]">
            {loading || refreshing ? 'Refreshing…' : '🔄 Refresh news'}
          </button>
        </header>
      )}

      {/* Breaking news + Trending keywords */}
      {!searchQuery && activeTab === 'feed' && articles.length > 0 && (
        <>
          <BreakingNewsBanner articles={articles} onOpen={onOpen} />
          <TrendingTopics articles={articles} onSearch={(w) => onSearchQuery && onSearchQuery(w)} />
        </>
      )}

      {!searchQuery && (
        <div className="flex gap-2 mb-5">
          {[['feed', 'Latest'], ['bookmarks', 'Bookmarks']].map(([tab, label]) => (
            <button key={tab} type="button" onClick={() => onTabChange(tab)} className={`rounded-full px-4 py-1.5 text-xs font-bold transition border ${activeTab === tab ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 border-transparent' : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'}`}>
              {label}{tab === 'bookmarks' && newsBookmarks.length > 0 && <span className="ml-1 text-indigo-400">({newsBookmarks.length})</span>}
            </button>
          ))}
        </div>
      )}

      {!searchQuery && activeTab === 'feed' && <div className="mb-5"><NewsCategoryBar active={newsCategory} onChange={onNewsCategory} /></div>}

      {searchQuery && (
        <div className="mb-5 flex items-center gap-3">
          <p className="text-sm text-slate-500 dark:text-slate-400">{list.length === 0 ? 'No results for ' : `${list.length} result${list.length !== 1 ? 's' : ''} for `}</p>
          <button onClick={() => onSearchQuery && onSearchQuery('')} className="inline-flex items-center gap-1.5 rounded-full bg-indigo-50 dark:bg-indigo-900/30 border border-indigo-200 dark:border-indigo-800 px-3 py-1 text-xs font-bold text-indigo-700 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition">
            "{searchQuery}"
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12" /></svg>
          </button>
        </div>
      )}

      {error && (
        <div className="rounded-2xl border border-rose-200 dark:border-rose-900 bg-rose-50 dark:bg-rose-950/40 px-4 py-3 text-sm text-rose-800 dark:text-rose-200 mb-6">
          <p className="font-bold">Could not load headlines</p>
          <p className="mt-1 text-rose-700/90 dark:text-rose-300/90">{error}</p>
          {/rate.?limit|too many req|429/i.test(error) ? (
            <p className="mt-2 text-xs text-rose-600 dark:text-rose-400">⏳ NewsAPI free-tier limit hit (100 req/day). Wait a few hours and refresh, or upgrade at <a href="https://newsapi.org/pricing" target="_blank" rel="noreferrer" className="underline font-semibold">newsapi.org/pricing</a>.</p>
          ) : /missing.*key|NEWS_API_KEY|api.?key/i.test(error) ? (
            <p className="mt-2 text-xs text-rose-600 dark:text-rose-400">Add <code className="rounded bg-rose-100 dark:bg-rose-900/60 px-1">NEWS_API_KEY</code> to <code className="rounded bg-rose-100 dark:bg-rose-900/60 px-1">.env</code> and restart <code className="rounded bg-rose-100 dark:bg-rose-900/60 px-1">npm run dev</code>.</p>
          ) : (
            <p className="mt-2 text-xs text-rose-600 dark:text-rose-400">Check the server console for details, then click <strong>Refresh news</strong> to retry.</p>
          )}
        </div>
      )}

      {activeTab === 'bookmarks' && newsBookmarks.length === 0 && (
        <div className="py-20 text-center">
          <p className="text-4xl mb-3">🔖</p>
          <p className="font-semibold text-slate-700 dark:text-slate-300">No bookmarks yet</p>
          <p className="text-sm text-slate-400 mt-1">Save articles from Latest to read them later</p>
        </div>
      )}

      {loading && articles.length === 0 && !error && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="rounded-3xl border border-slate-200 dark:border-slate-800 overflow-hidden animate-pulse">
              <div className="aspect-[16/10] bg-slate-200 dark:bg-slate-800" />
              <div className="p-5 space-y-2">
                <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded w-1/3" />
                <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-full" />
                <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-5/6" />
              </div>
            </div>
          ))}
        </div>
      )}

      {!loading || articles.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {list.map((a, i) => (
            <NewsCard key={a.url || `card-${i}-${a.title?.slice(0, 24)}`} article={a} onOpen={onOpen} isBookmarked={newsBookmarks.some(b => b.url === a.url)} onToggleBookmark={onToggleBookmark} />
          ))}
        </div>
      ) : null}

      {!loading && activeTab !== 'bookmarks' && fromFeed.length === 0 && !error && (
        <div className="py-24 text-center">
          <p className="text-5xl mb-4">🔍</p>
          <p className="text-slate-500 dark:text-slate-400">No headlines match your filters</p>
        </div>
      )}
    </div>
  )
}

/* ─── Story card (for story threads) ─────────────────────────── */
function StoryCard({ story, onOpen, isFollowing, isRead, isBookmarked, onToggleBookmark }) {
  const st = cs(story.category)
  return (
    <div className="relative group">
      <button type="button" onClick={() => onOpen(story.id)} className="w-full text-left rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm hover:shadow-lg hover:border-indigo-200 dark:hover:border-indigo-700 transition-all duration-200 active:scale-[0.99]">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex flex-wrap gap-1.5">
            <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ${st.pill} ${st.dpill}`}>{story.category}</span>
            {isFollowing && <span className="rounded-full border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-900/30 px-2.5 py-0.5 text-[11px] font-bold text-emerald-700 dark:text-emerald-400">Following</span>}
            {isRead && <span className="rounded-full bg-slate-100 dark:bg-slate-800 px-2.5 py-0.5 text-[11px] font-bold text-slate-400">Read</span>}
          </div>
          <span className="shrink-0 text-[11px] text-slate-300 dark:text-slate-600 mt-0.5">{story.readTime}</span>
        </div>

        {story.imageUrl && (
          <div className="mb-3 overflow-hidden rounded-2xl border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950">
            <img src={story.imageUrl} alt="" loading="lazy" className="h-36 w-full object-cover" onError={(e) => { e.currentTarget.style.display = 'none' }} />
          </div>
        )}

        <h2 className="text-[17px] font-bold leading-snug text-slate-900 dark:text-white pr-8" style={{ fontFamily: 'Georgia,serif' }}>{story.title}</h2>
        <p className="mt-1.5 text-sm leading-relaxed text-slate-500 dark:text-slate-400 line-clamp-2">{story.description}</p>
        <div className="mt-4 flex items-center gap-0.5 overflow-hidden">
          {story.timeline.map((_, i) => (
            <div key={i} className="flex items-center">
              <div className={`shrink-0 w-1.5 h-1.5 rounded-full ${st.dot}`} />
              {i < story.timeline.length - 1 && <div className="w-5 h-px bg-slate-200 dark:bg-slate-700 mx-0.5 shrink-0" />}
            </div>
          ))}
          <span className="ml-2 text-[11px] text-slate-400 dark:text-slate-500 truncate">{story.timeline[story.timeline.length - 1].event}</span>
        </div>
        <div className="mt-4 flex items-center justify-between">
          <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 flex items-center gap-1 group-hover:gap-2 transition-all">
            Read with context <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M2 6h8M7 3l3 3-3 3" /></svg>
          </span>
          <span className="text-[11px] text-slate-300 dark:text-slate-600">{story.timeline.length} events</span>
        </div>
      </button>
      <button onClick={e => { e.stopPropagation(); onToggleBookmark(story.id) }}
        className="absolute top-4 right-4 w-7 h-7 flex items-center justify-center rounded-full transition-all hover:scale-110 active:scale-95"
        title={isBookmarked ? 'Remove bookmark' : 'Bookmark'}>
        <svg width="15" height="15" viewBox="0 0 24 24" fill={isBookmarked ? '#6366f1' : 'none'} stroke={isBookmarked ? '#6366f1' : '#cbd5e1'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2z" />
        </svg>
      </button>
    </div>
  )
}

/* ─── Story Thread Feed ──────────────────────────────────────── */
function Feed({ stories, followedIds, readingHistory, onOpen, searchQuery, bookmarks, onToggleBookmark, activeTab, onTabChange }) {
  const [activeCat, setActiveCat] = useState('')
  const readIds = new Set(readingHistory.map(h => h.storyId))
  const categories = [...new Set(stories.map(s => s.category))]

  const filtered = stories
    .filter(s => !searchQuery.trim() || s.title.toLowerCase().includes(searchQuery.toLowerCase()) || s.description.toLowerCase().includes(searchQuery.toLowerCase()) || s.category.toLowerCase().includes(searchQuery.toLowerCase()))
    .filter(s => !activeCat || s.category === activeCat)
    .filter(s => activeTab === 'bookmarks' ? bookmarks.includes(s.id) : true)

  const following = filtered.filter(s => followedIds.includes(s.id))
  const rest = filtered.filter(s => !followedIds.includes(s.id))

  return (
    <div className="mx-auto max-w-3xl px-4 pb-24 pt-4">
      {!searchQuery && (
        <header className="mb-5">
          <p className="text-xs font-bold uppercase tracking-widest text-indigo-500 mb-1">Today's threads</p>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white" style={{ fontFamily: 'Georgia,serif' }}>For you</h1>
          <p className="mt-1 text-[13px] text-slate-400">Thread · Recap · Engage — every story</p>
        </header>
      )}

      {!searchQuery && (
        <div className="flex gap-2 mb-5">
          {[['feed', 'Feed'], ['bookmarks', 'Bookmarks']].map(([tab, label]) => (
            <button key={tab} onClick={() => onTabChange(tab)} className={`rounded-full px-4 py-1.5 text-xs font-bold transition border ${activeTab === tab ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 border-transparent' : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'}`}>
              {label}{tab === 'bookmarks' && bookmarks.length > 0 && <span className="ml-1 text-indigo-400">({bookmarks.length})</span>}
            </button>
          ))}
        </div>
      )}

      {!searchQuery && activeTab === 'feed' && <div className="mb-5"><CategoryBar categories={categories} active={activeCat} onChange={setActiveCat} /></div>}

      {searchQuery && <p className="mb-5 text-sm text-slate-500 dark:text-slate-400">{filtered.length === 0 ? 'No results for ' : `${filtered.length} result${filtered.length !== 1 ? 's' : ''} for `}<span className="font-semibold text-slate-800 dark:text-white">"{searchQuery}"</span></p>}

      {activeTab === 'bookmarks' && bookmarks.length === 0 && (
        <div className="py-20 text-center">
          <p className="text-4xl mb-3">🔖</p>
          <p className="font-semibold text-slate-700 dark:text-slate-300">No bookmarks yet</p>
          <p className="text-sm text-slate-400 mt-1">Tap the bookmark icon on any story card</p>
        </div>
      )}

      {following.length > 0 && !searchQuery && activeTab === 'feed' && !activeCat && (
        <div className="mb-8">
          <p className="text-[11px] font-bold uppercase tracking-widest text-emerald-600 dark:text-emerald-500 mb-3 flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block" />Following</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">{following.map(s => <StoryCard key={s.id} story={s} onOpen={onOpen} isFollowing isRead={readIds.has(s.id)} isBookmarked={bookmarks.includes(s.id)} onToggleBookmark={onToggleBookmark} />)}</div>
          {rest.length > 0 && <div className="mt-8 mb-5 border-t border-slate-100 dark:border-slate-800 pt-6"><p className="text-[11px] font-bold uppercase tracking-widest text-slate-400 mb-4">More stories</p></div>}
        </div>
      )}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">{rest.map(s => <StoryCard key={s.id} story={s} onOpen={onOpen} isFollowing={false} isRead={readIds.has(s.id)} isBookmarked={bookmarks.includes(s.id)} onToggleBookmark={onToggleBookmark} />)}</div>
      {filtered.length === 0 && activeTab !== 'bookmarks' && <div className="py-24 text-center"><p className="text-5xl mb-4">🔍</p><p className="text-slate-500 dark:text-slate-400">No stories found</p><button onClick={() => setActiveCat('')} className="mt-4 text-sm text-indigo-500 font-semibold hover:underline">Clear filters</button></div>}
    </div>
  )
}

/* ─── Story view (merged: main + prototype features) ─────────── */
function StoryView({ storiesData, isFollowing, onToggleFollow, savedAnswer, onSaveAnswer, showSimulatedUpdate, onSimulateUpdate, onBack, onFeedback, annotations, onSaveAnnotation, isBookmarked, onToggleBookmark }) {
  const { storyId } = useParams()
  const story = storiesData.find(s => String(s.id) === String(storyId))

  const articleRef = useRef(null)
  const [expandedIndex, setExpandedIndex] = useState(null)
  const [annotatingIndex, setAnnotatingIndex] = useState(null)
  const [annotationDraft, setAnnotationDraft] = useState('')
  const [selectedOption, setSelectedOption] = useState(null)
  const [userPrediction, setUserPrediction] = useState('')
  const [engagementMode, setEngagementMode] = useState('quick')
  const [submitted, setSubmitted] = useState(false)
  const [progress, setProgress] = useState(0)
  const [copied, setCopied] = useState(false)
  const [isPlaying, setIsPlaying] = useState(false)
  const [articleFull, setArticleFull] = useState(null)       // full text from /api/article
  const [articleFetching, setArticleFetching] = useState(false)
  const [articleFetchErr, setArticleFetchErr] = useState('')
  const [relatedTimeline, setRelatedTimeline] = useState([])
  const [relErr, setRelErr] = useState('')
  const [recapLines, setRecapLines] = useState([
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
      // Story not in memory (page refresh loses live news state) — redirect home after 2s
      const t = setTimeout(() => onBack(), 2000)
      return () => clearTimeout(t)
    }
  }, [storyId])

  if (!story) return (
    <div className="py-24 text-center">
      <p className="text-4xl mb-3">📰</p>
      <p className="font-semibold text-slate-700 dark:text-slate-300">This article is no longer in memory</p>
      <p className="text-sm text-slate-400 mt-1">Redirecting you to the feed…</p>
      <button onClick={onBack} className="mt-4 text-sm font-bold text-indigo-500 hover:underline">Go to Feed now</button>
    </div>
  )

  const currentAnswer = savedAnswer[String(story.id)] || null
  const currentSimulated = showSimulatedUpdate[String(story.id)] || false

  useEffect(() => {
    if (currentAnswer) {
      if (currentAnswer.optionIndex !== null) {
        setSelectedOption(currentAnswer.optionIndex)
        setEngagementMode('quick')
      } else {
        setUserPrediction(currentAnswer.optionLabel)
        setEngagementMode('custom')
      }
      setSubmitted(true)
    } else {
      setSelectedOption(null)
      setUserPrediction('')
      setEngagementMode('quick')
      setSubmitted(false)
    }
  }, [story.id, currentAnswer])
  useEffect(() => {
    const fn = () => { const el = document.documentElement; const total = el.scrollHeight - el.clientHeight; setProgress(total > 0 ? Math.round((el.scrollTop / total) * 100) : 0) }
    window.addEventListener('scroll', fn, { passive: true }); return () => window.removeEventListener('scroll', fn)
  }, [])

  useEffect(() => {
    let cancelled = false
    setRelatedTimeline([])
    setRelErr('')
    if (!story?.sourceUrl) return

      ; (async () => {
        try {
          const t = await fetchRelatedTimeline(story)
          if (!cancelled) setRelatedTimeline(t)
        } catch (e) {
          if (cancelled) return
          const msg = e instanceof Error ? e.message : String(e)
          setRelErr(msg)
        }
      })()

    return () => { cancelled = true }
  }, [story.id])

  useEffect(() => {
    const timelineToShow = relatedTimeline.length ? relatedTimeline : story.timeline
    let cancelled = false

      ; (async () => {
        const lines = await summarizeTimelineWithLocalModel(timelineToShow)
        if (cancelled) return
        setRecapLines(lines)
      })()

    return () => { cancelled = true }
  }, [story.id, relatedTimeline, story.timeline])

  const handleSubmit = e => {
    e.preventDefault();
    if (engagementMode === 'quick' && selectedOption !== null) {
      onSaveAnswer(story.id, selectedOption, story.question.options[selectedOption]);
    } else if (engagementMode === 'custom' && userPrediction.trim()) {
      onSaveAnswer(story.id, null, userPrediction.trim());
    } else return;
    setSubmitted(true);
  }
  const handleShare = () => { const t = `${story.title} — NewsThread`; if (navigator.share) navigator.share({ title: story.title, text: t }).catch(() => { }); else navigator.clipboard.writeText(t).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000) }) }

  const saveAnnotation = (eventIndex) => {
    if (!annotationDraft.trim()) return
    onSaveAnnotation(story.id, eventIndex, annotationDraft.trim())
    setAnnotationDraft('')
    setAnnotatingIndex(null)
  }

  const timelineToShow = useMemo(() => {
    const base = story.timeline || [];
    if (!relatedTimeline || relatedTimeline.length === 0) return base;

    // Build a rich, merged timeline: up to 10 related articles + the base items
    const combined = [];

    // Sort related by date descending, take up to 10, then reverse for chronological display
    relatedTimeline
      .slice(0, 10)
      .reverse()
      .forEach((rel) => {
        combined.push({
          ...rel,
          isArticleLink: true,
          event: rel.event || (rel.source ? `Coverage: ${rel.source}` : 'Related Coverage'),
          details: rel.details || rel.description || 'Further context on this development.'
        });
      });

    // Append the base story items (published + latest) at the end as the anchor
    if (base[0]) combined.push(base[0]);
    if (base[2]) combined.push({ ...base[2], isLatest: true });

    return combined;
  }, [story.timeline, relatedTimeline]);

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
  useEffect(() => {
    let cancelled = false
    setArticleFull(null)
    setArticleFetchErr('')
    const url = story?.sourceUrl || story?.url
    // Only fetch for non-JSX articles that have a source URL
    if (!url || typeof story?.article !== 'string') return
    setArticleFetching(true)
      ; (async () => {
        try {
          const res = await fetch(`/api/article?url=${encodeURIComponent(url)}`)
          const data = await res.json()
          if (cancelled) return
          if (data.success && data.text) {
            setArticleFull(data.text)
          } else {
            setArticleFetchErr(data.error || 'Could not load full article')
          }
        } catch (e) {
          if (!cancelled) setArticleFetchErr(e.message || 'Network error')
        } finally {
          if (!cancelled) setArticleFetching(false)
        }
      })()
    return () => { cancelled = true }
  }, [story?.id])

  const predictedLabel = currentAnswer?.optionLabel ?? (submitted ? (engagementMode === 'quick' ? story.question.options[selectedOption] : userPrediction) : null)
  const st = cs(story.category)

  // Determine article content — could be JSX (from stories.jsx) or string (from newsApi)
  const articleIsJSX = typeof story.article !== 'string' && story.article != null
  // Prefer full fetched text, fallback to story.article (cleaned)
  const rawArticleStr = articleIsJSX ? '' : (
    articleFull ||
    String(story.article || '')
      .replace(/Read the original article:\s*https?:\/\/[^\s]+/i, '')
      .replace(/\[\+\d+\s*chars\]/i, '')
      .trim()
  )

  return (
    <div className="pb-24">
      <div className="fixed top-[54px] inset-x-0 z-40 h-0.5 bg-slate-100 dark:bg-slate-800">
        <div className="h-full bg-indigo-500 transition-all duration-75" style={{ width: `${progress}%` }} />
      </div>
      <div className="bg-white dark:bg-slate-950 border-b border-slate-100 dark:border-slate-800">
        <div className="mx-auto max-w-3xl px-4 pt-6 pb-7">
          <div className="flex items-center justify-between mb-5">
            <button onClick={onBack} className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition">
              <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M9 3L4 8l5 5" /></svg>Back to feed
            </button>
            <button onClick={handleSpeak} className={`inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full transition-all active:scale-95 ${isPlaying ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-400' : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'}`}>
              {isPlaying ? '⏸ Stop Audio' : '🔊 Listen to Page'}
            </button>
          </div>
          <div className="flex items-center gap-2 mb-3">
            <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ${st.pill} ${st.dpill}`}>{story.category}</span>
            <span className="text-xs text-slate-400 dark:text-slate-500">{story.readTime} · {story.timeline.length} events</span>
          </div>
          <h1 className="text-lg sm:text-xl font-bold leading-snug text-slate-900 dark:text-white" style={{ fontFamily: 'Georgia,serif' }}><JargonText text={story.title} /></h1>
          <p className="mt-2 text-slate-500 dark:text-slate-400 leading-relaxed">{story.description}</p>
        </div>
      </div>

      <div className="mx-auto max-w-3xl px-4 pt-8 space-y-10">

        {/* ── CINEMATIC THREAD NARRATIVE ── */}
        <section className="relative px-2">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-amber-100 dark:bg-amber-900/30">
                <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-amber-600 dark:text-amber-400"><path d="M4 6h16M4 12h16M4 18h16" /></svg>
              </div>
              <div>
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-amber-500 dark:text-amber-400">The Journey</span>
                <h2 className="text-xl font-bold text-slate-900 dark:text-white editorial-serif">Story Timeline</h2>
              </div>
            </div>
            <div className="flex flex-col items-end">
              <span className="text-[11px] font-bold text-slate-400">{timelineToShow.length} Key Events</span>
              <div className="h-1.5 w-24 rounded-full bg-slate-100 dark:bg-slate-800 mt-1 overflow-hidden">
                <div className="h-full bg-amber-500 transition-all duration-500" style={{ width: `${Math.min(100, ((expandedIndex ?? -1) + 1) / timelineToShow.length * 100)}%` }} />
              </div>
            </div>
          </div>

          <div className="relative pl-12">
            {/* Animated Glow Connector */}
            <div className="timeline-connector-glow" />

            <div className="space-y-6">
              {timelineToShow.map((item, i) => {
                const isOpen = expandedIndex === i;
                const isLast = i === timelineToShow.length - 1;

                return (
                  <div key={i} className={`timeline-thread-card thread-reveal ${isOpen ? 'timeline-item-active' : ''}`} style={{ animationDelay: `${i * 100}ms` }}>
                    <div className={`timeline-node-dot ${isOpen ? 'bg-amber-500' : 'bg-slate-200 dark:bg-slate-700'}`} />

                    <button
                      onClick={() => setExpandedIndex(isOpen ? null : i)}
                      className={`w-full text-left p-5 rounded-3xl border-2 transition-all duration-300 ${isOpen ? 'border-amber-300 dark:border-amber-700 bg-white dark:bg-slate-900 shadow-xl shadow-amber-100/50 dark:shadow-none' : 'border-slate-100 dark:border-slate-800/50 bg-white/50 dark:bg-slate-900/30 hover:border-amber-200 dark:hover:border-amber-800'}`}
                    >
                      <div className="flex items-center justify-between gap-3 mb-2">
                        <span className="text-[10px] font-black uppercase tracking-widest text-amber-500">{item.date}</span>
                        {isLast && <span className="flex h-2 w-2 rounded-full bg-red-500 animate-pulse" />}
                      </div>
                      <h3 className={`text-[16px] font-bold leading-tight ${isOpen ? 'text-slate-900 dark:text-white' : 'text-slate-700 dark:text-slate-300'}`}>
                        <JargonText text={item.event} />
                      </h3>

                      {isOpen && (
                        <div className="mt-4 pt-4 border-t border-amber-100 dark:border-amber-900/50 animate-in fade-in slide-in-from-top-2 duration-400 space-y-4">
                          <p className="text-[15px] leading-relaxed text-slate-600 dark:text-slate-400 editorial-serif">
                            <JargonText text={item.details} />
                          </p>
                          {(item.isArticleLink || item.isLatest) && item.url && (
                            <a
                              href={item.url}
                              target="_blank"
                              rel="noreferrer"
                              className="mt-2 flex items-center justify-between p-4 rounded-2xl bg-gradient-to-r from-indigo-50 to-violet-50 dark:from-indigo-950/30 dark:to-violet-950/20 border border-indigo-200 dark:border-indigo-800/60 hover:border-indigo-400 dark:hover:border-indigo-600 transition-all group shadow-sm"
                            >
                              <div>
                                <p className="text-[10px] font-black uppercase tracking-widest text-indigo-500 dark:text-indigo-400 mb-0.5">
                                  {item.source ? `Source · ${item.source}` : 'Deep Dive Coverage'}
                                </p>
                                <p className="text-sm font-bold text-slate-800 dark:text-slate-200 line-clamp-1">
                                  Read full article
                                </p>
                              </div>
                              <span className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                                <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M5 3h6v6M11 3L3 11" /></svg>
                              </span>
                            </a>
                          )}
                          {item.links && item.links.length > 0 && (
                            <div className="flex flex-wrap gap-2">
                              {item.links.map((link, idx) => (
                                <a key={idx} href={link.url} target="_blank" rel="noreferrer"
                                  className="inline-flex items-center gap-1.5 rounded-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 px-3 py-1.5 text-xs font-bold text-slate-600 dark:text-slate-400 hover:border-indigo-300 hover:text-indigo-600 transition">
                                  {link.source || `Source ${idx + 1}`}
                                  <svg width="10" height="10" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M4 2h4v4M8 2L2 8" /></svg>
                                </a>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* ── AI RECAP ── */}
        <section>
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-emerald-100 dark:bg-emerald-900/30">
                <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5" className="text-emerald-600 dark:text-emerald-400"><path d="M12 2a10 10 0 110 20A10 10 0 0112 2zm0 0v10l4 2" /></svg>
              </div>
              <div>
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-500 dark:text-emerald-400">AI Powered</span>
                <h2 className="text-xl font-bold text-slate-900 dark:text-white editorial-serif">Story Recap</h2>
              </div>
            </div>
            <button onClick={() => articleRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })} className="text-xs font-bold text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 transition flex items-center gap-1">
              Read Full Story
              <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M5 9l4 4 4-4" /></svg>
            </button>
          </div>

          <div className="rounded-[2.5rem] border border-emerald-200 dark:border-emerald-900/50 bg-gradient-to-br from-emerald-50/60 to-white dark:from-emerald-950/20 dark:to-slate-950 p-7 sm:p-10 relative overflow-hidden shadow-lg shadow-emerald-50 dark:shadow-none">
            {/* Ambient glow */}
            <div className="absolute top-0 right-0 w-48 h-48 bg-emerald-400/5 rounded-full blur-3xl -mr-24 -mt-24 pointer-events-none" />

            {/* TL;DR headline */}
            <div className="mb-6 relative z-10">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-600 dark:text-emerald-400 mb-2">TL;DR</p>
              <p className="text-[18px] sm:text-[20px] font-bold text-slate-900 dark:text-white leading-snug editorial-serif">
                {recapLines[0]}
              </p>
            </div>

            {/* Divider */}
            <div className="flex items-center gap-4 my-6 relative z-10">
              <div className="h-px flex-1 bg-emerald-100 dark:bg-emerald-900/50" />
              <span className="text-[10px] font-black uppercase tracking-widest text-emerald-400">Key Points</span>
              <div className="h-px flex-1 bg-emerald-100 dark:bg-emerald-900/50" />
            </div>

            {/* Key point cards */}
            <div className="space-y-3 relative z-10">
              {recapLines.slice(1).map((line, i) => (
                <div key={i} className="flex gap-4 p-4 rounded-2xl bg-white/70 dark:bg-slate-900/50 border border-emerald-100 dark:border-emerald-900/40 backdrop-blur-sm">
                  <div className="shrink-0 w-7 h-7 rounded-xl bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-400 text-[11px] font-black flex items-center justify-center">
                    {i + 1}
                  </div>
                  <p className="text-[14px] leading-relaxed text-slate-700 dark:text-slate-300">
                    <JargonText text={line} />
                  </p>
                </div>
              ))}
            </div>

            {/* Footer metadata */}
            <div className="flex items-center justify-between mt-6 pt-5 border-t border-emerald-100 dark:border-emerald-900/50 relative z-10">
              <div className="flex items-center gap-2">
                <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-[11px] font-bold text-slate-400">Based on {timelineToShow.length} verified events</span>
              </div>
              <span className="text-[11px] font-bold text-slate-400">{story.readTime} read</span>
            </div>
          </div>
        </section>

        {/* ── FULL ARTICLE ── */}
        <section ref={articleRef} className="scroll-mt-20">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="w-1 h-5 rounded-full bg-blue-500" />
              <span className="text-[11px] font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">📰 Today's Full Article</span>
            </div>
            {articleFetching && (
              <span className="text-[11px] text-slate-400 flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full border-2 border-blue-400 border-t-transparent animate-spin inline-block" />
                Loading full article…
              </span>
            )}
            {articleFull && !articleFetching && (
              <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold">✓ Full article loaded</span>
            )}
          </div>
          <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm p-5 space-y-4">
            {/* Cover image inside article */}
            {(story.imageUrl || story.urlToImage) && (
              <div className="-mx-5 -mt-5 mb-6 relative overflow-hidden rounded-t-3xl">
                <div className="aspect-[16/7] relative">
                  <img
                    src={story.imageUrl || story.urlToImage}
                    alt=""
                    className="absolute inset-0 w-full h-full object-cover"
                    onError={(e) => { e.currentTarget.style.display = 'none' }}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-white/80 dark:from-slate-900/80 via-transparent to-transparent" />
                  <div className="absolute bottom-4 left-5 right-5 flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-700 dark:text-white drop-shadow-sm">Full Coverage</span>
                  </div>
                </div>
              </div>
            )}
            {articleIsJSX ? (
              /* Render JSX articles from stories.jsx (with embedded JargonWord components) */
              <div>{story.article}</div>
            ) : articleFetching && !rawArticleStr ? (
              /* Skeleton while fetching */
              <div className="space-y-3 animate-pulse">
                {[1, 2, 3, 4, 5].map(i => (
                  <div key={i} className={`h-4 bg-slate-200 dark:bg-slate-700 rounded-full ${i === 5 ? 'w-2/3' : 'w-full'}`} />
                ))}
                <div className="h-4 w-full bg-slate-200 dark:bg-slate-700 rounded-full" />
                <div className="h-4 w-5/6 bg-slate-200 dark:bg-slate-700 rounded-full" />
                <div className="h-4 w-full bg-slate-200 dark:bg-slate-700 rounded-full" />
                <div className="h-4 w-3/4 bg-slate-200 dark:bg-slate-700 rounded-full" />
              </div>
            ) : (
              <>
                <div className="relative pl-6 border-l-2 border-slate-100 dark:border-slate-800 space-y-8 mt-2 mb-6">
                  {rawArticleStr.split('\n\n').filter(Boolean).map((para, i) => (
                    <div key={i} className="relative">
                      {/* Node marker connecting the story elements */}
                      <div className="absolute -left-[31px] top-1.5 w-4 h-4 rounded-full bg-white dark:bg-slate-900 border-[3px] border-blue-400 z-10 shadow-sm" />

                      {i === 0 ? (
                        <p className="text-[16px] font-medium leading-relaxed text-slate-900 dark:text-white pb-3">
                          <span className="float-left text-5xl font-black text-blue-500 mr-2 mt-[-4px] leading-none" style={{ fontFamily: 'Georgia,serif' }}>{para[0]}</span>
                          <JargonParagraph text={para.slice(1)} />
                        </p>
                      ) : (
                        <p className="text-[15px] leading-relaxed text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/40 rounded-2xl p-4 shadow-sm border border-slate-100 dark:border-slate-800/60 transition-colors hover:border-blue-200 dark:hover:border-blue-800">
                          <JargonParagraph text={para} />
                        </p>
                      )}
                    </div>
                  ))}
                </div>
                {articleFetchErr && !articleFull && (
                  <div className="mt-3 rounded-2xl border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/40 px-4 py-3 text-sm text-amber-800 dark:text-amber-300">
                    <p className="font-semibold">Couldn't load the full article automatically</p>
                    <p className="mt-0.5 text-xs opacity-80">{articleFetchErr}</p>
                    <p className="mt-1 text-xs">The site may require a subscription or block automated access. Use the link below to read it directly.</p>
                  </div>
                )}
              </>
            )}
            {(story.sourceUrl || story.url) && (
              <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                <a href={story.sourceUrl || story.url} target="_blank" rel="noreferrer" className="text-sm font-bold text-indigo-600 dark:text-indigo-400 hover:underline inline-flex items-center gap-1.5">
                  Read on original source
                  <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M5 3h6v6M11 3L3 11" /></svg>
                </a>
              </div>
            )}
          </div>
        </section>

        <section>
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex flex-wrap gap-2">
              <button onClick={() => onToggleFollow(story.id)} className={`rounded-full px-4 py-2 text-sm font-bold border-2 transition-all active:scale-95 ${isFollowing.includes(story.id) ? 'border-emerald-400 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-800 dark:text-emerald-400' : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:border-indigo-300 hover:text-indigo-700'}`}>{isFollowing.includes(story.id) ? '✓ Following' : '+ Follow'}</button>
              <button onClick={() => onToggleBookmark(story.id)} className={`rounded-full px-4 py-2 text-sm font-bold border-2 transition-all active:scale-95 ${isBookmarked.includes(story.id) ? 'border-indigo-400 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-800 dark:text-indigo-400' : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:border-indigo-300'}`}>{isBookmarked.includes(story.id) ? '🔖 Saved' : '🔖 Save'}</button>
              {story.simulatedUpdate && <button onClick={() => onSimulateUpdate(story.id)} disabled={currentSimulated} className="rounded-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-4 py-2 text-sm font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition-all active:scale-95">{currentSimulated ? 'Updated ✓' : '⚡ Simulate update'}</button>}
              <button onClick={handleShare} className="rounded-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-4 py-2 text-sm font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all active:scale-95">{copied ? 'Copied!' : '↗ Share'}</button>
            </div>
            {story.sourceUrl && (
              <a href={story.sourceUrl} target="_blank" rel="noreferrer" className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline">
                View original
              </a>
            )}
          </div>
        </section>

        {/* ── INSIGHTS + ENGAGE ── */}
        <section>
          <div className="flex items-center gap-2 mb-4"><div className="w-1 h-5 rounded-full bg-violet-500" /><span className="text-[11px] font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">🎯 Engage</span></div>

          {/* ── Insights Panel (contextual background before the question) ── */}
          {insights && (
            <div className="rounded-3xl border border-indigo-200 dark:border-indigo-900/50 bg-indigo-50/30 dark:bg-indigo-950/20 p-5 mb-4 space-y-4">
              <p className="text-[10px] font-bold uppercase tracking-widest text-indigo-500 dark:text-indigo-400">💡 Context & Insights</p>

              {/* Why it matters & Tone */}
              <div className="rounded-2xl border border-indigo-100 dark:border-indigo-900 bg-white dark:bg-slate-900 overflow-hidden">
                <div className="flex items-center justify-between border-b border-indigo-50 dark:border-indigo-900/50 px-4 py-3 bg-indigo-50/30 dark:bg-slate-800/20">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-indigo-500 dark:text-indigo-400">Why this matters</p>
                  {insights.tone && (
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold text-${insights.tone.color}-700 dark:text-${insights.tone.color}-400 bg-${insights.tone.color}-100 dark:bg-${insights.tone.color}-900/30`}>
                      {insights.tone.label} Tone
                    </span>
                  )}
                </div>
                <div className="px-4 py-3">
                  <p className="text-[14px] leading-relaxed text-slate-700 dark:text-slate-300">{insights.whyMatters}</p>
                </div>
              </div>

              {/* Key Entities */}
              {insights.entities && insights.entities.length > 0 && (
                <div className="space-y-2">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-indigo-400 dark:text-indigo-500">🏷️ Key Players / Topics</p>
                  <div className="flex flex-wrap gap-2 pt-1">
                    {insights.entities.map((entity, i) => (
                      <span key={i} className="inline-flex items-center rounded-xl bg-indigo-100 dark:bg-indigo-900/40 border border-indigo-200 dark:border-indigo-800 px-3 py-1.5 text-xs font-bold text-indigo-700 dark:text-indigo-300">
                        {entity}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Community pulse — simulated poll */}
              {insights.poll && insights.poll.length > 0 && (
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-indigo-400 dark:text-indigo-500 mb-2">📊 Community pulse — how others leaned</p>
                  <div className="space-y-2">
                    {insights.poll.map((p, i) => (
                      <div key={i} className="rounded-xl overflow-hidden">
                        <div className="flex items-center justify-between text-xs mb-1">
                          <span className="text-slate-600 dark:text-slate-400 font-medium truncate pr-2">{p.label}</span>
                          <span className="text-indigo-600 dark:text-indigo-400 font-bold shrink-0">{p.pct}%</span>
                        </div>
                        <div className="h-2 rounded-full bg-slate-100 dark:bg-slate-800">
                          <div className="h-full rounded-full bg-gradient-to-r from-indigo-400 to-violet-500 transition-all duration-700" style={{ width: `${p.pct}%` }} />
                        </div>
                      </div>
                    ))}
                  </div>
                  <p className="text-[10px] text-slate-400 mt-2 italic">Based on reader engagement patterns</p>
                </div>
              )}
            </div>
          )}

          {/* ── SMART ENGAGEMENT NARRATIVE ── */}
          <div className="rounded-[2.5rem] border border-violet-200 dark:border-violet-900/50 bg-gradient-to-br from-violet-50/50 to-white dark:from-violet-950/20 dark:to-slate-950 p-8 sm:p-12 shadow-2xl shadow-indigo-100 dark:shadow-none overflow-hidden relative">
            {/* Ambient decorative elements */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-violet-400/5 rounded-full blur-3xl -mr-32 -mt-32 pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-64 h-64 bg-indigo-400/5 rounded-full blur-3xl -ml-32 -mb-32 pointer-events-none" />

            <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
              <div>
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="flex h-2 w-2 rounded-full bg-violet-500 animate-ping" />
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-violet-500 dark:text-violet-400">Smart Engagement</p>
                </div>
                <h3 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white editorial-serif tracking-tight">How do you read this situation?</h3>
              </div>
              <div className="flex flex-wrap sm:flex-nowrap bg-slate-200/40 dark:bg-slate-800/40 p-1.5 rounded-2xl backdrop-blur-md border border-white/50 dark:border-slate-700/50 self-start w-full sm:w-auto">
                <button type="button" onClick={() => setEngagementMode('quick')} className={`flex flex-1 justify-center items-center gap-2 px-3 sm:px-5 py-2.5 rounded-xl font-bold text-xs transition-all ${engagementMode === 'quick' ? 'bg-white dark:bg-slate-700 text-violet-600 dark:text-violet-300 shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}>
                  <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" /></svg> Quick Take
                </button>
                <button type="button" onClick={() => setEngagementMode('custom')} className={`flex flex-1 justify-center items-center gap-2 px-3 sm:px-5 py-2.5 rounded-xl font-bold text-xs transition-all ${engagementMode === 'custom' ? 'bg-white dark:bg-slate-700 text-violet-600 dark:text-violet-300 shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}>
                  <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 20h9M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z" /></svg> Reflect
                </button>
              </div>
            </div>

            <div className="relative z-10 mb-8 p-6 sm:p-8 rounded-[2rem] bg-white/80 dark:bg-slate-900/60 backdrop-blur-xl border border-violet-100 dark:border-violet-800/50 shadow-xl">
              <p className="text-[18px] sm:text-[20px] leading-relaxed text-slate-800 dark:text-slate-200 font-medium editorial-serif tracking-tight">{story.question.text}</p>
            </div>

            <div className="relative z-10">
              <form onSubmit={handleSubmit} className="duration-500 animate-in fade-in slide-in-from-bottom-4">
                {!submitted ? (
                  <>
                    {engagementMode === 'quick' ? (
                      <div className="grid grid-cols-1 gap-3">
                        {story.question.options.map((opt, i) => {
                          const checked = selectedOption === i;
                          return (
                            <label key={i} className={`flex items-center gap-4 p-4 rounded-2xl cursor-pointer transition-all duration-300 border-2 ${checked ? 'border-violet-500 bg-violet-50/80 dark:bg-violet-900/40 shadow-md transform scale-[1.01]' : 'border-slate-100 dark:border-slate-800/60 bg-white/50 dark:bg-slate-900/40 hover:bg-white dark:hover:bg-slate-900 hover:border-violet-300 dark:hover:border-violet-700'}`}>
                              <input type="radio" name={`q-${story.id}`} className="sr-only" checked={checked} onChange={() => { setSelectedOption(i); setSubmitted(false) }} />
                              <span className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 border-2 transition-colors ${checked ? 'bg-violet-600 border-violet-600 text-white' : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400'}`}>
                                <span className="text-sm font-bold">{String.fromCharCode(65 + i)}</span>
                              </span>
                              <span className={`text-[15px] font-medium leading-tight ${checked ? 'text-violet-900 dark:text-violet-100 font-bold' : 'text-slate-700 dark:text-slate-300'}`}>{opt}</span>
                            </label>
                          )
                        })}
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <textarea
                          value={userPrediction}
                          onChange={e => setUserPrediction(e.target.value)}
                          rows={4}
                          placeholder="Share your unique perspective..."
                          className="w-full rounded-[2rem] border-2 border-violet-100 dark:border-violet-900/50 bg-white dark:bg-slate-900 p-6 text-[16px] leading-relaxed text-slate-800 dark:text-slate-200 focus:ring-4 focus:ring-violet-500/20 focus:border-violet-500 outline-none resize-none transition-all shadow-inner editorial-serif"
                        />
                      </div>
                    )}
                    <button type="submit" disabled={(engagementMode === 'quick' && selectedOption === null) || (engagementMode === 'custom' && !userPrediction.trim())} className="mt-6 w-full rounded-2xl bg-gradient-to-r from-violet-600 to-indigo-600 py-4 text-[15px] font-bold text-white hover:opacity-90 hover:shadow-xl shadow-violet-200 dark:shadow-none transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed transform active:scale-95">Record Insight</button>
                  </>
                ) : (
                  <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
                    <div className="rounded-[2rem] border-2 border-violet-500 bg-violet-50/80 dark:bg-violet-900/20 p-6 sm:p-8 shadow-inner relative overflow-hidden">
                      <div className="absolute -top-10 -right-10 w-32 h-32 rounded-full bg-violet-400/20 blur-2xl" />

                      <div className="flex items-center gap-2 mb-3 relative z-10">
                        <div className="w-2 h-2 rounded-full bg-violet-500 animate-pulse" />
                        <p className="text-[10px] font-bold uppercase tracking-widest text-violet-600 dark:text-violet-400">Insight Recorded</p>
                      </div>
                      <p className="text-[18px] leading-relaxed font-bold text-slate-900 dark:text-white mb-6 relative z-10">
                        {currentAnswer ? currentAnswer.optionLabel : (selectedOption !== null ? story.question.options[selectedOption] : userPrediction)}
                      </p>

                      <div className="rounded-3xl bg-slate-900 dark:bg-slate-800 p-6 sm:p-8 text-white shadow-xl relative z-10 border border-slate-700">
                        <div className="flex items-start gap-4 mb-3">
                          <span className="text-2xl mt-1 block">🤖</span>
                          <div>
                            <p className="text-[10px] font-bold uppercase tracking-widest text-violet-400 mb-2">AI Contextual Reflection</p>
                            <p className="text-[15px] leading-relaxed text-slate-200">
                              {selectedOption !== null ? (
                                `Your selection identifies a pivotal direction for this developing story. Given the ${timelineToShow.length} key events verified in our timeline, this pattern mirrors how ${story.category.toLowerCase()} stories hit crucial inflection points.`
                              ) : (
                                `A highly nuanced perspective. Your thoughts actively consider the ${timelineToShow.length} verified developments in the thread, recognizing the subtle complexities beyond standard choices.`
                              )}
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="flex justify-center mt-6">
                        <button type="button" onClick={() => { setSubmitted(false); setSelectedOption(null); setUserPrediction('') }} className="inline-flex items-center gap-2 text-xs font-bold text-violet-500 hover:text-violet-700 transition relative z-10">
                          <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M4 4l16 16m0-16L4 20" /></svg>
                          Clear & retry engagement
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </form>
            </div>
          </div>
        </section>


        {/* ── SIMULATED UPDATE ── */}
        {currentSimulated && story.simulatedUpdate && (
          <section>
            <div className="rounded-3xl border-2 border-sky-300 dark:border-sky-700 bg-sky-50/50 dark:bg-sky-950/30 p-5">
              <span className="rounded-full bg-sky-100 dark:bg-sky-900/50 px-3 py-1 text-[11px] font-bold text-sky-800 dark:text-sky-300">⚡ Story updated</span>
              <h3 className="mt-3 font-bold text-slate-900 dark:text-white" style={{ fontFamily: 'Georgia,serif' }}>What actually happened</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-700 dark:text-slate-300">{story.simulatedUpdate.actualOutcome}</p>
              {predictedLabel && (
                <div className="mt-4 rounded-2xl border border-sky-200 dark:border-sky-800 bg-white dark:bg-slate-900 p-4 space-y-3 text-sm">
                  <div>
                    <span className="font-semibold text-sky-600 dark:text-sky-400 block mb-1">You predicted:</span>
                    <span className="text-slate-800 dark:text-slate-200 italic">"{predictedLabel}"</span>
                  </div>
                  <div className="border-t border-slate-100 dark:border-slate-800 pt-3">
                    <span className="font-semibold text-emerald-600 dark:text-emerald-400 block mb-1">Actual outcome:</span>
                    <span className="text-slate-800 dark:text-slate-200">{story.simulatedUpdate.outcomeSummary}</span>
                  </div>
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
function PredictionsScreen({ stories, userAnswers, simulatedByStory, onOpenStory, onBack }) {
  const answered = stories.filter(s => userAnswers[String(s.id)])
  return (
    <div className="mx-auto max-w-3xl px-4 pb-24 pt-4">
      <button onClick={onBack} className="mb-5 inline-flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition">
        <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M9 3L4 8l5 5" /></svg>Back
      </button>
      <p className="text-xs font-bold uppercase tracking-widest text-violet-500 mb-1">Your predictions</p>
      <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-6" style={{ fontFamily: 'Georgia,serif' }}>Prediction tracker</h1>
      {answered.length === 0 && (
        <div className="py-20 text-center rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
          <p className="text-4xl mb-3">🎯</p>
          <p className="font-semibold text-slate-700 dark:text-slate-300">No predictions yet</p>
          <p className="text-sm text-slate-400 mt-1">Read a story and submit your prediction to track it here</p>
        </div>
      )}
      <div className="space-y-4">
        {answered.map(s => {
          const ans = userAnswers[String(s.id)]
          const revealed = simulatedByStory[String(s.id)]
          return (
            <button key={s.id} onClick={() => onOpenStory(s.id)} className="w-full text-left rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 hover:shadow-md hover:border-indigo-200 dark:hover:border-indigo-700 transition-all">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400 mb-1">{s.category}</p>
                  <p className="font-bold text-slate-900 dark:text-white text-[15px] leading-snug" style={{ fontFamily: 'Georgia,serif' }}>{s.title}</p>
                  <p className="text-sm text-slate-500 dark:text-slate-400 mt-3 italic">"{ans.optionLabel}"</p>
                  {revealed && <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800"><p className="text-sm font-semibold text-emerald-600 dark:text-emerald-400 mb-0.5">Outcome:</p><p className="text-sm text-slate-700 dark:text-slate-300">{s.simulatedUpdate?.outcomeSummary}</p></div>}
                </div>
                <div className="shrink-0 mt-1">
                  {!revealed && <span className="rounded-full border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 px-3 py-1 text-[11px] font-bold">Waiting</span>}
                  {revealed && <span className="rounded-full bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400 px-3 py-1 text-[11px] font-bold">Updated</span>}
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
function Drawer({ onClose, children }) {
  return (
    <div className="fixed inset-0 z-40 flex items-end sm:items-center justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-[2px]" />
      <div className="relative z-10 w-full max-w-md rounded-t-3xl sm:rounded-3xl bg-white dark:bg-slate-900 shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>{children}</div>
    </div>
  )
}
function DHead({ title, sub, onClose }) {
  return (
    <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-800">
      <div><h2 className="font-bold text-slate-900 dark:text-white">{title}</h2>{sub && <p className="text-xs text-slate-400 mt-0.5">{sub}</p>}</div>
      <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 text-xs font-bold hover:bg-slate-200 dark:hover:bg-slate-700 transition">✕</button>
    </div>
  )
}

function HistoryDrawer({ items, onClose, onPick }) {
  return (
    <Drawer onClose={onClose}>
      <DHead title="Reading history" sub={`${items.length} ${items.length === 1 ? 'item' : 'items'}`} onClose={onClose} />
      <ul className="max-h-72 overflow-y-auto divide-y divide-slate-50 dark:divide-slate-800 p-2">
        {items.length === 0 ? <li className="py-10 text-center text-sm text-slate-400">Nothing read yet</li> :
          items.map(row => (
            <li key={row.newsUrl || row.storyId}>
              <button type="button" onClick={() => onPick(row)} className="flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left hover:bg-slate-50 dark:hover:bg-slate-800 transition">
                <div className="w-9 h-9 rounded-xl bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center shrink-0"><span className="text-indigo-600 dark:text-indigo-400 text-xs font-bold">{row.title?.[0] ?? '·'}</span></div>
                <div className="min-w-0 flex-1"><p className="text-sm font-semibold text-slate-900 dark:text-white truncate">{row.title}</p><p className="text-xs text-slate-400">{relTime(row.lastOpened)}{row.newsUrl && <span className="ml-1 text-indigo-400">· Live</span>}</p></div>
                <svg className="shrink-0 text-slate-300 dark:text-slate-600" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 3l5 5-5 5" /></svg>
              </button>
            </li>
          ))}
      </ul>
    </Drawer>
  )
}

function ProfilePanel({ onClose, followedIds, readingHistory, interests, allFeedback, streak, onShowPredictions }) {
  const avg = allFeedback.length ? (allFeedback.reduce((s, f) => s + f.rating, 0) / allFeedback.length).toFixed(1) : null
  const annotatedCount = Object.keys(load(LS.ANNOTATIONS, {})).length

  // Build 7-day reading heatmap
  const weekHeatmap = useMemo(() => {
    const days = []
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
    for (let i = 6; i >= 0; i--) {
      const d = new Date(Date.now() - i * 86400000)
      const dayStr = d.toDateString()
      const count = readingHistory.filter(h => {
        const hd = h.lastOpened ? new Date(h.lastOpened).toDateString() : ''
        return hd === dayStr
      }).length
      days.push({ name: dayNames[d.getDay()], date: d.getDate(), count, isToday: i === 0 })
    }
    return days
  }, [readingHistory])

  const streakMessage = streak >= 7 ? 'Amazing! A full week streak! 🏆' : streak >= 3 ? 'Great momentum! Keep it going! 💪' : streak >= 1 ? 'Nice start! Read daily to build your streak.' : 'Read today to start your streak!'

  return (
    <Drawer onClose={onClose}>
      <div className="px-5 pt-6 pb-5 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-4">
          <div className="relative w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-400 to-violet-500 flex items-center justify-center text-white text-2xl font-bold shadow-sm">N
            {streak >= 1 && <span className="absolute -bottom-1 -right-1 rounded-full bg-orange-500 text-white text-[9px] font-bold px-1.5 py-0.5">{streak}d🔥</span>}
          </div>
          <div><p className="font-bold text-slate-900 dark:text-white text-base">Demo Reader</p><p className="text-xs text-slate-400 mt-0.5">All data local · Bengaluru</p></div>
          <button onClick={onClose} className="ml-auto w-8 h-8 flex items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 text-xs font-bold hover:bg-slate-200 transition">✕</button>
        </div>
      </div>

      {/* Streak & Reading Heatmap */}
      <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center justify-between mb-3">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">🔥 Reading streak</p>
          <span className="text-sm font-bold text-orange-600 dark:text-orange-400">{streak} day{streak !== 1 ? 's' : ''}</span>
        </div>
        <div className="grid grid-cols-7 gap-1.5 mb-3">
          {weekHeatmap.map((day, i) => (
            <div key={i} className="text-center">
              <p className="text-[9px] text-slate-400 mb-1">{day.name}</p>
              <div className={`mx-auto w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold transition-all ${day.count >= 3 ? 'bg-orange-500 text-white shadow-sm shadow-orange-200 dark:shadow-orange-900' :
                  day.count >= 1 ? 'bg-orange-200 dark:bg-orange-900/50 text-orange-700 dark:text-orange-400' :
                    'bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-600'
                } ${day.isToday ? 'ring-2 ring-orange-400 ring-offset-1 ring-offset-white dark:ring-offset-slate-950' : ''}`}>
                {day.date}
              </div>
              <p className={`text-[9px] font-bold mt-0.5 ${day.count > 0 ? 'text-orange-500 dark:text-orange-400' : 'text-transparent'}`}>
                {day.count > 0 ? `${day.count}✓` : '·'}
              </p>
            </div>
          ))}
        </div>
        <p className="text-xs text-slate-500 dark:text-slate-400 text-center">{streakMessage}</p>
      </div>

      <div className="px-5 py-4 grid grid-cols-4 gap-2 border-b border-slate-100 dark:border-slate-800">
        {[{ label: 'Read', value: readingHistory.length }, { label: 'Following', value: followedIds.length }, { label: 'Notes', value: annotatedCount }, { label: 'Avg ★', value: avg || '—' }].map(s => (
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
          <svg className="text-violet-400" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 3l5 5-5 5" /></svg>
        </button>
      </div>

      {interests.length > 0 && (
        <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2.5">Topics</p>
          <div className="flex flex-wrap gap-2">{interests.map(t => <span key={t} className="rounded-full bg-indigo-50 dark:bg-indigo-900/40 border border-indigo-200 dark:border-indigo-800 px-3 py-1 text-xs font-bold text-indigo-700 dark:text-indigo-400">{t}</span>)}</div>
        </div>
      )}
      <div className="px-5 py-4"><p className="text-[11px] text-slate-400 text-center">NewsThread · Prototype v1 · Design Thinking Project · Bengaluru</p></div>
    </Drawer>
  )
}

/* ─── streak helper ──────────────────────────────────────────── */
function updateStreak() {
  const today = new Date().toDateString()
  const data = load(LS.STREAK, { streak: 0, lastDay: '' })
  const yesterday = new Date(Date.now() - 86400000).toDateString()
  if (data.lastDay === today) return data.streak
  const newStreak = data.lastDay === yesterday ? data.streak + 1 : 1
  save(LS.STREAK, { streak: newStreak, lastDay: today })
  return newStreak
}

/* ─── Subscribe Modal ────────────────────────────────────────── */
function SubscribeModal({ onClose }) {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [isComingSoon, setIsComingSoon] = useState(false)
  const [loading, setLoading] = useState(false)

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await fetch('/api/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email })
      });
      setIsComingSoon(true);
    } catch(e) {
      console.error(e);
    }
    setLoading(false);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-[2px]" />
      <div className="relative z-10 w-full max-w-md max-h-[90dvh] overflow-y-auto rounded-3xl bg-white dark:bg-slate-900 shadow-2xl p-6 md:p-8 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden" onClick={e => e.stopPropagation()}>
        {isComingSoon ? (
          <div className="text-center py-6 animate-in zoom-in duration-300">
            <div className="mx-auto w-16 h-16 bg-amber-100 dark:bg-amber-900/30 rounded-full flex items-center justify-center text-3xl mb-4 shadow-inner">✨</div>
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2" style={{ fontFamily: 'Georgia,serif' }}>We are coming soon!</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-6 font-medium">Thanks for subscribing, {name}. We will let you know when payments are live.</p>
            <button onClick={onClose} className="w-full rounded-2xl bg-slate-900 dark:bg-white py-3.5 text-sm font-bold text-white dark:text-slate-900 hover:opacity-90 transition shadow-md active:scale-[0.98]">Close</button>
          </div>
        ) : (
          <form className="animate-in slide-in-from-bottom-2 duration-300" onSubmit={submit}>
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white" style={{ fontFamily: 'Georgia,serif' }}>Subscribe to unlock</h2>
              <button type="button" onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 text-xs font-bold hover:bg-slate-200 transition">✕</button>
            </div>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">Get unlimited access to story timelines and AI recaps.</p>
            <div className="space-y-4 mb-8">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 uppercase tracking-wide">Name</label>
                <input required value={name} onChange={e => setName(e.target.value)} type="text" placeholder="John Doe" className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-4 py-3 text-sm text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500 transition-shadow" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 uppercase tracking-wide">Email</label>
                <input required value={email} onChange={e => setEmail(e.target.value)} type="email" placeholder="john@example.com" className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-4 py-3 text-sm text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500 transition-shadow" />
              </div>
            </div>
            <button disabled={!name || !email || loading} type="submit" className="w-full rounded-2xl bg-gradient-to-r from-violet-600 to-indigo-600 py-3.5 text-sm font-bold text-white hover:opacity-90 transition shadow-lg shadow-indigo-200 dark:shadow-indigo-900/40 disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98]">
              {loading ? 'Processing...' : 'Proceed to Payment →'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}

/* ─── App Content (Inside Router) ───────────────────────────── */
function AppContent() {
  const navigate = useNavigate()
  const location = useLocation()
  const [ready, setReady] = useState(false)
  const [onboarded, setOnboarded] = useState(false)
  const [activeTab, setActiveTab] = useState('feed')
  const [profileOpen, setProfileOpen] = useState(false)
  const [historyOpen, setHistoryOpen] = useState(false)
  const [feedbackOpen, setFeedbackOpen] = useState(false)
  const [subscribeOpen, setSubscribeOpen] = useState(false)
  const [followedIds, setFollowedIds] = useState([])
  const [userAnswers, setUserAnswers] = useState({})
  const [readingHistory, setReadingHistory] = useState([])
  const [simulatedByStory, setSimulatedByStory] = useState({})
  const [interests, setInterests] = useState([])
  const [darkMode, setDarkMode] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [allFeedback, setAllFeedback] = useState([])
  const [annotations, setAnnotations] = useState({})
  const [bookmarks, setBookmarks] = useState([])
  const [streak, setStreak] = useState(0)
  const [notifs, setNotifs] = useState([])
  const [storiesData, setStoriesData] = useState(fallbackStories)
  const [storiesLoading, setStoriesLoading] = useState(true)
  const [storiesError, setStoriesError] = useState('')

  // ── Live news state (from prototype) ──
  const [newsArticles, setNewsArticles] = useState([])
  const [newsLoading, setNewsLoading] = useState(true)
  const [newsError, setNewsError] = useState(null)
  const [newsCategory, setNewsCategory] = useState('')
  const [newsRefreshTick, setNewsRefreshTick] = useState(0)
  const [newsBookmarks, setNewsBookmarks] = useState([])
  const [feedMode, setFeedMode] = useState('news') // 'news' | 'threads'

  const openStory = (id) => {
    navigate(`/story/${id}`)
    const s = storiesData.find(x => x.id === id) || protoStories.find(x => x.id === id)
    if (s) {
      setReadingHistory(p => {
        const next = [{ storyId: s.id, title: s.title, lastOpened: Date.now() }, ...p.filter(x => x.storyId !== s.id)].slice(0, 20)
        save(LS.HISTORY, next)
        return next
      })
    }
  }

  const openNewsArticle = (article) => {
    // --- Smart engage question from title + description ---
    const engageQ = generateSmartQuestion(article)


    // Convert live news article to a story thread
    const simulatedStory = {
      id: article.url,
      title: article.title,
      category: 'Live update',
      description: article.description,
      tag: 'Live update',
      readTime: '3 min',
      sourceUrl: article.url,
      url: article.url,
      source: article.source,
      publishedAt: article.publishedAt,
      urlToImage: article.urlToImage,
      imageUrl: article.urlToImage,
      timeline: [
        { date: 'Just now', event: article.title || 'Headline breaks', details: article.description || 'Details are emerging.' },
      ],
      recap: [
        'Live updates from NewsAPI.',
        'This is a developing event.',
        'Share your perspective below.'
      ],
      article: `(Live) ${article.description || ''}\n\nSource: ${article.source}`,
      question: engageQ,
      simulatedUpdate: null
    }
    // Add to storiesData so it can be found by StoryView
    setStoriesData(prev => {
      const exists = prev.some(s => String(s.id) === String(simulatedStory.id))
      return exists ? prev : [...prev, simulatedStory]
    })
    // Record in history
    setReadingHistory(prev => {
      const row = { kind: 'news', newsUrl: article.url, storyId: article.url, title: article.title, lastOpened: Date.now(), description: article.description, urlToImage: article.urlToImage, source: article.source, publishedAt: article.publishedAt }
      const next = [row, ...prev.filter(h => h.newsUrl !== article.url && h.storyId !== article.url)].slice(0, 20)
      save(LS.HISTORY, next)
      return next
    })
    navigate(`/story/${encodeURIComponent(article.url)}`)
  }

  const pickFromHistory = (row) => {
    setHistoryOpen(false)
    if (row.newsUrl) {
      openNewsArticle({
        title: row.title,
        description: row.description || '',
        urlToImage: row.urlToImage || '',
        publishedAt: row.publishedAt || '',
        source: row.source || '',
        url: row.newsUrl,
      })
    } else {
      openStory(row.storyId)
    }
  }

  const toggleNewsBookmark = (article) => {
    setNewsBookmarks(prev => {
      const has = prev.some(a => a.url === article.url)
      const next = has ? prev.filter(a => a.url !== article.url) : [{ title: article.title, description: article.description || '', urlToImage: article.urlToImage || '', publishedAt: article.publishedAt || '', source: article.source || '', url: article.url }, ...prev]
      save(LS.NEWS_BOOKMARKS, next)
      return next
    })
  }

  const goHome = () => navigate('/')
  const goPredictions = () => { setProfileOpen(false); navigate('/predictions') }
  const toggleDark = () => { const next = !darkMode; setDarkMode(next); save(LS.DARK, next); document.documentElement.classList.toggle('dark', next) }

  useEffect(() => {
    const dm = load(LS.DARK, false); setDarkMode(dm); document.documentElement.classList.toggle('dark', dm)
    setOnboarded(load(LS.ONBOARDED, false))
    setFollowedIds(load(LS.FOLLOWED, []))
    setUserAnswers(load(LS.ANSWERS, {}))
    setReadingHistory(load(LS.HISTORY, []))
    setSimulatedByStory(load(LS.SIMULATED, {}))
    setInterests(load(LS.INTERESTS, []))
    setAllFeedback(load(LS.FEEDBACK, []))
    setAnnotations(load(LS.ANNOTATIONS, {}))
    setBookmarks(load(LS.BOOKMARKS, []))
    setNewsBookmarks(load(LS.NEWS_BOOKMARKS, []))
    setStreak(updateStreak())
    setReady(true)
  }, [])

  // Load story threads from NewsAPI
  useEffect(() => {
    if (!ready || !onboarded) return
    let cancelled = false
    const loadStories = async () => {
      setStoriesLoading(true)
      setStoriesError('')
      try {
        const nextStories = await fetchDailyStories(interests)
        if (!cancelled) setStoriesData(nextStories)
      } catch (err) {
        if (cancelled) return
        setStoriesData(fallbackStories)
        const msg = err instanceof Error ? err.message : String(err)
        setStoriesError(`Unable to load fresh news right now. Showing saved demo stories instead. (${msg})`)
      } finally {
        if (!cancelled) setStoriesLoading(false)
      }
    }
    loadStories()
    return () => { cancelled = true }
  }, [ready, onboarded, interests])

  // Load live news headlines — proxied through Express server (caches 15 min, hides API key)
  useEffect(() => {
    if (!ready || !onboarded) return
    let cancelled = false
      ; (async () => {
        setNewsLoading(true)
        setNewsError(null)
        try {
          const params = new URLSearchParams()
          if (newsCategory) params.set('category', newsCategory)
          // newsRefreshTick > 0 means user clicked Refresh → bust the server cache
          if (newsRefreshTick > 0) params.set('bust', '1')
          const res = await fetch(`/api/news?${params}`)
          if (!res.ok) throw new Error(`Server error ${res.status}`)
          const data = await res.json()
          if (!data.success) throw new Error(data.error || 'Could not load headlines')
          if (!cancelled) setNewsArticles(data.articles || [])
        } catch (e) {
          if (!cancelled) setNewsError(e.message || 'Network error')
        } finally {
          if (!cancelled) setNewsLoading(false)
        }
      })()
    return () => { cancelled = true }
  }, [ready, onboarded, newsCategory, newsRefreshTick])

  useEffect(() => {
    if (!ready) return
    const dismissed = load(LS.NOTIFS, [])
    const pending = storiesData
      .filter(s => followedIds.includes(s.id) && !simulatedByStory[String(s.id)] && !dismissed.includes(s.id))
      .slice(0, 2)
      .map(s => ({ storyId: s.id, title: s.title }))
    setNotifs(pending)
  }, [ready, followedIds, simulatedByStory, storiesData])

  const finishOnboarding = chosen => { setInterests(chosen); save(LS.INTERESTS, chosen); setOnboarded(true); save(LS.ONBOARDED, true) }
  const restartOnboarding = () => {
    setProfileOpen(false); setHistoryOpen(false); setSearchQuery('')
    navigate('/'); setActiveTab('feed')
    setOnboarded(false); save(LS.ONBOARDED, false)
  }

  const toggleFollow = id => setFollowedIds(prev => { const next = prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]; save(LS.FOLLOWED, next); return next })
  const toggleBookmark = id => setBookmarks(prev => { const next = prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]; save(LS.BOOKMARKS, next); return next })
  const saveAnswer = (storyId, optIdx, optLabel) => setUserAnswers(prev => { const next = { ...prev, [String(storyId)]: { optionIndex: optIdx, optionLabel: optLabel, savedAt: Date.now() } }; save(LS.ANSWERS, next); return next })
  const revealSimulated = storyId => setSimulatedByStory(prev => { const next = { ...prev, [String(storyId)]: true }; save(LS.SIMULATED, next); return next })
  const submitFeedback = fb => setAllFeedback(prev => { const next = [...prev, fb]; save(LS.FEEDBACK, next); return next })
  const saveAnnotation = (storyId, eventIdx, text) => {
    const key = `${storyId}_${eventIdx}`
    setAnnotations(prev => { const next = { ...prev, [key]: text }; save(LS.ANNOTATIONS, next); return next })
  }
  const dismissNotif = storyId => {
    setNotifs(p => p.filter(n => n.storyId !== storyId))
    const dismissed = load(LS.NOTIFS, [])
    save(LS.NOTIFS, [...dismissed, storyId])
  }

  if (!ready) return <div className="fixed inset-0 flex items-center justify-center bg-white dark:bg-slate-950"><div className="w-7 h-7 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin" /></div>
  if (!onboarded) return <Onboarding onDone={finishOnboarding} />

  return (
    <div className="min-h-dvh bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white transition-colors">
      <Navbar
        onGoHome={goHome}
        onToggleProfile={() => { setProfileOpen(p => !p); setHistoryOpen(false) }}
        onToggleHistory={() => { setHistoryOpen(p => !p); setProfileOpen(false) }}
        profileOpen={profileOpen} historyOpen={historyOpen}
        darkMode={darkMode} onToggleDark={toggleDark}
        searchQuery={searchQuery} onSearch={q => { setSearchQuery(q); if (location.pathname !== '/') navigate('/') }}
        onFeedback={() => setFeedbackOpen(true)}
        streak={streak}
        notifCount={notifs.length}
        onSubscribe={() => setSubscribeOpen(true)}
      />

      <NotifBanner notifs={notifs} onDismiss={dismissNotif} onOpenStory={id => { dismissNotif(id); openStory(id) }} />

      {profileOpen && <ProfilePanel onClose={() => setProfileOpen(false)} followedIds={followedIds} readingHistory={readingHistory} interests={interests} allFeedback={allFeedback} streak={streak} onShowPredictions={goPredictions} />}
      {historyOpen && <HistoryDrawer items={readingHistory} onClose={() => setHistoryOpen(false)} onPick={pickFromHistory} />}
      {feedbackOpen && <FeedbackModal onClose={() => setFeedbackOpen(false)} onSubmit={submitFeedback} />}
      {subscribeOpen && <SubscribeModal onClose={() => setSubscribeOpen(false)} />}

      <div className="fixed bottom-5 right-5 z-30">
        <button onClick={restartOnboarding} className="rounded-full bg-slate-900/90 dark:bg-white/90 text-white dark:text-slate-900 px-4 py-2 text-xs font-bold shadow-lg border border-slate-800/20 dark:border-white/30 hover:opacity-95 transition">
          Re-pick topics
        </button>
      </div>

      <main className="pt-[54px]">
        <Routes>
          <Route path="/" element={
            <>
              {/* Feed mode toggle */}
              <div className="mx-auto max-w-3xl px-4 pt-4 pb-0">
                <div className="flex gap-2 mb-0">
                  {[['news', '📡 Live News'], ['threads', '🧵 Story Threads']].map(([mode, label]) => (
                    <button key={mode} onClick={() => setFeedMode(mode)} className={`rounded-full px-4 py-2 text-xs font-bold transition border ${feedMode === mode ? 'bg-indigo-600 text-white border-transparent' : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-indigo-300'}`}>
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {feedMode === 'news' ? (
                <NewsFeed
                  articles={newsArticles}
                  loading={newsLoading}
                  error={newsError}
                  searchQuery={searchQuery}
                  onOpen={openNewsArticle}
                  newsBookmarks={newsBookmarks}
                  onToggleBookmark={toggleNewsBookmark}
                  activeTab={activeTab}
                  onTabChange={setActiveTab}
                  newsCategory={newsCategory}
                  onNewsCategory={setNewsCategory}
                  onRefresh={() => setNewsRefreshTick(t => t + 1)}
                  refreshing={newsLoading && newsArticles.length > 0}
                  onSearchQuery={(w) => { setSearchQuery(w); if (location.pathname !== '/') navigate('/') }}
                />
              ) : (
                <>
                  {storiesError && <div className="mx-auto max-w-3xl px-4 pt-4"><div className="rounded-2xl border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/40 px-4 py-3 text-sm text-amber-800 dark:text-amber-300">{storiesError}</div></div>}
                  {storiesLoading ? (
                    <div className="mx-auto max-w-3xl px-4 py-24 text-center">
                      <div className="mx-auto w-8 h-8 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin" />
                      <p className="mt-4 text-sm text-slate-500 dark:text-slate-400">Loading your daily news feed...</p>
                    </div>
                  ) : (
                    <Feed stories={storiesData} followedIds={followedIds} readingHistory={readingHistory} onOpen={openStory} searchQuery={searchQuery} interests={interests} bookmarks={bookmarks} onToggleBookmark={toggleBookmark} activeTab={activeTab} onTabChange={setActiveTab} />
                  )}
                </>
              )}
            </>
          } />
          <Route path="/story/:storyId" element={
            <StoryView
              storiesData={[...storiesData, ...protoStories.filter(ps => !storiesData.some(s => s.id === ps.id))]}
              isFollowing={followedIds}
              onToggleFollow={toggleFollow}
              savedAnswer={userAnswers}
              onSaveAnswer={saveAnswer}
              showSimulatedUpdate={simulatedByStory}
              onSimulateUpdate={revealSimulated}
              onBack={goHome}
              onFeedback={() => setFeedbackOpen(true)}
              annotations={annotations}
              onSaveAnnotation={saveAnnotation}
              isBookmarked={bookmarks}
              onToggleBookmark={toggleBookmark}
            />
          } />
          <Route path="/predictions" element={
            storiesLoading ? (
              <div className="mx-auto max-w-3xl px-4 py-24 text-center">
                <div className="mx-auto w-8 h-8 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin" />
              </div>
            ) : (
              <PredictionsScreen stories={[...storiesData, ...protoStories.filter(ps => !storiesData.some(s => s.id === ps.id))]} userAnswers={userAnswers} simulatedByStory={simulatedByStory} onOpenStory={openStory} onBack={goHome} />
            )
          } />
          <Route path="*" element={<div className="py-24 text-center"><p className="text-slate-500">Wait a moment while we find that page...</p><button onClick={goHome} className="mt-4 text-indigo-500 font-bold">Go to Feed</button></div>} />
        </Routes>
      </main>
    </div>
  )
}

export default function App() {
  return (
    <AppContent />
  )
}
