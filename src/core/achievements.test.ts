import { describe, expect, it } from 'vitest';
import { achievementIds, normalizeAchievements, unlockAchievements } from './achievements';
import { emptyStats, planShot, recordShot } from './model';

const goal = planShot({ x: 0.4, y: 0.3 }, [], () => 0.95);
const fanGoal = { ...goal, surprise: 'fan' as const };
describe('goal achievements', () => {
  it.each([
    [0, ['first-goal']],
    [3, ['first-goal']],
    [4, ['first-goal', 'five-goals']],
    [8, ['first-goal', 'five-goals']],
    [9, ['first-goal', 'five-goals', 'ten-goals']],
  ])('unlocks milestones after %s previous goals', (goals, expected) => {
    expect(unlockAchievements([], { ...emptyStats(), goals, shots: goals }, goal)).toEqual(
      expected,
    );
  });
  it('awards comeback for a goal after ten saves, not nine', () => {
    let stats = emptyStats();
    for (let i = 0; i < 9; i++) stats = recordShot(stats, 'predictor');
    expect(unlockAchievements([], stats, goal)).not.toContain('comeback');
    stats = recordShot(stats, 'flash');
    expect(unlockAchievements([], stats, goal)).toContain('comeback');
    stats = recordShot(stats, 'miss');
    expect(unlockAchievements([], stats, goal)).not.toContain('comeback');
  });
  it('unlocks simultaneous first goal and supporter assistance once', () => {
    const unlocked = unlockAchievements([], emptyStats(), fanGoal);
    expect(unlocked).toEqual(['first-goal', 'fan-goal']);
    expect(unlockAchievements(unlocked, recordShot(emptyStats(), 'goal'), fanGoal)).toEqual(
      unlocked,
    );
  });
  it.each(['predictor', 'flash', 'showoff', 'miss'] as const)('never awards on %s', (outcome) => {
    expect(unlockAchievements([], { ...emptyStats(), goals: 9 }, { ...fanGoal, outcome })).toEqual(
      [],
    );
  });
  it('never mutates its inputs', () => {
    const ids = Object.freeze(['first-goal'] as const);
    const stats = Object.freeze(emptyStats());
    expect(unlockAchievements(ids, stats, fanGoal)).toEqual(['first-goal', 'fan-goal']);
    expect(ids).toEqual(['first-goal']);
    expect(stats).toEqual(emptyStats());
  });
  it('migrates total-goal milestones without inventing special incidents', () => {
    expect(normalizeAchievements(undefined, { ...emptyStats(), goals: 10 })).toEqual([
      'first-goal',
      'five-goals',
      'ten-goals',
    ]);
  });
  it('filters corrupt ids, duplicates and impossible unlocks', () => {
    const raw = ['unknown', null, 'fan-goal', 'comeback', 'fan-goal'];
    expect(normalizeAchievements(raw, emptyStats())).toEqual([]);
    expect(normalizeAchievements(raw, { ...emptyStats(), goals: 1 })).toEqual([
      'first-goal',
      'fan-goal',
    ]);
    expect(normalizeAchievements(raw, { ...emptyStats(), goals: 10, bestStreak: 10 })).toEqual(
      achievementIds,
    );
  });
});
