import { useMemo, useState } from 'react'

const API = 'https://api.dictionaryapi.dev/api/v2/entries/en/'
const cache = new Map()
const JARGON_TERMS = new Set([
  'inflation', 'deflation', 'liquidity', 'volatility', 'derivatives', 'yield', 'benchmark', 'repo',
  'geopolitical', 'sanctions', 'compliance', 'regulatory', 'governance', 'mandate', 'legislation',
  'algorithm', 'neural', 'inference', 'latency', 'bandwidth', 'cybersecurity', 'blockchain',
  'emissions', 'decarbonization', 'renewable', 'mitigation', 'adaptation', 'biodiversity',
  'genomics', 'epidemiology', 'pathogen', 'clinical', 'diagnostics', 'biotech',
  'infrastructure', 'congestion', 'augmentation', 'reservoir', 'transit', 'urbanization',
  'constellation', 'orbital', 'satellite', 'payload', 'trajectory', 'debris',
])

function isCandidate(word) {
  const w = word.toLowerCase()
  if (!/^[a-z-]{4,}$/.test(w)) return false
  if (JARGON_TERMS.has(w)) return true
  // Match common jargon morphology, but avoid plain words.
  return /(tion|sion|metry|nomics|graphy|phasic|genic|morphic|dynamic|kinetic|ization|isation)$/.test(w)
}

async function fetchMeaning(word) {
  const key = word.toLowerCase()
  if (cache.has(key)) return cache.get(key)

  try {
    const res = await fetch(`${API}${encodeURIComponent(key)}`)
    if (!res.ok) throw new Error('not-found')
    const data = await res.json()
    const def = data?.[0]?.meanings?.[0]?.definitions?.[0]?.definition
    const value = def ? String(def) : 'No definition found.'
    cache.set(key, value)
    return value
  } catch {
    const value = 'No definition found.'
    cache.set(key, value)
    return value
  }
}

export default function JargonText({ text, className = '' }) {
  const [definitions, setDefinitions] = useState({})
  const tokens = useMemo(() => String(text || '').split(/(\s+)/), [text])
  const onHover = async (token) => {
    const clean = token.replace(/[^A-Za-z]/g, '')
    if (!isCandidate(clean)) return
    const key = clean.toLowerCase()
    if (definitions[key]) return
    const meaning = await fetchMeaning(clean)
    setDefinitions((prev) => ({ ...prev, [key]: meaning }))
  }

  return (
    <span className={className}>
      {tokens.map((token, idx) => {
        const clean = token.replace(/[^A-Za-z]/g, '')
        const key = clean.toLowerCase()
        if (!isCandidate(clean)) return <span key={`${token}-${idx}`}>{token}</span>

        return (
          <span
            key={`${token}-${idx}`}
            onMouseEnter={() => onHover(token)}
            title={definitions[key] || 'Fetching meaning...'}
            className="underline decoration-dotted underline-offset-4 decoration-slate-300 dark:decoration-slate-600"
          >
            {token}
          </span>
        )
      })}
    </span>
  )
}
