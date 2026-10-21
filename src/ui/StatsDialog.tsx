import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { Stats } from '../core/model';

interface StatsDialogProps {
  stats: Stats;
  reducedMotion: boolean;
  onReducedMotion: (value: boolean) => void;
  onReset: () => void;
  onClose: () => void;
}

export function StatsDialog({
  stats,
  reducedMotion,
  onReducedMotion,
  onReset,
  onClose,
}: StatsDialogProps) {
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
          <span className="eyebrow">THE NUMBERS DON’T LIE</span>
          <button
            className="icon-button close-button"
            aria-label="Close statistics"
            onClick={onClose}
          >
            ×
          </button>
        </div>
        <h2 id="stats-title">
          Your record<span>.</span>
        </h2>
        <p className="dialog-intro">Every shot counts. Even the ones he makes look easy.</p>
        <dl className="detailed-stats">
          <div>
            <dt>Shots taken</dt>
            <dd>{stats.shots}</dd>
          </div>
          <div>
            <dt>Goals scored</dt>
            <dd className="lime-text">{stats.goals}</dd>
          </div>
          <div>
            <dt>Keeper saves</dt>
            <dd>{stats.saves}</dd>
          </div>
          <div>
            <dt>Goal conversion</dt>
            <dd>
              {rate}
              <small>%</small>
            </dd>
          </div>
          <div>
            <dt>Current save streak</dt>
            <dd>{stats.streak}</dd>
          </div>
          <div>
            <dt>Longest save streak</dt>
            <dd>{stats.bestStreak}</dd>
          </div>
        </dl>
        <label className="motion-option">
          <span>
            <strong>Reduced motion</strong>
            <small>Less camera movement and fewer effects.</small>
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
              <p>Erase your entire record? This cannot be undone.</p>
              <div className="reset-actions">
                <button
                  className="danger-button"
                  onClick={() => {
                    onReset();
                    showResetConfirmation(false);
                  }}
                >
                  Yes, reset record
                </button>
                <button
                  ref={keepRecordRef}
                  className="text-button"
                  onClick={() => showResetConfirmation(false)}
                >
                  Keep my record
                </button>
              </div>
            </>
          ) : (
            <button
              ref={resetButtonRef}
              className="text-button reset-button"
              onClick={() => showResetConfirmation(true)}
            >
              Reset statistics
            </button>
          )}
        </div>
        <button className="primary-button" onClick={onClose}>
          BACK TO THE SPOT <span aria-hidden="true">↗</span>
        </button>
        <p className="dialog-footnote">
          Independent odds. A 10% chance of glory, every single shot.
        </p>
      </div>
    </div>
  );
}
