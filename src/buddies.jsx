// Extra buddies in the same soft, expressive style as the cloud monster.
// Food friends suit a calorie app; a few creatures for variety.
// Faces: mood = 'happy' | 'ok' | 'worried' | 'sleepy'

const INK = '#2b2b30'

export function Face({ mood, y = 60, gap = 15, my, cx = 60, cheeks = '#ff8fa3', iris, eyeInk = INK }) {
  const m = my ?? y + 22
  return (
    <g>
      <ellipse cx={cx - gap - 7} cy={y + 13} rx="6.5" ry="4" fill={cheeks} opacity={mood === 'worried' ? 0.2 : 0.5} />
      <ellipse cx={cx + gap + 7} cy={y + 13} rx="6.5" ry="4" fill={cheeks} opacity={mood === 'worried' ? 0.2 : 0.5} />
      {[cx - gap, cx + gap].map((x) =>
        mood === 'sleepy' ? (
          <path key={x} d={`M${x - 6} ${y} q6 5 12 0`} stroke={eyeInk} strokeWidth="3" strokeLinecap="round" fill="none" />
        ) : mood === 'happy' ? (
          <path key={x} d={`M${x - 6} ${y + 2} q6 -8 12 0`} stroke={eyeInk} strokeWidth="3.2" strokeLinecap="round" fill="none" />
        ) : (
          <g key={x}>
            <circle cx={x} cy={y} r={mood === 'worried' ? 8.5 : 7.5} fill="#fff" />
            {iris && <circle cx={x + 1} cy={y + 1} r="5" fill={iris} />}
            <circle cx={x + (mood === 'ok' ? 2.5 : 1)} cy={y + (mood === 'worried' ? 0 : 1)} r={mood === 'worried' ? 3.2 : 4} fill={INK} />
            <circle cx={x + 2.6} cy={y - 1.6} r="1.3" fill="#fff" />
          </g>
        ),
      )}
      {mood === 'worried' && (
        <g stroke={INK} strokeWidth="2.6" strokeLinecap="round">
          <path d={`M${cx - gap - 8} ${y - 13} l10 3`} />
          <path d={`M${cx + gap + 8} ${y - 13} l-10 3`} />
        </g>
      )}
      {mood === 'happy' && <g><path d={`M${cx - 9} ${m - 2} q9 12 18 0 z`} fill={INK} /><ellipse cx={cx} cy={m + 4} rx="4" ry="2.4" fill="#ff7d93" /></g>}
      {mood === 'ok' && <path d={`M${cx - 7} ${m} q3.5 -3 7 0 t7 0`} stroke={INK} strokeWidth="3" strokeLinecap="round" fill="none" />}
      {mood === 'worried' && <ellipse cx={cx} cy={m + 1} rx="5" ry="6.5" fill={INK} />}
      {mood === 'sleepy' && <ellipse cx={cx} cy={m} rx="3" ry="2.2" fill={INK} />}
      {(mood === 'ok' || mood === 'worried') && <path transform={`translate(${cx + gap + 16} ${y - 12})`} d="M0 -7 C4 -1 5 2 5 4 a5 5 0 0 1 -10 0 c0 -2 1 -5 5 -11z" fill="#8fd3ff" />}
      {mood === 'sleepy' && <g fill="#9a9ab0" fontFamily="system-ui" fontWeight="900"><text x="92" y="24" fontSize="15">z</text><text x="102" y="14" fontSize="10">z</text></g>}
    </g>
  )
}

const g = (id, a, b) => (
  <defs>
    <linearGradient id={id} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={a} /><stop offset="1" stopColor={b} /></linearGradient>
  </defs>
)

export const BUDDIES = {
  mochi: { label: 'Mochi', draw: (m) => (<>
    {g('b-mochi', '#ffffff', '#f3e6ee')}
    <ellipse cx="60" cy="108" rx="40" ry="6" fill="#000" opacity="0.06" />
    <path d="M14 86 C14 50 34 30 60 30 C86 30 106 50 106 86 C106 102 90 108 60 108 C30 108 14 102 14 86 Z" fill="url(#b-mochi)" />
    <ellipse cx="60" cy="34" rx="14" ry="6" fill="#ffd1e0" />
    <Face mood={m} y={66} />
  </>) },
  avocado: { label: 'Avocado', draw: (m) => (<>
    {g('b-avo', '#7ec850', '#3f8f3a')}
    <path d="M60 8 C80 8 92 34 100 60 C108 90 90 112 60 112 C30 112 12 90 20 60 C28 34 40 8 60 8 Z" fill="url(#b-avo)" />
    <path d="M60 18 C76 18 86 40 92 62 C98 86 84 104 60 104 C36 104 22 86 28 62 C34 40 44 18 60 18 Z" fill="#f2f5b8" />
    <circle cx="60" cy="90" r="13" fill="#a8723f" /><circle cx="55.5" cy="85.5" r="3.5" fill="#fff" opacity="0.3" />
    <Face mood={m} y={52} gap={13} my={68} cheeks="#ff9f9f" />
  </>) },
  onigiri: { label: 'Onigiri', draw: (m) => (<>
    {g('b-oni', '#ffffff', '#efebe4')}
    {/* soft, rounded rice-ball shape: a broad dome on top, full rounded corners */}
    <path d="M60 14 C76 14 86 28 95 44 C104 60 113 76 110 94 C107 108 92 111 60 111 C28 111 13 108 10 94 C7 76 16 60 25 44 C34 28 44 14 60 14 Z" fill="url(#b-oni)" stroke="#e6e1d9" strokeWidth="2" />
    {/* a few rice grains */}
    <g fill="#e9e4dc">
      <ellipse cx="44" cy="40" rx="3" ry="1.6" transform="rotate(-30 44 40)" /><ellipse cx="76" cy="36" rx="3" ry="1.6" transform="rotate(25 76 36)" />
      <ellipse cx="28" cy="72" rx="3" ry="1.6" transform="rotate(60 28 72)" /><ellipse cx="94" cy="70" rx="3" ry="1.6" transform="rotate(-50 94 70)" />
    </g>
    {/* nori wrapped around the base, following the curve */}
    <path d="M40 86 C46 85 74 85 80 86 L82 110.5 C74 111 46 111 38 110.5 Z" fill="#2f3d33" />
    <path d="M42 89 L78 89" stroke="#40564a" strokeWidth="1.5" strokeLinecap="round" opacity="0.6" />
    <Face mood={m} y={62} gap={14} my={76} />
  </>) },
  donut: { label: 'Donut', draw: (m) => (<>
    <circle cx="60" cy="62" r="48" fill="#e2a35f" />
    <path d="M14 58 C14 30 34 14 60 14 C86 14 106 30 106 58 C106 70 98 66 92 72 C86 78 80 70 72 76 C64 82 58 74 50 80 C42 86 36 74 28 78 C20 82 14 72 14 58 Z" fill="#ff9ec4" />
    <ellipse cx="60" cy="98" rx="10" ry="5" fill="#c9884a" />
    {[[30, 34, '#7fd1ff', 20], [84, 30, '#ffe066', -30], [40, 22, '#a3e07a', 60], [76, 50, '#fff', 10], [96, 50, '#7fd1ff', 70], [22, 52, '#ffe066', -40]].map(([x, y, c, r]) => (
      <rect key={x + '' + y} x={x} y={y} width="9" height="3.5" rx="1.75" fill={c} transform={`rotate(${r} ${x} ${y})`} />
    ))}
    <Face mood={m} y={58} gap={15} my={80} />
  </>) },
  toast: { label: 'Toast', draw: (m) => (<>
    <path d="M20 46 C8 46 8 14 34 12 C44 6 76 6 86 12 C112 14 112 46 100 46 L100 106 C100 110 96 112 92 112 L28 112 C24 112 20 110 20 106 Z" fill="#c98a4b" />
    <path d="M28 48 C18 48 18 22 38 20 C46 15 74 15 82 20 C102 22 102 48 92 48 L92 102 C92 104 90 105 88 105 L32 105 C30 105 28 104 28 102 Z" fill="#f6dba6" />
    <Face mood={m} y={62} gap={14} my={84} />
  </>) },
  egg: { label: 'Fried egg', draw: (m) => (<>
    <path d="M18 70 C10 44 30 22 52 26 C66 12 96 20 100 42 C116 54 110 86 92 94 C84 112 54 112 42 102 C22 104 8 90 18 70 Z" fill="#ffffff" stroke="#eee8de" strokeWidth="2" />
    <circle cx="60" cy="64" r="28" fill="#ffc83d" /><circle cx="50" cy="54" r="7" fill="#fff" opacity="0.35" />
    <Face mood={m} y={60} gap={11} my={74} cheeks="#ff8a5c" />
  </>) },
  broccoli: { label: 'Broccoli', draw: (m) => (<>
    {g('b-broc', '#8fd66a', '#4ea24a')}
    <rect x="46" y="70" width="28" height="42" rx="12" fill="#b6e08c" />
    <g fill="url(#b-broc)"><circle cx="34" cy="50" r="22" /><circle cx="60" cy="34" r="26" /><circle cx="86" cy="50" r="22" /><circle cx="60" cy="62" r="26" /></g>
    <Face mood={m} y={54} gap={14} my={74} />
  </>) },
  dino: { label: 'Little dino', draw: (m) => (<>
    {g('b-dino', '#9be3b5', '#4dbb83')}
    <g fill="#3f9f6c"><path d="M38 30 l8 -16 l8 16 z" /><path d="M54 24 l8 -16 l8 16 z" /><path d="M70 30 l8 -14 l7 16 z" /></g>
    <rect x="16" y="28" width="88" height="80" rx="40" fill="url(#b-dino)" />
    <ellipse cx="60" cy="92" rx="26" ry="14" fill="#d8f5df" />
    <Face mood={m} y={60} gap={16} my={86} />
  </>) },
  ghost: { label: 'Ghost', draw: (m) => (<>
    <path d="M18 60 C18 30 38 12 60 12 C82 12 102 30 102 60 L102 104 C96 112 90 100 84 108 C78 116 72 102 66 110 C60 118 54 102 48 110 C42 116 36 102 30 108 C24 114 18 104 18 104 Z" fill="#f6f4ff" stroke="#e4e0f5" strokeWidth="2" />
    <Face mood={m} y={56} gap={15} cheeks="#c9b8ff" />
  </>) },
  bean: { label: 'Jelly bean', draw: (m) => (<>
    {g('b-bean', '#c7a6ff', '#8b63e6')}
    <path d="M26 28 C46 10 86 14 98 40 C108 62 92 74 96 92 C98 108 80 116 60 112 C34 108 14 96 14 70 C14 50 16 38 26 28 Z" fill="url(#b-bean)" />
    <ellipse cx="44" cy="32" rx="12" ry="5" fill="#fff" opacity="0.35" transform="rotate(-20 44 32)" />
    <Face mood={m} y={60} gap={15} />
  </>) },
  cloud: { label: 'Cloud monster', draw: (m) => (<>
    {g('b-cloud', '#a6e3a1', '#5fbf72')}
    <g fill="url(#b-cloud)"><circle cx="38" cy="40" r="17" /><circle cx="60" cy="31" r="20" /><circle cx="82" cy="40" r="17" /><rect x="18" y="38" width="84" height="66" rx="33" /></g>
    <g fill="#5fbf72"><rect x="36" y="98" width="12" height="12" rx="6" /><rect x="72" y="98" width="12" height="12" rx="6" /></g>
    <Face mood={m} y={58} gap={15} />
  </>) },
  blobcat: { label: 'Blob cat', draw: (m) => (<>
    {g('b-cat', '#ffd28a', '#f3a647')}
    <path d="M22 50 L26 14 L52 34 Z" fill="#f3a647" /><path d="M98 50 L94 14 L68 34 Z" fill="#f3a647" />
    <rect x="16" y="28" width="88" height="80" rx="40" fill="url(#b-cat)" />
    <g stroke="#b9772f" strokeWidth="3" strokeLinecap="round" opacity="0.6"><path d="M52 32 v8" /><path d="M60 30 v10" /><path d="M68 32 v8" /></g>
    <path d="M55 74 h10 l-5 4 z" fill="#ff7d93" />
    <Face mood={m} y={62} gap={16} my={86} />
  </>) },
  boba: { label: 'Boba', draw: (m) => (<>
    {g('b-boba', '#f6dcc0', '#e3b98f')}
    <rect x="72" y="2" width="9" height="34" rx="4.5" fill="#ff8fb1" transform="rotate(14 76 18)" />
    <path d="M24 30 h72 l-8 74 c-1 6 -6 8 -12 8 h-32 c-6 0 -11 -2 -12 -8 z" fill="url(#b-boba)" />
    <rect x="20" y="24" width="80" height="12" rx="6" fill="#fff" opacity="0.9" />
    <g fill="#4a2f24">{[[40, 98], [52, 102], [64, 99], [76, 101], [46, 90], [70, 91], [58, 92]].map(([x, y]) => <circle key={x + '' + y} cx={x} cy={y} r="5" />)}</g>
    <Face mood={m} y={58} gap={13} my={72} />
  </>) },
  dumpling: { label: 'Dumpling', draw: (m) => (<>
    {g('b-dump', '#ffffff', '#f2eadf')}
    <ellipse cx="60" cy="108" rx="42" ry="6" fill="#000" opacity="0.06" />
    <path d="M10 84 C10 52 32 30 60 30 C88 30 110 52 110 84 C110 100 92 106 60 106 C28 106 10 100 10 84 Z" fill="url(#b-dump)" stroke="#e8dfd2" strokeWidth="2" />
    <g stroke="#e1d6c6" strokeWidth="3" strokeLinecap="round" fill="none"><path d="M44 36 q4 8 2 14" /><path d="M56 32 q3 9 1 16" /><path d="M68 32 q-1 9 0 16" /><path d="M80 36 q-4 8 -2 14" /></g>
    <Face mood={m} y={70} gap={15} />
  </>) },
  strawberry: { label: 'Strawberry', draw: (m) => (<>
    {g('b-straw', '#ff6f7d', '#e23d55')}
    <path d="M60 112 C34 106 14 80 16 56 C18 36 36 28 60 28 C84 28 102 36 104 56 C106 80 86 106 60 112 Z" fill="url(#b-straw)" />
    <g fill="#57b847"><path d="M60 30 L44 14 L56 22 L60 8 L64 22 L76 14 Z" /><ellipse cx="60" cy="30" rx="22" ry="7" /></g>
    <g fill="#ffe08a">{[[34, 52], [86, 52], [30, 76], [90, 76], [46, 96], [74, 96], [60, 102]].map(([x, y]) => <ellipse key={x + '' + y} cx={x} cy={y} rx="2" ry="3" />)}</g>
    <Face mood={m} y={62} gap={14} cheeks="#ffb3bd" />
  </>) },
  sushi: { label: 'Sushi', draw: (m) => (<>
    <ellipse cx="60" cy="106" rx="44" ry="6" fill="#000" opacity="0.06" />
    <rect x="16" y="56" width="88" height="48" rx="22" fill="#fffdf8" stroke="#ece6da" strokeWidth="2" />
    <path d="M12 60 C14 36 36 28 60 28 C84 28 106 36 108 60 C108 70 96 70 60 70 C24 70 12 70 12 60 Z" fill="#ff9a6b" />
    <g stroke="#ffd2bb" strokeWidth="4" strokeLinecap="round" opacity="0.9"><path d="M30 40 l12 22" /><path d="M54 32 l10 34" /><path d="M78 36 l6 28" /></g>
    <rect x="16" y="90" width="88" height="12" fill="#2f3d33" />
    <Face mood={m} y={74} gap={16} my={84} />
  </>) },
  cupcake: { label: 'Cupcake', draw: (m) => (<>
    <path d="M24 66 h72 l-9 42 c-1 4 -4 6 -8 6 h-38 c-4 0 -7 -2 -8 -6 z" fill="#8fd3ff" />
    <g stroke="#6bbbe9" strokeWidth="3">{[36, 48, 60, 72, 84].map((x) => <path key={x} d={`M${x} 68 L${x + (x - 60) * 0.12} 112`} />)}</g>
    <path d="M18 68 C10 52 26 40 34 40 C34 24 50 16 60 22 C70 16 86 24 86 40 C94 40 110 52 102 68 C96 76 24 76 18 68 Z" fill="#ffc1dc" />
    <circle cx="60" cy="14" r="8" fill="#ff5d73" /><path d="M60 7 q4 -6 8 -4" stroke="#5aa04a" strokeWidth="2.5" fill="none" strokeLinecap="round" />
    <g fill="#fff">{[[36, 50], [80, 48], [56, 34], [70, 58], [44, 60]].map(([x, y]) => <rect key={x + '' + y} x={x} y={y} width="7" height="3" rx="1.5" transform={`rotate(${x} ${x} ${y})`} />)}</g>
    <Face mood={m} y={86} gap={14} my={98} />
  </>) },
  coffee: { label: 'Coffee cup', draw: (m) => (<>
    <path d="M96 52 c18 0 18 30 0 30" stroke="#ffffff" strokeWidth="9" fill="none" />
    <path d="M96 52 c18 0 18 30 0 30" stroke="#e8e2da" strokeWidth="2" fill="none" />
    <path d="M18 40 h82 v42 c0 18 -14 28 -30 28 h-22 c-16 0 -30 -10 -30 -28 z" fill="#ffffff" stroke="#e8e2da" strokeWidth="2" />
    <ellipse cx="59" cy="40" rx="41" ry="9" fill="#8a5a3c" /><ellipse cx="52" cy="38" rx="10" ry="3" fill="#c79a73" />
    <g stroke="#cfc6bb" strokeWidth="3" strokeLinecap="round" fill="none"><path d="M44 24 q-5 -7 0 -14" /><path d="M60 22 q-5 -7 0 -14" /><path d="M76 24 q-5 -7 0 -14" /></g>
    <Face mood={m} y={66} gap={14} my={82} />
  </>) },
  panda: { label: 'Panda', draw: (m) => (<>
    <circle cx="27" cy="34" r="13" fill="#3b3b44" /><circle cx="93" cy="34" r="13" fill="#3b3b44" />
    <rect x="14" y="26" width="92" height="84" rx="42" fill="#ffffff" stroke="#ececf1" strokeWidth="2" />
    <ellipse cx="44" cy="63" rx="11" ry="9" fill="#3b3b44" transform="rotate(-18 44 63)" /><ellipse cx="76" cy="63" rx="11" ry="9" fill="#3b3b44" transform="rotate(18 76 63)" />
    <ellipse cx="60" cy="80" rx="5" ry="3.5" fill="#3b3b44" />
    <Face mood={m} y={62} gap={16} my={86} eyeInk="#ffffff" />
  </>) },
  penguin: { label: 'Penguin', draw: (m) => (<>
    {g('b-peng', '#56627a', '#36405a')}
    <ellipse cx="60" cy="110" rx="34" ry="5" fill="#000" opacity="0.06" />
    <ellipse cx="17" cy="74" rx="8" ry="18" fill="#36405a" transform="rotate(18 17 74)" /><ellipse cx="103" cy="74" rx="8" ry="18" fill="#36405a" transform="rotate(-18 103 74)" />
    <path d="M60 14 C88 14 102 38 102 66 C102 96 84 110 60 110 C36 110 18 96 18 66 C18 38 32 14 60 14 Z" fill="url(#b-peng)" />
    <path d="M60 40 C66 30 86 30 88 50 C90 66 86 98 60 102 C34 98 30 66 32 50 C34 30 54 30 60 40 Z" fill="#fffdf8" />
    <g fill="#ffb347"><ellipse cx="46" cy="110" rx="9" ry="4" /><ellipse cx="74" cy="110" rx="9" ry="4" /></g>
    <Face mood={m} y={58} gap={12} my={78} cheeks="#ffb0c0" />
    <path d="M53 66 q7 -4 14 0 l-7 7 z" fill="#ffa63d" />
  </>) },
}

export function Buddy({ id, mood = 'happy', size = 64 }) {
  const b = BUDDIES[id] ?? BUDDIES.cloud
  return <svg width={size} height={size} viewBox="0 0 120 120" aria-hidden="true" style={{ overflow: 'visible' }}>{b.draw(mood)}</svg>
}
