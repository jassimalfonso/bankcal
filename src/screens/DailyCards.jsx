import { fmt } from '../calc'
import { GOOD_REFS, OVER_REFS, pick, useVerse } from '../quotes'
import { BOUNCE_BACK, GOOD_DAY } from '../motivation'
import Character from '../Character'

export function Words({ words }) {
  return (
    <div className="words">
      <div className="word">
        <span className="word-tag">Today’s verse</span>
        {words.verse.text ? <p className="word-text">“{words.verse.text}”</p> : <p className="word-text muted">Connect to the internet to load today’s verse.</p>}
        <span className="word-ref">{words.verse.reference}{words.verse.version ? ` · ${words.verse.version}` : ''}</span>
      </div>
      {words.reflection && (
        <div className="word reflection">
          <span className="word-tag">Reflection</span>
          <p className="word-text">{words.reflection}</p>
        </div>
      )}
      {words.motivation && (
        <div className="word">
          <span className="word-tag">Today’s motivation</span>
          <p className="word-text">“{words.motivation.text}”</p>
          <span className="word-ref">{words.motivation.by}</span>
        </div>
      )}
    </div>
  )
}

// Shown once each morning: greeting, yesterday's result, streak, today's words.
export function MorningCard({ profile, words, yesterday, streakDays, birthday, onClose }) {
  const h = new Date().getHours()
  const hello = h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening'
  return (
    <div className="sheet-wrap center" onClick={onClose}>
      <div className="daily-card" onClick={(e) => e.stopPropagation()} role="dialog" aria-label="Today">
        <Character kind={profile.character} mood="happy" size={92} className="bob" />
        <p className="muted">{new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
        {birthday && <div className="confetti" aria-hidden="true">{Array.from({ length: 18 }, (_, i) => <i key={i} style={{ '--i': i }} />)}</div>}
        <h2>{birthday ? `Happy birthday, ${profile.name}! 🎂` : `${hello}, ${profile.name}`}</h2>
        {birthday && <p className="streak-line">Enjoy your day. Cake counts, and one day won’t undo your progress.</p>}
        {yesterday && (
          <p className={`yday ${yesterday.net >= 0 ? 'pos' : 'neg'}`}>
            {yesterday.net >= 0 ? `Yesterday you saved ${fmt(yesterday.net)} kcal. Good job!` : `Yesterday went ${fmt(-yesterday.net)} kcal over. Today is a fresh start.`}
          </p>
        )}
        {streakDays > 1 && <p className="streak-line">🔥 {streakDays}-day streak within budget</p>}
        <Words words={words} />
        <button className="btn-primary" onClick={onClose}>Start my day</button>
      </div>
    </div>
  )
}

// "Close my day": celebration when within budget, encouragement when over.
export function DayResult({ profile, budget, spent, earn, streakDays, today, onClose }) {
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
      <h2 className="group-title">Today’s word</h2>
      <Words words={words} />
    </section>
  )
}
