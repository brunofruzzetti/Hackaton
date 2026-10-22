/**
 * Efectos de sonido sintéticos con Web Audio API. No hay assets externos ni
 * licencias: todo se genera en el navegador.
 */

let audioContext: AudioContext | null = null;

type AudioContextConstructor = typeof AudioContext;

function getContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (audioContext) return audioContext;
  const candidate =
    window.AudioContext ??
    (window as Window & { webkitAudioContext?: AudioContextConstructor }).webkitAudioContext;
  if (!candidate) return null;
  try {
    audioContext = new candidate();
  } catch {
    return null;
  }
  return audioContext;
}

export function unlockAudio(): void {
  const ctx = getContext();
  if (ctx?.state === "suspended") {
    void ctx.resume().catch(() => undefined);
  }
}

function tone(
  ctx: AudioContext,
  frequency: number,
  startOffset: number,
  duration: number,
  type: OscillatorType,
  gainValue: number,
): void {
  const oscillator = ctx.createOscillator();
  const gain = ctx.createGain();
  const start = ctx.currentTime + startOffset;
  oscillator.type = type;
  oscillator.frequency.setValueAtTime(frequency, start);
  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.exponentialRampToValueAtTime(gainValue, start + 0.012);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
  oscillator.connect(gain).connect(ctx.destination);
  oscillator.start(start);
  oscillator.stop(start + duration + 0.02);
}

function noise(
  ctx: AudioContext,
  startOffset: number,
  duration: number,
  gainValue: number,
): void {
  const frames = Math.max(1, Math.floor(ctx.sampleRate * duration));
  const buffer = ctx.createBuffer(1, frames, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let index = 0; index < frames; index += 1) {
    const decay = 1 - index / frames;
    data[index] = (Math.random() * 2 - 1) * decay;
  }
  const source = ctx.createBufferSource();
  const gain = ctx.createGain();
  const start = ctx.currentTime + startOffset;
  source.buffer = buffer;
  gain.gain.setValueAtTime(gainValue, start);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
  source.connect(gain).connect(ctx.destination);
  source.start(start);
}

function readyContext(): AudioContext | null {
  const ctx = getContext();
  if (!ctx) return null;
  if (ctx.state === "suspended") void ctx.resume().catch(() => undefined);
  return ctx;
}

/** Martillazo seco al cerrar la votación. */
export function playHammer(): void {
  const ctx = readyContext();
  if (!ctx) return;
  tone(ctx, 120, 0, 0.14, "square", 0.16);
  tone(ctx, 64, 0.015, 0.22, "sine", 0.22);
  noise(ctx, 0, 0.07, 0.12);
}

/** Crujido de sobre + acorde corto al revelar el resultado. */
export function playEnvelope(): void {
  const ctx = readyContext();
  if (!ctx) return;
  noise(ctx, 0, 0.32, 0.08);
  tone(ctx, 523.25, 0.12, 0.22, "triangle", 0.09);
  tone(ctx, 783.99, 0.2, 0.28, "triangle", 0.08);
  tone(ctx, 1046.5, 0.28, 0.36, "triangle", 0.06);
}

/** Fanfarria breve para la pantalla final. */
export function playVictory(): void {
  const ctx = readyContext();
  if (!ctx) return;
  const notes = [523.25, 659.25, 783.99, 1046.5];
  notes.forEach((frequency, index) => {
    tone(ctx, frequency, index * 0.11, 0.28, "triangle", 0.1);
  });
  noise(ctx, 0.44, 0.35, 0.05);
}
