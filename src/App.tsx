import { useCallback, useEffect, useRef, useState } from 'react';
import type { KeyboardEvent } from 'react';
import { GameAudio } from './core/audio';
import { translateRemark } from './core/i18n';
import { uiText, phaseKeys, type AnnouncementKey } from './ui/localization';
import { emptyStats, recordShot } from './core/model';
import type { Phase } from './core/model';
import { loadData, saveData } from './core/storage';
import { createGame } from './game/createGame';
import { config } from './config';
import { StatsDialog } from './ui/StatsDialog';
import { FullscreenButton } from './ui/FullscreenButton';
import { AchievementToast } from './ui/Achievements';
import { unlockAchievements, type AchievementId } from './core/achievements';

type GameHandle = ReturnType<typeof createGame>;

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
  const [announcement, setAnnouncement] = useState<AnnouncementKey | null>(null);
  const t = uiText[data.language];
  const [phase, setPhase] = useState<Phase>('ready');
  const [remark, setRemark] = useState('GO ON. PICK A CORNER.');
  const [statsOpen, setStatsOpen] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [toastQueue, setToastQueue] = useState<AchievementId[]>([]);
  const previousAchievements = useRef(data.achievements);
  const matchRef = useRef<HTMLElement>(null);
  const pitchRef = useRef<HTMLDivElement>(null);
  const dismissAchievement = useCallback(() => setToastQueue((previous) => previous.slice(1)), []);
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
        onPhase: (nextPhase) => {
          setPhase(nextPhase);
          if (nextPhase === 'runup') setAnnouncement(null);
        },
        onShot: (shot) => {
          setAnnouncement(
            shot.surprise === 'referee'
              ? 'announceReferee'
              : shot.surprise === 'rocket'
                ? 'announceRocket'
                : shot.outcome === 'miss'
                  ? 'announceMiss'
                  : shot.surprise === 'fan'
                    ? 'announceFan'
                    : shot.surprise === 'giant'
                      ? 'announceGiant'
                      : shot.outcome === 'goal'
                        ? 'announceGoal'
                        : 'announceSave',
          );
          setData((previous) => ({
            ...previous,
            stats: recordShot(previous.stats, shot.outcome),
            achievements: unlockAchievements(previous.achievements, previous.stats, shot),
          }));
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
    gameRef.current?.setLanguage(data.language);
    document.documentElement.lang = data.language;
    document.title = uiText[data.language].documentTitle;
    const available = saveData(data);
    let active = true;
    queueMicrotask(() => {
      if (active) setStorageAvailable(available);
    });
    return () => {
      active = false;
    };
  }, [data]);

  useEffect(() => {
    const newIds = data.achievements.filter((id) => !previousAchievements.current.includes(id));
    previousAchievements.current = data.achievements;
    if (newIds.length === 0 && data.achievements.length !== 0) return;
    let active = true;
    queueMicrotask(() => {
      if (active)
        setToastQueue((previous) =>
          data.achievements.length === 0 ? [] : [...previous, ...newIds],
        );
    });
    return () => {
      active = false;
    };
  }, [data.achievements]);

  const activeAchievement = toastQueue[0];
  useEffect(() => {
    if (!activeAchievement) return;
    const timer = window.setTimeout(dismissAchievement, 4000);
    return () => clearTimeout(timer);
  }, [activeAchievement, dismissAchievement]);

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
      <header className="masthead" inert={fullscreen}>
        <a
          className="wordmark"
          href={config.repositoryUrl}
          target="_blank"
          rel="noreferrer"
          aria-label={t.githubLabel}
        >
          <svg width="22" height="22" viewBox="0 0 22 22" aria-hidden="true">
            <path fill="currentColor" d="M6 1h10v3h3v3h2v9h-3v3h-3v2H6v-3H3v-3H1V7h3V4h2Z" />
            <path fill="#0b1418" d="m9 7 5-1 3 5-4 4-5-3ZM4 9h3v5H4Zm11 7h3v3h-5v-3ZM7 2h6v3H7Z" />
          </svg>
          <span>{t.wordmark}</span>
        </a>
        <nav className="utility-nav" aria-label={t.settings}>
          <button
            className="utility-button language-button"
            aria-label={t.switchLanguage}
            onClick={() =>
              setData((previous) => ({
                ...previous,
                language: previous.language === 'en' ? 'ru' : 'en',
              }))
            }
          >
            {t.languageCode}
          </button>
          <button
            className={`utility-button sound-button ${data.sound ? 'is-active' : ''}`}
            onClick={toggleSound}
            aria-pressed={data.sound}
            aria-label={data.sound ? t.mute : t.enableSound}
          >
            <SoundIcon enabled={data.sound} />
            <span>
              {t.sound} <b>{data.sound ? t.on : t.off}</b>
            </span>
          </button>
          <button
            className="utility-button"
            aria-label={t.statsLabel}
            onClick={() => setStatsOpen(true)}
            aria-haspopup="dialog"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
              <path d="M1 9h3v6H1Zm5-5h3v11H6Zm5-3h3v14h-3Z" />
            </svg>
            <span>{t.stats}</span>
          </button>
        </nav>
      </header>

      <section className="hero" aria-labelledby="game-title" inert={fullscreen}>
        <div className="hero-copy">
          <div className="eyebrow match-label">
            <span className="live-dot" /> {t.nightMatch}
          </div>
          <h1 id="game-title">
            IMPOSSIBLE
            <br />
            <span>PENALTY</span>
            <span className="title-period">.</span>
          </h1>
          <p>{t.tagline}</p>
        </div>
        <div className="odds-note" aria-label={t.oddsLabel}>
          <span className="odds-number">
            90<span>%</span>
          </span>
          <div>
            <span>{t.heSaves}</span>
            <span>{t.keepTrying}</span>
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

      <section
        ref={matchRef}
        className={`match-section ${fullscreen ? 'is-fullscreen' : ''}`}
        aria-label={t.penaltyGame}
      >
        <p className="shot-announcement sr-only" aria-live="polite" aria-atomic="true">
          {announcement ? t[announcement] : ''}
        </p>
        <div className="pitch-topline">
          <span>
            <span className="square-dot" /> <span className="pitch-live-label">{t.liveSpot}</span>
          </span>
          <div className="pitch-tools">
            <span className="match-number">
              {t.attempt} {String(data.stats.shots + 1).padStart(3, '0')}
            </span>
            {fullscreen && (
              <>
                <button
                  type="button"
                  className="pitch-control"
                  aria-label={t.switchLanguage}
                  onClick={() =>
                    setData((previous) => ({
                      ...previous,
                      language: previous.language === 'en' ? 'ru' : 'en',
                    }))
                  }
                >
                  {t.languageCode}
                </button>
                <button
                  type="button"
                  className="pitch-control"
                  onClick={toggleSound}
                  aria-label={data.sound ? t.mute : t.enableSound}
                  aria-pressed={data.sound}
                >
                  <SoundIcon enabled={data.sound} />
                </button>
                <button
                  type="button"
                  className="pitch-control"
                  onClick={() => setStatsOpen(true)}
                  aria-label={t.statsLabel}
                  aria-haspopup="dialog"
                >
                  {t.stats}
                </button>
              </>
            )}
            <FullscreenButton
              language={data.language}
              targetRef={matchRef}
              focusRef={pitchRef}
              onChange={setFullscreen}
            />
          </div>
        </div>
        <div
          ref={pitchRef}
          className={`stadium-shell ${phase !== 'ready' ? 'is-playing' : ''}`}
          tabIndex={statsOpen ? -1 : 0}
          role="group"
          aria-label={t.pitchLabel}
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
              <strong>{t.stadiumError}</strong>
              <span>{t.reloadHelp}</span>
              <button className="primary-button" onClick={() => window.location.reload()}>
                {t.reload}
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
            <span aria-label={t.keeperLabel}>{t.keeper}</span>
            <span className="keeper-number">01</span>
          </div>
          <p className="keeper-remark sr-only" aria-live="polite" aria-atomic="true">
            “{translateRemark(remark, data.language)}”
          </p>
          <p className="keeper-aside">{t.keeperAside}</p>
          <span className={`phase-indicator ${phase === 'ready' ? 'ready' : ''}`} role="status">
            {t[phaseKeys[phase]]}
          </span>
        </div>
        <dl className="scoreboard" aria-label={t.statsSummary}>
          <div>
            <dt>{t.shots}</dt>
            <dd>{String(data.stats.shots).padStart(2, '0')}</dd>
          </div>
          <div className="goals-stat">
            <dt>{t.goals}</dt>
            <dd>
              {String(data.stats.goals).padStart(2, '0')}
              <span className="stat-tag">{t.rareGoals}</span>
            </dd>
          </div>
          <div>
            <dt>{t.saves}</dt>
            <dd>{String(data.stats.saves).padStart(2, '0')}</dd>
          </div>
          <div className="misses-stat">
            <dt>{t.misses}</dt>
            <dd>{String(data.stats.misses).padStart(2, '0')}</dd>
          </div>
          <div>
            <dt aria-label={t.streakLabel}>
              <span className="streak-prefix">{t.savePrefix}</span>
              {t.streak}
            </dt>
            <dd>
              {String(data.stats.streak).padStart(2, '0')}
              <span className="streak-mark" aria-hidden="true">
                ↗
              </span>
            </dd>
          </div>
        </dl>
        {activeAchievement && (
          <AchievementToast
            language={data.language}
            id={activeAchievement}
            onDismiss={dismissAchievement}
          />
        )}
        {statsOpen && (
          <StatsDialog
            language={data.language}
            stats={data.stats}
            achievements={data.achievements}
            reducedMotion={data.reducedMotion}
            onReducedMotion={(value) =>
              setData((previous) => ({ ...previous, reducedMotion: value }))
            }
            onReset={() =>
              setData((previous) => ({ ...previous, stats: emptyStats(), achievements: [] }))
            }
            onClose={closeStats}
          />
        )}
      </section>

      <div className="instructions-row" id="game-controls" inert={fullscreen}>
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
          <strong>{t.controlTitle}</strong>
          <span>{t.instructions}</span>
        </p>
        <p className="keyboard-hint">
          <kbd>↑</kbd>
          <kbd>↓</kbd>
          <kbd>←</kbd>
          <kbd>→</kbd>
          <span>{t.aim}</span>
          <kbd>ENTER</kbd>
          <span>{t.shoot}</span>
        </p>
      </div>
      {!storageAvailable && (
        <p className="storage-notice" role="status">
          {t.storageNotice}
        </p>
      )}
      <footer className="page-footer" inert={fullscreen}>
        <span>{t.footer}</span>
        <span>
          {t.madeBy}{' '}
          <a href={config.authorUrl} target="_blank" rel="noreferrer">
            {config.author} <span aria-hidden="true">↗</span>
          </a>
        </span>
      </footer>
    </main>
  );
}
