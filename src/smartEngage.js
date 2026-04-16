/**
 * Smart Engage — generates article-specific questions & contextual insights.
 *
 * Instead of generic "What happens next?" the system:
 * 1. Extracts the core subject from the headline
 * 2. Detects the action/event type (launch, crisis, ruling, etc.)
 * 3. Generates a question that references the specific article
 * 4. Builds contextual insight cards (key facts, why-it-matters, community pulse)
 */

/* ─── Stop words to filter when extracting subject ────────────────── */
const STOP = new Set([
  'the','a','an','and','or','to','of','in','on','for','with','as','at','by','from',
  'is','are','was','were','be','been','being','it','its','this','that','these','those',
  'has','have','had','will','would','could','should','may','might','can','do','does','did',
  'not','no','but','if','so','than','very','just','now','also','after','before','over',
  'into','out','up','down','about','above','below','between','through','during','while',
  'new','says','said','report','reports','according','amid','more','most','some','all',
  'first','last','next','other','many','much','every','each','still','even','how','what',
  'when','where','why','who','which','their','they','them','its','our','your','his','her',
  'he','she','we','you','i','my','me','us','been','get','gets','got','going','go',
  'make','makes','made','take','takes','took','come','comes','came','year','years',
  'day','days','time','way','back','set','big','top','two','three','four','five',
  'among','against','here','there','then','only','ahead',
])

/* ─── Extract meaningful subject phrases from headline ────────────── */
function extractSubject(title) {
  // Remove source suffix like " - Reuters", " | BBC"
  const clean = (title || '')
    .replace(/\s*[-–—|]\s*[^-–—|]{2,30}$/, '')
    .replace(/^breaking:\s*/i, '')
    .replace(/^exclusive:\s*/i, '')
    .replace(/^update:\s*/i, '')
    .trim()

  // Get significant words
  const words = clean.split(/\s+/).filter(w => {
    const low = w.toLowerCase().replace(/[^a-z]/g, '')
    return low.length >= 3 && !STOP.has(low)
  })

  // Return cleaned short title (max 8 words for readability)
  if (words.length <= 8) return clean
  return words.slice(0, 8).join(' ')
}

/* ─── Detect news action type from content ────────────────────────── */
const ACTION_PATTERNS = [
  { type: 'policy',    rx: /\b(policy|regulation|bill|law|reform|mandate|mandatory|guideline|framework|approve|toll|fine|penalty|compulsory|rule|compliance|norms?|directive|notification|gazette|ordinance|amend|ratif)/i },
  { type: 'launch',    rx: /\b(launch|unveil|introduce|announce|roll.?out|debut|release|inaugurate|flag.?off|kick.?off|commence|begins|opens)\b/i },
  { type: 'crisis',    rx: /\b(crisis|emergency|disaster|collapse|crash|surge|spike|outbreak|shortage|devastat|catastroph|worsen|alarm|critical|severe|acute)\b/i },
  { type: 'ruling',    rx: /\b(court|ruling|verdict|judge|supreme|ban|struck.?down|upheld|overturn|plea|hearing|tribunal|bench|petition|acquit|convict|sentence)\b/i },
  { type: 'deal',      rx: /\b(deal|acquisition|merger|partnership|agreement|alliance|contract|invest|ipo|valuation|funding|stake|buyout|takeover|joint.?venture)\b/i },
  { type: 'conflict',  rx: /\b(war|conflict|attack|strike|tension|clash|protest|sanction|ceasefire|military|troops|bomb|shell|drone|raid|clampdown|crackdown)\b/i },
  { type: 'discovery', rx: /\b(discover|breakthrough|study.?finds|research|scientist|evidence|reveal|found.?that|shows.?that|confirms|gene|molecule|fossil)\b/i },
  { type: 'election',  rx: /\b(election|vote|poll|ballot|campaign|candidate|party.?wins|coalition|sworn.?in|inaugurat|landslide|seat|constituency|exit.?poll)\b/i },
  { type: 'record',    rx: /\b(record|all.?time|historic|milestone|surpass|peak|highest|lowest|broke|first.?ever|unprecedented|biggest|largest|fastest)\b/i },
  { type: 'scandal',   rx: /\b(scandal|scam|fraud|corruption|allegation|investigate|probe|arrest|accused|charge|indictment|suspend|dismiss|sack|complaint)\b/i },
  { type: 'health',    rx: /\b(health|disease|virus|vaccine|hospital|patient|treatment|drug|mental|doctor|medical|cancer|diet|fitness|wellbeing|surgery|WHO|ICMR)\b/i },
  { type: 'tech',      rx: /\b(ai|artificial.?intelligence|robot|chip|semiconductor|software|cyber|hack|automation|algorithm|machine.?learn|deep.?learn|startup|app|digital|5g|quantum)\b/i },
  { type: 'climate',   rx: /\b(climate|flood|drought|heatwave|cyclone|emission|carbon|wildfire|pollution|deforest|glacier|sea.?level|renewable|solar|wind.?energy|EV|electric.?vehicle)\b/i },
  { type: 'market',    rx: /\b(market|stock|share|sensex|nifty|rally|bull|bear|gdp|inflation|rbi|interest.?rate|forex|rupee|dollar|bond|yield|index|bse|nse|dow|nasdaq)\b/i },
  { type: 'sport',     rx: /\b(cricket|ipl|match|goal|final|championship|medal|olympic|world.?cup|tournament|wicket|runs|batting|bowling|football|soccer|tennis|f1|grand.?prix)\b/i },
  { type: 'space',     rx: /\b(space|nasa|isro|satellite|rocket|orbit|mars|moon|asteroid|mission|astronaut|cosmonaut|telescope|earth.?observation)\b/i },
  { type: 'education', rx: /\b(education|university|student|school|exam|college|campus|teacher|syllabus|admission|CBSE|ICSE|NEET|JEE|UGC|scholarship|degree|curriculum)\b/i },
  { type: 'transport', rx: /\b(rail|train|metro|bus|highway|airport|flight|airline|traffic|road|bridge|port|ship|logistics|freight|commut|transit|vehicle|overload)\b/i },
]

function detectAction(text) {
  const lower = (text || '').toLowerCase()
  for (const p of ACTION_PATTERNS) {
    if (p.rx.test(lower)) return p.type
  }
  return 'general'
}

/* ─── Extract numbers & key facts from article text ───────────────── */
function extractKeyFacts(title, description, content) {
  const all = `${title || ''} ${description || ''} ${content || ''}`
  const facts = []

  // Numbers with context (percentages, currency, counts)
  const numPatterns = [
    { rx: /(\d[\d,.]*\s*%)/g, label: 'percentage' },
    { rx: /((?:₹|Rs\.?|INR|\$|USD|€|£)\s*[\d,.]+\s*(?:crore|lakh|billion|million|trillion|thousand|bn|mn|cr|lk)?)/gi, label: 'amount' },
    { rx: /(\d[\d,.]+\s+(?:people|users|students|patients|workers|employees|deaths|cases|units|vehicles|tonnes|km|miles))/gi, label: 'count' },
    { rx: /(\d[\d,.]*\s*(?:times|x)\s+(?:the|more|less|higher|lower|faster|slower)?)/gi, label: 'multiplier' },
  ]

  for (const {rx, label} of numPatterns) {
    const matches = all.match(rx) || []
    for (const m of matches.slice(0, 2)) {
      // Get surrounding context (grab the sentence containing the number)
      const idx = all.indexOf(m)
      const start = Math.max(0, all.lastIndexOf('.', idx) + 1)
      const end = all.indexOf('.', idx + m.length)
      const sentence = all.slice(start, end > 0 ? end + 1 : undefined).trim().slice(0, 120)
      if (sentence.length > 20) {
        facts.push({ type: label, value: m.trim(), context: sentence })
      }
    }
  }

  // Named entities (capitalized multi-word phrases)
  const entities = []
  const entityRx = /([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)/g
  let em
  while ((em = entityRx.exec(title || '')) !== null) {
    if (em[1].length > 4 && !STOP.has(em[1].toLowerCase())) {
      entities.push(em[1])
    }
  }

  return { facts: facts.slice(0, 3), entities: entities.slice(0, 3) }
}

/* ─── Generate article-specific question ──────────────────────────── */

const QUESTION_TEMPLATES = {
  launch: {
    q: (subj) => `"${subj}" — will this succeed or stumble?`,
    opts: () => [
      'Strong launch — real impact expected',
      'Mixed results — promising but challenges ahead',
      'Likely overshadowed or abandoned',
    ],
  },
  crisis: {
    q: (subj) => `How will the situation around "${subj}" unfold?`,
    opts: () => [
      'Swift resolution within weeks',
      'Prolonged impact — months of fallout',
      'Triggers wider systemic changes',
    ],
  },
  ruling: {
    q: (subj) => `What effect will this ruling on "${subj}" have?`,
    opts: () => [
      'Sets a strong precedent going forward',
      'Gets challenged or reversed on appeal',
      'Limited practical impact despite headlines',
    ],
  },
  policy: {
    q: (subj) => `Will this new rule on "${subj}" actually work?`,
    opts: () => [
      'Yes — meaningful enforcement will follow',
      'Partially — good intent, weak implementation',
      'No — loopholes and poor oversight will undermine it',
    ],
  },
  deal: {
    q: (subj) => `How significant is this deal involving "${subj}"?`,
    opts: () => [
      'Game-changer — reshapes the industry',
      'Important but incremental',
      'May fall through or underperform',
    ],
  },
  conflict: {
    q: (subj) => `Where is the situation around "${subj}" headed?`,
    opts: () => [
      'De-escalation is most likely',
      'Tensions will continue to rise',
      'International intervention changes the dynamic',
    ],
  },
  discovery: {
    q: (subj) => `How impactful is this finding on "${subj}"?`,
    opts: () => [
      'Breakthrough — changes our understanding',
      'Promising but needs more validation',
      'Interesting but mostly academic for now',
    ],
  },
  election: {
    q: (subj) => `What's the likely outcome for "${subj}"?`,
    opts: () => [
      'Incumbent/favorite holds strong',
      'A surprise upset is brewing',
      'Too close to call — could go either way',
    ],
  },
  record: {
    q: (subj) => `Is "${subj}" a lasting trend or a peak moment?`,
    opts: () => [
      'Just the beginning — more records to come',
      'Near the peak — expect a correction',
      'Unique event — unlikely to repeat soon',
    ],
  },
  scandal: {
    q: (subj) => `How will "${subj}" play out?`,
    opts: () => [
      'Full accountability — consequences follow',
      'Investigation drags on with little resolution',
      'Fades from public memory within weeks',
    ],
  },
  health: {
    q: (subj) => `What's the most important angle on "${subj}"?`,
    opts: () => [
      'Public health systems need urgent reform',
      'Awareness will rise but action will lag',
      'The situation will stabilize soon',
    ],
  },
  tech: {
    q: (subj) => `What does "${subj}" mean for the bigger picture?`,
    opts: () => [
      'Accelerates progress — a genuine leap',
      'Raises serious concerns to address first',
      'Overhyped — real impact is further away',
    ],
  },
  climate: {
    q: (subj) => `What should be the response to "${subj}"?`,
    opts: () => [
      'Urgent policy action is non-negotiable',
      'Local adaptation must come first',
      'Better infrastructure investment over time',
    ],
  },
  market: {
    q: (subj) => `How will "${subj}" affect markets short-term?`,
    opts: () => [
      'Bullish — markets will respond positively',
      'Bearish — expect a dip or correction',
      'Already priced in — minimal reaction',
    ],
  },
  sport: {
    q: (subj) => `What's your call on "${subj}"?`,
    opts: () => [
      'The favorite delivers as expected',
      'It will be a tight, dramatic finish',
      'An underdog upset is coming',
    ],
  },
  space: {
    q: (subj) => `How significant is "${subj}" for space exploration?`,
    opts: () => [
      'A defining milestone',
      'Solid progress, but incremental',
      'The real payoff is years away',
    ],
  },
  education: {
    q: (subj) => `What will "${subj}" mean for students and institutions?`,
    opts: () => [
      'Positive change — real benefits ahead',
      'More pressure on students and teachers',
      'Unlikely to make much practical difference',
    ],
  },
  transport: {
    q: (subj) => `Will "${subj}" actually improve things on the ground?`,
    opts: () => [
      'Yes — commuters/users will benefit soon',
      'Good idea, but execution will be patchy',
      'Unlikely — systemic issues will persist',
    ],
  },
  general: {
    q: (subj) => `What's your take on "${subj}"?`,
    opts: () => [
      'This will lead to meaningful change',
      'Interesting, but the situation is more nuanced',
      'Unlikely to have lasting impact',
    ],
  },
}

/* ─── Truncate subject to keep question readable ──────────────────── */
function truncateSubject(subj, maxLen = 60) {
  if (subj.length <= maxLen) return subj
  // Cut at last word boundary before maxLen
  const cut = subj.lastIndexOf(' ', maxLen)
  return (cut > 20 ? subj.slice(0, cut) : subj.slice(0, maxLen)) + '…'
}

/* ─── Generate "why it matters" — specific to the article ─────────── */
function whyItMatters(actionType, title) {
  // Extract a key subject token from the title for specificity
  const subj = extractSubject(title)
  const short = subj.length > 50 ? subj.slice(0, 50) + '…' : subj

  const map = {
    launch:    `Launches like "${short}" can reshape markets, set policy precedent, or signal strategic direction.`,
    crisis:    `Crises like this often expose systemic weaknesses and drive both immediate and long-term policy changes.`,
    ruling:    `Court rulings on matters like "${short}" set legal precedents that can affect millions.`,
    policy:    `Policy changes like "${short}" directly influence how industries operate and how daily life is affected.`,
    deal:      `Deals like this can shift competitive dynamics, affect jobs, and redraw industry boundaries.`,
    conflict:  `Conflicts like "${short}" affect geopolitics, trade routes, humanitarian conditions, and global markets.`,
    discovery: `Scientific findings on "${short}" can take time to reach daily life but often transform how we understand the world.`,
    election:  `Election outcomes shape governance (including "${short}"), policy priorities, and national direction for years.`,
    record:    `Records like "${short}" point to shifting trends — knowing if they sustain helps planning.`,
    scandal:   `Scandals test institutional accountability. How "${short}" plays out can drive reform — or deepen cynicism.`,
    health:    `Health topics like "${short}" affect entire populations, particularly vulnerable communities.`,
    tech:      `Technology moves like "${short}" can disrupt industries, change work patterns, and create new opportunities or risks.`,
    climate:   `Climate events like "${short}" highlight how environmental change impacts infrastructure, health, and the economy.`,
    market:    `Market signals from "${short}" affect investor sentiment, savings, loans, and household decisions.`,
    sport:     `Events like "${short}" shape national mood, drive major commercial interests, and fuel community pride.`,
    space:     `Space milestones like "${short}" push technology forward and often spark broader scientific and public interest.`,
    education: `Education decisions like "${short}" directly affect millions of students, families, and institutions.`,
    transport: `Transport changes like "${short}" impact daily commutes, logistics, safety, and urban planning.`,
    general:   `Understanding the full context of "${short}" helps you form a more informed perspective.`,
  }
  return map[actionType] || map.general
}

/* ─── Simulated community poll (deterministic from title hash) ────── */
function communityPoll(title, options) {
  // Simple hash to generate consistent "community" percentages per article
  let hash = 0
  for (let i = 0; i < (title || '').length; i++) {
    hash = ((hash << 5) - hash + title.charCodeAt(i)) | 0
  }
  const seed = Math.abs(hash)

  // Generate 3 percentages that sum to 100
  const r1 = 25 + (seed % 30)           // 25–54
  const r2 = 20 + ((seed >> 8) % 25)    // 20–44
  const r3 = 100 - r1 - r2              // remainder
  const raw = [r1, r2, r3]

  // Map to options, ensure at least 3 items
  return options.map((opt, i) => ({
    label: opt,
    pct: raw[i] ?? Math.round(100 / options.length),
  }))
}

/* ═══════════════════════════════════════════════════════════════════
   PUBLIC API
   ═══════════════════════════════════════════════════════════════════ */

/**
 * Generate a smart, article-specific engage question.
 * @param {{ title: string, description?: string, content?: string }} article
 * @returns {{ text: string, options: string[], type: string }}
 */
export function generateSmartQuestion(article) {
  const title = article.title || ''
  const desc  = article.description || ''
  const allText = `${title} ${desc} ${article.content || ''}`

  const actionType = detectAction(allText)
  const subject = truncateSubject(extractSubject(title))
  const template = QUESTION_TEMPLATES[actionType] || QUESTION_TEMPLATES.general

  return {
    text: template.q(subject),
    options: template.opts(subject),
    type: actionType,
  }
}

/**
 * Generate contextual insights for an article.
 * @param {{ title: string, description?: string, content?: string }} article
 * @param {{ text: string, options: string[] }} question – the engage question
 * @returns {{ whyMatters: string, keyFacts: Array, poll: Array, entities: string[] }}
 */
export function generateInsights(article, question) {
  const title = article.title || ''
  const desc  = article.description || ''
  const content = article.content || article.article || ''
  const allText = `${title} ${desc} ${content}`

  const actionType = detectAction(allText)
  const { facts, entities } = extractKeyFacts(title, desc, content)

  return {
    whyMatters: whyItMatters(actionType, title),
    keyFacts: facts,
    poll: communityPoll(title, question.options),
    entities,
  }
}
