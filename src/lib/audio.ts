/**
 * Lightweight Web Audio sound engine. No external assets.
 * Generates short procedural sounds on demand.
 */

let ctx: AudioContext | null = null;
let muted = false;

function ensureCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!ctx) {
    const AC =
      (window as unknown as { AudioContext?: typeof AudioContext; webkitAudioContext?: typeof AudioContext })
        .AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
  }
  if (ctx.state === "suspended") ctx.resume().catch(() => {});
  return ctx;
}

export function setMuted(value: boolean): void {
  muted = value;
}

export function isMuted(): boolean {
  return muted;
}

type Tone = {
  freq: number;
  type?: OscillatorType;
  duration?: number; // s
  gain?: number;
  attack?: number;
  release?: number;
  detune?: number;
  delay?: number; // s
};

function playTone(t: Tone): void {
  const c = ensureCtx();
  if (!c) return;
  const now = c.currentTime + (t.delay ?? 0);
  const osc = c.createOscillator();
  const g = c.createGain();
  osc.type = t.type ?? "sine";
  osc.frequency.setValueAtTime(t.freq, now);
  if (t.detune) osc.detune.setValueAtTime(t.detune, now);
  const peak = (t.gain ?? 0.12);
  const atk = t.attack ?? 0.005;
  const rel = t.release ?? 0.12;
  const dur = t.duration ?? 0.15;
  g.gain.setValueAtTime(0.0001, now);
  g.gain.exponentialRampToValueAtTime(peak, now + atk);
  g.gain.exponentialRampToValueAtTime(0.0001, now + atk + dur + rel);
  osc.connect(g).connect(c.destination);
  osc.start(now);
  osc.stop(now + atk + dur + rel + 0.02);
}

function play(tones: Tone[]): void {
  if (muted) return;
  tones.forEach(playTone);
}

export const SFX = {
  pickup(): void {
    play([{ freq: 520, type: "sine", duration: 0.06, gain: 0.08, release: 0.08 }]);
  },
  drop(): void {
    play([
      { freq: 320, type: "triangle", duration: 0.08, gain: 0.12, release: 0.1 },
      { freq: 180, type: "sine", duration: 0.12, gain: 0.08, release: 0.18, delay: 0.02 },
    ]);
  },
  invalid(): void {
    play([
      { freq: 180, type: "square", duration: 0.07, gain: 0.06, release: 0.08 },
      { freq: 130, type: "square", duration: 0.09, gain: 0.05, release: 0.1, delay: 0.05 },
    ]);
  },
  click(): void {
    play([{ freq: 700, type: "sine", duration: 0.03, gain: 0.05, release: 0.05 }]);
  },
  win(): void {
    play([
      { freq: 523.25, type: "triangle", duration: 0.12, gain: 0.1, release: 0.15 },
      { freq: 659.25, type: "triangle", duration: 0.12, gain: 0.1, release: 0.15, delay: 0.1 },
      { freq: 783.99, type: "triangle", duration: 0.14, gain: 0.11, release: 0.2, delay: 0.2 },
      { freq: 1046.5, type: "sine", duration: 0.2, gain: 0.1, release: 0.3, delay: 0.32 },
    ]);
  },
  timeout(): void {
    play([
      { freq: 220, type: "sawtooth", duration: 0.18, gain: 0.08, release: 0.2 },
      { freq: 165, type: "sawtooth", duration: 0.22, gain: 0.08, release: 0.25, delay: 0.15 },
      { freq: 110, type: "sawtooth", duration: 0.3, gain: 0.07, release: 0.35, delay: 0.3 },
    ]);
  },
};
