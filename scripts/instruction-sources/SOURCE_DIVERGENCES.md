# Known English-source divergences

The pt-BR pack preserves the source dataset's exercise identity and step order.
When the English mechanics are internally inconsistent, the translation should
not silently redefine the exercise. Record those cases here for a separate
upstream correction.

| Exercise | English-source issue | pt-BR handling |
|---|---|---|
| `0023` barbell alternate biceps curl | Says to hold a barbell in each hand and later refers to multiple barbells. | Translated faithfully; equipment issue remains upstream. |
| `0984` band lying hip internal rotation | The title says internal rotation, while step 3 directs the knees outward. | Direction translated faithfully. |
| `3667` side lying hip adduction | Step 3 says to engage the adductors while lifting the top leg, which describes abduction. | Muscle cue translated faithfully. |
| `2139` hands bike | Step 2 says to place the feet on pedals of an upper-body ergometer. | Setup translated faithfully. |
| `0987` band one arm single leg split squat | Step 2 says to extend one leg forward but rest that foot on a bench behind the user. | Portuguese clarifies that the other foot rests behind, preserving usable split-squat mechanics; this intentional divergence is documented here. |
| `3294` archer push up | Step 3 says to bend both elbows although the preceding step extends one arm. | Portuguese identifies the supporting arm to avoid an ambiguous unsafe cue; this intentional clarification is documented here. |
| `1512` all fours squad stretch | Steps 2–3 said to extend one leg back and lower the hips, which does not match the GIF (the hand pulls the foot of the bent leg toward the glutes). | Fixed in every language and in the English `st` (2026-09-30): the steps now describe the GIF. |
| `3214` arms apart circular toe touch (male) | The steps described a single-leg toe touch with the other leg lifted back (an airplane), while the GIF and the name show a two-footed circular toe touch with arms overhead. | Fixed in every language and in the English `st` (2026-09-30): the steps now describe the GIF. |
| `3204` arms overhead full sit-up (male) | The steps said knees bent and feet flat, while the GIF shows legs straight on the floor and a full roll-up toward the feet. | Fixed in every language and in the English `st` (2026-09-30): the steps now describe the GIF. |
| `1708` assisted lying calves stretch | The steps described a solo stretch with the hands or a towel, while the name and the GIF show a partner holding the raised foot. | Fixed in every language and in the English `st` (2026-09-30): the steps now describe the partner-assisted stretch. |
