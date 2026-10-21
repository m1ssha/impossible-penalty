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
