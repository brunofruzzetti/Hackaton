/**
 * Configuración central del juego. Editar aquí los umbrales del MVP.
 * En el servidor, algunas flags se pueden sobrescribir por entorno (p. ej. JUDGE_FORCE_MUTE).
 */

export const GAME_CONFIG = {
  /** Participantes totales (humanos + IA) para poder empezar. */
  MIN_PARTICIPANTS: 3,
  /** Máximo de participantes: hay 14 roles en la bolsa. */
  MAX_PARTICIPANTS: 10,
  /** Máximo de vecinos IA en una partida. */
  MAX_AI_PLAYERS: 4,
  /** Roles fijos durante toda la partida. */
  ROUNDS: 3,
  /** Duración de la discusión por ronda (4 min para 10 jugadores). */
  DISCUSSION_SECONDS: 240,
  /** Longitud del código de sala. */
  ROOM_CODE_LENGTH: 4,
  /** Aforo de la transcripción en memoria por sala. */
  MAX_TRANSCRIPT_ENTRIES: 1000,
  /** Tiempo que se conserva una sala sin humanos conectados. */
  ROOM_TTL_MS: 2 * 60 * 60 * 1000,
} as const;

export const JUDGE_CONFIG = {
  /** Nº de humanos hablando simultáneamente para que intervenga el juez. */
  OVERLAP_SPEAKERS: 4,
  /** Tiempo que debe mantenerse el solapamiento (ms). */
  OVERLAP_MS: 2000,
  /** Espera mínima entre intervenciones del juez (ms). */
  COOLDOWN_MS: 15000,
  /** Duración del silencio forzado (ms). */
  FORCE_MUTE_MS: 3000,
  /** Silencio humano que habilita a un vecino IA a tomar la palabra (ms). */
  AI_SILENCE_AFTER_HUMAN_MS: 2500,
  /** Penalización por cada aviso de orden en la ronda. */
  ORDER_WARNING_PENALTY: 10,
} as const;

export const AI_CONFIG = {
  /** Silencio humano mínimo antes de que una IA publique texto (ms). */
  SILENCE_AFTER_HUMAN_MS: 2500,
  /** Tiempo mínimo entre dos mensajes de IA (ms). */
  MIN_GAP_MS: 15000,
  /** Máximo de intervenciones por IA y ronda. */
  MAX_TURNS_PER_ROUND: 2,
  /** Líneas de transcripción que recibe el modelo como contexto. */
  CONTEXT_LINES: 16,
  /** Longitud máxima de una intervención IA (caracteres). */
  MAX_LINE_CHARS: 240,
  /** Límite de espera de la generación (ms). */
  GENERATION_TIMEOUT_MS: 20000,
  /** Tiempo que el texto de la IA cuenta como "hablando" para el juez (ms). */
  DISPLAY_BASE_MS: 2200,
  DISPLAY_PER_CHAR_MS: 22,
  DISPLAY_MAX_MS: 6000,
} as const;

export const TASK_CONFIG = {
  /** Tareas que recibe cada jugador al empezar una ronda. */
  TASKS_PER_PLAYER: 4,
  /** Tamaño del mazo de cada rol. */
  TASKS_PER_ROLE: 24,
  /** Puntos por dificultad. */
  DIFFICULTY_POINTS: {
    easy: 1,
    medium: 2,
    hard: 3,
  },
  /** Reparto por ronda: 1 fácil, 2 medias, 1 difícil. */
  DRAW_BY_DIFFICULTY: {
    easy: 1,
    medium: 2,
    hard: 1,
  },
} as const;

export const SCORING_CONFIG = {
  /**
   * Puntuación por ronda:
   * - Puntos de tareas: 1/2/3 según dificultad, sumados en servidor.
   * - Bonus de rol: 0-5 puntos según la media ponderada del juez.
   */
  ROLE_BONUS_MAX: 5,
  RUBRIC_WEIGHTS: {
    fidelidad_cliche: 0.4,
    participacion: 0.2,
    creatividad: 0.2,
    reaccion_a_otros: 0.2,
  },
} as const;

export const AUDIO_CONFIG = {
  /** Nivel mínimo (0-1) para considerar que alguien habla en cliente. */
  SPEAKING_LEVEL_THRESHOLD: 0.02,
  /** Duración máxima de un clip de push-to-talk (ms). */
  MAX_CLIP_MS: 30000,
  /** Tamaño máximo de un clip subido (bytes). */
  MAX_CLIP_BYTES: 10 * 1024 * 1024,
} as const;

/** Propuestas posibles de la comunidad. */
export const PROPOSALS = [
  "Instalar un ascensor en el portal",
  "Cambiar el portero automático por uno con cámara",
  "Pintar la fachada y arreglar la cornisa",
  "Poner placas solares en la azotea",
  "Contratar un servicio de limpieza para el portal",
  "Cambiar las tuberías del edificio",
  "Instalar un sistema de videovigilancia",
  "Reformar el patio interior y poner bancos",
  "Poner un aparcabicis en el patio",
  "Cambiar la calefacción central por aerotermia",
] as const;

/** Nombres para los vecinos IA. Se usan sin repetir dentro de una sala. */
export const AI_NAMES = [
  "Manoli",
  "Paco",
  "Carmen",
  "Antonio",
  "Rosa",
  "Julián",
  "Lola",
  "Fernando",
  "Pilar",
  "Ramón",
] as const;

/** Frases del juez para pedir silencio (Hito 5). */
export const JUDGE_SILENCE_PHRASES = [
  "¡Orden en la sala, que esto es una junta y no un mercado!",
  "¡Silencio, por favor, que se oye hasta el gato del tercero!",
  "Un momento: aquí habla uno, como en las bodas.",
  "¡Que no estamos en un karaoke, señores!",
  "Vecinos, que el acta no se escribe sola.",
  "¡Menos gritar y más firmar el acta, por favor!",
  "El que quiera micrófono, que pida la palabra.",
  "¡Que esto es una junta de vecinos, no la final de la Champions!",
  "Un turno de palabra, como Dios manda.",
  "¡Silencio en la sala, que me van a saltar los plomos!",
] as const;
