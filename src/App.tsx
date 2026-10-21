import { useCallback, useEffect, useRef, useState } from 'react';
import type { KeyboardEvent } from 'react';
import { GameAudio } from './core/audio';
import { emptyStats, recordShot } from './core/model';
import type { Phase } from './core/model';
import { loadData, saveData } from './core/storage';
import { createGame } from './game/createGame';
import { config } from './config';
import { StatsDialog } from './ui/StatsDialog';

type GameHandle = ReturnType<typeof createGame>;
const phaseLabels: Record<Phase, string> = {
  ready: 'YOUR SHOT.',
  runup: 'HERE WE GO.',
  flight: 'HOLD YOUR BREATH.',
  result: 'ONE MORE?',
};

function SoundIcon({ enabled }: { enabled: boolean }) {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      aria-hidden="true"
    >
      <path d="M11 5 6 9H3v6h3l5 4V5Z" />
      {enabled ? (
        <>
          <path d="M15 8a6 6 0 0 1 0 8M18 5a10 10 0 0 1 0 14" />
        </>
      ) : (
        <path d="m16 9 6 6m0-6-6 6" />
      )}
    </svg>
  );
}

export default function App() {
  const [data, setData] = useState(loadData);
  const [announcement, setAnnouncement] = useState('');
  const [phase, setPhase] = useState<Phase>('ready');
  const [remark, setRemark] = useState('GO ON. PICK A CORNER.');
  const [statsOpen, setStatsOpen] = useState(false);
  const [storageAvailable, setStorageAvailable] = useState(true);
  const [gameError, setGameError] = useState(false);
  const stageRef = useRef<HTMLDivElement>(null);
  const gameRef = useRef<GameHandle | null>(null);
  const audioRef = useRef<GameAudio | null>(null);
  const soundRef = useRef(data.sound);
  const closeStats = useCallback(() => setStatsOpen(false), []);

  useEffect(() => {
    let active = true;
    const audio = new GameAudio();
    audioRef.current = audio;
    audio.setEnabled(soundRef.current);
    if (!stageRef.current) return () => audio.destroy();
    try {
      gameRef.current = createGame(stageRef.current, {
        onPhase: setPhase,
        onShot: (shot) => {
          setAnnouncement(
            shot.outcome === 'goal'
              ? 'Goal! You beat the keeper.'
              : 'Saved by the keeper. Try again.',
          );
          setData((previous) => ({ ...previous, stats: recordShot(previous.stats, shot.outcome) }));
        },
        onSound: (event) => audio.play(event),
        onRemark: setRemark,
      });
    } catch {
      queueMicrotask(() => {
        if (active) setGameError(true);
      });
    }
    return () => {
      active = false;
      gameRef.current?.destroy();
      gameRef.current = null;
      audio.destroy();
      audioRef.current = null;
    };
  }, []);

  useEffect(() => {
    soundRef.current = data.sound;
    audioRef.current?.setEnabled(data.sound);
    gameRef.current?.setReducedMotion(data.reducedMotion);
    const available = saveData(data);
    let active = true;
    queueMicrotask(() => {
      if (active) setStorageAvailable(available);
    });
    return () => {
      active = false;
    };
  }, [data]);

  function onGameKey(event: KeyboardEvent<HTMLDivElement>) {
    if (statsOpen) return;
    const directions: Record<string, [number, number]> = {
      ArrowLeft: [-0.06, 0],
      ArrowRight: [0.06, 0],
      ArrowUp: [0, -0.08],
      ArrowDown: [0, 0.08],
    };
    if (directions[event.key]) {
      event.preventDefault();
      gameRef.current?.moveAim(...directions[event.key]);
    } else if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      if (!event.repeat) {
        audioRef.current?.play('hover');
        gameRef.current?.shoot();
      }
    }
  }

  function toggleSound() {
    const enabled = !data.sound;
    audioRef.current?.setEnabled(enabled);
    if (enabled) audioRef.current?.play('hover');
    setData((previous) => ({ ...previous, sound: enabled }));
  }

  return (
    <main className="app-shell">
      <p className="sr-only" aria-live="polite" aria-atomic="true">
        {announcement}
      </p>
      <header className="masthead">
        <a
          className="wordmark"
          href={config.repositoryUrl}
          target="_blank"
          rel="noreferrer"
          aria-label="Impossible Penalty on GitHub"
        >
          <svg width="22" height="22" viewBox="0 0 22 22" aria-hidden="true">
            <path fill="currentColor" d="M6 1h10v3h3v3h2v9h-3v3h-3v2H6v-3H3v-3H1V7h3V4h2Z" />
            <path fill="#0b1418" d="m9 7 5-1 3 5-4 4-5-3ZM4 9h3v5H4Zm11 7h3v3h-5v-3ZM7 2h6v3H7Z" />
          </svg>
          <span>THE ONE-MORE-TRY CLUB</span>
        </a>
        <nav className="utility-nav" aria-label="Game settings">
          <button
            className={`utility-button sound-button ${data.sound ? 'is-active' : ''}`}
            onClick={toggleSound}
            aria-pressed={data.sound}
            aria-label={data.sound ? 'Mute sound' : 'Enable sound'}
          >
            <SoundIcon enabled={data.sound} />
            <span>
              SOUND <b>{data.sound ? 'ON' : 'OFF'}</b>
            </span>
          </button>
          <button
            className="utility-button"
            onClick={() => setStatsOpen(true)}
            aria-haspopup="dialog"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
              <path d="M1 9h3v6H1Zm5-5h3v11H6Zm5-3h3v14h-3Z" />
            </svg>
            <span>STATS</span>
          </button>
        </nav>
      </header>

      <section className="hero" aria-labelledby="game-title">
        <div className="hero-copy">
          <div className="eyebrow match-label">
            <span className="live-dot" /> NIGHT MATCH / NO MERCY
          </div>
          <h1 id="game-title">
            IMPOSSIBLE
            <br />
            <span>PENALTY</span>
            <span className="title-period">.</span>
          </h1>
          <p>One goal. One keeper. A deeply unfair advantage.</p>
        </div>
        <div className="odds-note" aria-label="Keeper saves 90 percent of shots">
          <span className="odds-number">
            90<span>%</span>
          </span>
          <div>
            <span>HE SAVES.</span>
            <span>YOU KEEP TRYING.</span>
          </div>
          <svg
            viewBox="0 0 80 40"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            aria-hidden="true"
          >
            <path d="M4 3c40 0 54 4 54 24M50 21l8 9 9-9" />
          </svg>
        </div>
      </section>

      <section className="match-section" aria-label="Penalty game">
        <div className="pitch-topline">
          <span>
            <span className="square-dot" /> LIVE FROM THE PENALTY SPOT
          </span>
          <span className="match-number">
            ATTEMPT {String(data.stats.shots + 1).padStart(3, '0')}
          </span>
        </div>
        <div
          className={`stadium-shell ${phase !== 'ready' ? 'is-playing' : ''}`}
          tabIndex={statsOpen ? -1 : 0}
          role="group"
          aria-label="Football pitch. Use arrow keys to aim and Enter or Space to shoot."
          aria-describedby="game-controls"
          onKeyDown={onGameKey}
          onPointerDown={(event) => {
            if (!statsOpen) {
              event.currentTarget.focus({ preventScroll: true });
              audioRef.current?.play('hover');
            }
          }}
        >
          <div className="game-stage" ref={stageRef} aria-hidden="true" />
          {gameError && (
            <div className="game-error">
              <strong>The stadium could not open.</strong>
              <span>Please reload the page to try again.</span>
              <button className="primary-button" onClick={() => window.location.reload()}>
                RELOAD GAME
              </button>
            </div>
          )}
          {statsOpen && <div className="input-shield" />}
          <div className="pitch-corner top-left" aria-hidden="true" />
          <div className="pitch-corner bottom-right" aria-hidden="true" />
        </div>
        <div className="keeper-strip">
          <div className="keeper-identity">
            <span className="keeper-dot" />
            <span>THE KEEPER</span>
            <span className="keeper-number">01</span>
          </div>
          <p className="keeper-remark" aria-live="polite" aria-atomic="true">
            “{remark}”
          </p>
          <span className={`phase-indicator ${phase === 'ready' ? 'ready' : ''}`} role="status">
            {phaseLabels[phase]}
          </span>
        </div>
        <dl className="scoreboard" aria-label="Your game statistics">
          <div>
            <dt>SHOTS</dt>
            <dd>{String(data.stats.shots).padStart(2, '0')}</dd>
          </div>
          <div className="goals-stat">
            <dt>GOALS</dt>
            <dd>
              {String(data.stats.goals).padStart(2, '0')}
              <span className="stat-tag">THE RARE ONES</span>
            </dd>
          </div>
          <div>
            <dt>SAVES</dt>
            <dd>{String(data.stats.saves).padStart(2, '0')}</dd>
          </div>
          <div>
            <dt>SAVE STREAK</dt>
            <dd>
              {String(data.stats.streak).padStart(2, '0')}
              <span className="streak-mark" aria-hidden="true">
                ↗
              </span>
            </dd>
          </div>
        </dl>
      </section>

      <div className="instructions-row" id="game-controls">
        <p>
          <svg
            width="17"
            height="17"
            viewBox="0 0 20 20"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            aria-hidden="true"
          >
            <path d="M10 1v5m0 8v5M1 10h5m8 0h5" />
            <circle cx="10" cy="10" r="5" />
          </svg>
          <strong>AIM. SHOOT. REPEAT.</strong>
          <span>Click or tap anywhere inside the goal.</span>
        </p>
        <p className="keyboard-hint">
          <kbd>↑</kbd>
          <kbd>↓</kbd>
          <kbd>←</kbd>
          <kbd>→</kbd>
          <span>aim</span>
          <kbd>ENTER</kbd>
          <span>shoot</span>
        </p>
      </div>
      {!storageAvailable && (
        <p className="storage-notice" role="status">
          Your browser has disabled storage. Your record stays available until you close this page.
        </p>
      )}
      <footer className="page-footer">
        <span>A GAME OF VERY SMALL ODDS & VERY BIG GLOVES.</span>
        <span>
          MADE BY{' '}
          <a href={config.authorUrl} target="_blank" rel="noreferrer">
            {config.author} <span aria-hidden="true">↗</span>
          </a>
        </span>
      </footer>
      {statsOpen && (
        <StatsDialog
          stats={data.stats}
          reducedMotion={data.reducedMotion}
          onReducedMotion={(value) =>
            setData((previous) => ({ ...previous, reducedMotion: value }))
          }
          onReset={() => setData((previous) => ({ ...previous, stats: emptyStats() }))}
          onClose={closeStats}
        />
      )}
    </main>
  );
}
