// Daily words. One Bible verse per day in the NLT (via /api/verse and Tyndale's
// official NLT API), falling back to the public-domain WEB if the NLT key isn't set.
// Cached per day so it still shows offline. Plus one famous motivational saying.
import { useEffect, useState } from 'react'
import { MOTIVATION } from './motivation'
import { REFLECTIONS } from './reflections'
import { CONTEXT } from './context'

const BIBLE_REFS = [
  'Philippians 4:13', 'Isaiah 40:31', 'Joshua 1:9', '1 Corinthians 6:19-20', '1 Corinthians 10:31', 'Galatians 6:9',
  'Hebrews 12:1', 'Hebrews 12:11', 'Proverbs 16:3', 'Proverbs 3:5-6', 'Proverbs 25:28', 'Romans 12:1', 'Romans 12:2',
  '2 Timothy 1:7', '3 John 1:2', 'Psalm 118:24', 'Psalm 23:1-3', 'Psalm 46:1', 'Psalm 139:14', 'Lamentations 3:22-23',
  'Matthew 6:33', 'Matthew 11:28', 'Isaiah 41:10', 'Jeremiah 29:11', 'Philippians 1:6', 'Philippians 4:6-7',
  'Colossians 3:23', '1 Timothy 4:8', 'James 1:12', 'James 1:2-4', 'Proverbs 4:23', 'Proverbs 21:5', 'Ecclesiastes 3:1',
  'Nehemiah 8:10', 'Psalm 37:5', 'Psalm 73:26', '2 Corinthians 12:9', '2 Corinthians 5:17', 'Romans 8:28', 'Romans 5:3-4',
  'Galatians 5:22-23', 'Ephesians 3:20', '1 Peter 5:7', 'Micah 6:8', 'Zephaniah 3:17', 'Deuteronomy 31:6', 'Psalm 34:8',
  'John 6:35', 'Matthew 4:4', 'Proverbs 17:22', 'Isaiah 26:3', 'Psalm 16:11', 'John 16:33', 'Romans 15:13',
  'Hebrews 10:23', '1 Corinthians 16:13', 'Psalm 121:1-2', 'Proverbs 13:4', 'Titus 2:11-12', '1 Corinthians 9:24-25',
]

// Verses used by the good-job and bounce-back screens.
export const GOOD_REFS = ['Galatians 6:9', 'Psalm 118:24', 'Philippians 1:6', '1 Corinthians 15:58', 'Psalm 16:11', 'Colossians 3:23']
export const OVER_REFS = ['Lamentations 3:22-23', 'Philippians 3:13-14', 'Proverbs 24:16', 'Isaiah 43:19', '2 Corinthians 12:9', 'Psalm 73:26']

const dayNumber = (key) => Math.floor(Date.UTC(...key.split('-').map((n, i) => (i === 1 ? +n - 1 : +n))) / 86400000)
export const pick = (list, key, offset = 0) => (list.length ? list[(dayNumber(key) + offset) % list.length] : null)

async function fetchVerse(ref) {
  try {
    const r = await fetch(`/api/verse?ref=${encodeURIComponent(ref)}&v=2`)
    if (r.ok) return await r.json()
  } catch { /* fall through to WEB */ }
  const r = await fetch(`https://bible-api.com/${encodeURIComponent(ref)}?translation=web`)
  if (!r.ok) throw new Error('verse unavailable')
  const j = await r.json()
  return { text: j.text.replace(/\s+/g, ' ').trim(), reference: j.reference, version: 'WEB' }
}

// Load (and cache) one verse by reference.
export function useVerse(ref, cacheTag) {
  const cacheKey = `bankcal:verse3:${cacheTag}:${ref}`
  const [verse, setVerse] = useState(() => {
    try { return JSON.parse(localStorage.getItem(cacheKey)) } catch { return null }
  })
  useEffect(() => {
    // re-check once per open if we only have the WEB fallback, so NLT appears as soon as its key is added
    if (!ref || (verse?.text && verse.version !== 'WEB') || !navigator.onLine) return
    let alive = true
    fetchVerse(ref)
      .then((v) => {
        try { localStorage.setItem(cacheKey, JSON.stringify(v)) } catch { /* storage full */ }
        if (alive) setVerse(v)
      })
      .catch(() => {})
    return () => { alive = false }
  }, [ref, cacheKey]) // eslint-disable-line react-hooks/exhaustive-deps
  return verse ?? { text: null, reference: ref, version: '' }
}

export function useDailyWords(dayKey) {
  const ref = pick(BIBLE_REFS, dayKey, 7)
  const verse = useVerse(ref, dayKey)
  return { verse, reflection: REFLECTIONS[ref] ?? null, context: CONTEXT[ref] ?? null, motivation: pick(MOTIVATION, dayKey, 3) }
}
