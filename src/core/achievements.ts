import type { Shot, Stats } from './model';

export const achievementIds = [
  'first-goal',
  'five-goals',
  'ten-goals',
  'comeback',
  'fan-goal',
] as const;
export type AchievementId = (typeof achievementIds)[number];

/** Old records can recover total-goal milestones, but not historical incidents. */
export function normalizeAchievements(value: unknown, stats: Stats): AchievementId[] {
  const saved: unknown[] = Array.isArray(value) ? value : [];
  return achievementIds.filter((id) => {
    if (id === 'first-goal') return stats.goals >= 1;
    if (id === 'five-goals') return stats.goals >= 5;
    if (id === 'ten-goals') return stats.goals >= 10;
    if (stats.goals === 0 || !saved.includes(id)) return false;
    return id !== 'comeback' || stats.bestStreak >= 10;
  });
}

/** Called once per resolved shot; badges never participate in outcome selection. */
export function unlockAchievements(
  unlocked: readonly AchievementId[],
  previousStats: Stats,
  shot: Shot,
): AchievementId[] {
  if (shot.outcome !== 'goal') return [...unlocked];
  const ids = new Set(unlocked);
  const goals = previousStats.goals + 1;
  if (goals >= 1) ids.add('first-goal');
  if (goals >= 5) ids.add('five-goals');
  if (goals >= 10) ids.add('ten-goals');
  if (previousStats.streak >= 10) ids.add('comeback');
  if (shot.surprise === 'fan') ids.add('fan-goal');
  return achievementIds.filter((id) => ids.has(id));
}
