# Architecture and shared contracts

Vite + strict TypeScript + React own the accessible shell. Phaser 3 owns a fixed 960 × 600 logical stadium, scaled with FIT and pixelArt. Pure core modules determine probabilities, keep shot memory and persist versioned data. No network dependency at runtime. Static build uses relative base `./`.

## Files and ownership

- `src/core/model.ts`, `storage.ts`, `audio.ts`: main agent. Core has no Phaser dependency.
- `src/game/art.ts`: Art Director. Original runtime canvas textures; no external assets.
- `src/game/PenaltyScene.ts`, `src/game/createGame.ts`: Gameplay Engineer.
- `src/App.tsx`, `src/styles.css`, `src/ui/*`: Frontend Engineer.
- Build config, tests, CI, docs: main agent then QA/DevOps review.

## Contracts (agreed before implementation)

`model.ts` exports `Point {x:number;y:number}` (normalized 0..1), `Outcome = 'predictor'|'flash'|'showoff'|'goal'`, `Phase = 'ready'|'runup'|'flight'|'result'`, `Stats {shots,goals,saves,streak,bestStreak}`, `Shot {target:Point;outcome:Outcome;remark:string}`, `chooseOutcome(random?:()=>number):Outcome`, `planShot(target:Point,history:Point[],random?:()=>number):Shot`, `emptyStats():Stats`, `recordShot(stats:Stats,outcome:Outcome):Stats`.

`createGame.ts` exports `createGame(parent:HTMLElement, callbacks:GameCallbacks): {destroy():void; setReducedMotion(value:boolean):void; shoot():void; moveAim(dx:number,dy:number):void}`. `GameCallbacks` exported there has `onPhase(phase:Phase):void`, `onShot(shot:Shot):void`, `onSound(event:'kick'|'save'|'goal'|'hover'):void`, `onRemark(text:string):void`. Game calls onShot exactly once at resolution, keeps max six targets, blocks shots unless ready. Input keyboard owned by React shell; Phaser handles pointer, rejects outside goal. React calls imperative shoot / moveAim via accessible controls. Destroy cleans events/timers.

`art.ts` exports `createArt(scene:Phaser.Scene):void` generating textures: `stadium` (960×600), `keeper-idle`, `keeper-dive`, `keeper-showoff`, `keeper-yawn`, `keeper-clap`, `keeper-paper`, `striker-idle`, `striker-run`, `striker-kick`, `ball`. Characters: 32×48 pixels, display at scale 2.5 (80×120), origin (0.5,1); ball 12×12, origin center. Texture poses may be rotated/flipped by scene. Goal inner rectangle x=226,y=154,width=508,height=202 (net plane). Keeper base foot (480,365), striker base foot (455,550), ball start (492,527). Stage/crowd/goal/net painted into stadium. Gameplay overlays animated net/effects using Phaser Graphics. Goal uses high contrast white frame and subtle cyan net. Do not paint UI into stadium.

`storage.ts` exports `loadData(): {stats:Stats;sound:boolean;reducedMotion:boolean}`, `saveData(data):boolean`, with SSR/storage denial handling. `audio.ts` exports `GameAudio` class with `setEnabled(boolean)`, `play(event)`, `destroy()`; sound is synthesized with Web Audio and only starts on explicit activation.

Application config in `src/config.ts`: author name/URL, repository URL. No environment variables required.

## Chaos expansion (user request)

- Outcome adds `'miss'`; Stats adds `misses:number`. Invariant shots=goals+saves+misses. Miss resets current save streak. v1 storage missing misses migrates to0.
- Point targets can extend outside goal: canvas-normalized goal coordinates x[-.445,1.445], y[-.762,2.208]. `planShot` returns miss for any target outside[0,1]². `clampPoint` retains its original public unit clamping behavior; scene bounds physical canvas separately. Pure `planShot` validates finite values (invalid=>center).
- Shot adds `surprise:'none'|'giant'|'fan'`. `planShot(target,history,random=Math.random,remarkIndex=history.length)` samples outcome only for in-goal shots, then one separate cosmetic random draw: save+random<.18=>giant, goal+random<.28=>fan, otherwise none. Goal odds remain10% for in-goal shots; a selected fan episode always scores. Core tests check cosmetic independence using varying controlled RNG.
- Scene can aim/shoot anywhere on canvas (outside goal=>miss). Miss visual: ball arcs wide/over/to turf, keeper watches/taunts rather than diving, result WIDE. Aim reticle turns orange outside goal. Arrow aiming can move beyond goal to fullcanvas limits. Keeper history should ignore miss points for repeated corner anticipation.
- `keeper-smoke` additional32×48 original idle pose texture; scene adds rising smoke pixel particles during idle smoke state. Reduced motion fewer particles.
- Giant save scales keeper continuously during flight to7.5 at contact and contracts during landing. Scale-aware hand transform must preserve exact collision at contact; no jump cuts.
- Fan surprise: original `fan-run`, `fan-kick`32×48 textures. Fan enters from sideline during runup, kicks at ball instead of striker, shot is guaranteed goal per already-selected goal outcome; then fan celebrates and exits. Doesn't add a second statistical shot. Show explicit FAN INVASION feedback/taunt. Normal kick can be held back; preserve leg-ball contact.
- React HUD + statistics dialog include misses. Result live region announces miss distinctly. Instructions permit aiming anywhere on field. Sound callback uses existing kick/save/goal/hover (miss uses kick only, no save effect).

## Russian localization

`src/core/i18n.ts` exports `Language='en'|'ru'`, `defaultLanguage():Language` (browser language ru→ru, otherwise en), `translateRemark(canonicalEnglish:string,language:Language):string`. Stats/storage settings now contain `language:Language`, migrated from browser preference when absent; only en/ru accepted. Existing statistics preserved.

React owns RU/EN choice and persistence, updates html.lang/document.title and calls controller.setLanguage(language). Frontend owns src/ui/localization.ts for all interface strings and translated accessibility labels. Gameplay owns src/game/localization.ts for canvas banners/celebrations and new controller.setLanguage. Scene stores canonical English thought/shot strings and translates at rendering, so switching languages instantly updates current result/cloud without redrawing odds or restarting round. Core outcome model remains language-neutral; onRemark callback stays canonical English and React translates for live region. English remains default in existing English browser E2E; dedicated Russian test covers switch, saved language and translated gameplay. Brand IMPOSSIBLE PENALTY is unchanged.

## Sky-shot rocket interception

`Shot.surprise` additionally supports `'rocket'`: every target above the goal (target.y<0) is a miss with rocket interception, chosen without RNG. Other outside targets remain normal misses. It counts once as a miss and resets save streak; in-goal 10% odds unchanged. Canonical remark: `AIR DEFENCE: ONE. FOOTBALL: ZERO.`
Art exports extra `rocket`32×16 texture facing right. Scene renders original rocket from offscreen to an intersection of the moving ball at flight t≈.86, while ball stays visible inside canvas. Smoke trail, pixel explosion and shockwave replace continuing ball drift (ball disappears at impact); one resolution callback. New sound callback events `'rocket'|'explosion'` are synthesized by core/audio.ts. Reduced motion reduces smoke/sparks and camera shake; never full-screen flashing. All result/remark text has EN/RU translations, and change of language preserves missile progress. New E2E explicitly aims above goal and checks one miss, explosion/result, return to ready and Russian translation.

## Fullscreen and achievements

FullscreenButton owns native/prefixed Fullscreen API entry and exit, confirms actual
fullscreen state, and uses an explicitly announced expanded-window fallback when
the API is absent or rejects entry. The match container includes the canvas, HUD,
settings controls, statistics dialog and achievement notices. A separate body
class locks background scrolling without conflicting with dialog inline locks.

Pure core/achievements.ts unlocks five badges from the previous Stats and resolved
Shot. It never changes outcomes or consumes random numbers. SavedData stores badge
IDs alongside statistics. Loading validates stats before normalizing badges and
recovers goal-count milestones from legacy records. Special historical episodes
are not invented. React queues only newly unlocked notices, not restored badges;
confirmed reset clears statistics and badges together.
