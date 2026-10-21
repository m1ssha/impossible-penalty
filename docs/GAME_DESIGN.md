# Game design
Each shot draws one independent uniform random number: [0,.50) predictor, [.50,.75) flash, [.75,.90) showoff, [.90,1) goal. Target and previous shots never change the distribution. Six recent targets influence anticipation and taunts only. No guaranteed tenth goal.

States: ready → runup → flight → result → ready. Input gate closes synchronously at acceptance. onShot commits statistics once after impact. Flight is time based, ball shrinks with depth, trajectory arcs. For saves the keeper hand/body reaches the sampled trajectory at contact; ball then rebounds. Goal misses keeper and ripples net. Predictor begins before kick, Flash delays then accelerates, Showoff uses a flamboyant pose; goal dive is late and offset from the target.

Ready idle cycle includes breathing, yawning, clapping and newspaper. Repeated same-side targeting changes gaze/taunt but never odds. Result text appears in live region and visual reaction. Reduced motion removes shake/trails and shortens excess celebration without removing essential trajectory. Active rounds pause on hidden tab; resume advances from the same local animation time.
