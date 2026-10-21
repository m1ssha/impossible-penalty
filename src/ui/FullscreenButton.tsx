import { useCallback, useEffect, useRef, useState, type RefObject } from 'react';
import type { Language } from '../core/i18n';
import { activeFullscreenElement, enterFullscreen, leaveFullscreen } from './fullscreen';

interface FullscreenButtonProps {
  language: Language;
  targetRef: RefObject<HTMLElement | null>;
  focusRef: RefObject<HTMLDivElement | null>;
  onChange: (active: boolean) => void;
}
const copy = {
  en: {
    enter: 'Enter fullscreen',
    exit: 'Exit fullscreen',
    label: 'FULLSCREEN',
    exitLabel: 'EXIT',
    unsupported: 'Fullscreen is unavailable in this browser. Expanded game view enabled.',
    denied: 'Fullscreen could not open. Expanded game view enabled.',
    exitDenied: 'Could not exit fullscreen. Press Esc or try again.',
  },
  ru: {
    enter: 'На весь экран',
    exit: 'Выйти из полноэкранного режима',
    label: 'НА ВЕСЬ ЭКРАН',
    exitLabel: 'ВЫЙТИ',
    unsupported: 'Браузер не поддерживает полный экран. Игровое поле развёрнуто на окно.',
    denied: 'Не удалось открыть полный экран. Игровое поле развёрнуто на окно.',
    exitDenied: 'Не удалось выйти из полного экрана. Нажмите Esc или попробуйте ещё раз.',
  },
};

export function FullscreenButton({
  language,
  targetRef,
  focusRef,
  onChange,
}: FullscreenButtonProps) {
  const [active, setActive] = useState(false);
  const [feedback, setFeedback] = useState<'unsupported' | 'denied' | 'exitDenied' | null>(null);
  const [pending, setPending] = useState(false);
  const fallback = useRef(false);
  const t = copy[language];
  const update = useCallback(
    (value: boolean) => {
      setActive(value);
      onChange(value);
      requestAnimationFrame(() => {
        if (!targetRef.current?.querySelector('[role="dialog"]')) {
          focusRef.current?.focus({ preventScroll: true });
        }
      });
    },
    [focusRef, onChange, targetRef],
  );

  useEffect(() => {
    const sync = () => update(fallback.current || activeFullscreenElement() === targetRef.current);
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && fallback.current) {
        if (targetRef.current?.querySelector('[role="dialog"]')) return;
        fallback.current = false;
        setFeedback(null);
        update(false);
      }
    };
    document.addEventListener('fullscreenchange', sync);
    document.addEventListener('webkitfullscreenchange', sync);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('fullscreenchange', sync);
      document.removeEventListener('webkitfullscreenchange', sync);
      document.removeEventListener('keydown', onKey);
    };
  }, [targetRef, update]);

  useEffect(() => {
    if (!active) return;
    document.body.classList.add('game-fullscreen-open');
    return () => {
      document.body.classList.remove('game-fullscreen-open');
    };
  }, [active]);

  useEffect(() => {
    if (!feedback) return;
    const timer = window.setTimeout(() => setFeedback(null), 5000);
    return () => clearTimeout(timer);
  }, [feedback]);

  async function toggle() {
    if (pending) return;
    setFeedback(null);
    setPending(true);
    try {
      if (active) {
        if (fallback.current) {
          fallback.current = false;
          update(false);
        } else {
          await leaveFullscreen();
          const stillActive = activeFullscreenElement() === targetRef.current;
          update(stillActive);
          if (stillActive) setFeedback('exitDenied');
        }
      } else if (targetRef.current) {
        const request = enterFullscreen(targetRef.current);
        if (request) {
          await request;
          update(activeFullscreenElement() === targetRef.current);
        } else {
          fallback.current = true;
          setFeedback('unsupported');
          update(true);
        }
      }
    } catch {
      if (active) {
        const stillActive = activeFullscreenElement() === targetRef.current;
        update(stillActive);
        if (stillActive) setFeedback('exitDenied');
      } else if (targetRef.current) {
        fallback.current = activeFullscreenElement() !== targetRef.current;
        if (fallback.current) setFeedback('denied');
        update(true);
      }
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="fullscreen-control">
      <button
        type="button"
        className="pitch-control fullscreen-button"
        aria-label={active ? t.exit : t.enter}
        aria-pressed={active}
        disabled={pending}
        onClick={() => {
          void toggle();
        }}
      >
        <svg
          width="14"
          height="14"
          viewBox="0 0 16 16"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          aria-hidden="true"
        >
          {active ? (
            <path d="M1 5h4V1m10 4h-4V1M1 11h4v4m10-4h-4v4" />
          ) : (
            <path d="M6 1H1v5m9-5h5v5M1 10v5h5m9-5v5h-5" />
          )}
        </svg>
        <span>{active ? t.exitLabel : t.label}</span>
      </button>
      {feedback && (
        <span className="fullscreen-feedback" role="status">
          {t[feedback]}
        </span>
      )}
    </div>
  );
}
