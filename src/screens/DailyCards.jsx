import { weekSummary, fmt, KCAL_PER_KG, fmtSleep, sleepHours, SLEEP_TARGET, DEFAULT_BED, DEFAULT_WAKE } from '../calc'
import { GOOD_REFS, OVER_REFS, pick, useVerse } from '../quotes'
import { BOUNCE_BACK, GOOD_DAY } from '../motivation'
import { useEffect, useRef, useState } from 'react'
import ShareSheet from './ShareSheet'
import Character from '../Character'
import BankCard from './BankCard'
import VersionLine from './VersionLine'
import { useEscape } from '../motion'
import { IconHeart, IconShare } from '../icons'
import { favItems, isFav, toggleFav, shareFav, KIND_LABEL } from '../favorites'
import CollectionSheet from './Collection'

// The verse and its reflection are one card: tap the verse to unfold the reflection.
// The motivation sits quietly underneath.
// Save or share one of today's words. Only on the Today card, not the morning welcome.
function Acts({ it, acts, verse }) {
  const [pic, setPic] = useState(false)
  if (!it || !acts) return null
  const on = isFav(acts.profile, it)
  const what = KIND_LABEL[it.kind].toLowerCase()
  return (
    <div className="w-acts">
      <button className={on ? 'on' : ''} onClick={() => toggleFav(acts.profile, acts.updateProfile, it, acts.notify)} aria-pressed={on} aria-label={on ? `Remove ${what} from favourites` : `Save ${what} to favourites`}>
        <IconHeart filled={on} size={18} /><span>{on ? 'Saved' : 'Save'}</span>
      </button>
      {/* the verse shares as a picture (with a text option); reflections and quotes as text */}
      <button onClick={() => (verse ? setPic(true) : shareFav(it, acts.notify))} aria-label={`Share ${what}`}><IconShare size={18} /><span>Share</span></button>
      {pic && (
        <ShareSheet kind="verse" title="Share today’s verse" file="todays-verse.png" data={{ verse }} notify={acts.notify} onClose={() => setPic(false)}
          extra={<button className="link-btn share-text" onClick={() => { setPic(false); shareFav(it, acts.notify) }}>Share as text instead</button>} />
      )}
    </div>
  )
}

export function Words({ words, compact = false, acts = null }) {
  const [open, setOpen] = useState(!compact)
  const hasReflection = !!words.reflection
  const items = acts ? favItems(words) : {}
  return (
    <div className="words">
      <button
        className={`w-verse ${open ? 'open' : ''}`}
        onClick={() => hasReflection && setOpen((o) => !o)}
        aria-expanded={hasReflection ? open : undefined}
        aria-controls="today-reflection"
      >
        {words.verse.text
          ? <span className="w-quote">“{words.verse.text}”</span>
          : <span className="w-quote muted">Connect to the internet to load today’s verse.</span>}
        <span className="w-ref">
          <span>{words.verse.reference}{words.verse.version ? ` · ${words.verse.version}` : ''}</span>
          {hasReflection && <span className="w-toggle">{open ? 'Hide reflection' : 'Read reflection'}<svg viewBox="0 0 12 12" aria-hidden="true"><path d="M3 4.5 6 7.5 9 4.5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg></span>}
        </span>
      </button>
      <Acts it={items.verse} acts={acts} verse={words.verse} />
      {hasReflection && (
        <div className={`w-fold ${open ? 'open' : ''}`} id="today-reflection" aria-hidden={!open}>
          <div>
            <div className="w-reflect">
              {words.context && <p className="w-context"><b>Context</b>{words.context}</p>}
              <p>{words.reflection}</p>
              <Acts it={items.reflection} acts={acts} />
            </div>
          </div>
        </div>
      )}
      {words.motivation && (
        <div className="w-motive-wrap">
          <p className="w-motive">“{words.motivation.text}” <span>— {words.motivation.by}</span></p>
          <Acts it={items.motivation} acts={acts} />
        </div>
      )}
    </div>
  )
}

const helloFor = (h = new Date().getHours()) => (h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening')
const longDate = () => new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })

// First open of the day: a calm, two-step welcome. Greeting first, then today's word, then the app.
export function MorningCard({ profile, words, yesterday, streakDays, birthday, onClose, sleep, onSleep, budget, leaving, focus, notify, isNew }) {
  useEscape(onClose)
  const [step, setStep] = useState(0)
  const [sharing, setSharing] = useState(false)
  const now = new Date()
  const [bed, setBed] = useState(sleep?.bed ?? profile.bedTime ?? DEFAULT_BED)
  // default to the usual wake time; only use "now" if it's earlier than that (an early start)
  const nowHM = `${String(now.getHours()).padStart(2, '0')}:${String(Math.floor(now.getMinutes() / 5) * 5).padStart(2, '0')}`
  const usual = profile.wakeTime ?? DEFAULT_WAKE
  const [wake, setWake] = useState(sleep?.wake ?? (nowHM < usual && nowHM > '03:00' ? nowHM : usual))
  const [editSleep, setEditSleep] = useState(false)
  const hrs = sleepHours({ bed, wake })
  const save = () => { if (editSleep) onSleep?.({ bed, wake }) }
  const next = () => { save(); setStep(1) }
  const skip = () => { save(); onClose() }
  return (
    <div className={`dawn theme-${profile.theme} ${leaving ? 'leaving' : ''}`} role="dialog" aria-label="Good morning">
      <div className="dawn-glow" aria-hidden="true" />
      <button className={`dawn-share ${isNew ? 'is-new' : ''}`} onClick={() => setSharing(true)} aria-label="Share my morning on socials">
        <IconShare size={18} /><span>Share</span>{isNew && <i>New</i>}
      </button>
      {sharing && <ShareSheet kind="morning" title="Share my morning" file="my-morning.png" buddies={[profile.character]} notify={notify}
        data={{ words, name: profile.name, greeting: helloFor(), streakDays }} onClose={() => setSharing(false)} />}
      {birthday && <div className="confetti" aria-hidden="true">{Array.from({ length: 18 }, (_, i) => <i key={i} style={{ '--i': i }} />)}</div>}

      {step === 0 ? (
        <div className="dawn-step" key="greet">
          <BankCard value={budget} holder={profile.name.toUpperCase()} buddies={[{ kind: profile.character, theme: profile.theme }]} />
          <h1>{birthday ? `Happy birthday, ${profile.name}! 🎂` : `${helloFor()}, ${profile.name}`}</h1>
          <p className="dawn-line">
            {birthday ? 'Enjoy your day. Cake counts, and one day won’t undo your progress.'
              : yesterday ? (yesterday.net >= 0 ? `Yesterday you saved ${fmt(yesterday.net)} kcal. Well done.` : 'Yesterday went over, and that’s okay. Today is a fresh start.')
              : 'A new day, a full balance.'}
            {streakDays > 1 && <><br /><span className="dawn-streak">🔥 {streakDays} days in a row</span></>}
          </p>
          {focus && !birthday && <p className="one-thing"><span>One thing today</span>{focus.emoji} {focus.text}</p>}
          {!editSleep ? (
            <button className="sleep-chip" onClick={() => setEditSleep(true)}>
              {sleep ? <>😴 <b>{fmtSleep(sleepHours(sleep))}</b> of sleep <span>Edit</span></> : <>😴 Log last night’s sleep <span>Add</span></>}
            </button>
          ) : (
            <div className="dawn-sleep">
              <div className="ds-row">
                <label><span>Went to bed</span><input type="time" value={bed} onChange={(e) => setBed(e.target.value)} /></label>
                <label><span>Woke up</span><input type="time" value={wake} onChange={(e) => setWake(e.target.value)} /></label>
              </div>
              <span className={`ds-total ${hrs != null && hrs < SLEEP_TARGET ? 'short' : ''}`}>
                {hrs != null && hrs > 14 ? 'That looks long. Check the times.' : `${fmtSleep(hrs)} of sleep${hrs != null && hrs < SLEEP_TARGET ? '. Go gently on yourself today.' : ''}`}
              </span>
            </div>
          )}
          <button className="btn-primary dawn-btn" onClick={next}>Continue</button>
          <button className="dawn-skip" onClick={skip}>Skip to my day</button>
        </div>
      ) : (
        <div className="dawn-step word" key="word">
          <p className="dawn-date">Today’s verse and reflection</p>
          <Words words={words} compact />
          <button className="btn-primary dawn-btn" onClick={onClose}>Start my day</button>
        </div>
      )}

      <div className="dawn-dots" aria-hidden="true"><i className={step === 0 ? 'on' : ''} /><i className={step === 1 ? 'on' : ''} /></div>
      <VersionLine />
    </div>
  )
}

// Later opens the same day: the card shows what's left, then fades into the app.
export function WelcomeBack({ profile, left, onDone, leaving }) {
  useEscape(onDone)
  return (
    <div className={`dawn hello-back theme-${profile.theme} ${leaving ? 'leaving' : ''}`} role="dialog" aria-label="Welcome back">
      <div className="dawn-glow" aria-hidden="true" />
      <div className="dawn-step">
        <BankCard label={left != null && left < 0 ? 'Over today' : 'Left today'} value={left == null ? null : Math.abs(left)} holder={profile.name.toUpperCase()} buddies={[{ kind: profile.character, theme: profile.theme }]} />
        <h1>Welcome back, {profile.name}</h1>
        <p className="dawn-line">{helloFor()}. {left == null ? '' : left >= 0 ? 'Your balance is ready when you are.' : 'Go gently for the rest of today.'}</p>
        <button className="btn-primary dawn-btn" onClick={onDone}>Open my day</button>
        <VersionLine />
      </div>
    </div>
  )
}

export function DayResult({ profile, budget, spent, earn, streakDays, today, onClose }) {
  useEscape(onClose)
  const net = budget - spent
  const good = net >= 0
  const verse = useVerse(pick(good ? GOOD_REFS : OVER_REFS, today), today)
  const quote = pick(good ? GOOD_DAY : BOUNCE_BACK, today)
  // 30 min brisk walk (5.6 km/h ≈ 4.3 MET, net of resting)
  const walkKcal = Math.round(3.3 * (+profile.weight || 70) * 0.5)
  return (
    <div className="sheet-wrap center" onClick={onClose}>
      <div className={`daily-card result ${good ? 'good' : 'over'}`} onClick={(e) => e.stopPropagation()} role="dialog" aria-label="Today's result">
        {good && <div className="confetti" aria-hidden="true">{Array.from({ length: 18 }, (_, i) => <i key={i} style={{ '--i': i }} />)}</div>}
        <Character kind={profile.character} mood={good ? 'happy' : 'worried'} size={110} className="bob" acc={profile.accessory} />
        <h2>{good ? 'Good job!' : 'Not today, and that’s okay'}</h2>
        <p className="big-net">{good ? `+${fmt(net)}` : `−${fmt(-net)}`} <span>kcal {good ? 'saved' : 'over'}</span></p>
        {good ? (
          <>
            <p className="muted">You stayed within your budget{earn.total > 0 ? ` and earned ${fmt(earn.total)} kcal from activity` : ''}.</p>
            {streakDays > 1 && <p className="streak-line">🔥 {streakDays} days in a row</p>}
          </>
        ) : (
          <div className="tips">
            <p className="muted">One day doesn’t undo your progress. Some ways to bounce back:</p>
            <ul>
              <li>A 30-minute brisk walk earns back about {fmt(walkKcal)} kcal{walkKcal >= -net ? ', enough to cover today' : ''}.</li>
              <li>Plan tomorrow’s first meal tonight, and keep it high in protein.</li>
              <li>Log before you eat tomorrow, not after.</li>
            </ul>
          </div>
        )}
        {quote && (
          <div className="word result-verse">
            <p className="word-text">“{quote.text}”</p>
            <span className="word-ref">{quote.by}</span>
          </div>
        )}
        {verse.text && (
          <div className="word result-verse">
            <p className="word-text">“{verse.text}”</p>
            <span className="word-ref">{verse.reference}{verse.version ? ` · ${verse.version}` : ''}</span>
          </div>
        )}
        <button className="btn-primary" onClick={onClose}>{good ? 'Close my day' : 'Got it'}</button>
      </div>
    </div>
  )
}

export function WordsCard({ words, profile, updateProfile, notify, onReplay }) {
  const [shelf, setShelf] = useState(false)
  const n = profile?.favorites?.length ?? 0
  return (
    <section className="today-words">
      <div className="block-head">
        <h2 className="group-title">Today’s verse and reflection</h2>
        {n > 0 && <button className="link-btn" onClick={() => setShelf(true)}>Favourites ({n})</button>}
      </div>
      <div className="card words-panel"><Words words={words} compact acts={{ profile, updateProfile, notify }} /></div>
      {onReplay && <button className="link-btn words-replay" onClick={onReplay}>☀️ See the morning welcome again</button>}
      {shelf && <CollectionSheet tab="favs" profile={profile} updateProfile={updateProfile} notify={notify} onClose={() => setShelf(false)} />}
    </section>
  )
}

// Sunday: a calm look back at the week. Encouraging, never a report card.
export function WeeklyCard({ profile, mine, budgetFor, today, onClose, notify, streakDays, sInfo, partner }) {
  const w = weekSummary({ entries: mine, profile, budgetFor, todayKey: today })
  const [pic, setPic] = useState(false)
  if (w.logged === 0 && w.habitDone === 0 && w.workouts === 0) return null
  const title = w.logged < 3 ? 'A quieter week' : w.within >= 5 ? 'What a week' : w.within >= 3 ? 'A good week' : 'You kept showing up'
  const line = w.logged < 3 ? 'Each new week is a fresh page.'
    : w.within >= 5 ? 'Steady days like these are how lasting change is built.'
    : w.within >= 3 ? 'More days on track than off. That’s real progress.'
    : 'Some weeks are harder. Showing up is what counts.'
  const d = (k) => new Date(k + 'T12:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
  const dn = (k) => new Date(k + 'T12:00').toLocaleDateString('en-GB', { weekday: 'short' })
  const kg = w.saved > 0 ? w.saved / KCAL_PER_KG : 0
  const pid = partner?.partners?.[0]
  const pname = pid ? partner.shares?.[pid]?.name : null
  const cheers = pid ? (partner.received?.[pid]?.log ?? []).filter((c) => c.at >= new Date(w.from + 'T00:00').getTime()).length : 0
  const covered = (sInfo?.covered ?? []).filter((k) => k >= w.from && k <= w.to)
  const top = Math.max(1, ...w.bars.map((b) => Math.abs(b.net ?? 0)))
  return (
    <section className="block">
      {pic && (
        <ShareSheet kind="week" title="Share my week" file="my-week.png" buddies={[profile.character]} notify={notify} onClose={() => setPic(false)}
          data={{ from: w.from, to: w.to, line, say: w.within >= 5 ? 'What a week!' : 'Still showing up!', stats: [
            w.logged > 0 && { emoji: '🎯', value: `${w.within}/${w.logged}`, label: 'days on budget' },
            kg >= 0.05 && { emoji: '🔥', value: `≈ ${kg.toFixed(1)} kg`, label: 'of fat' },
            w.workouts > 0 && { emoji: '💪', value: String(w.workouts), label: w.workouts > 1 ? 'workouts' : 'workout' },
            streakDays > 1 && { emoji: '🔥', value: String(streakDays), label: 'day streak' },
          ].filter(Boolean).slice(0, 4) }} />
      )}
      <div className="card recap">
        <span className="rc-pill">🗓️ Your week · {d(w.from)} – {d(w.to)}</span>
        <h3>{title}, {profile.name}!</h3>
        <p className="rc-lead">{w.logged > 0 ? `${w.within} of ${w.logged} logged days on budget. ` : ''}{line}</p>
        {covered.length > 0 && <p className="rc-shield">🧊 Your shield kept the streak safe on {covered.map(dn).join(' and ')}</p>}
        <div className="rc-stats">
          {w.logged > 0 && <div><b className={w.saved >= 0 ? 'pos' : ''}>{fmt(Math.abs(w.saved))}</b><span>kcal {w.saved >= 0 ? 'saved' : 'over'}</span></div>}
          {kg >= 0.05 && <div><b>≈ {kg.toFixed(1)} kg</b><span>of fat, gone</span></div>}
          {w.workouts > 0 && <div><b>{w.workouts}</b><span>workout{w.workouts > 1 ? 's' : ''}</span></div>}
          {pname && cheers > 0 ? <div><b>💌 {cheers}</b><span>cheers from {pname}</span></div>
            : w.habitPossible > 0 ? <div><b>{w.habitDone}<small>/{w.habitPossible}</small></b><span>habit ticks</span></div> : null}
        </div>
        {w.logged > 1 && (
          <div className="rc-bars" aria-label="Each day's balance this week">
            {w.bars.map((b) => (
              <div key={b.k} className="rc-bar">
                <i className={b.net == null ? 'none' : b.k === w.best?.k ? 'best' : b.net < 0 ? 'over' : ''} style={{ height: b.net == null ? '8%' : `${Math.max(10, (Math.abs(b.net) / top) * 100)}%` }} />
                <span>{dn(b.k)}</span>
              </div>
            ))}
          </div>
        )}
        {w.best && <p className="rc-best">⭐ Best day: {new Date(w.best.k + 'T12:00').toLocaleDateString('en-GB', { weekday: 'long' })}, {fmt(w.best.net)} under budget</p>}
        <div className="rc-btns">
          <button className="btn-soft" onClick={() => setPic(true)}>Share</button>
          <button className="btn-primary" onClick={onClose}>Next week 💪</button>
        </div>
      </div>
    </section>
  )
}
