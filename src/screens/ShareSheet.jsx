import { createPortal } from 'react-dom'
// One share screen for every card: shows the picture first, Story or Post, then Share.
// The picture is made before you tap Share, so iPhone opens the share sheet straight away.
import { useEffect, useRef, useState } from 'react'
import Character from '../Character'
import { IconClose, IconShare } from '../icons'
import { useEscape, useSheetDrag } from '../motion'
import { FORMATS, drawShare, sharePicture } from '../shareCard'

const FMT_KEY = 'bankcal:share-format'

export default function ShareSheet({ kind, data, buddies = [], title = 'Share', file = 'bankcal.png', notify, onClose, extra }) {
  const [format, setFormat] = useState(() => { try { return localStorage.getItem(FMT_KEY) || 'story' } catch { return 'story' } })
  const [pic, setPic] = useState(null) // { blob, url }
  const rootRef = useRef(null)
  const budRef = useRef(null)
  const drag = useSheetDrag(onClose)
  useEscape(onClose)

  useEffect(() => {
    let gone = false
    setPic(null)
    const cs = getComputedStyle(rootRef.current)
    const v = (n) => cs.getPropertyValue(n).trim()
    const svgs = [...(budRef.current?.querySelectorAll('svg') ?? [])]
    drawShare(kind, data, { theme: { accent: v('--accent'), accent2: v('--accent-2') }, buddySvgs: svgs, format })
      .then((blob) => { if (!gone && blob) setPic({ blob, url: URL.createObjectURL(blob) }) })
      .catch(() => notify?.('Couldn’t make the picture on this phone'))
    return () => { gone = true }
  }, [format]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => () => { if (pic?.url) URL.revokeObjectURL(pic.url) }, [pic])

  const pick = (f) => { setFormat(f); try { localStorage.setItem(FMT_KEY, f) } catch { /* ignore */ } }

  return createPortal(
    <div className="sheet-wrap share-wrap" onClick={onClose}>
      <div ref={rootRef} className="sheet share-sheet" style={drag.style} onClick={(e) => e.stopPropagation()} role="dialog" aria-label={title}>
        <div className="grabber-zone" {...drag.handle}><div className="grabber" /></div>
        <div className="sheet-head">
          <div><p className="muted">No calories, weight or links in the picture</p><h2>{title}</h2></div>
          <button className="icon-btn" onClick={onClose} aria-label="Close"><IconClose /></button>
        </div>
        <span ref={budRef} className="dawn-bud-src" aria-hidden="true">{buddies.map((b, i) => <Character key={i} kind={b} size={300} />)}</span>

        <div className={`share-preview ${format}`}>
          {pic ? <img src={pic.url} alt="Preview of the picture you’ll share" /> : <span className="share-making">Making your picture…</span>}
        </div>

        <div className="seg share-seg" role="radiogroup" aria-label="Size">
          {Object.entries(FORMATS).map(([k, f]) => (
            <button key={k} role="radio" aria-checked={format === k} className={format === k ? 'on' : ''} onClick={() => pick(k)}>
              {f.label}<small>{k === 'story' ? 'tall, for stories' : 'for your feed'}</small>
            </button>
          ))}
        </div>
        <button className="btn-primary share-go" disabled={!pic} onClick={() => sharePicture(pic.blob, file, notify)}>
          <IconShare size={20} /> Share picture
        </button>
        {extra}
      </div>
    </div>
  , document.body
  )
}
