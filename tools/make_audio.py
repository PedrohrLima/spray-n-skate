#!/usr/bin/env python3
"""Gera a trilha sonora e os efeitos sonoros do SPRAY N' SKATE (100% sintetizados).

Uso:  python3 tools/make_audio.py
Saída: public/audio/*.wav (mono, 22050 Hz, 16 bits)
"""
import os
import wave
import numpy as np

SR = 22050
OUT = os.path.join(os.path.dirname(__file__), "..", "public", "audio")
os.makedirs(OUT, exist_ok=True)
rng = np.random.default_rng(42)


def save(name, data, gain=0.9):
    data = np.asarray(data, dtype=np.float64)
    peak = np.max(np.abs(data)) or 1.0
    data = data / peak * gain
    pcm = (data * 32767).astype("<i2")
    with wave.open(os.path.join(OUT, name + ".wav"), "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes(pcm.tobytes())
    print(f"{name}.wav  {len(pcm) / SR:.2f}s")


def t_axis(dur):
    return np.arange(int(SR * dur)) / SR


def env(n, a=0.005, r=0.05):
    e = np.ones(n)
    na, nr = max(1, int(SR * a)), max(1, int(SR * r))
    e[:na] = np.linspace(0, 1, na)
    e[-nr:] *= np.linspace(1, 0, nr)
    return e


def square(freq, dur, duty=0.5):
    t = t_axis(dur)
    ph = (t * freq) % 1.0
    return np.where(ph < duty, 1.0, -1.0)


def sine(freq, dur):
    return np.sin(2 * np.pi * freq * t_axis(dur))


def noise(dur):
    return rng.uniform(-1, 1, int(SR * dur))


def sweep(f0, f1, dur, wave_fn="sine"):
    t = t_axis(dur)
    f = np.linspace(f0, f1, len(t))
    ph = np.cumsum(f) / SR
    if wave_fn == "square":
        return np.where((ph % 1.0) < 0.5, 1.0, -1.0)
    return np.sin(2 * np.pi * ph)


def midi(n):
    return 440.0 * 2 ** ((n - 69) / 12)


# ------------------------------------------------------------------ SFX
def sfx():
    # ollie: estalo curto + chirp ascendente
    s = sweep(220, 520, 0.16, "square") * env(int(SR * 0.16), 0.002, 0.08) * 0.6
    s += noise(0.16) * np.linspace(0.5, 0, int(SR * 0.16)) * 0.4
    save("ollie", s)

    # trick: whoosh com giro
    d = 0.28
    s = sweep(300, 1100, d) * env(int(SR * d), 0.01, 0.12) * 0.5
    s += sweep(1100, 500, d, "square") * env(int(SR * d), 0.02, 0.15) * 0.25
    s += noise(d) * np.sin(np.linspace(0, np.pi, int(SR * d))) * 0.25
    save("trick", s)

    # land: baque grave + rolamento
    d = 0.22
    s = sweep(140, 55, d) * env(int(SR * d), 0.001, 0.15)
    s += noise(d) * np.exp(-np.linspace(0, 9, int(SR * d))) * 0.6
    save("land", s)

    # coin: dois tons
    a = square(988, 0.07, 0.25) * env(int(SR * 0.07), 0.002, 0.03)
    b = square(1319, 0.2, 0.25) * env(int(SR * 0.2), 0.002, 0.15)
    save("coin", np.concatenate([a, b]) * 0.7)

    # crash: queda
    d = 0.7
    n = int(SR * d)
    s = noise(d) * np.exp(-np.linspace(0, 5, n)) * 0.9
    s += sweep(200, 40, d) * np.exp(-np.linspace(0, 3.5, n)) * 0.9
    save("crash", s)

    # grind: ruído metálico (loop curto)
    d = 0.4
    n = int(SR * d)
    t = t_axis(d)
    s = noise(d) * 0.5 + square(1830, d, 0.3) * 0.12 + square(2410, d, 0.3) * 0.08
    s *= 0.8 + 0.2 * np.sin(2 * np.pi * 25 * t)
    k = int(SR * 0.01)
    s[:k] *= np.linspace(0, 1, k)
    s[-k:] *= np.linspace(1, 0, k)
    save("grind", s, 0.55)

    # powerup: arpejo ascendente
    notes = [60, 64, 67, 72, 76]
    s = np.concatenate([square(midi(n), 0.07, 0.25) * env(int(SR * 0.07), 0.002, 0.03) for n in notes])
    save("powerup", s)

    # life: 'jingle' curto
    notes = [67, 72, 76, 79]
    s = np.concatenate([sine(midi(n), 0.1) * env(int(SR * 0.1), 0.003, 0.05) for n in notes])
    save("life", s)

    # select / start
    a = square(660, 0.06, 0.25) * env(int(SR * 0.06), 0.002, 0.03)
    b = square(990, 0.12, 0.25) * env(int(SR * 0.12), 0.002, 0.08)
    save("select", np.concatenate([a, b]) * 0.8)

    # countdown beep
    save("beep", square(440, 0.12, 0.5) * env(int(SR * 0.12), 0.002, 0.05))
    save("go", square(880, 0.35, 0.5) * env(int(SR * 0.35), 0.002, 0.2))

    # zona nova
    notes = [(57, .12), (60, .12), (64, .12), (69, .3)]
    s = np.concatenate([square(midi(n), d, 0.25) * env(int(SR * d), 0.003, 0.05) for n, d in notes])
    save("zone", s * 0.8)

    # game over: descendente triste
    notes = [(64, .22), (62, .22), (60, .22), (57, .6)]
    s = np.concatenate([square(midi(n), d, 0.5) * env(int(SR * d), 0.005, 0.12) for n, d in notes])
    save("gameover", s * 0.8)

    # vitória: fanfarra
    notes = [(60, .12), (60, .12), (60, .12), (64, .3), (62, .12), (65, .12), (64, .12), (67, .6)]
    parts = []
    for n, d in notes:
        m = square(midi(n), d, 0.25) * 0.6 + square(midi(n - 12), d, 0.5) * 0.4
        parts.append(m * env(int(SR * d), 0.004, 0.06))
    save("win", np.concatenate(parts))


def story_sfx():
    """Sons das cutscenes (spray, alerta, sirene e derrapada). Usa um gerador próprio de números
    aleatórios para não alterar os demais sons já gerados."""
    r = np.random.default_rng(11)

    def hp_noise(dur, k=8):
        n = r.uniform(-1, 1, int(SR * dur))
        return n - np.convolve(n, np.ones(k) / k, mode="same")  # passa-alta simples

    # spray: chiado agudo com leve tremulação
    d = 0.6
    s = hp_noise(d) * env(int(SR * d), 0.04, 0.15) * (0.8 + 0.2 * np.sin(2 * np.pi * 26 * t_axis(d)))
    save("spray", s, 0.55)
    # alerta ("!"): dois bipes subindo
    a = square(660, 0.09, 0.5) * env(int(SR * 0.09), 0.002, 0.03)
    b = square(990, 0.18, 0.5) * env(int(SR * 0.18), 0.002, 0.1)
    save("alert", np.concatenate([a, b]) * 0.8)
    # sirene: lamento de duas notas (sobe e desce), 4 ciclos
    parts = []
    for k in range(4):
        f0, f1 = (640, 980) if k % 2 == 0 else (980, 640)
        w = 0.6 * sweep(f0, f1, 0.42, "square") + 0.4 * sweep(f0, f1, 0.42, "sine")
        parts.append(w * env(len(w), 0.01, 0.04))
    sir = np.concatenate(parts)
    save("siren", sir * np.linspace(0.6, 1.0, len(sir)), 0.5)
    # derrapada: ruído agudo modulado
    d = 0.55
    sk = hp_noise(d, 4) * env(int(SR * d), 0.02, 0.25) * (0.7 + 0.3 * np.sin(2 * np.pi * 70 * t_axis(d)))
    save("skid", sk, 0.6)
    # lata de spray sendo sacudida: cliques secos de ar/bolinha
    d = 0.75
    t = t_axis(d)
    clicks = np.zeros(len(t))
    for k in range(9):
        i0 = int(SR * (0.03 + k * 0.078))
        n = int(SR * 0.025)
        clicks[i0:i0 + n] += hp_noise(0.025, 3)[:n] * np.linspace(1, 0, n) ** 2 * (0.7 + 0.3 * r.random())
    save("shake", clicks, 0.6)
    # apito do policial: dois sopros com vibrato
    parts = []
    for dur in (0.28, 0.5):
        tt = t_axis(dur)
        f = 2350 + 90 * np.sin(2 * np.pi * 38 * tt)
        w = np.sin(2 * np.pi * np.cumsum(f) / SR) * env(len(tt), 0.01, 0.06)
        parts += [w, np.zeros(int(SR * 0.06))]
    save("whistle", np.concatenate(parts), 0.5)
    # helicóptero: pás batendo (pulsos graves + ruído)
    d = 3.2
    tt = t_axis(d)
    pulse = (np.sin(2 * np.pi * 11 * tt) > 0.2).astype(float)
    pulse = np.convolve(pulse, np.ones(180) / 180, mode="same")
    rumble = np.convolve(r.uniform(-1, 1, len(tt)), np.ones(40) / 40, mode="same")
    save("chopper", (rumble * 2.4 + np.sin(2 * np.pi * 58 * tt) * 0.6) * pulse * env(len(tt), 0.3, 0.5), 0.6)
    # porta de viatura batendo
    d = 0.3
    tt = t_axis(d)
    door = (np.sin(2 * np.pi * 95 * tt) * 0.9 + hp_noise(d, 5) * 0.5) * np.exp(-tt * 18)
    save("door", door, 0.7)
    # skate rolando: ronco grave modulado
    d = 1.4
    tt = t_axis(d)
    ro = np.convolve(r.uniform(-1, 1, len(tt)), np.ones(14) / 14, mode="same") * (0.75 + 0.25 * np.sin(2 * np.pi * 21 * tt))
    save("roll", ro * env(len(tt), 0.15, 0.4), 0.4)


# ------------------------------------------------------------------ MÚSICA
def music(name, bpm, prog, melody_seed, bright=False):
    """Loop de 8 compassos: bateria + baixo + arpejo + melodia (estilo chiptune/lo-fi)."""
    beat = 60.0 / bpm
    bars = 8
    total = int(SR * beat * 4 * bars)
    buf = np.zeros(total + SR * 2)  # cauda extra para dobrar no início

    def put(sig, start):
        i = int(start * SR)
        buf[i:i + len(sig)] += sig

    r = np.random.default_rng(melody_seed)
    for bar in range(bars):
        root, chord = prog[bar % len(prog)]
        t0 = bar * 4 * beat
        # bateria
        for b in range(4):
            tb = t0 + b * beat
            if b in (0, 2):
                k = sweep(150, 45, 0.18) * np.exp(-np.linspace(0, 5, int(SR * 0.18)))
                put(k * 0.95, tb)
            if b in (1, 3):
                sn = noise(0.14) * np.exp(-np.linspace(0, 7, int(SR * 0.14)))
                sn += sine(190, 0.14) * np.exp(-np.linspace(0, 9, int(SR * 0.14))) * 0.5
                put(sn * 0.55, tb)
            for h in (0, 0.5):
                hh = noise(0.04) * np.exp(-np.linspace(0, 8, int(SR * 0.04)))
                put(hh * (0.22 if h == 0 else 0.14), tb + h * beat)
        # baixo (colcheias)
        pat = [0, 0, 12, 0, 7, 0, 12, 7]
        for i, off in enumerate(pat):
            d = beat * 0.5
            nt = root - 24 + off
            s = square(midi(nt), d, 0.5) * env(int(SR * d), 0.004, 0.06)
            put(s * 0.34, t0 + i * d)
        # arpejo (semicolcheias)
        for i in range(16):
            d = beat * 0.25
            nt = root + chord[i % len(chord)] + (12 if (i // 4) % 2 else 0)
            s = square(midi(nt), d, 0.25) * env(int(SR * d), 0.003, 0.05)
            put(s * 0.13, t0 + i * d)
        # melodia (mais presente na segunda metade)
        if bar >= 2:
            scale = [0, 3, 5, 7, 10, 12, 15] if not bright else [0, 2, 4, 7, 9, 12, 14]
            tt = 0.0
            while tt < 4 * beat - 0.01:
                dur = float(r.choice([0.5, 0.5, 1.0, 0.25 * 2]))
                dur = min(dur, 4 - tt / beat) * beat
                if r.random() < 0.78:
                    nt = root + 12 + int(r.choice(scale))
                    s = square(midi(nt), dur * 0.92, 0.5) * env(int(SR * dur * 0.92), 0.01, 0.1)
                    put(s * 0.17, t0 + tt)
                tt += dur
    out = buf[:total].copy()
    tail = buf[total:]
    out[:len(tail)] += tail[:total] if len(tail) > total else tail
    save(name, out, 0.85)


if __name__ == "__main__":
    sfx()
    story_sfx()
    # progressão Am - F - C - G
    prog = [(57, [0, 3, 7]), (53, [0, 4, 7]), (60, [0, 4, 7]), (55, [0, 4, 7])]
    music("music", 112, prog, melody_seed=7)
