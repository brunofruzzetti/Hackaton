import type { VoiceProfile } from "@shared/index";

interface QueueItem {
  text: string;
  voice: VoiceProfile;
}

/**
 * Interfaz de TTS del cliente. El MVP usa speechSynthesis; mañana puede sustituirse
 * por un proveedor de audio (ElevenLabs, OpenAI TTS...) sin tocar el resto.
 */
export interface TtsProvider {
  readonly supported: boolean;
  speak(text: string, voice: VoiceProfile): void;
  cancel(): void;
  prime(): void;
}

class BrowserTtsProvider implements TtsProvider {
  readonly supported =
    typeof window !== "undefined" && "speechSynthesis" in window && "SpeechSynthesisUtterance" in window;

  private queue: QueueItem[] = [];
  private current: SpeechSynthesisUtterance | null = null;
  private generation = 0;
  private primed = false;

  speak(text: string, voice: VoiceProfile): void {
    const clean = text.trim();
    if (!this.supported || !clean) return;
    this.queue.push({ text: clean, voice });
    if (!this.current) this.next();
  }

  cancel(): void {
    if (!this.supported) return;
    this.generation += 1;
    this.queue = [];
    this.current = null;
    window.speechSynthesis.cancel();
  }

  /** Desbloquea speechSynthesis dentro de un gesto del usuario. */
  prime(): void {
    if (!this.supported || this.primed) return;
    this.primed = true;
    try {
      const utterance = new SpeechSynthesisUtterance(" ");
      utterance.volume = 0;
      utterance.lang = "es-ES";
      window.speechSynthesis.speak(utterance);
    } catch {
      // Sin permiso de audio: se reintentará al primer speak.
    }
  }

  private next(): void {
    if (!this.supported) return;
    const item = this.queue.shift();
    if (!item) {
      this.current = null;
      return;
    }

    const generation = this.generation;
    const utterance = new SpeechSynthesisUtterance(item.text);
    utterance.lang = "es-ES";
    utterance.pitch = clamp(item.voice.pitch, 0, 2);
    utterance.rate = clamp(item.voice.rate, 0.5, 2);
    utterance.volume = clamp(item.voice.volume, 0, 1);
    const selectedVoice = this.pickVoice(item.voice.voiceIndex);
    if (selectedVoice) utterance.voice = selectedVoice;

    const advance = (): void => {
      if (generation !== this.generation) return;
      this.current = null;
      this.next();
    };
    utterance.onend = advance;
    utterance.onerror = advance;

    this.current = utterance;
    try {
      window.speechSynthesis.speak(utterance);
    } catch {
      this.current = null;
      this.next();
    }
  }

  private pickVoice(index: number): SpeechSynthesisVoice | null {
    const voices = window.speechSynthesis.getVoices();
    if (voices.length === 0) return null;
    const spanish = voices.filter((voice) => voice.lang.toLowerCase().startsWith("es"));
    const pool = spanish.length > 0 ? spanish : voices;
    return pool[index % pool.length] ?? null;
  }
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/** Singleton: el socket encola y la UI no necesita saber nada más. */
export const tts: TtsProvider = new BrowserTtsProvider();
