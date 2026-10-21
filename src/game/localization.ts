import type { Language } from '../core/i18n';
import type { Shot } from '../core/model';

const copy = {
  refereeInterference: { en: 'REFEREE INTERFERENCE!', ru: 'СУДЬЯ ВМЕШАЛСЯ!' },
  refereeSave: { en: 'REF-LEX SAVE.', ru: 'СУДЕЙСКИЙ СЕЙВ.' },
  refereeAccent: { en: 'THE WHISTLE WAS A DISTRACTION', ru: 'СВИСТОК БЫЛ ОТВЛЕКАЮЩИМ МАНЁВРОМ' },
  airspaceClosed: { en: 'AIRSPACE CLOSED.', ru: 'НЕБО ЗАКРЫТО.' },
  rocketAccent: { en: 'NO BALLS BEYOND THIS POINT', ru: 'МЯЧАМ ТУДА НЕЛЬЗЯ.' },
  airDefence: { en: 'AIR DEFENCE ACTIVE!', ru: 'ПВО НАЧЕКУ!' },
  wide: { en: 'WIDE.', ru: 'МИМО.' },
  fanGoal: { en: 'FAN-TASTIC!', ru: 'ФАНАТСТИКА!' },
  goal: { en: 'GOOOAL!', ru: 'ГОООЛ!' },
  flashSave: { en: 'BLINK. SAVED.', ru: 'МИГ — И СЕЙВ.' },
  showoffSave: { en: 'TOO EASY.', ru: 'СЛИШКОМ ЛЕГКО.' },
  giantSave: { en: 'ABSOLUTELY NOT.', ru: 'ДАЖЕ НЕ МЕЧТАЙ.' },
  save: { en: 'DENIED.', ru: 'ОТБИТО.' },
  missAccent: { en: 'THE GOAL WAS THE OTHER BIT', ru: 'ВОРОТА БЫЛИ В ДРУГОЙ СТОРОНЕ' },
  fanAccent: { en: 'UNAUTHORISED. UNSTOPPABLE.', ru: 'БЕЗ ДОПУСКА. БЕЗ ТОРМОЗОВ.' },
  giantAccent: { en: 'SOMEONE CHECK THE RULEBOOK', ru: 'КТО-НИБУДЬ, ПРОВЕРЬТЕ ПРАВИЛА' },
  goalAccent: { en: 'THE IMPOSSIBLE JUST HAPPENED', ru: 'НЕВОЗМОЖНОЕ ТОЛЬКО ЧТО СЛУЧИЛОСЬ' },
  flashAccent: { en: 'REACTION TIME: UNFAIR', ru: 'СКОРОСТЬ РЕАКЦИИ: НЕЧЕСТНАЯ' },
  showoffAccent: { en: 'STYLE POINTS: DISRESPECTFUL', ru: 'ОЦЕНКА ЗА СТИЛЬ: НАГЛОСТЬ' },
  saveAccent: { en: 'HE KNEW BEFORE YOU DID', ru: 'ОН ЗНАЛ РАНЬШЕ ТЕБЯ' },
  fanInvasion: { en: 'FAN INVASION!', ru: 'ФАНАТ НА ПОЛЕ!' },
  regulationSize: { en: 'REGULATION SIZE. PROBABLY.', ru: 'РАЗМЕР ПО ПРАВИЛАМ. НАВЕРНОЕ.' },
} satisfies Record<string, Record<Language, string>>;

export function canvasCopy(key: keyof typeof copy, language: Language): string {
  return copy[key][language];
}

export function resultCopy(shot: Shot, language: Language): { title: string; accent: string } {
  const title =
    shot.surprise === 'referee'
      ? 'refereeSave'
      : shot.surprise === 'rocket'
        ? 'airspaceClosed'
        : shot.outcome === 'miss'
          ? 'wide'
          : shot.outcome === 'goal'
            ? shot.surprise === 'fan'
              ? 'fanGoal'
              : 'goal'
            : shot.outcome === 'flash'
              ? 'flashSave'
              : shot.outcome === 'showoff'
                ? 'showoffSave'
                : shot.surprise === 'giant'
                  ? 'giantSave'
                  : 'save';
  const accent =
    shot.surprise === 'referee'
      ? 'refereeAccent'
      : shot.surprise === 'rocket'
        ? 'rocketAccent'
        : shot.outcome === 'miss'
          ? 'missAccent'
          : shot.surprise === 'fan'
            ? 'fanAccent'
            : shot.surprise === 'giant'
              ? 'giantAccent'
              : shot.outcome === 'goal'
                ? 'goalAccent'
                : shot.outcome === 'flash'
                  ? 'flashAccent'
                  : shot.outcome === 'showoff'
                    ? 'showoffAccent'
                    : 'saveAccent';
  return { title: canvasCopy(title, language), accent: canvasCopy(accent, language) };
}
