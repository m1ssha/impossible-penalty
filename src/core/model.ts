/** All outcome selection is independent of target and previous results. */
export interface Point {
  x: number;
  y: number;
}
export type Outcome = 'predictor' | 'flash' | 'showoff' | 'goal';
export type Phase = 'ready' | 'runup' | 'flight' | 'result';
export interface Stats {
  shots: number;
  goals: number;
  saves: number;
  streak: number;
  bestStreak: number;
}
export interface Shot {
  target: Point;
  outcome: Outcome;
  remark: string;
}
export function chooseOutcome(random: () => number = Math.random): Outcome {
  const value = random();
  if (!Number.isFinite(value) || value < 0 || value >= 1)
    throw new RangeError('Random value must be in [0, 1).');
  return value < 0.5 ? 'predictor' : value < 0.75 ? 'flash' : value < 0.9 ? 'showoff' : 'goal';
}
const remarks: Record<Outcome, readonly string[]> = {
  predictor: [
    'NICE TRY.',
    'I KNOW YOUR GAME.',
    'NOT TODAY.',
    'SAME TIME NEXT SHOT?',
    'I WAS ALREADY THERE.',
  ],
  flash: ['TOO EASY.', 'BLINK AND YOU MISS IT.', 'SERIOUSLY?', 'WAS THAT YOUR FAST ONE?'],
  showoff: [
    'ARE YOU EVEN TRYING?',
    'MAYBE TRY ANOTHER WEBSITE.',
    'ONE HAND. NO PROBLEM.',
    'I COULD DO THIS ALL NIGHT.',
  ],
  goal: [
    "WAIT. THAT'S ILLEGAL.",
    'NOBODY SAW THAT.',
    'THE LIGHT WAS IN MY EYES.',
    'ENJOY IT. IT WON’T HAPPEN AGAIN.',
  ],
};
export function clampPoint(target: Point): Point {
  return {
    x: Number.isFinite(target.x) ? Math.max(0, Math.min(1, target.x)) : 0.5,
    y: Number.isFinite(target.y) ? Math.max(0, Math.min(1, target.y)) : 0.5,
  };
}
export function planShot(
  target: Point,
  history: Point[],
  random: () => number = Math.random,
  remarkIndex: number = history.length,
): Shot {
  const outcome = chooseOutcome(random);
  const point = clampPoint(target);
  const repeated =
    history.length >= 3 &&
    history
      .slice(-3)
      .every((p) => Math.abs(p.x - point.x) < 0.22 && Math.abs(p.y - point.y) < 0.35);
  // No extra random draw: cosmetic remarks cannot perturb the outcome stream.
  const list = remarks[outcome];
  const remark =
    repeated && outcome !== 'goal'
      ? 'SAME CORNER. SAME RESULT.'
      : list[Math.abs(Math.trunc(remarkIndex)) % list.length];
  return { target: point, outcome, remark };
}
export const emptyStats = (): Stats => ({ shots: 0, goals: 0, saves: 0, streak: 0, bestStreak: 0 });
export function recordShot(stats: Stats, outcome: Outcome): Stats {
  const goal = outcome === 'goal';
  const streak = goal ? 0 : stats.streak + 1;
  return {
    shots: stats.shots + 1,
    goals: stats.goals + Number(goal),
    saves: stats.saves + Number(!goal),
    streak,
    bestStreak: Math.max(stats.bestStreak, streak),
  };
}
