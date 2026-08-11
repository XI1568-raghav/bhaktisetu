# apps\remotion-pitch\scripts\synth-music.py

- env_ad · function · L35-L43 — Builds an attack-decay amplitude envelope (linear ramp in, exponential falloff out) used to shape the dynamics of synthesized instruments.
- kick · function · L45-L53 — Synthesizes a punchy kick drum via a 150→45Hz pitch-dropping sine body plus a noise click transient, giving the drop its 4-on-the-floor drive.
- snare · function · L55-L64 — Synthesizes a snare hit by mixing high-passed noise with a decaying 180Hz tonal body for backbeat and fill accents.
- hat · function · L66-L74 — Synthesizes a hi-hat as a high-passed noise burst whose decay rate switches between closed and open variants for offbeat groove.
- supersaw · function · L76-L87 — Synthesizes a supersaw stab by stacking 7 slightly detuned sawtooth oscillators, producing the thick future-bass chord stabs.
- sub_bass · function · L89-L94 — Synthesizes a sub-bass tone as an enveloped pure sine at the chord root to anchor the low end under each stab.
- chord_pad · function · L96-L106 — Synthesizes a warm sustained chord pad from triangle oscillators with a slow 0.3s attack for buildup and outro harmony beds.
- whoosh · function · L108-L122 — Synthesizes a transition whoosh by sweeping a bandpass center frequency up then down over noise with a sine-squared swell envelope.
- pop · function · L124-L131 — Synthesizes a bubble-pop SFX from a rapidly rising sine sweep plus a noise tick, used for UI element appearances.
- click · function · L133-L139 — Synthesizes a crisp mechanical click from dual high sine tones (2200/3300Hz) with a very fast decay for tick and UI sounds.
- chime · function · L141-L152 — Synthesizes an ethereal chime from a C-major triad sine cluster (C5–C6) plus a high shimmer harmonic for AI-themed accents.
- add · function · L170-L173 — Mixes a synthesized signal into the master track at a given timestamp, clamping at the buffer end.
- record · function · L175-L177 — Logs a musical event into the beatmap with its exact 60fps frame number so Remotion visuals can sync to the audio.
