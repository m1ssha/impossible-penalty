import { describe, expect, it } from 'vitest';
import { chooseOutcome, clampPoint, emptyStats, planShot, recordShot } from './model';
function seeded(seed: number) {
  return () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 4294967296;
  };
}
describe('independent outcome model', () => {
  it.each([
    [0, 'predictor'],
    [0.499999, 'predictor'],
    [0.5, 'flash'],
    [0.749999, 'flash'],
    [0.75, 'showoff'],
    [0.899999, 'showoff'],
    [0.9, 'goal'],
    [0.999999, 'goal'],
  ] as const)('maps %s to %s', (value, outcome) =>
    expect(chooseOutcome(() => value)).toBe(outcome),
  );
  it.each([-1, 1, NaN, Infinity])('rejects invalid RNG %s', (value) =>
    expect(() => chooseOutcome(() => value)).toThrow(RangeError),
  );
  it('matches 50/25/15/10 distribution over 200,000 reproducible shots', () => {
    const random = seeded(0x1a2b3c4d);
    const counts = { predictor: 0, flash: 0, showoff: 0, goal: 0 };
    for (let i = 0; i < 200_000; i++) counts[chooseOutcome(random)]++;
    for (const [kind, rate] of Object.entries({
      predictor: 0.5,
      flash: 0.25,
      showoff: 0.15,
      goal: 0.1,
    }))
      expect(Math.abs(counts[kind as keyof typeof counts] / 200_000 - rate)).toBeLessThan(0.004);
  });
  it('memory changes taunt without changing probability or consuming more randomness', () => {
    let calls = 0;
    const random = () => {
      calls++;
      return 0.8;
    };
    const a = planShot({ x: 0.1, y: 0.1 }, [], random);
    const b = planShot({ x: 0.1, y: 0.1 }, Array(4).fill({ x: 0.1, y: 0.1 }), random);
    expect(a.outcome).toBe(b.outcome);
    expect(b.remark).toBe('SAME CORNER. SAME RESULT.');
    expect(calls).toBe(4);
  });
  it('varies taunts after memory reaches its six-shot cap', () => {
    const history = Array(6).fill({ x: 0, y: 0 });
    const first = planShot({ x: 1, y: 1 }, history, () => 0.1, 6);
    const second = planShot({ x: 1, y: 1 }, history, () => 0.1, 7);
    expect(first.outcome).toBe(second.outcome);
    expect(first.remark).not.toBe(second.remark);
  });
  it('allows consecutive goals and saves', () => {
    expect(Array.from({ length: 10 }, () => chooseOutcome(() => 0.99))).toEqual(
      Array(10).fill('goal'),
    );
    expect(Array.from({ length: 10 }, () => chooseOutcome(() => 0.1))).toEqual(
      Array(10).fill('predictor'),
    );
  });
  it('clamps invalid targets', () => {
    expect(clampPoint({ x: -1, y: 2 })).toEqual({ x: 0, y: 1 });
    expect(clampPoint({ x: NaN, y: Infinity })).toEqual({ x: 0.5, y: 0.5 });
  });
  it('records totals and preserves the best streak across a goal', () => {
    let stats = emptyStats();
    for (const outcome of ['predictor', 'flash', 'showoff', 'goal', 'predictor'] as const)
      stats = recordShot(stats, outcome);
    expect(stats).toEqual({ shots: 5, goals: 1, saves: 4, misses: 0, streak: 1, bestStreak: 3 });
  });
  it('counts an outside target as a genuine miss without sampling a save', () => {
    let draws = 0;
    const shot = planShot({ x: -0.2, y: 0.4 }, [], () => {
      draws++;
      return 0.1;
    });
    expect(shot.outcome).toBe('miss');
    expect(shot.surprise).toBe('none');
    expect(shot.target.x).toBe(-0.2);
    expect(draws).toBe(0);
    const stats = recordShot(recordShot(emptyStats(), 'predictor'), 'miss');
    expect(stats).toEqual({ shots: 2, goals: 0, saves: 1, misses: 1, streak: 0, bestStreak: 1 });
  });
  it.each([
    [0.1, 0.1, 'predictor', 'giant'],
    [0.6, 0.1, 'flash', 'giant'],
    [0.8, 0.1, 'showoff', 'giant'],
    [0.95, 0.1, 'goal', 'fan'],
    [0.95, 0.8, 'goal', 'none'],
    [0.1, 0.8, 'predictor', 'none'],
  ] as const)('selects cosmetic %s/%s independently', (result, cosmetic, outcome, surprise) => {
    const values = [result, cosmetic];
    const shot = planShot({ x: 0.5, y: 0.5 }, [], () => values.shift()!);
    expect(shot.outcome).toBe(outcome);
    expect(shot.surprise).toBe(surprise);
  });
  it('keeps 10% in-goal odds when giant and fan effects are enabled', () => {
    const random = seeded(0x1a2b3c4d);
    let goals = 0;
    let fans = 0;
    let giants = 0;
    for (let i = 0; i < 200000; i++) {
      const shot = planShot({ x: 0.2, y: 0.3 }, [], random, i);
      if (shot.outcome === 'goal') goals++;
      if (shot.surprise === 'fan') {
        fans++;
        expect(shot.outcome).toBe('goal');
      }
      if (shot.surprise === 'giant') {
        giants++;
        expect(['goal', 'miss']).not.toContain(shot.outcome);
      }
    }
    expect(goals / 200000).toBeGreaterThan(0.096);
    expect(goals / 200000).toBeLessThan(0.104);
    expect(fans / goals).toBeGreaterThan(0.26);
    expect(fans / goals).toBeLessThan(0.3);
    expect(giants / (200000 - goals)).toBeGreaterThan(0.17);
    expect(giants / (200000 - goals)).toBeLessThan(0.19);
  });
  it('sky shots trigger rocket interception and still count as one miss', () => {
    let draws = 0;
    const shot = planShot({ x: 0.5, y: -0.5 }, [], () => {
      draws++;
      return 0.95;
    });
    expect(shot.outcome).toBe('miss');
    expect(shot.surprise).toBe('rocket');
    expect(shot.remark).toBe('AIR DEFENCE: ONE. FOOTBALL: ZERO.');
    expect(draws).toBe(0);
    expect(recordShot(emptyStats(), shot.outcome)).toEqual({
      shots: 1,
      goals: 0,
      saves: 0,
      misses: 1,
      streak: 0,
      bestStreak: 0,
    });
  });
});
