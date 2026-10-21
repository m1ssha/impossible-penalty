# IMPOSSIBLE PENALTY

A complete single-screen arcade: night stadium, one confident orange keeper, an independent 10% chance of scoring on every shot. The player should immediately understand click/tap inside the net and want one more try.

## Stories and acceptance

- Mouse/touch player chooses any point in the goal; preview reticle signals valid input. Rapid extra taps cannot create overlapping rounds.
- Keyboard player focuses the stadium, adjusts aim with arrows and shoots using Enter/Space; controls and live result are accessible outside canvas.
- Every accepted shot has runup, contact, perspective flight, believable keeper contact or net impact, reaction, and automatic reset.
- Persistent counters include shots, goals, saves, current/best save streak. A small stats dialog offers explicit reset and dismissal by Escape/backdrop. Storage failure leaves a functional in-memory game.
- Sound starts only with user activation and can be muted. Motion preference defaults from OS and is configurable. Dialog pause prevents accidental shots.
- Mobile portrait/landscape, resize and background return preserve the round. Blur pauses the simulation; no background catch-up.

## Delivery plan

1. Establish contracts, art direction and test strategy; create public repository/issues.
2. Parallel original art, gameplay, React interface; main agent builds core/storage/audio/toolchain.
3. Integrate and inspect browser at desktop/mobile sizes. Repair visual/interaction defects.
4. Unit/integration/E2E/type/lint/build checks, Russian documentation, meaningful commits, push and verify CI. No hosting deployment.
