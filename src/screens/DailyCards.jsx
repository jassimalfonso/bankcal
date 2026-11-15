import { fmt, fmtSleep, sleepHours, SLEEP_TARGET, DEFAULT_BED, DEFAULT_WAKE } from '../calc'
import { GOOD_REFS, OVER_REFS, pick, useVerse } from '../quotes'
import { BOUNCE_BACK, GOOD_DAY } from '../motivation'
import { useEffect, useState } from 'react'
import Character from '../Character'
import BankCard from './BankCard'
import { useEscape } from '../motion'

// The verse and its reflection are one card: tap the verse to unfold the reflection.
// The motivation sits quietly underneath.
export function Words({ words, compact = false }) {
  const [open, setOpen] = useState(!compact)
  const hasReflection = !!words.reflection
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
      {hasReflection && (
        <div className={`w-fold ${open ? 'open' : ''}`} id="today-reflection" aria-hidden={!open}>
          <div>
            <div className="w-reflect">
              {words.context && <p className="w-context"><b>Context</b>{words.context}</p>}
              <p>{words.reflection}</p>
            </div>
          </div>
        </div>
      )}
      {words.motivation && (
        <p className="w-motive">“{words.motivation.text}” <span>— {words.motivation.by}</span></p>
      )}
    </div>
  )
}

const helloFor = (h = new Date().getHours()) => (h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening')
const longDate = () => new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })

// First open of the day: a calm, two-step welcome. Greeting first, then today's word, then the app.
export function MorningCard({ profile, words, yesterday, streakDays, birthday, onClose, sleep, onSleep, budget }) {
  useEscape(onClose)
  const [step, setStep] = useState(0)
  const now = new Date()
  const [bed, setBed] = useState(sleep?.bed ?? profile.bedTime ?? DEFAULT_BED)
  // default to the usual wake time; only use "now" if it's earlier than that (an early start)
  const nowHM = `${String(now.getHours()).padStart(2, '0')}:${String(Math.floor(now.getMinutes() / 5) * 5).padStart(2, '0')}`
  const usual = profile.wakeTime ?? DEFAULT_WAKE
  const [wake, setWake] = useState(sleep?.wake ?? (nowHM < usual && nowHM > '03:00' ? nowHM : usual))
  const hrs = sleepHours({ bed, wake })
  const [editSleep, setEditSleep] = useState(false)
  const next = () => { onSleep?.({ bed, wake }); setStep(1) }
  const skip = () => { onSleep?.({ bed, wake }); onClose() }
  return (
    <div className={`dawn theme-${profile.theme}`} role="dialog" aria-label="Good morning">
      <div className="dawn-glow" aria-hidden="true" />
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
          {!editSleep ? (
            <button className="sleep-chip" onClick={() => setEditSleep(true)}>
              😴 <b>{hrs != null && hrs <= 14 ? fmtSleep(hrs) : '—'}</b> of sleep <span>Edit</span>
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
    </div>
  )
}

// Later opens the same day: the card shows what's left, then fades into the app.
export function WelcomeBack({ profile, left, onDone }) {
  useEffect(() => { const t = setTimeout(onDone, 2600); return () => clearTimeout(t) }, [onDone])
  return (
    <button className={`dawn hello-back theme-${profile.theme}`} onClick={onDone} aria-label="Continue to BankCal">
      <div className="dawn-glow" aria-hidden="true" />
      <div className="dawn-step">
        <BankCard label={left != null && left < 0 ? 'Over today' : 'Left today'} value={left == null ? null : Math.abs(left)} holder={profile.name.toUpperCase()} buddies={[{ kind: profile.character, theme: profile.theme }]} />
        <h1>Welcome back, {profile.name}</h1>
        <p className="dawn-line">{helloFor()}. Tap anywhere to continue.</p>
      </div>
    </button>
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
        <Character kind={profile.character} mood={good ? 'happy' : 'worried'} size={110} className="bob" />
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

export function WordsCard({ words }) {
  return (
    <section className="today-words">
      <h2 className="group-title">Today’s verse and reflection</h2>
      <div className="card words-panel"><Words words={words} compact /></div>
    </section>
  )
}
