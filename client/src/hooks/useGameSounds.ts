import { useCallback, useEffect, useRef, useState } from "react";
import type { RuinaState } from "@shared/index";
import { playEnvelope, playHammer, playVictory, unlockAudio } from "../lib/sfx";

const SOUND_KEY = "junta.sound.v1";

function readPreference(): boolean {
  try {
    return window.localStorage.getItem(SOUND_KEY) !== "off";
  } catch {
    return true;
  }
}

export interface GameSounds {
  soundEnabled: boolean;
  toggleSound: () => void;
}

/** Dispara los efectos según las transiciones de fase que llegan del servidor. */
export function useGameSounds(room: RuinaState | null): GameSounds {
  const [soundEnabled, setSoundEnabled] = useState(readPreference);
  const previousPhase = useRef<RuinaState["phase"] | null>(room?.phase ?? null);

  useEffect(() => {
    const unlock = (): void => unlockAudio();
    window.addEventListener("pointerdown", unlock, { once: true });
    return () => window.removeEventListener("pointerdown", unlock);
  }, []);

  useEffect(() => {
    if (!room) {
      previousPhase.current = null;
      return;
    }
    const previous = previousPhase.current;
    previousPhase.current = room.phase;
    if (!soundEnabled || previous === null || previous === room.phase) return;

    if (
      previous === "VOTACION_COMISION" &&
      (room.phase === "FIRMA_CONTRATO" ||
        room.phase === "NOMINACION" ||
        room.phase === "RESOLUCION_RONDA")
    ) {
      playHammer();
    }
    if (room.phase === "RESOLUCION_RONDA") playEnvelope();
    if (room.phase === "VICTORIA") playVictory();
  }, [room, soundEnabled]);

  const toggleSound = useCallback((): void => {
    setSoundEnabled((current) => {
      const next = !current;
      try {
        window.localStorage.setItem(SOUND_KEY, next ? "on" : "off");
      } catch {
        // Sin almacenamiento: solo dura la sesión.
      }
      if (next) unlockAudio();
      return next;
    });
  }, []);

  return { soundEnabled, toggleSound };
}
