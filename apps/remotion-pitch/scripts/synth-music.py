#!/usr/bin/env python3
"""
Darshya demo reel — future-bass music + SFX synthesizer.

Generates a ~75s future-bass track programmatically (numpy/scipy DSP):
  - buildup (0-15s): rising filtered noise swells + sparse ticks
  - drop (15-60s): driving 4-on-the-floor kick, syncopated snare, sub bass,
    supersaw synth stabs on the chord changes
  - outro (60-75s): pull-back, chord pad, final hit + decay

Exports a PRECISE beat map (beatmap.json) so the Remotion composition can
sync every visual hit to an exact frame. BPM=128, 60fps -> 1 beat = 60/128*60
= 28.125 frames. Every kick/snare/stab timestamp is written to beatmap.json.

Also exports SFX stems: whoosh, pop, click, chime — used on transitions and
UI element appearances.

No external audio assets, no licenses. All synthesized.
"""
import json
import numpy as np
from scipy.io import wavfile
from scipy.signal import butter, lfilter
import os

SR = 48000  # sample rate
FPS = 60
BPM = 128
BEAT = 60.0 / BPM          # seconds per beat (0.46875)
BAR = 4 * BEAT             # 1.875s

OUT = os.path.join(os.path.dirname(__file__), '..', 'public', 'pitch', 'audio')
os.makedirs(OUT, exist_ok=True)

def env_ad(n, attack, decay, sr=SR):
    """Attack-decay envelope (exp decay)."""
    t = np.arange(n) / sr
    a = int(attack * sr)
    e = np.ones(n)
    if a > 0:
        e[:a] = np.linspace(0, 1, a)
    e[a:] = np.exp(-np.linspace(0, decay, n - a))
    return e

def kick(t0, dur=0.18, sr=SR, gain=1.0):
    """Punchy 4-on-the-floor kick: pitch-drop sine + click transient."""
    n = int(dur * sr)
    t = np.arange(n) / sr
    freq = 150 * np.exp(-t * 30) + 45       # pitch drop 150->45Hz
    body = np.sin(2 * np.pi * np.cumsum(freq) / sr)
    click = np.random.uniform(-1, 1, n) * np.exp(-t * 200) * 0.3
    e = np.exp(-t * 12)
    return (body * e + click) * gain

def snare(t0, dur=0.2, sr=SR, gain=0.7):
    """Snare: tonal noise + 180Hz body."""
    n = int(dur * sr)
    t = np.arange(n) / sr
    noise = np.random.uniform(-1, 1, n)
    b, a = butter(4, 2500 / (sr / 2), 'high')
    noise = lfilter(b, a, noise)
    body = np.sin(2 * np.pi * 180 * t) * np.exp(-t * 25)
    e = np.exp(-t * 18)
    return (noise * 0.7 + body * 0.4) * e * gain

def hat(t0, dur=0.06, sr=SR, gain=0.25, open_=False):
    """Hi-hat: filtered noise burst."""
    n = int(dur * sr)
    t = np.arange(n) / sr
    noise = np.random.uniform(-1, 1, n)
    b, a = butter(4, 7000 / (sr / 2), 'high')
    noise = lfilter(b, a, noise)
    e = np.exp(-t * (40 if not open_ else 12))
    return noise * e * gain

def supersaw(freq, dur, sr=SR, detune=0.008, gain=0.3):
    """Supersaw: 7 detuned sawtooth oscillators."""
    n = int(dur * sr)
    t = np.arange(n) / sr
    out = np.zeros(n)
    for i in range(7):
        d = 1 + (i - 3) * detune
        ph = np.cumsum(freq * d) / sr
        out += (2 * (ph - np.floor(0.5 + ph)))  # sawtooth
    out /= 7
    e = env_ad(n, 0.005, dur * 0.9)
    return out * e * gain

def sub_bass(freq, dur, sr=SR, gain=0.5):
    """Sub bass sine."""
    n = int(dur * sr)
    t = np.arange(n) / sr
    e = env_ad(n, 0.01, dur * 0.7)
    return np.sin(2 * np.pi * freq * t) * e * gain

def chord_pad(freqs, dur, sr=SR, gain=0.18):
    """Warm chord pad (triangle oscs + slow attack)."""
    n = int(dur * sr)
    t = np.arange(n) / sr
    out = np.zeros(n)
    for f in freqs:
        out += 2 * np.abs(2 * (np.cumsum(f) / sr * np.ones(n) - np.floor(0.5 + np.cumsum(f) / sr))) - 1
    out /= len(freqs)
    e = np.concatenate([np.linspace(0, 1, int(0.3 * sr)), np.ones(n - int(0.3 * sr))])
    e = e[:n]
    return out * e * gain

def whoosh(dur=0.5, sr=SR, gain=0.6):
    """Rising then falling filtered noise — transition whoosh."""
    n = int(dur * sr)
    t = np.arange(n) / sr
    noise = np.random.uniform(-1, 1, n)
    # sweep bandpass center 200 -> 6000 -> 1000
    center = 200 + 5800 * np.sin(np.pi * t / dur) ** 0.5
    # crude bandpass via moving average subtract
    out = np.zeros(n)
    win = int(sr / 200)
    for i in range(0, n, win):
        seg = noise[i:i+win]
        out[i:i+win] = seg - seg.mean()
    e = np.sin(np.pi * t / dur) ** 2
    return out * e * gain

def pop(dur=0.12, sr=SR, gain=0.5):
    """Bubble pop: rising sine + noise tick."""
    n = int(dur * sr)
    t = np.arange(n) / sr
    freq = 400 + 1600 * t / dur
    tone = np.sin(2 * np.pi * np.cumsum(freq) / sr)
    e = np.exp(-t * 20)
    return (tone * e + np.random.uniform(-1,1,n) * np.exp(-t*300) * 0.2) * gain

def click(dur=0.04, sr=SR, gain=0.4):
    """Crisp mechanical click."""
    n = int(dur * sr)
    t = np.arange(n) / sr
    tone = np.sin(2 * np.pi * 2200 * t) + np.sin(2 * np.pi * 3300 * t)
    e = np.exp(-t * 250)
    return tone * e * gain

def chime(dur=0.8, sr=SR, gain=0.4):
    """Ethereal AI chime: major triad sine clusters + shimmer."""
    n = int(dur * sr)
    t = np.arange(n) / sr
    freqs = [523.25, 659.25, 783.99, 1046.5]  # C5 E5 G5 C6
    out = np.zeros(n)
    for f in freqs:
        out += np.sin(2 * np.pi * f * t) * np.exp(-t * 2.5)
    # shimmer (high harmonic)
    out += 0.3 * np.sin(2 * np.pi * 2093 * t) * np.exp(-t * 4)
    out /= len(freqs) + 1
    return out * gain

# ---------- compose the track ----------
DUR = 75.0
N = int(DUR * SR)
track = np.zeros(N)

# Chord progression (future-bass, key of C minor -> Eb major lift):
# i - VI - III - VII  (Cm - Ab - Eb - Bb) for the drop
CHORDS = [
    (130.81, [196.0, 261.63, 311.13]),   # Gm-ish low + Cm
    (174.61, [220.0, 261.63, 329.63]),   # Ab-ish
    (130.81, [196.0, 261.63, 311.13]),
    (196.0,  [246.94, 311.13, 392.0]),   # Bb lift
]

beatmap = {'bpm': BPM, 'fps': FPS, 'beat': BEAT, 'events': []}

def add(buf, sig, t0):
    i = int(t0 * SR)
    j = min(i + len(sig), len(buf))
    buf[i:j] += sig[:j-i]

def record(kind, t, label=''):
    beatmap['events'].append({'kind': kind, 't': round(t, 4),
                              'frame': int(round(t * FPS)), 'label': label})

# --- BUILDUP 0-15s: rising swell + sparse ticks ---
for i in range(8):  # 8 swells over 15s
    t = i * (15.0 / 8)
    add(track, whoosh(0.6, gain=0.15), t)
# rising tick riser every 2 beats in last 4s
t = 11.0
while t < 15.0:
    add(track, click(0.05, gain=0.2), t)
    record('tick', t)
    t += BEAT / 2
# big riser into drop
add(track, whoosh(1.5, gain=0.4), 13.5)
# filter sweep noise bed
swell = np.random.uniform(-1, 1, int(15 * SR))
b, a = butter(4, 400 / (SR / 2), 'low')
swell = lfilter(b, a, swell)
env_s = np.concatenate([np.linspace(0, 0.3, int(15 * SR))])
track[:len(swell)] += swell * env_s * 0.2

# --- DROP 15-60s: 4-on-floor + syncopated bass + supersaw stabs ---
DROP_START = 15.0
DROP_END = 60.0
drop_beats = np.arange(DROP_START, DROP_END, BEAT)
for i, bt in enumerate(drop_beats):
    # kick every beat
    add(track, kick(bt), bt)
    record('kick', bt)
    # snare on beats 2 and 4 (every other beat)
    if i % 2 == 1:
        add(track, snare(bt), bt)
        record('snare', bt)
    # hats on offbeats
    add(track, hat(bt + BEAT/2), bt + BEAT/2, )
    if i % 4 == 0:
        add(track, hat(bt + BEAT/2, open_=True, gain=0.2), bt + BEAT/2)
    # supersaw stab at start of each bar
    if i % 4 == 0:
        chord = CHORDS[(i // 4) % len(CHORDS)]
        stab = supersaw(chord[0] * 2, BEAT * 0.5, gain=0.25)
        add(track, stab, bt)
        record('stab', bt, 'chord')
        # sub bass under the stab
        add(track, sub_bass(chord[0], BEAT * 4, gain=0.4), bt)
        # chord pad sustained over the bar
        add(track, chord_pad([f * 2 for f in chord[1]], BEAT * 4, gain=0.12), bt)

# extra snare fill at 58-60s (transition into outro)
for k, bt in enumerate(np.arange(58.0, 60.0, BEAT / 2)):
    add(track, snare(bt, gain=0.4 + 0.1*k), bt)
    record('snare', bt, 'fill')

# --- OUTRO 60-75s: pull-back pad + final hit ---
add(track, chord_pad([261.63, 329.63, 392.0, 523.25], 6.0, gain=0.2), 60.0)
add(track, sub_bass(65.41, 6.0, gain=0.25), 60.0)
# final big hit at 62s
add(track, kick(62.0, dur=0.4, gain=1.3), 62.0)
add(track, supersaw(261.63, 1.5, gain=0.3), 62.0)
record('kick', 62.0, 'final')
record('stab', 62.0, 'final')
# decay to silence
decay_t = np.arange(int(13 * SR)) / SR
decay_env = np.exp(-decay_t * 0.4)
outro_start = int(62 * SR)
track[outro_start:outro_start + len(decay_env)] *= decay_env

# normalize + soft clip
track = np.tanh(track * 0.9) * 0.85
stereo = np.stack([track, track], axis=1)

wavfile.write(os.path.join(OUT, 'music.wav'), SR, (stereo * 32767).astype(np.int16))
print(f'music.wav written: {DUR}s, {SR}Hz stereo')

# ---------- SFX stems ----------
for name, fn in [('whoosh', whoosh()), ('pop', pop()), ('click', click()), ('chime', chime())]:
    s = np.stack([fn, fn], axis=1)
    wavfile.write(os.path.join(OUT, f'sfx-{name}.wav'), SR, (s * 32767).astype(np.int16))
    print(f'sfx-{name}.wav written')

# ---------- beat map ----------
with open(os.path.join(OUT, 'beatmap.json'), 'w') as f:
    json.dump(beatmap, f, indent=2)
print(f'beatmap.json: {len(beatmap["events"])} events')
print(f'  kicks: {sum(1 for e in beatmap["events"] if e["kind"]=="kick")}')
print(f'  snares: {sum(1 for e in beatmap["events"] if e["kind"]=="snare")}')
print(f'  stabs: {sum(1 for e in beatmap["events"] if e["kind"]=="stab")}')
