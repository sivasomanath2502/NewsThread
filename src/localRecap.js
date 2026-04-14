function cleanText(text = '') {
  return String(text).replace(/\s+/g, ' ').trim()
}

function heuristicTimelineRecap(timeline) {
  const items = Array.isArray(timeline) ? timeline.filter(Boolean) : []
  if (!items.length) {
    return [
      'This thread is still building and has limited updates so far.',
      'As more related coverage is added, this recap will evolve automatically.',
      'Follow the story to track how the timeline changes day by day.',
    ]
  }

  const toSentence = (text = '') => {
    const s = cleanText(text).replace(/(\.\.\.|…)\s*$/, '').trim()
    if (!s) return ''
    return /[.!?]["')\]]?\s*$/.test(s) ? s : `${s}.`
  }

  const points = items.slice(0, 12).map((item) => {
    const event = cleanText(item?.event)
    const details = cleanText(item?.details)
    return toSentence([event, details].filter(Boolean).join(' — '))
  }).filter(Boolean)

  const first = points[0] || ''
  const middle = points[Math.floor((points.length - 1) / 2)] || ''
  const latest = points[points.length - 1] || ''

  const unique = []
  for (const line of [first, middle, latest]) {
    const key = line.toLowerCase()
    if (!key || unique.some((v) => v.toLowerCase() === key)) continue
    unique.push(line)
  }

  while (unique.length < 3) {
    if (unique.length === 0) unique.push('The timeline captures how this story has developed across related reports.')
    else if (unique.length === 1) unique.push(`So far, ${items.length} related updates have contributed to the thread.`)
    else unique.push('The latest entries suggest the story is still evolving.')
  }

  return unique.slice(0, 3)
}

export async function summarizeTimelineWithLocalModel(timeline) {
  return heuristicTimelineRecap(timeline)
}
