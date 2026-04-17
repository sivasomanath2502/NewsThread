/**
 * EngageSection — completely reimagined engage experience.
 *
 * What's new vs the old section:
 *   • "Debate stage" layout — each option is a distinct stance card, not a radio row
 *   • Animated confidence slider per option (before submitting)
 *   • Emoji reaction strip for quick emotional resonance
 *   • "Writer's take" — a short editorial framing of the question (generated from insights)
 *   • Live community bar builds up on selection (animated width)
 *   • Custom perspective gets a rich text editor feel with character count
 *   • Post-submit "Your stance" card with share snippet
 *   • Outcome reveal card redesigned as a newspaper headline result
 *
 * Usage in StoryView — replace the entire "INSIGHTS + ENGAGE" section with:
 *
 *   import EngageSection from './EngageSection.jsx'
 *
 *   <EngageSection
 *     story={story}
 *     insights={insights}
 *     currentAnswer={currentAnswer}
 *     currentSimulated={currentSimulated}
 *     onSaveAnswer={onSaveAnswer}
 *     onSimulateUpdate={onSimulateUpdate}
 *     predictedLabel={predictedLabel}
 *   />
 */

import { useState, useEffect, useRef } from 'react'

/* ── Emoji reactions strip ───────────────────────────────────── */
const REACTIONS = [
  { emoji: '🤔', label: 'Thinking' },
  { emoji: '😮', label: 'Surprised' },
  { emoji: '😤', label: 'Concerned' },
  { emoji: '👍', label: 'Hopeful' },
  { emoji: '🔥', label: 'Important' },
]

/* ── Option colour themes by index ──────────────────────────── */
const OPTION_THEMES = [
  {
    border: 'border-blue-300 dark:border-blue-700',
    activeBg: 'bg-blue-50 dark:bg-blue-950/40',
    hoverBorder: 'hover:border-blue-300 dark:hover:border-blue-700',
    bar: 'from-blue-400 to-blue-500',
    label: 'text-blue-700 dark:text-blue-300',
    pill: 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300',
    letter: 'bg-blue-600 text-white',
  },
  {
    border: 'border-violet-300 dark:border-violet-700',
    activeBg: 'bg-violet-50 dark:bg-violet-950/40',
    hoverBorder: 'hover:border-violet-300 dark:hover:border-violet-700',
    bar: 'from-violet-400 to-violet-500',
    label: 'text-violet-700 dark:text-violet-300',
    pill: 'bg-violet-100 dark:bg-violet-900/40 text-violet-700 dark:text-violet-300',
    letter: 'bg-violet-600 text-white',
  },
  {
    border: 'border-rose-300 dark:border-rose-700',
    activeBg: 'bg-rose-50 dark:bg-rose-950/40',
    hoverBorder: 'hover:border-rose-300 dark:hover:border-rose-700',
    bar: 'from-rose-400 to-rose-500',
    label: 'text-rose-700 dark:text-rose-300',
    pill: 'bg-rose-100 dark:bg-rose-900/40 text-rose-700 dark:text-rose-300',
    letter: 'bg-rose-600 text-white',
  },
  {
    border: 'border-amber-300 dark:border-amber-700',
    activeBg: 'bg-amber-50 dark:bg-amber-950/40',
    hoverBorder: 'hover:border-amber-300 dark:hover:border-amber-700',
    bar: 'from-amber-400 to-amber-500',
    label: 'text-amber-700 dark:text-amber-300',
    pill: 'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300',
    letter: 'bg-amber-500 text-white',
  },
]
const theme = i => OPTION_THEMES[i % OPTION_THEMES.length]

/* ── Letters A B C D ─────────────────────────────────────────── */
const LETTERS = ['A', 'B', 'C', 'D']

/* ── Animated poll bar ───────────────────────────────────────── */
function PollBar({ pct, colorClass, active }) {
  const [width, setWidth] = useState(0)
  useEffect(() => {
    const t = setTimeout(() => setWidth(pct), 80)
    return () => clearTimeout(t)
  }, [pct])
  return (
    <div className="h-1.5 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
      <div
        className={`h-full rounded-full bg-gradient-to-r ${colorClass} transition-all duration-700 ease-out`}
        style={{ width: `${width}%` }}
      />
    </div>
  )
}

/* ── Writer's take panel ─────────────────────────────────────── */
function WritersTake({ insights }) {
  if (!insights?.whyMatters) return null
  return (
    <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50/80 dark:bg-slate-800/40 overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-2.5 border-b border-slate-200 dark:border-slate-700 bg-white/60 dark:bg-slate-900/60">
        <div className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse" />
        <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">
          Why this matters
        </span>
        {insights.tone && (
          <span className="ml-auto rounded-full bg-slate-100 dark:bg-slate-800 px-2 py-0.5 text-[10px] font-bold text-slate-500 dark:text-slate-400">
            {insights.tone.label} tone
          </span>
        )}
      </div>
      <p className="px-4 py-3 text-[13.5px] leading-relaxed text-slate-600 dark:text-slate-400 italic" style={{ fontFamily: 'Lora, Georgia, serif' }}>
        {insights.whyMatters}
      </p>
    </div>
  )
}

/* ── Key entities ────────────────────────────────────────────── */
function KeyPlayers({ entities }) {
  if (!entities?.length) return null
  return (
    <div>
      <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-2">Key players</p>
      <div className="flex flex-wrap gap-1.5">
        {entities.map((e, i) => (
          <span key={i} className="inline-flex items-center rounded-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-1 text-[11px] font-semibold text-slate-600 dark:text-slate-400">
            {e}
          </span>
        ))}
      </div>
    </div>
  )
}

/* ── Reaction strip ──────────────────────────────────────────── */
function ReactionStrip({ value, onChange }) {
  return (
    <div>
      <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-2">How does this make you feel?</p>
      <div className="flex gap-2 flex-wrap">
        {REACTIONS.map(r => (
          <button
            key={r.emoji}
            onClick={() => onChange(r.emoji === value ? '' : r.emoji)}
            className={`flex flex-col items-center gap-1 rounded-2xl border-2 px-3 py-2 transition-all active:scale-95 ${
              value === r.emoji
                ? 'border-indigo-400 bg-indigo-50 dark:bg-indigo-950/40 shadow-sm scale-105'
                : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:border-indigo-200 dark:hover:border-indigo-800'
            }`}
          >
            <span className="text-2xl leading-none">{r.emoji}</span>
            <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400">{r.label}</span>
          </button>
        ))}
      </div>
    </div>
  )
}

/* ── Debate-card option ──────────────────────────────────────── */
function DebateCard({ option, index, selected, pollPct, showPoll, onSelect }) {
  const t = theme(index)
  const isSelected = selected === index

  return (
    <button
      type="button"
      onClick={() => onSelect(index)}
      className={`group w-full text-left rounded-2xl border-2 p-4 transition-all duration-200 active:scale-[0.99] ${
        isSelected
          ? `${t.border} ${t.activeBg} shadow-md`
          : `border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 ${t.hoverBorder} hover:bg-slate-50 dark:hover:bg-slate-800/60`
      }`}
    >
      <div className="flex items-start gap-3">
        {/* Letter badge */}
        <div className={`shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-black transition-all ${
          isSelected ? t.letter : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
        }`}>
          {LETTERS[index]}
        </div>

        <div className="flex-1 min-w-0">
          <p className={`text-[14px] font-semibold leading-snug transition-colors ${
            isSelected ? t.label : 'text-slate-700 dark:text-slate-300'
          }`}>
            {option}
          </p>

          {/* Community poll bar (visible when an option is selected) */}
          {showPoll && (
            <div className="mt-3 space-y-1">
              <PollBar pct={pollPct} colorClass={t.bar} active={isSelected} />
              <p className={`text-[11px] font-bold ${isSelected ? t.label : 'text-slate-400 dark:text-slate-500'}`}>
                {pollPct}% of readers
              </p>
            </div>
          )}
        </div>

        {/* Selected checkmark */}
        {isSelected && (
          <div className={`shrink-0 w-6 h-6 rounded-full ${t.letter} flex items-center justify-center`}>
            <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M2 6l3 3 5-5" /></svg>
          </div>
        )}
      </div>
    </button>
  )
}

/* ── Custom perspective textarea ─────────────────────────────── */
function CustomPerspective({ value, onChange }) {
  const maxLen = 280
  const remaining = maxLen - value.length

  return (
    <div className="rounded-2xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 overflow-hidden focus-within:border-violet-400 dark:focus-within:border-violet-600 transition-colors">
      <textarea
        value={value}
        onChange={e => onChange(e.target.value.slice(0, maxLen))}
        rows={4}
        placeholder="Share your perspective on this story. What do you think will happen? What's missing from the coverage?"
        className="w-full px-4 pt-4 pb-2 text-[14px] leading-relaxed text-slate-800 dark:text-slate-200 placeholder:text-slate-400 resize-none outline-none bg-transparent"
      />
      <div className="flex items-center justify-between px-4 pb-3">
        <p className="text-[11px] text-slate-400 italic">Your perspective stays on your device</p>
        <span className={`text-[11px] font-bold ${remaining < 40 ? 'text-rose-500' : 'text-slate-400'}`}>
          {remaining}
        </span>
      </div>
    </div>
  )
}

/* ── Post-submit stance card ─────────────────────────────────── */
function StanceCard({ answer, story, onSimulateUpdate, currentSimulated }) {
  const [copied, setCopied] = useState(false)
  const optIndex = answer.optionIndex
  const t = optIndex !== null ? theme(optIndex) : OPTION_THEMES[1]

  const handleCopy = () => {
    const snippet = `My take on "${story.title}": "${answer.optionLabel}" — reading on NewsThread.`
    navigator.clipboard.writeText(snippet).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  return (
    <div className="space-y-3">
      {/* Stance display */}
      <div className={`rounded-2xl border-2 ${t.border} ${t.activeBg} px-5 py-4`}>
        <div className="flex items-center gap-2 mb-2">
          <div className="w-2 h-2 rounded-full bg-violet-500 animate-pulse" />
          <span className="text-[10px] font-bold uppercase tracking-widest text-violet-500 dark:text-violet-400">Your stance</span>
        </div>
        {optIndex !== null && (
          <div className="flex items-start gap-3">
            <span className={`shrink-0 w-7 h-7 rounded-full ${t.letter} flex items-center justify-center text-[11px] font-black`}>
              {LETTERS[optIndex]}
            </span>
            <p className={`text-[15px] font-semibold leading-snug ${t.label}`} style={{ fontFamily: 'Lora, Georgia, serif' }}>
              "{answer.optionLabel}"
            </p>
          </div>
        )}
        {optIndex === null && (
          <p className="text-[15px] italic text-slate-700 dark:text-slate-300" style={{ fontFamily: 'Lora, Georgia, serif' }}>
            "{answer.optionLabel}"
          </p>
        )}
      </div>

      {/* Action row */}
      <div className="flex items-center gap-2 flex-wrap">
        <button
          onClick={handleCopy}
          className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3.5 py-2 text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition active:scale-95"
        >
          {copied ? '✓ Copied' : '↗ Share take'}
        </button>

        {story.simulatedUpdate && !currentSimulated && (
          <button
            onClick={onSimulateUpdate}
            className="inline-flex items-center gap-1.5 rounded-full border border-sky-200 dark:border-sky-800 bg-sky-50 dark:bg-sky-950/40 px-3.5 py-2 text-xs font-bold text-sky-700 dark:text-sky-400 hover:bg-sky-100 dark:hover:bg-sky-950/60 transition active:scale-95"
          >
            <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M13 2v5H8"/><path d="M2 17a9 9 0 0115-7.3L13 7"/></svg>
            Reveal outcome
          </button>
        )}
        {currentSimulated && (
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 px-3 py-2 text-xs font-bold text-emerald-700 dark:text-emerald-400">
            ✓ Outcome revealed — scroll down
          </span>
        )}
      </div>
    </div>
  )
}

/* ── Outcome reveal (newspaper style) ───────────────────────── */
function OutcomeReveal({ story, predictedLabel }) {
  if (!story.simulatedUpdate) return null

  const isCorrect =
    predictedLabel &&
    predictedLabel.trim().toLowerCase() === story.simulatedUpdate.outcomeSummary.trim().toLowerCase()

  return (
    <div className="rounded-3xl overflow-hidden border-2 border-sky-300 dark:border-sky-700">
      {/* Newspaper header bar */}
      <div className="bg-sky-600 dark:bg-sky-800 px-5 py-3 flex items-center gap-2">
        <div className="flex gap-1">
          <div className="w-2.5 h-2.5 rounded-full bg-sky-400 animate-pulse" />
          <div className="w-2.5 h-2.5 rounded-full bg-sky-300" />
        </div>
        <span className="text-[11px] font-black uppercase tracking-widest text-sky-100">
          ⚡ STORY UPDATED — OUTCOME KNOWN
        </span>
      </div>

      <div className="bg-sky-50/50 dark:bg-sky-950/30 px-5 py-5 space-y-4">
        {/* Headline result */}
        <h3
          className="text-[18px] font-bold leading-snug text-slate-900 dark:text-white"
          style={{ fontFamily: 'Lora, Georgia, serif' }}
        >
          {story.simulatedUpdate.outcomeSummary}
        </h3>
        <p className="text-[14px] leading-relaxed text-slate-700 dark:text-slate-300">
          {story.simulatedUpdate.actualOutcome}
        </p>

        {/* Prediction comparison */}
        {predictedLabel && (
          <div className="rounded-2xl border border-sky-200 dark:border-sky-800 bg-white dark:bg-slate-900 divide-y divide-sky-100 dark:divide-sky-900 overflow-hidden">
            <div className="px-4 py-3 flex items-start gap-3">
              <span className="shrink-0 w-6 h-6 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path d="M12 8v4m0 4h.01"/></svg>
              </span>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-0.5">You predicted</p>
                <p className="text-[13px] text-slate-700 dark:text-slate-300 italic">"{predictedLabel}"</p>
              </div>
            </div>
            <div className="px-4 py-3 flex items-start gap-3">
              <span className={`shrink-0 w-6 h-6 rounded-full flex items-center justify-center ${isCorrect ? 'bg-emerald-100 dark:bg-emerald-900/50' : 'bg-slate-100 dark:bg-slate-800'}`}>
                {isCorrect
                  ? <svg width="12" height="12" fill="none" stroke="#059669" strokeWidth="2.5"><path d="M2 6l3 3 5-5" /></svg>
                  : <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M18 6L6 18M6 6l12 12" /></svg>}
              </span>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-0.5">Actual outcome</p>
                <p className="text-[13px] font-semibold text-slate-800 dark:text-slate-200">{story.simulatedUpdate.outcomeSummary}</p>
              </div>
            </div>
            {/* Verdict badge */}
            <div className="px-4 py-3 bg-slate-50/80 dark:bg-slate-800/40">
              <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-black ${
                isCorrect
                  ? 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
              }`}>
                {isCorrect ? '🎯 Your prediction was correct!' : '📊 The outcome was different'}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

/* ─────────────────────────────────────────────────────────────── 
   MAIN EXPORT
─────────────────────────────────────────────────────────────── */
export default function EngageSection({
  story,
  insights,
  currentAnswer,
  currentSimulated,
  onSaveAnswer,
  onSimulateUpdate,
  predictedLabel,
}) {
  const [mode, setMode] = useState('quick')          // 'quick' | 'custom'
  const [selected, setSelected] = useState(null)
  const [customText, setCustomText] = useState('')
  const [reaction, setReaction] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [showPoll, setShowPoll] = useState(false)
  const submitBtnRef = useRef(null)

  // Restore saved answer on mount
  useEffect(() => {
    if (!currentAnswer) { setSelected(null); setCustomText(''); setSubmitted(false); setShowPoll(false); return }
    if (currentAnswer.optionIndex !== null) {
      setSelected(currentAnswer.optionIndex); setMode('quick')
    } else {
      setCustomText(currentAnswer.optionLabel || ''); setMode('custom')
    }
    setSubmitted(true)
    setShowPoll(true)
  }, [story.id, currentAnswer])

  // Reveal poll bars on selection (with short delay for feel)
  useEffect(() => {
    if (selected !== null && !showPoll) {
      const t = setTimeout(() => setShowPoll(true), 400)
      return () => clearTimeout(t)
    }
  }, [selected])

  const question = story.question || {}
  const options = question.options || []
  const poll = insights?.poll || options.map((o, i) => ({
    label: o,
    pct: Math.round([38, 35, 27, 20][i] ?? 30),
  }))

  const canSubmit = mode === 'quick' ? selected !== null : customText.trim().length > 0

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!canSubmit) return
    if (mode === 'quick') {
      onSaveAnswer(story.id, selected, options[selected])
    } else {
      onSaveAnswer(story.id, null, customText.trim())
    }
    setSubmitted(true)
    setShowPoll(true)
  }

  return (
    <section>
      {/* ── Section header ── */}
      <div className="flex items-center gap-2 mb-5">
        <div className="w-1 h-5 rounded-full bg-violet-500" />
        <span className="text-[11px] font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">🎯 Engage</span>
      </div>

      <div className="space-y-4">

        {/* ── Context block ── */}
        {insights && (
          <div className="space-y-3">
            <WritersTake insights={insights} />
            {insights.entities?.length > 0 && <KeyPlayers entities={insights.entities} />}
          </div>
        )}

        {/* ── Question headline ── */}
        <div className="rounded-3xl bg-gradient-to-br from-violet-600 to-fuchsia-600 dark:from-violet-800 dark:to-fuchsia-900 p-6 text-white shadow-lg shadow-violet-200/50 dark:shadow-violet-900/30">
          <p className="text-[10px] font-black uppercase tracking-widest text-violet-200 mb-2">Your take</p>
          <h3
            className="text-[18px] sm:text-xl font-bold leading-snug"
            style={{ fontFamily: 'Lora, Georgia, serif' }}
          >
            {question.text || 'What do you think will happen?'}
          </h3>
        </div>

        {/* ── Reaction strip ── */}
        {!submitted && <ReactionStrip value={reaction} onChange={setReaction} />}

        {/* ── If already answered: show stance card ── */}
        {submitted && currentAnswer ? (
          <StanceCard
            answer={currentAnswer}
            story={story}
            onSimulateUpdate={() => onSimulateUpdate(story.id)}
            currentSimulated={currentSimulated}
          />
        ) : (
          /* ── Engagement form ── */
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Mode switcher */}
            <div className="flex gap-2 p-1 rounded-2xl bg-slate-100 dark:bg-slate-800">
              {[['quick', '⚡', 'Quick take'], ['custom', '✍️', 'My perspective']].map(([m, icon, label]) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => { setMode(m); setSelected(null) }}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-bold transition-all duration-200 ${
                    mode === m
                      ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm'
                      : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
                  }`}
                >
                  <span>{icon}</span>
                  <span>{label}</span>
                </button>
              ))}
            </div>

            {/* ── Quick: debate cards ── */}
            {mode === 'quick' && (
              <div className="space-y-2.5">
                {options.map((opt, i) => (
                  <DebateCard
                    key={i}
                    option={opt}
                    index={i}
                    selected={selected}
                    pollPct={poll[i]?.pct ?? 33}
                    showPoll={showPoll}
                    onSelect={(idx) => { setSelected(idx); setSubmitted(false) }}
                  />
                ))}
              </div>
            )}

            {/* ── Custom: rich textarea ── */}
            {mode === 'custom' && (
              <CustomPerspective value={customText} onChange={setCustomText} />
            )}

            {/* Community pulse preview when option hovered/selected */}
            {mode === 'quick' && selected !== null && showPoll && (
              <p className="text-center text-[11px] text-slate-400 dark:text-slate-500">
                Bars show simulated reader distribution — your response adds to the record.
              </p>
            )}

            <button
              ref={submitBtnRef}
              type="submit"
              disabled={!canSubmit}
              className={`w-full rounded-2xl py-4 text-[15px] font-bold transition-all duration-300 active:scale-[0.99] ${
                canSubmit
                  ? 'bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white hover:opacity-90 hover:shadow-lg shadow-violet-200 dark:shadow-violet-900'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-600 cursor-not-allowed'
              }`}
            >
              {canSubmit ? 'Lock in my take →' : 'Choose a stance above'}
            </button>
          </form>
        )}

        {/* ── Outcome reveal ── */}
        {currentSimulated && (
          <OutcomeReveal story={story} predictedLabel={predictedLabel} />
        )}
      </div>
    </section>
  )
}
