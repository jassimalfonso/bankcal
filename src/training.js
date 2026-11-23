import { WORKOUTS } from './calc.js'

// Exercise library, levels and workout plans for the Train tab.
// Sets, reps and rest follow common strength-training guidance for each level
// (e.g. ACSM: 2–4 sets of 8–12 reps for general strength; beginners start with 1–2 sets).
// Weight ranges are conservative STARTING points per dumbbell, not targets.

export const LEVELS = [
  { id: 'beginner', label: 'Beginner', hint: 'New or back after a break' },
  { id: 'intermediate', label: 'Intermediate', hint: 'Training regularly for 3+ months' },
  { id: 'advanced', label: 'Advanced', hint: 'A year or more of steady training' },
]

export const GROUPS = [
  { id: 'all', label: 'All' }, { id: 'legs', label: 'Legs' }, { id: 'push', label: 'Push' },
  { id: 'pull', label: 'Pull' }, { id: 'core', label: 'Core' }, { id: 'cardio', label: 'Cardio' },
]

// log: how it's saved in Deposits ({ type } from calc WORKOUTS; weighted ones use 'dumbbells' with kg)
// kg: starting range per dumbbell [low, high] by sex and level; one: true = a single dumbbell
export const EXERCISES = [
  {
    id: 'squat', name: 'Squat', emoji: '🦵', group: 'legs', muscles: 'Thighs, glutes, core', equipment: 'None or a chair',
    log: { type: 'squats' },
    levels: {
      beginner: { variant: 'Box squat to a chair', sets: 2, reps: '8–10', rest: '60–90 s' },
      intermediate: { variant: 'Bodyweight squat', sets: 3, reps: '12–15', rest: '60 s' },
      advanced: { variant: 'Pause squat (2 s at the bottom)', sets: 4, reps: '12–15', rest: '60 s' },
    },
    steps: ['Stand with feet shoulder-width apart, toes turned out slightly.', 'Push your hips back and bend your knees, as if sitting into a chair.', 'Go down until thighs are about parallel to the floor, or as low as you can with a flat back.', 'Drive through your whole foot to stand back up.'],
    cues: ['Chest up, eyes forward', 'Knees track over your toes, not caving in', 'Heels stay down', 'Back stays neutral, not rounded'],
    mistakes: ['Knees collapsing inward', 'Heels lifting', 'Rounding the lower back at the bottom'],
    breathing: 'Breathe in on the way down, out as you stand.',
  },
  {
    id: 'goblet', name: 'Goblet squat', emoji: '🏋️', group: 'legs', muscles: 'Thighs, glutes, core', equipment: '1 dumbbell',
    log: { type: 'dumbbells' }, one: true,
    kg: { f: { beginner: [4, 8], intermediate: [10, 14], advanced: [16, 24] }, m: { beginner: [8, 12], intermediate: [16, 22], advanced: [24, 32] } },
    levels: {
      beginner: { variant: 'Light dumbbell, to a chair', sets: 2, reps: '8–10', rest: '90 s' },
      intermediate: { variant: 'Full-depth goblet squat', sets: 3, reps: '8–12', rest: '90 s' },
      advanced: { variant: 'Heavier, 3 s lowering', sets: 4, reps: '8–10', rest: '2 min' },
    },
    steps: ['Hold one dumbbell vertically against your chest, both hands under the top end.', 'Feet shoulder-width, toes slightly out.', 'Sit down between your heels, keeping the weight close.', 'Stand up by pushing the floor away.'],
    cues: ['Elbows point down, inside the knees at the bottom', 'Torso stays tall', 'Weight in mid-foot and heels'],
    mistakes: ['Letting the dumbbell drift away from the chest', 'Leaning forward', 'Bouncing at the bottom'],
    breathing: 'Breathe in and brace before lowering, breathe out near the top.',
  },
  {
    id: 'lunge', name: 'Reverse lunge', emoji: '🚶', group: 'legs', muscles: 'Thighs, glutes, balance', equipment: 'None, or 2 dumbbells',
    log: { type: 'lunges' },
    kg: { f: { beginner: [0, 0], intermediate: [4, 8], advanced: [9, 12] }, m: { beginner: [0, 0], intermediate: [6, 12], advanced: [14, 20] } },
    levels: {
      beginner: { variant: 'Bodyweight, holding a wall for balance', sets: 2, reps: '6–8 each leg', rest: '60 s' },
      intermediate: { variant: 'Holding dumbbells at your sides', sets: 3, reps: '8–10 each leg', rest: '90 s' },
      advanced: { variant: 'Heavier, or with a front knee pause', sets: 3, reps: '10–12 each leg', rest: '90 s' },
    },
    steps: ['Stand tall, feet hip-width apart.', 'Step one foot back and lower until both knees are bent about 90°.', 'Back knee hovers just above the floor.', 'Push through the front heel to step back to standing.'],
    cues: ['Front knee stays over the ankle', 'Torso upright', 'Hips square to the front'],
    mistakes: ['Front knee shooting past the toes and heel lifting', 'Steps too short', 'Leaning sideways'],
    breathing: 'In as you step back, out as you return.',
  },
  {
    id: 'rdl', name: 'Romanian deadlift', emoji: '🏋️', group: 'pull', muscles: 'Hamstrings, glutes, lower back', equipment: '2 dumbbells',
    log: { type: 'dumbbells' },
    kg: { f: { beginner: [4, 6], intermediate: [8, 12], advanced: [14, 20] }, m: { beginner: [8, 10], intermediate: [12, 18], advanced: [20, 28] } },
    levels: {
      beginner: { variant: 'Light dumbbells, to mid-shin', sets: 2, reps: '8–10', rest: '90 s' },
      intermediate: { variant: 'Full range, slow lowering', sets: 3, reps: '8–12', rest: '90 s' },
      advanced: { variant: 'Heavier, or single-leg', sets: 4, reps: '8–10', rest: '2 min' },
    },
    steps: ['Stand with dumbbells in front of your thighs, soft knees.', 'Push your hips straight back, letting the weights slide down your legs.', 'Stop when you feel a strong hamstring stretch, usually just below the knees.', 'Squeeze your glutes to stand back up.'],
    cues: ['Back flat from head to hips', 'Weights stay close to the legs', 'It’s a hip hinge, not a squat: shins stay nearly vertical'],
    mistakes: ['Rounding the back to reach lower', 'Bending the knees too much', 'Leaning back at the top'],
    breathing: 'Breathe in at the top and brace, out as you stand.',
    caution: 'Stop if you feel it in your lower back rather than your hamstrings. Lighten the weight and shorten the range.',
  },
  {
    id: 'bridge', name: 'Glute bridge', emoji: '🍑', group: 'legs', muscles: 'Glutes, hamstrings', equipment: 'None, or 1 dumbbell',
    log: { type: 'bridge' },
    levels: {
      beginner: { variant: 'Two-leg bridge', sets: 2, reps: '10–12', rest: '45 s' },
      intermediate: { variant: 'Dumbbell on hips, 2 s squeeze', sets: 3, reps: '12–15', rest: '60 s' },
      advanced: { variant: 'Single-leg bridge', sets: 3, reps: '10–12 each leg', rest: '60 s' },
    },
    steps: ['Lie on your back, knees bent, feet flat and hip-width apart.', 'Press through your heels and lift your hips until body is in a straight line from knees to shoulders.', 'Squeeze your glutes at the top for a second.', 'Lower slowly.'],
    cues: ['Ribs down, don’t arch the lower back', 'Push through the heels', 'Knees stay hip-width'],
    mistakes: ['Overarching at the top', 'Pushing through the toes', 'Rushing the reps'],
    breathing: 'Out as you lift, in as you lower.',
  },
  {
    id: 'pushup', name: 'Push-up', emoji: '💪', group: 'push', muscles: 'Chest, shoulders, triceps, core', equipment: 'None',
    log: { type: 'pushups' },
    levels: {
      beginner: { variant: 'Incline push-up (hands on a bench or wall)', sets: 2, reps: '6–10', rest: '60–90 s' },
      intermediate: { variant: 'Knee or full push-up', sets: 3, reps: '8–12', rest: '60–90 s' },
      advanced: { variant: 'Full push-up, feet raised or 3 s lowering', sets: 4, reps: '10–15', rest: '90 s' },
    },
    steps: ['Hands slightly wider than shoulders, body in a straight line from head to heels.', 'Lower your chest towards the floor, elbows at about 45° from your body.', 'Go down until your chest is a fist’s height off the floor.', 'Push the floor away to straighten your arms.'],
    cues: ['Squeeze glutes and brace your stomach: no sagging hips', 'Elbows angled back, not flared out wide', 'Neck in line with your spine'],
    mistakes: ['Hips sagging or piked up', 'Elbows flaring to 90°', 'Half reps'],
    breathing: 'In on the way down, out as you push.',
  },
  {
    id: 'press', name: 'Dumbbell chest press', emoji: '🏋️', group: 'push', muscles: 'Chest, shoulders, triceps', equipment: '2 dumbbells, bench or floor',
    log: { type: 'dumbbells' },
    kg: { f: { beginner: [3, 5], intermediate: [6, 10], advanced: [12, 16] }, m: { beginner: [6, 10], intermediate: [12, 18], advanced: [20, 30] } },
    levels: {
      beginner: { variant: 'Floor press (lying on the floor)', sets: 2, reps: '8–10', rest: '90 s' },
      intermediate: { variant: 'Bench press', sets: 3, reps: '8–12', rest: '90 s' },
      advanced: { variant: 'Heavier, or incline bench', sets: 4, reps: '6–10', rest: '2 min' },
    },
    steps: ['Lie back holding dumbbells above your chest, palms facing your feet.', 'Lower them slowly to the sides of your chest, elbows about 45° from your body.', 'Press back up until arms are straight but not locked.'],
    cues: ['Shoulder blades pulled back and down', 'Feet flat on the floor', 'Wrists stacked over elbows'],
    mistakes: ['Elbows flared straight out', 'Bouncing the weights', 'Lower back arching off the bench'],
    breathing: 'In as you lower, out as you press.',
  },
  {
    id: 'shoulder', name: 'Shoulder press', emoji: '🙆', group: 'push', muscles: 'Shoulders, triceps, upper back', equipment: '2 dumbbells',
    log: { type: 'dumbbells' },
    kg: { f: { beginner: [2, 4], intermediate: [5, 8], advanced: [9, 12] }, m: { beginner: [5, 8], intermediate: [9, 14], advanced: [15, 22] } },
    levels: {
      beginner: { variant: 'Seated, back supported', sets: 2, reps: '8–10', rest: '90 s' },
      intermediate: { variant: 'Standing press', sets: 3, reps: '8–12', rest: '90 s' },
      advanced: { variant: 'Heavier standing press', sets: 4, reps: '6–10', rest: '2 min' },
    },
    steps: ['Hold dumbbells at shoulder height, palms facing forward.', 'Press straight up until arms are extended overhead.', 'Lower slowly back to your shoulders.'],
    cues: ['Brace your stomach and squeeze glutes: no leaning back', 'Wrists over elbows', 'Head moves slightly back as weights pass your face'],
    mistakes: ['Arching the lower back', 'Pressing forward instead of up', 'Shrugging the shoulders to the ears'],
    breathing: 'Out as you press, in as you lower.',
    caution: 'Skip or go lighter if you have shoulder pain when your arms are overhead.',
  },
  {
    id: 'row', name: 'One-arm dumbbell row', emoji: '🚣', group: 'pull', muscles: 'Upper back, lats, biceps', equipment: '1 dumbbell, bench or chair',
    log: { type: 'dumbbells' }, one: true,
    kg: { f: { beginner: [4, 6], intermediate: [8, 12], advanced: [14, 18] }, m: { beginner: [8, 12], intermediate: [14, 20], advanced: [22, 32] } },
    levels: {
      beginner: { variant: 'Supported on a bench or chair', sets: 2, reps: '8–10 each arm', rest: '60 s' },
      intermediate: { variant: 'Supported, 1 s squeeze at the top', sets: 3, reps: '10–12 each arm', rest: '60–90 s' },
      advanced: { variant: 'Heavier, 3 s lowering', sets: 4, reps: '8–10 each arm', rest: '90 s' },
    },
    steps: ['Put one knee and the same-side hand on a bench, back flat.', 'Hold the dumbbell with your free arm hanging straight down.', 'Pull your elbow up towards your hip until the dumbbell reaches your waist.', 'Lower slowly until your arm is straight.'],
    cues: ['Back flat and level, like a tabletop', 'Pull with your back, not your arm', 'Don’t twist your torso open'],
    mistakes: ['Jerking the weight up', 'Rotating the body', 'Shrugging instead of rowing'],
    breathing: 'Out as you pull, in as you lower.',
  },
  {
    id: 'curl', name: 'Bicep curl', emoji: '💪', group: 'pull', muscles: 'Biceps, forearms', equipment: '2 dumbbells',
    log: { type: 'dumbbells' },
    kg: { f: { beginner: [2, 4], intermediate: [5, 7], advanced: [8, 10] }, m: { beginner: [4, 6], intermediate: [8, 12], advanced: [12, 16] } },
    levels: {
      beginner: { variant: 'Alternating arms', sets: 2, reps: '10–12', rest: '60 s' },
      intermediate: { variant: 'Both arms together', sets: 3, reps: '10–12', rest: '60 s' },
      advanced: { variant: 'Heavier, 3 s lowering', sets: 3, reps: '8–10', rest: '90 s' },
    },
    steps: ['Stand tall, dumbbells at your sides, palms facing forward.', 'Curl the weights up by bending your elbows.', 'Squeeze at the top, then lower slowly to full extension.'],
    cues: ['Elbows pinned to your sides', 'No swinging from the hips', 'Full range: straight arm at the bottom'],
    mistakes: ['Swinging the body', 'Elbows drifting forward', 'Dropping the weight quickly'],
    breathing: 'Out as you curl, in as you lower.',
  },
  {
    id: 'hang', name: 'Dead hang', emoji: '🙌', group: 'pull', muscles: 'Grip, shoulders, back', equipment: 'Pull-up bar',
    log: { type: 'hang', sec: true },
    levels: {
      beginner: { variant: 'Feet lightly touching a box to take some weight', sets: 3, reps: '10–20 s', rest: '60 s' },
      intermediate: { variant: 'Full dead hang', sets: 3, reps: '20–40 s', rest: '60 s' },
      advanced: { variant: 'Active hang (shoulders pulled down)', sets: 3, reps: '40–60 s', rest: '90 s' },
    },
    steps: ['Grip the bar slightly wider than your shoulders, palms facing away.', 'Lift your feet and hang with straight arms.', 'Hold for the time, then step down with control.'],
    cues: ['Breathe steadily', 'Keep a light brace in your stomach', 'Don’t let your body swing'],
    mistakes: ['Dropping off the bar instead of stepping down', 'Holding your breath'],
    breathing: 'Slow, steady breaths throughout.',
    caution: 'Use a sturdy bar and a step to get on and off safely.',
  },
  {
    id: 'plank', name: 'Plank', emoji: '📏', group: 'core', muscles: 'Core, shoulders', equipment: 'None',
    log: { type: 'plank', sec: true },
    levels: {
      beginner: { variant: 'Knee plank', sets: 3, reps: '15–25 s', rest: '45 s' },
      intermediate: { variant: 'Forearm plank', sets: 3, reps: '30–45 s', rest: '45 s' },
      advanced: { variant: 'Plank with shoulder taps or leg lifts', sets: 3, reps: '45–60 s', rest: '60 s' },
    },
    steps: ['Forearms on the floor, elbows under shoulders.', 'Step your feet back so your body forms a straight line.', 'Hold, pressing the floor away.'],
    cues: ['Squeeze glutes and brace your stomach', 'Hips level, not sagging or piked', 'Look at the floor just ahead of your hands'],
    mistakes: ['Hips dropping', 'Holding your breath', 'Shoulders sinking'],
    breathing: 'Short, steady breaths while staying braced.',
  },
  {
    id: 'deadbug', name: 'Dead bug', emoji: '🪲', group: 'core', muscles: 'Deep core', equipment: 'None',
    log: { type: 'situps' },
    levels: {
      beginner: { variant: 'Legs only, arms on the floor', sets: 2, reps: '6 each side', rest: '45 s' },
      intermediate: { variant: 'Opposite arm and leg', sets: 3, reps: '8 each side', rest: '45 s' },
      advanced: { variant: 'Holding a light dumbbell, slow tempo', sets: 3, reps: '10 each side', rest: '60 s' },
    },
    steps: ['Lie on your back, arms straight up, knees bent at 90° over your hips.', 'Press your lower back gently into the floor.', 'Slowly lower one arm behind you and the opposite leg towards the floor.', 'Return and switch sides.'],
    cues: ['Lower back stays flat on the floor', 'Move slowly', 'Only go as low as you can without arching'],
    mistakes: ['Back arching off the floor', 'Rushing', 'Holding your breath'],
    breathing: 'Breathe out as you extend, in as you return.',
  },
  {
    id: 'jacks', name: 'Jumping jacks', emoji: '⭐', group: 'cardio', muscles: 'Full body, heart and lungs', equipment: 'None',
    log: { type: 'jacks' },
    levels: {
      beginner: { variant: 'Step jacks (no jump)', sets: 2, reps: '20', rest: '30 s' },
      intermediate: { variant: 'Jumping jacks', sets: 3, reps: '30', rest: '30 s' },
      advanced: { variant: 'Fast jumping jacks', sets: 4, reps: '40', rest: '20 s' },
    },
    steps: ['Stand with feet together, arms at your sides.', 'Jump your feet out while raising your arms overhead.', 'Jump back to the start.'],
    cues: ['Land softly on the balls of your feet', 'Knees slightly bent', 'Stay light and rhythmic'],
    mistakes: ['Landing flat-footed and heavy', 'Locked knees'],
    breathing: 'Keep breathing rhythmically; don’t hold it.',
  },
  {
    id: 'burpee', name: 'Burpee', emoji: '🔥', group: 'cardio', muscles: 'Full body, heart and lungs', equipment: 'None',
    log: { type: 'burpees' },
    levels: {
      beginner: { variant: 'Walk-out burpee (step back, no push-up, no jump)', sets: 2, reps: '5–6', rest: '60 s' },
      intermediate: { variant: 'Burpee without the push-up', sets: 3, reps: '8–10', rest: '60 s' },
      advanced: { variant: 'Full burpee with push-up and jump', sets: 4, reps: '10–12', rest: '45 s' },
    },
    steps: ['Squat down and place your hands on the floor.', 'Jump or step your feet back into a plank.', 'Jump or step your feet back to your hands.', 'Stand up, or jump with arms overhead.'],
    cues: ['Keep a straight plank, no sagging hips', 'Land softly', 'Move at a pace you can control'],
    mistakes: ['Hips dropping in the plank', 'Landing with straight legs'],
    breathing: 'Out on the effort, then recover before the next rep.',
  },
]

export const exerciseById = Object.fromEntries(EXERCISES.map((e) => [e.id, e]))

// Starting weight range for a person (per dumbbell). null = bodyweight at this level.
export function weightRange(ex, sex, level) {
  const r = ex.kg?.[sex === 'f' ? 'f' : 'm']?.[level]
  return r && r[1] > 0 ? r : null
}

// Ready-made plans. Each session uses the user's level for sets and reps.
export const PLANS = [
  {
    id: 'start', name: 'Start here', emoji: '🌱', days: 3, mins: 25, level: 'Beginner friendly',
    blurb: 'Full body, three days a week. Learn the basic moves with bodyweight before adding weight.',
    sessions: [
      { name: 'Session A', items: ['squat', 'pushup', 'bridge', 'plank'] },
      { name: 'Session B', items: ['lunge', 'deadbug', 'jacks', 'hang'] },
    ],
  },
  {
    id: 'home', name: 'No equipment', emoji: '🏠', days: 3, mins: 30, level: 'All levels',
    blurb: 'Everything at home, no gym needed. Your level decides the version of each move.',
    sessions: [
      { name: 'Legs and core', items: ['squat', 'lunge', 'bridge', 'deadbug', 'plank'] },
      { name: 'Upper body and cardio', items: ['pushup', 'burpee', 'jacks', 'plank'] },
    ],
  },
  {
    id: 'dumbbell', name: 'Dumbbell strength', emoji: '🏋️', days: 4, mins: 40, level: 'Intermediate',
    blurb: 'Upper and lower days, twice each a week. Build strength with a pair of dumbbells.',
    sessions: [
      { name: 'Lower body', items: ['goblet', 'rdl', 'lunge', 'bridge', 'plank'] },
      { name: 'Upper body', items: ['press', 'row', 'shoulder', 'curl', 'deadbug'] },
    ],
  },
  {
    id: 'burn', name: 'Quick burn', emoji: '⚡', days: 3, mins: 20, level: 'All levels',
    blurb: 'A circuit: one move after another, rest 1 minute after each round. 15–25 minutes, good on busy days.',
    sessions: [{ name: 'Circuit', items: ['jacks', 'squat', 'pushup', 'burpee', 'plank'] }],
  },
]

const secs = (txt) => { const n = parseInt(txt, 10) || 0; return /min/.test(txt) ? n * 60 : n }

// Estimated minutes for an exercise at a level, rests included.
export function exerciseMinutes(ex, level) {
  const L = ex.levels[level]
  const each = /each/.test(L.reps) ? 2 : 1
  const work = ex.log.sec ? secs(L.reps) : (parseInt(L.reps, 10) || 10) * 3 * each
  return (L.sets * (work + secs(L.rest))) / 60
}

// Turn an exercise into a Deposits entry. Strength moves count the whole time
// including rests (how the Compendium rates resistance training); cardio moves keep their own value.
export function toWorkout(ex, level, kg) {
  const L = ex.levels[level]
  const w = ex.group !== 'cardio' && kg > 0 && ex.kg ? ` @ ${kg} kg` : ''
  if (ex.group === 'cardio') {
    const each = /each/.test(L.reps) ? 2 : 1
    return { type: ex.log.type, sets: L.sets, reps: (parseInt(L.reps, 10) || 10) * each, label: ex.name }
  }
  return { type: 'strength', min: Math.max(1, Math.round(exerciseMinutes(ex, level))), label: ex.name, note: `${L.sets} × ${L.reps}${w}` }
}

// A whole session as one Deposits entry, with a 5-minute warm-up.
// Circuits rest only between rounds, so they use fixed lengths per level.
const CIRCUIT_MIN = { beginner: 15, intermediate: 20, advanced: 25 }
export function toSession(plan, session, level) {
  const mins = plan.id === 'burn' ? CIRCUIT_MIN[level] : Math.round(5 + session.items.reduce((a, id) => a + exerciseMinutes(exerciseById[id], level), 0))
  return { type: plan.id === 'burn' ? 'circuit' : 'strength', min: mins, label: `${plan.name}: ${session.name}`, note: `${session.items.length} exercises · ${mins} min` }
}

// ───────── Your own exercises and your routine ─────────
// Effort levels use Compendium of Physical Activities values:
// calisthenics light 2.8, moderate 3.8; vigorous resistance training 6.0; vigorous calisthenics 8.0.
export const EFFORTS = [
  { id: 'light', label: 'Light', met: 2.8, hint: 'Stretching, mobility, easy bodyweight moves' },
  { id: 'moderate', label: 'Moderate', met: 3.8, hint: 'Most dumbbell and bodyweight exercises' },
  { id: 'hard', label: 'Hard', met: 6.0, hint: 'Heavy lifting or short rests; you’re out of breath' },
  { id: 'cardio', label: 'Very hard', met: 8.0, hint: 'Fast cardio like burpees, skipping, sprints' },
]
const REST_MET = 2.0 // standing around between hard sets

// A routine item from a library exercise at your level.
export function routineFromExercise(ex, level, kg) {
  const L = ex.levels[level]
  const n = parseInt(L.reps, 10) || 10
  const met = ex.group === 'cardio' ? (WORKOUTS.find((w) => w.id === ex.log.type)?.met ?? 8) : 3.5
  return {
    id: `r${Date.now().toString(36)}`, ex: ex.id, name: ex.name, emoji: ex.emoji,
    kind: ex.log.sec ? 'time' : 'reps', sets: L.sets, reps: ex.log.sec ? undefined : n, sec: ex.log.sec ? n : undefined,
    each: /each/.test(L.reps) || undefined, kg: ex.kg && kg > 0 ? +kg : undefined, rest: secs(L.rest) || 60, met,
  }
}
export function routineFromCustom(c) {
  return { id: `r${Date.now().toString(36)}`, ex: c.id, name: c.name, emoji: c.emoji ?? '✅', kind: c.kind, sets: +c.sets || 3, reps: c.kind === 'reps' ? (+c.reps || 10) : undefined, sec: c.kind === 'time' ? (+c.sec || 30) : undefined, kg: c.weighted ? (c.kg != null ? +c.kg : 5) : undefined, rest: 60, met: c.met }
}

// Minutes and effort for a routine item. Up to moderate effort the whole time counts at that
// level, rests included (how the Compendium rates weight training). For harder efforts only the
// working time counts at the high level and the rests count as light standing.
export function routineWorkout(item) {
  const sets = +item.sets || 1
  const work = sets * (item.kind === 'time' ? (+item.sec || 0) : (+item.reps || 0) * 3 * (item.each ? 2 : 1))
  const rest = sets * (+item.rest || 60)
  const total = work + rest
  const met = item.met <= 3.8 ? item.met : total > 0 ? (item.met * work + REST_MET * rest) / total : item.met
  const dose = item.kind === 'time' ? `${sets} × ${item.sec} s` : `${sets} × ${item.reps}${item.each ? ' each side' : ''}`
  // `item` keeps the sets/reps/kg so the logged workout can be edited later
  const keep = Object.fromEntries(Object.entries({ name: item.name, emoji: item.emoji, kind: item.kind, sets, reps: item.reps, sec: item.sec, kg: item.kg, each: item.each, rest: item.rest, met: item.met }).filter(([, v]) => v !== undefined && v !== null))
  return { type: 'custom', rid: item.id, min: Math.round((total / 60) * 10) / 10, met: Math.round(met * 100) / 100, label: item.name, note: `${dose}${item.kg ? ` @ ${item.kg} kg` : ''}`, item: keep }
}

// ---------- Your workouts + exercise search (used by "Log a workout") ----------
const doseOf = (it) => (it.kind === 'time' ? `${it.sets} × ${it.sec} s` : `${it.sets} × ${it.reps}${it.each ? ' each side' : ''}`) + (it.kg ? ` · ${it.kg} kg` : '')

// Your routine first, then your own exercises that aren't in it
export function myWorkouts(profile, todaysWorkouts = []) {
  const routine = profile.routine ?? []
  return [
    ...routine.map((it) => ({ key: it.id, item: it, done: todaysWorkouts.some((w) => w.rid === it.id) })),
    ...(profile.customEx ?? []).filter((c) => !routine.some((r) => r.ex === c.id)).map((c) => ({ key: c.id, item: { ...routineFromCustom(c), id: undefined } })),
  ].map((m) => ({ ...m, dose: doseOf(m.item) }))
}

// Extra words people type for each exercise or activity
const EX_WORDS = {
  squat: 'squats legs thighs', goblet: 'squat dumbbell legs', lunge: 'lunges legs', rdl: 'deadlift hamstrings', bridge: 'glute hips bum',
  pushup: 'push ups press up chest', press: 'bench chest dumbbell', shoulder: 'overhead press arms', row: 'back dumbbell', curl: 'biceps arms dumbbell bicep',
  hang: 'bar grip', plank: 'core abs', deadbug: 'core abs', jacks: 'jumping cardio', burpee: 'burpees cardio',
}
const ACT_WORDS = {
  cycling: 'bike spin cycle', swim: 'swimming pool', padel: 'tennis squash badminton', football: 'soccer futsal', stairs: 'steps climb',
  yoga: 'stretch stretching pilates mobility', rope: 'skipping jump rope', hiit: 'interval tabata', strength: 'gym weights lifting', circuit: 'class bootcamp',
  custom: 'other workout', walk: 'walking stroll', run: 'running jog jogging', treadmill: 'incline walk',
}

// One searchable list: yours, the exercise library (sets × reps), and activities (minutes)
// A partner's saved workouts, minus the ones you already have
export function partnerWorkouts(partner, mine) {
  const have = new Set(mine.map((m) => m.item.name?.toLowerCase()))
  const out = []
  for (const id of partner?.partners ?? []) {
    const sh = partner.shares?.[id]
    for (const w of sh?.workouts ?? []) {
      const k = String(w.name ?? '').toLowerCase()
      if (!k || have.has(k) || !(+w.met > 0) || !(+w.sets > 0)) continue
      have.add(k)
      const item = { ...w, sets: +w.sets, emoji: w.emoji || '💪' }
      out.push({ key: `p-${id}-${k}`, kind: 'lib', from: sh.name, item, dose: doseOf(item), words: `${w.name} ${EX_WORDS[w.ex] ?? ''}` })
    }
  }
  return out
}

export function exerciseIndex(profile, mine, WORKOUT_TYPES, theirs = []) {
  const level = profile.level ?? 'beginner'
  const lifts = profile.lifts ?? {}
  const kgFor = (ex) => lifts[ex.id] ?? weightRange(ex, profile.sex, level)?.[0] ?? 0
  const lib = EXERCISES.filter((ex) => ex.levels && ex.log).map((ex) => {
    const item = { ...routineFromExercise(ex, level, kgFor(ex)), id: undefined }
    return { key: 'x' + ex.id, kind: 'lib', item, dose: doseOf(item), words: `${ex.name} ${ex.muscles ?? ''} ${ex.equipment ?? ''} ${ex.group ?? ''} ${EX_WORDS[ex.id] ?? ''}`, logType: ex.log.type }
  })
  const libTypes = new Set(lib.map((l) => l.logType))
  const acts = WORKOUT_TYPES.filter((w) => !libTypes.has(w.id)).map((w) => ({ key: 'a' + w.id, kind: 'act', type: w.id, item: { name: w.label, emoji: w.emoji }, dose: w.kind === 'min' ? 'minutes' : w.kind === 'sec' ? 'seconds' : 'reps', words: `${w.label} ${ACT_WORDS[w.id] ?? ''}` }))
  const yours = mine.map((m) => ({ ...m, kind: 'mine', words: m.item.name }))
  return [...yours, ...theirs, ...lib.filter((l) => !theirs.some((t) => t.item.name === l.item.name)), ...acts]
}

const nrm = (s) => String(s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, ' ').trim()
export function searchExercises(q, index) {
  const t = nrm(q)
  if (!t) return []
  const words = t.split(' ').map((w) => w.replace(/s$/, ''))
  return index
    .map((e) => {
      const name = nrm(e.item.name)
      const all = `${name} ${nrm(e.words)}`
      if (!words.every((w) => all.includes(w))) return null
      const score = (name.startsWith(t) ? 100 : name.includes(t) ? 60 : words.every((w) => name.includes(w)) ? 40 : 10) + (e.kind === 'mine' ? 30 : e.from ? 20 : 0)
      return { ...e, score }
    })
    .filter(Boolean)
    .sort((a, b) => b.score - a.score)
    .slice(0, 12)
}

// Doing the same exercise again (same reps, seconds and weight): its sets add up on one line.
export const sameDose = (a, b) => !!a && !!b && a.kind === b.kind && (a.name ?? '').toLowerCase() === (b.name ?? '').toLowerCase() && (+a.reps || 0) === (+b.reps || 0) && (+a.sec || 0) === (+b.sec || 0) && (+a.kg || 0) === (+b.kg || 0) && !!a.each === !!b.each
export function withMoreSets(w, it, n) {
  return { ...routineWorkout({ ...it, name: it.name ?? w.label, sets: Math.min(20, (+it.sets || 1) + n) }), id: w.id, rid: w.rid }
}
