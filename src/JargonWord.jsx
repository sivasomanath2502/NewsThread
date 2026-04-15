import { useState, useEffect, useCallback, useRef } from 'react'
import { JARGON_GLOSSARY } from './glossary.js'

const LS_KEY = 'nt_jargon_meanings'

function readCache() {
  try {
    const raw = localStorage.getItem(LS_KEY)
    if (!raw) return {}
    const p = JSON.parse(raw)
    return typeof p === 'object' && p !== null ? p : {}
  } catch {
    return {}
  }
}

function writeCacheEntry(key, meaning) {
  try {
    const cur = readCache()
    cur[key] = meaning
    localStorage.setItem(LS_KEY, JSON.stringify(cur))
  } catch {
    /* ignore quota */
  }
}

function getCachedMeaning(key) {
  const g = JARGON_GLOSSARY[key]
  if (g) return g
  return readCache()[key] ?? null
}

/** Shorten dictionary text to ~1–2 lines for reading comfort */
function simplifyDefinition(text) {
  if (!text) return ''
  const t = text.trim()
  const max = 220
  if (t.length <= max) return t
  const cut = t.slice(0, max)
  const lastPeriod = cut.lastIndexOf('.')
  if (lastPeriod > 80) return cut.slice(0, lastPeriod + 1)
  return `${cut.trim()}…`
}

async function fetchDictionaryMeaning(lookupKey) {
  const url = `https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(lookupKey)}`
  const res = await fetch(url)
  if (!res.ok) throw new Error('lookup failed')
  const data = await res.json()
  const entry = Array.isArray(data) ? data[0] : null
  if (!entry?.meanings?.length) throw new Error('no definitions')
  for (const m of entry.meanings) {
    for (const d of m.definitions ?? []) {
      if (d.definition) return simplifyDefinition(d.definition)
    }
  }
  throw new Error('no definition text')
}

/**
 * Hoverable term with tooltip: glossary → localStorage → Free Dictionary API.
 * @param {{ word: string, lookup?: string }} props — `lookup` overrides API/glossary key (e.g. acronym → full term)
 */
export function JargonWord({ word, lookup }) {
  const key = (lookup ?? word).toLowerCase().trim()
  const display = word

  const [open, setOpen] = useState(false)
  const [meaning, setMeaning] = useState(() => getCachedMeaning(key))
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(false)
  const leaveTimer = useRef(null)

  useEffect(() => {
    setMeaning(getCachedMeaning(key))
    setError(false)
    setLoading(false)
    setOpen(false)
  }, [key])

  useEffect(() => {
    return () => {
      if (leaveTimer.current) clearTimeout(leaveTimer.current)
    }
  }, [])

  const ensureMeaning = useCallback(async () => {
    const cached = getCachedMeaning(key)
    if (cached) {
      setMeaning(cached)
      setError(false)
      return
    }
    setLoading(true)
    setError(false)
    try {
      const text = await fetchDictionaryMeaning(key)
      writeCacheEntry(key, text)
      setMeaning(text)
    } catch {
      setMeaning(null)
      setError(true)
    } finally {
      setLoading(false)
    }
  }, [key])

  const onEnter = () => {
    if (leaveTimer.current) {
      clearTimeout(leaveTimer.current)
      leaveTimer.current = null
    }
    setOpen(true)
    if (!getCachedMeaning(key)) void ensureMeaning()
    else setMeaning(getCachedMeaning(key))
  }

  const onLeave = () => {
    leaveTimer.current = setTimeout(() => {
      setOpen(false)
      leaveTimer.current = null
    }, 100)
  }

  const showText = error
    ? 'Simple explanation not available'
    : loading && !meaning
      ? '…'
      : meaning || 'Simple explanation not available'

  return (
    <span
      className="relative inline cursor-help border-b border-dotted border-indigo-400/80 dark:border-indigo-500/80 text-indigo-800 dark:text-indigo-300 font-medium"
      onMouseEnter={onEnter}
      onMouseLeave={onLeave}
    >
      {display}
      {open && (
        <span
          role="tooltip"
          className="pointer-events-none absolute left-1/2 bottom-[calc(100%+8px)] z-[60] w-[min(240px,calc(100vw-2rem))] -translate-x-1/2 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-left text-[12px] leading-snug text-slate-700 shadow-lg dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200"
          style={{ boxShadow: '0 10px 25px -5px rgb(0 0 0 / 0.12)' }}
        >
          <span className="block font-semibold text-slate-900 dark:text-white">{display}</span>
          <span className="mt-1 block font-normal text-slate-600 dark:text-slate-300">{showText}</span>
          <span className="absolute left-1/2 top-full -translate-x-1/2 -mt-px h-2 w-2 rotate-45 border-b border-r border-slate-200 bg-white dark:border-slate-600 dark:bg-slate-800" aria-hidden />
        </span>
      )}
    </span>
  )
}
