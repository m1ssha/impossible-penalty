import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { Stats } from '../core/model';
import type { Language } from '../core/i18n';
import { uiText } from './localization';

interface StatsDialogProps {
  language: Language;
  stats: Stats;
  reducedMotion: boolean;
  onReducedMotion: (value: boolean) => void;
  onReset: () => void;
  onClose: () => void;
}

export function StatsDialog({
  language,
  stats,
  reducedMotion,
  onReducedMotion,
  onReset,
  onClose,
}: StatsDialogProps) {
  const t = uiText[language];
  const dialogRef = useRef<HTMLDivElement>(null);
  const resetButtonRef = useRef<HTMLButtonElement>(null);
  const keepRecordRef = useRef<HTMLButtonElement>(null);
  const resetFocusPending = useRef(false);
  const [confirmReset, setConfirmReset] = useState(false);
  const rate = stats.shots ? Math.round((stats.goals / stats.shots) * 100) : 0;

  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const first = dialogRef.current?.querySelector<HTMLButtonElement>('button');
    first?.focus();
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
      if (event.key !== 'Tab') return;
      const items = Array.from(
        dialogRef.current?.querySelectorAll<HTMLElement>('button, input, a[href]') ?? [],
      );
      const index = items.indexOf(document.activeElement as HTMLElement);
      if (event.shiftKey && index <= 0) {
        event.preventDefault();
        items.at(-1)?.focus();
      } else if (!event.shiftKey && (index < 0 || index === items.length - 1)) {
        event.preventDefault();
        items[0]?.focus();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = originalOverflow;
      document.removeEventListener('keydown', onKey);
      previous?.focus();
    };
  }, [onClose]);

  // These controls replace each other. Move focus before paint so removing a
  // focused reset button never leaves keyboard navigation behind the dialog.
  useLayoutEffect(() => {
    if (!resetFocusPending.current) return;
    (confirmReset ? keepRecordRef.current : resetButtonRef.current)?.focus();
    resetFocusPending.current = false;
  }, [confirmReset]);

  function showResetConfirmation(value: boolean) {
    resetFocusPending.current = true;
    setConfirmReset(value);
  }

  return (
    <div
      className="modal-backdrop"
      onPointerDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        className="stats-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="stats-title"
        ref={dialogRef}
      >
        <div className="dialog-heading">
          <span className="eyebrow">{t.numbers}</span>
          <button className="icon-button close-button" aria-label={t.closeStats} onClick={onClose}>
            ×
          </button>
        </div>
        <h2 id="stats-title">
          {t.record}
          <span>.</span>
        </h2>
        <p className="dialog-intro">{t.dialogIntro}</p>
        <dl className="detailed-stats">
          <div>
            <dt>{t.shotsTaken}</dt>
            <dd>{stats.shots}</dd>
          </div>
          <div>
            <dt>{t.goalsScored}</dt>
            <dd className="lime-text">{stats.goals}</dd>
          </div>
          <div>
            <dt>{t.keeperSaves}</dt>
            <dd>{stats.saves}</dd>
          </div>
          <div>
            <dt>{t.shotsMissed}</dt>
            <dd>{stats.misses}</dd>
          </div>
          <div>
            <dt>{t.currentStreak}</dt>
            <dd>{stats.streak}</dd>
          </div>
          <div>
            <dt>{t.longestStreak}</dt>
            <dd>{stats.bestStreak}</dd>
          </div>
          <div className="conversion-stat">
            <dt>{t.conversion}</dt>
            <dd>
              {rate}
              <small>%</small>
            </dd>
          </div>
        </dl>
        <label className="motion-option">
          <span>
            <strong>{t.reducedMotion}</strong>
            <small>{t.reducedHelp}</small>
          </span>
          <input
            type="checkbox"
            checked={reducedMotion}
            onChange={(event) => onReducedMotion(event.target.checked)}
          />
        </label>
        <div className="reset-area">
          {confirmReset ? (
            <>
              <p>{t.resetQuestion}</p>
              <div className="reset-actions">
                <button
                  className="danger-button"
                  onClick={() => {
                    onReset();
                    showResetConfirmation(false);
                  }}
                >
                  {t.resetConfirm}
                </button>
                <button
                  ref={keepRecordRef}
                  className="text-button"
                  onClick={() => showResetConfirmation(false)}
                >
                  {t.resetCancel}
                </button>
              </div>
            </>
          ) : (
            <button
              ref={resetButtonRef}
              className="text-button reset-button"
              onClick={() => showResetConfirmation(true)}
            >
              {t.reset}
            </button>
          )}
        </div>
        <button className="primary-button" onClick={onClose}>
          {t.backToSpot} <span aria-hidden="true">↗</span>
        </button>
        <p className="dialog-footnote">{t.dialogFootnote}</p>
      </div>
    </div>
  );
}
