import { useId } from 'react';
import { achievementIds, type AchievementId } from '../core/achievements';
import type { Language } from '../core/i18n';
import './achievements.css';

const text = {
  en: {
    heading: 'Achievements',
    unlocked: 'Unlocked',
    locked: 'Locked',
    toast: 'ACHIEVEMENT UNLOCKED',
    dismiss: 'Dismiss achievement notification',
    entries: {
      'first-goal': ['First breakthrough', 'Score your first goal.'],
      'five-goals': ['Getting personal', 'Score 5 goals.'],
      'ten-goals': ['Double figures', 'Score 10 goals.'],
      comeback: ['Not today, keeper', 'Score after 10 or more saves in a row.'],
      'fan-goal': ['Pitch accomplice', 'Score with help from the invading fan.'],
    },
  },
  ru: {
    heading: 'Достижения',
    unlocked: 'Открыто',
    locked: 'Пока закрыто',
    toast: 'НОВОЕ ДОСТИЖЕНИЕ',
    dismiss: 'Закрыть уведомление о достижении',
    entries: {
      'first-goal': ['Лёд тронулся', 'Забей первый гол.'],
      'five-goals': ['Личный счёт', 'Забей 5 голов.'],
      'ten-goals': ['Двузначный счёт', 'Забей 10 голов.'],
      comeback: ['Характер чемпиона', 'Забей после серии из 10 и более сейвов.'],
      'fan-goal': ['Помощь с трибун', 'Забей с помощью выбежавшего болельщика.'],
    },
  },
} as const;

function AchievementIcon({ id }: { id: AchievementId }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
      {id === 'first-goal' && (
        <>
          <path d="M3 19V5h18v14M6 5v14m6-14v5m6-5v14M3 10h18M3 15h5m8 0h5" />
          <path d="m12 12 3 2-1 4h-4l-1-4Z" fill="currentColor" stroke="none" />
        </>
      )}
      {id === 'five-goals' && (
        <>
          <path d="m12 3 2.5 5.6 6.1.7-4.5 4.1 1.3 6-5.4-3-5.4 3 1.3-6-4.5-4.1 6.1-.7Z" />
          <path d="m10 10 2-4 2 4" opacity=".5" />
        </>
      )}
      {id === 'ten-goals' && (
        <>
          <path d="M7 4h10v6a5 5 0 0 1-10 0ZM7 6H3v3a4 4 0 0 0 4 4m10-7h4v3a4 4 0 0 1-4 4M12 15v5m-5 1h10" />
          <path
            d="m12 6 .8 1.7 1.9.2-1.4 1.3.4 1.8-1.7-.9-1.7.9.4-1.8-1.4-1.3 1.9-.2Z"
            fill="currentColor"
            stroke="none"
          />
        </>
      )}
      {id === 'comeback' && (
        <>
          <path d="M6 8a8 8 0 1 1-1 9M6 3v5H1" />
          <path d="m13 6-5 7h4l-1 5 6-8h-4Z" fill="currentColor" stroke="none" />
        </>
      )}
      {id === 'fan-goal' && (
        <>
          <path d="M5 3 3 8l5 5v8m11-18 2 5-5 5v8M8 16h8M8 11l4 3 4-3" />
          <path d="M15 7a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
          <path d="m7 12 4 1 2 4" />
        </>
      )}
    </svg>
  );
}

function AchievementState({ unlocked }: { unlocked: boolean }) {
  return (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" aria-hidden="true">
      {unlocked ? (
        <path d="m3 8 3 3 7-7" />
      ) : (
        <>
          <path d="M5 7V5a3 3 0 0 1 6 0v2M4 7h8v7H4Z" />
          <path d="M8 9v3" />
        </>
      )}
    </svg>
  );
}

export function AchievementList({
  language,
  unlocked,
}: {
  language: Language;
  unlocked: AchievementId[];
}) {
  const headingId = useId();
  const t = text[language];
  const earned = new Set(unlocked);
  const count = achievementIds.filter((id) => earned.has(id)).length;
  return (
    <section className="achievements" aria-labelledby={headingId}>
      <div className="achievements-heading">
        <h3 id={headingId}>{t.heading}</h3>
        <span className="achievements-count">
          {t.unlocked} <b>{count}</b>
          <span aria-hidden="true"> / </span>
          <span className="achievement-sr-only"> / </span>
          {achievementIds.length}
        </span>
      </div>
      <ul className="achievement-list">
        {achievementIds.map((id) => {
          const isUnlocked = earned.has(id);
          const [title, description] = t.entries[id];
          return (
            <li
              className={`achievement-row${isUnlocked ? ' is-unlocked' : ''}`}
              key={id}
              data-achievement={id}
              data-unlocked={isUnlocked}
            >
              <span className="achievement-badge">
                <AchievementIcon id={id} />
              </span>
              <div className="achievement-copy">
                <h4>{title}</h4>
                <p>{description}</p>
              </div>
              <span className="achievement-state">
                <AchievementState unlocked={isUnlocked} />
                <span className="achievement-sr-only">{isUnlocked ? t.unlocked : t.locked}</span>
              </span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

export function AchievementToast({
  language,
  id,
  onDismiss,
}: {
  language: Language;
  id: AchievementId;
  onDismiss: () => void;
}) {
  const t = text[language];
  const [title, description] = t.entries[id];
  return (
    <div
      className="achievement-toast"
      role="status"
      aria-live="polite"
      aria-atomic="true"
      data-achievement-toast={id}
    >
      <span className="achievement-badge">
        <AchievementIcon id={id} />
      </span>
      <div className="achievement-copy">
        <span className="achievement-toast-eyebrow">{t.toast}</span>
        <strong>{title}</strong>
        <p>{description}</p>
      </div>
      <button
        type="button"
        className="achievement-dismiss"
        aria-label={t.dismiss}
        onClick={onDismiss}
      >
        <svg
          viewBox="0 0 16 16"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          aria-hidden="true"
        >
          <path d="m4 4 8 8m0-8-8 8" />
        </svg>
      </button>
    </div>
  );
}
