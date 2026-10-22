import { AI_CONFIG } from "@shared/index";

/**
 * Tiempo que el texto de un vecino IA cuenta como "hablando" para el juez.
 * No hay TTS: solo se mantiene el indicador y el solapamiento mientras el
 * mensaje está destacado en pantalla.
 */
export function estimateTextDisplayMs(text: string): number {
  return Math.min(
    AI_CONFIG.DISPLAY_MAX_MS,
    AI_CONFIG.DISPLAY_BASE_MS + text.length * AI_CONFIG.DISPLAY_PER_CHAR_MS,
  );
}
