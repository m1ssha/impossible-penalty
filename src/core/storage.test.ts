import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { loadData, saveData } from './storage';
import { emptyStats, recordShot } from './model';
describe('persistent session', () => {
  let data: Map<string, string>;
  beforeEach(() => {
    data = new Map();
    vi.stubGlobal('localStorage', {
      getItem: (key: string) => data.get(key) ?? null,
      setItem: (key: string, value: string) => data.set(key, value),
    });
  });
  afterEach(() => vi.unstubAllGlobals());
  it('roundtrips stats and settings', () => {
    const value = { stats: recordShot(emptyStats(), 'goal'), sound: true, reducedMotion: true };
    expect(saveData(value)).toBe(true);
    expect(loadData()).toEqual(value);
  });
  it('recovers from malformed JSON', () => {
    data.set('impossible-penalty:v1', '{broken');
    expect(loadData().stats).toEqual(emptyStats());
  });
  it('rejects inconsistent statistics', () => {
    data.set(
      'impossible-penalty:v1',
      JSON.stringify({ stats: { shots: 10, goals: 12, saves: 2, streak: 2, bestStreak: 2 } }),
    );
    expect(loadData().stats).toEqual(emptyStats());
  });
  it('survives inaccessible localStorage', () => {
    vi.stubGlobal('localStorage', {
      getItem: () => {
        throw new Error('denied');
      },
      setItem: () => {
        throw new Error('quota');
      },
    });
    expect(loadData().stats).toEqual(emptyStats());
    expect(saveData({ stats: emptyStats(), sound: false, reducedMotion: false })).toBe(false);
  });
  it('uses OS reduced motion for a new session', () => {
    vi.stubGlobal('matchMedia', () => ({ matches: true }));
    expect(loadData().reducedMotion).toBe(true);
  });
  it('migrates records written before misses were introduced', () => {
    data.set(
      'impossible-penalty:v1',
      JSON.stringify({
        stats: { shots: 3, goals: 1, saves: 2, streak: 2, bestStreak: 2 },
        sound: true,
        reducedMotion: false,
      }),
    );
    expect(loadData().stats).toEqual({
      shots: 3,
      goals: 1,
      saves: 2,
      misses: 0,
      streak: 2,
      bestStreak: 2,
    });
    expect(loadData().sound).toBe(true);
  });
  it('roundtrips misses and rejects a broken miss invariant', () => {
    const value = { stats: recordShot(emptyStats(), 'miss'), sound: false, reducedMotion: false };
    expect(saveData(value)).toBe(true);
    expect(loadData()).toEqual(value);
    data.set(
      'impossible-penalty:v1',
      JSON.stringify({ ...value, stats: { ...value.stats, misses: 8 } }),
    );
    expect(loadData().stats).toEqual(emptyStats());
  });
});
