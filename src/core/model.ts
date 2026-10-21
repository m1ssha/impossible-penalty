/** All outcome selection is independent of target and previous results. */
export interface Point {
  x: number;
  y: number;
}
export type Outcome = 'predictor' | 'flash' | 'showoff' | 'goal' | 'miss';
export type Phase = 'ready' | 'runup' | 'flight' | 'result';
export interface Stats {
  shots: number;
  goals: number;
  saves: number;
  misses: number;
  streak: number;
  bestStreak: number;
}
export interface Shot {
  target: Point;
  outcome: Outcome;
  remark: string;
  surprise: 'none' | 'giant' | 'fan' | 'rocket' | 'referee';
}
export function chooseOutcome(random: () => number = Math.random): Exclude<Outcome, 'miss'> {
  const value = random();
  if (!Number.isFinite(value) || value < 0 || value >= 1)
    throw new RangeError('Random value must be in [0, 1).');
  return value < 0.5 ? 'predictor' : value < 0.75 ? 'flash' : value < 0.9 ? 'showoff' : 'goal';
}
const remarks: Record<Outcome, readonly string[]> = {
  miss: [
    'THE GOAL IS THE WHITE THING.',
    'TRY THE OTHER STADIUM.',
    'I DID NOT EVEN HAVE TO MOVE.',
    'AIMING IS OPTIONAL, APPARENTLY.',
  ],
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
  const point = {
    x: Number.isFinite(target.x) ? target.x : 0.5,
    y: Number.isFinite(target.y) ? target.y : 0.5,
  };
  const outside = point.x < 0 || point.x > 1 || point.y < 0 || point.y > 1;
  const outcome = outside ? 'miss' : chooseOutcome(random);
  // This draw chooses presentation only; it cannot alter the already selected result.
  // 90% saves × 1/18 referee variants = 5% of all in-frame attempts.
  const cosmetic = outcome === 'miss' ? 1 : random();
  const surprise: Shot['surprise'] =
    outcome === 'miss' && point.y < 0
      ? 'rocket'
      : outcome === 'goal' && cosmetic < 0.28
        ? 'fan'
        : outcome !== 'goal' && outcome !== 'miss' && cosmetic < 1 / 18
          ? 'referee'
          : outcome !== 'goal' && outcome !== 'miss' && cosmetic < 1 / 18 + 0.18
            ? 'giant'
            : 'none';
  const repeated =
    history.length >= 3 &&
    history
      .slice(-3)
      .every((p) => Math.abs(p.x - point.x) < 0.22 && Math.abs(p.y - point.y) < 0.35);
  const list = remarks[outcome];
  const remark =
    repeated && outcome !== 'goal' && outcome !== 'miss'
      ? 'SAME CORNER. SAME RESULT.'
      : list[Math.abs(Math.trunc(remarkIndex)) % list.length];
  return {
    target: point,
    outcome,
    remark:
      surprise === 'fan'
        ? 'HE IS NOT EVEN ON THE TEAM.'
        : surprise === 'rocket'
          ? 'AIR DEFENCE: ONE. FOOTBALL: ZERO.'
          : surprise === 'referee'
            ? 'THE REF IS ON MY SIDE.'
            : remark,
    surprise,
  };
}
export const emptyStats = (): Stats => ({
  shots: 0,
  goals: 0,
  saves: 0,
  misses: 0,
  streak: 0,
  bestStreak: 0,
});
export function recordShot(stats: Stats, outcome: Outcome): Stats {
  const goal = outcome === 'goal';
  const miss = outcome === 'miss';
  const save = !goal && !miss;
  const streak = save ? stats.streak + 1 : 0;
  return {
    shots: stats.shots + 1,
    goals: stats.goals + Number(goal),
    saves: stats.saves + Number(save),
    misses: stats.misses + Number(miss),
    streak,
    bestStreak: Math.max(stats.bestStreak, streak),
  };
}
