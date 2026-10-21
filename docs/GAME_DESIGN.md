# Game design

Each shot draws one independent uniform random number: [0,.50) predictor, [.50,.75) flash, [.75,.90) showoff, [.90,1) goal. Target and previous shots never change the distribution. Six recent targets influence anticipation and taunts only. No guaranteed tenth goal.

States: ready → runup → flight → result → ready. Input gate closes synchronously at acceptance. onShot commits statistics once after impact. Flight is time based, ball shrinks with depth, trajectory arcs. For saves the keeper hand/body reaches the sampled trajectory at contact; ball then rebounds. Goal misses keeper and ripples net. Predictor begins before kick, Flash delays then accelerates, Showoff uses a flamboyant pose; goal dive is late and offset from the target.

Ready idle cycle includes breathing, yawning, clapping and newspaper. Repeated same-side targeting changes gaze/taunt but never odds. Result text appears in live region and visual reaction. Reduced motion removes shake/trails and shortens excess celebration without removing essential trajectory. Active rounds pause on hidden tab; resume advances from the same local animation time.

## Chaos expansion

The keeper occasionally smokes in idle (original pixel cigarette + drifting smoke), grows absurdly during a save, and encounters a fan who runs in and scores. Fan is a rare visual variant of already-selected goals (28% of goals), preserving10% total goal probability for shots aimed inside the frame. Giant animation occurs on18% of saves, without changing result probabilities. Aim outside the goal is a genuine miss, recorded separately, with keeper mockery and no fake save. Misses reset current save streak. All new effects retain reduced-motion support and cannot create an extra shot or bypass the phase gate.

## Helmet and referee

The keeper is an original pixel parody of Petr Čech in his recognizable padded black
headguard. It remains attached in all idle and save poses, including giant dives.
A referee waits at the sideline and occasionally runs in to block a shot with his
body, whistles, then returns to his position. This is a cosmetic subtype of an
already-selected save: 1/18 of saves, or approximately 5% of all in-frame shots.
Goals remain independent at 10%, and outside misses never become referee saves.
The ball meets the referee's chest on its sampled flight trajectory and rebounds
from the same point. Statistics commit exactly once. The reduced-motion setting
preserves this essential movement while reducing decorative effects.

For local review only, `?demo=referee` forces the first accepted in-frame shot to
use this incident. This option is gated by Vite's development mode and is absent
from the production decision path.

The player character is Messi-inspired and takes a left-footed penalty. His
run-up starts to the right of the ball and ends with exact left-boot contact.
The fan's separate right-foot animation is preserved. The keeper waits on the
chalk goal line at y358, keeps his feet there during anticipation, and returns
to it after each round. These presentation changes do not affect shot odds.
