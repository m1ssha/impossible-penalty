import { defaultLanguage, type Language } from './i18n';
import { emptyStats, type Stats } from './model';
export interface SavedData {
  stats: Stats;
  sound: boolean;
  language: Language;
  reducedMotion: boolean;
}
const KEY = 'impossible-penalty:v1';
function defaults(): SavedData {
  return {
    stats: emptyStats(),
    sound: false,
    language: defaultLanguage(),
    reducedMotion:
      typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches,
  };
}
function validStats(value: unknown): value is Stats {
  if (!value || typeof value !== 'object') return false;
  const s = value as Stats;
  return (
    ['shots', 'goals', 'saves', 'misses', 'streak', 'bestStreak'].every(
      (key) => Number.isSafeInteger(s[key as keyof Stats]) && s[key as keyof Stats] >= 0,
    ) &&
    s.shots === s.goals + s.saves + s.misses &&
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
    // Version1 records predate wide shots. Preserve all existing totals/settings.
    const rawStats: unknown = d.stats;
    const migratedStats =
      rawStats && typeof rawStats === 'object' && !('misses' in rawStats)
        ? { ...rawStats, misses: 0 }
        : rawStats;
    return {
      stats: validStats(migratedStats) ? migratedStats : fallback.stats,
      language: d.language === 'en' || d.language === 'ru' ? d.language : fallback.language,
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
