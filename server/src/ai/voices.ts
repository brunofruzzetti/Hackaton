import { AI_CONFIG, AUDIO_CONFIG, type VoiceProfile } from "@shared/index";

interface BaseVoice {
  voiceIndex: number;
  pitch: number;
  rate: number;
}

/**
 * Perfiles de voz para los 4 vecinos IA. El índice elige una voz del navegador;
 * pitch/rate aseguran que suenen distintos aunque el sistema solo tenga una voz.
 */
const AI_VOICES: readonly BaseVoice[] = [
  { voiceIndex: 0, pitch: 1.18, rate: 1.02 },
  { voiceIndex: 1, pitch: 0.82, rate: 0.94 },
  { voiceIndex: 2, pitch: 1.32, rate: 1.06 },
  { voiceIndex: 3, pitch: 0.72, rate: 0.9 },
];

export function getAiVoiceProfile(index: number, name: string): VoiceProfile {
  const base = AI_VOICES[index % AI_VOICES.length] ?? AI_VOICES[0];
  if (!base) {
    return {
      voiceIndex: 0,
      pitch: 1,
      rate: 1,
      volume: AUDIO_CONFIG.TTS_VOLUME,
      label: `IA · ${name}`,
    };
  }
  return {
    voiceIndex: base.voiceIndex,
    pitch: base.pitch,
    rate: base.rate,
    volume: AUDIO_CONFIG.TTS_VOLUME,
    label: `IA · ${name}`,
  };
}

/** Voz del juez: más grave, más lenta y omnipresente. */
export const JUDGE_VOICE: VoiceProfile = {
  voiceIndex: 0,
  pitch: 0.62,
  rate: 0.9,
  volume: 0.9,
  label: "Juez",
};

export function estimateSpeechMs(text: string): number {
  return Math.min(
    20_000,
    AI_CONFIG.TTS_BASE_MS + text.length * AI_CONFIG.TTS_PER_CHAR_MS,
  );
}
