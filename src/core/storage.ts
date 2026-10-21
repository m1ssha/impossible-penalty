import { emptyStats, type Stats } from './model';
export interface SavedData {
  stats: Stats;
  sound: boolean;
  reducedMotion: boolean;
}
const KEY = 'impossible-penalty:v1';
function defaults(): SavedData {
  return {
    stats: emptyStats(),
    sound: false,
    reducedMotion:
      typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches,
  };
}
function validStats(value: unknown): value is Stats {
  if (!value || typeof value !== 'object') return false;
  const s = value as Stats;
  return (
    ['shots', 'goals', 'saves', 'streak', 'bestStreak'].every(
      (key) => Number.isSafeInteger(s[key as keyof Stats]) && s[key as keyof Stats] >= 0,
    ) &&
    s.shots === s.goals + s.saves &&
    s.streak <= s.saves &&
    s.bestStreak >= s.streak &&
    s.bestStreak <= s.saves
  );
}
export function loadData(): SavedData {
  const fallback = defaults();
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return fallback;
    const data: unknown = JSON.parse(raw);
    if (!data || typeof data !== 'object') return fallback;
    const d = data as Partial<SavedData>;
    return {
      stats: validStats(d.stats) ? d.stats : fallback.stats,
      sound: typeof d.sound === 'boolean' ? d.sound : fallback.sound,
      reducedMotion:
        typeof d.reducedMotion === 'boolean' ? d.reducedMotion : fallback.reducedMotion,
    };
  } catch {
    return fallback;
  }
}
export function saveData(data: SavedData): boolean {
  try {
    localStorage.setItem(KEY, JSON.stringify(data));
    return true;
  } catch {
    return false;
  }
}
