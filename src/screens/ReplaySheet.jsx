import { createPortal } from 'react-dom'
// Progress replay: plays your days back as a short video and lets you share it.
import { useEffect, useMemo, useRef, useState } from 'react'
import Character from '../Character'
import { IconClose, IconShare } from '../icons'
import { useEscape, useSheetDrag } from '../motion'
import { dayKey, replayDays } from '../calc'
import { svgImage } from '../shareCard'
import { VW, VH, SECONDS, runReplay, replayPicture, shareFile, videoType } from '../replay'

const RANGES = [['7', '7 days'], ['30', '30 days'], ['all', 'Everything']]

export default function ReplaySheet({ mine, profile, budgetFor, notify, onClose }) {
  const [range, setRange] = useState('30')
  const [weight, setWeight] = useState(false)
  const [video, setVideo] = useState(undefined) // undefined = making, null = can't, { blob, ext }
  const [left, setLeft] = useState(SECONDS)
  const rootRef = useRef(null), budRef = useRef(null), canvasRef = useRef(null), optsRef = useRef(null)
  const drag = useSheetDrag(onClose)
  useEscape(onClose)

  const data = useMemo(() => {
    const firstKey = mine.reduce((a, e) => (!a || e.day < a ? e.day : a), null)
    const since = firstKey ? Math.round((new Date(dayKey() + 'T12:00') - new Date(firstKey + 'T12:00')) / 86400000) + 1 : 7
    const len = range === 'all' ? Math.max(7, Math.min(365, since)) : +range
    const keys = Array.from({ length: len }, (_, i) => { const d = new Date(); d.setDate(d.getDate() - (len - 1 - i)); return dayKey(d) })
    // a fixed range starts at the first day with anything in it, so the video never opens on blanks
    const has = (k) => mine.some((e) => e.day === k) || profile?.days?.[k]?.steps || (profile?.days?.[k]?.workouts ?? []).length
    const from = Math.max(0, Math.min(keys.findIndex(has), len - 7))
    return replayDays({ entries: mine, profile, budgetFor, keys: keys.slice(from) })
  }, [range, mine, profile, budgetFor])
  const canWeight = data.weightChange != null
  // restart only when the days themselves change, not on every re-render of the screen behind
  const sig = JSON.stringify(data)
  const dataRef = useRef(data); dataRef.current = data

  useEffect(() => {
    let stop = null, gone = false, timer = 0
    setVideo(undefined); setLeft(SECONDS)
    const cs = getComputedStyle(rootRef.current)
    const v = (n) => cs.getPropertyValue(n).trim()
    Promise.all([svgImage(budRef.current?.querySelector('svg'), 320), document.fonts?.load('900 60px "Nunito Variable"').catch(() => {})]).then(([buddy]) => {
      if (gone) return
      const opts = { theme: { accent: v('--accent'), accent2: v('--accent-2') }, buddy, showWeight: weight && canWeight }
      optsRef.current = opts
      stop = runReplay(canvasRef.current, dataRef.current, opts, (res) => { clearInterval(timer); setVideo(res) })
      if (videoType()) timer = setInterval(() => setLeft((s) => Math.max(1, s - 1)), 1000)
    })
    return () => { gone = true; clearInterval(timer); stop?.() }
  }, [sig, weight, canWeight])

  const share = async () => {
    if (video) return shareFile(video.blob, `my-progress.${video.ext}`, notify)
    const blob = await replayPicture(data, optsRef.current)
    if (blob) shareFile(blob, 'my-progress.png', notify)
  }

  return createPortal(
    <div className="sheet-wrap share-wrap" onClick={onClose}>
      <div ref={rootRef} className="sheet share-sheet" style={drag.style} onClick={(e) => e.stopPropagation()} role="dialog" aria-label="Progress replay">
        <div className="grabber-zone" {...drag.handle}><div className="grabber" /></div>
        <div className="sheet-head">
          <div><p className="muted">No calories in the video. Made on your phone.</p><h2>Progress replay</h2></div>
          <button className="icon-btn" onClick={onClose} aria-label="Close"><IconClose /></button>
        </div>
        <span ref={budRef} className="dawn-bud-src" aria-hidden="true"><Character kind={profile?.character} size={300} /></span>

        <div className="share-preview story">
          <canvas ref={canvasRef} width={VW} height={VH} role="img" aria-label={`Your last ${data.days.length} days played back: ${data.logged} days logged, ${data.workouts} workouts`} />
        </div>

        <div className="seg replay-seg" role="radiogroup" aria-label="How far back">
          {RANGES.map(([k, label]) => <button key={k} role="radio" aria-checked={range === k} className={range === k ? 'on' : ''} onClick={() => setRange(k)}>{label}</button>)}
        </div>
        {canWeight && (
          <label className="replay-opt">
            <input type="checkbox" checked={weight} onChange={(e) => setWeight(e.target.checked)} />
            <span>Show my weight change<small>Only the change, never your weight</small></span>
          </label>
        )}
        <button className="btn-primary share-go" disabled={video === undefined} onClick={share}>
          <IconShare size={20} /> {video === undefined ? `Making your video… ${left} s` : video ? 'Share video' : 'Share as a picture'}
        </button>
        {video === null && <p className="fine replay-note">This phone can’t record the video, so you’ll share the last frame instead.</p>}
      </div>
    </div>, document.body)
}
