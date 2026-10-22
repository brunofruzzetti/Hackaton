import {
  AI_CONFIG,
  buildRolePrompt,
  getEffectiveRole,
  type PresidentStyleId,
  type RoleId,
  type TranscriptEntry,
} from "@shared/index";

export interface NeighborPromptPlayer {
  name: string;
  roleId: RoleId | null;
  kind: "human" | "ai";
}

export interface NeighborPromptInput {
  playerName: string;
  roleId: RoleId;
  presidentStyleId: PresidentStyleId | null;
  proposal: string;
  transcript: readonly TranscriptEntry[];
  players: readonly NeighborPromptPlayer[];
  presidentName?: string | null;
}

function roleName(roleId: RoleId | null, styleId: PresidentStyleId | null): string {
  return roleId ? getEffectiveRole(roleId, styleId).name : "Vecino";
}

/** Construye el prompt de una intervención de vecino IA. */
export function buildNeighborPrompt(input: NeighborPromptInput): {
  systemPrompt: string;
  userPrompt: string;
} {
  const role = getEffectiveRole(input.roleId, input.presidentStyleId);
  const presidentName =
    input.presidentName ??
    input.players.find((player) => player.roleId === "president")?.name ??
    "el presidente";

  const personality = buildRolePrompt(input.roleId, {
    presidentName,
    presidentStyleId: input.presidentStyleId,
  });

  const systemPrompt = [
    `Eres ${input.playerName}, un vecino de una comunidad de propietarios española.`,
    "Estás participando en una junta de vecinos por voz. No eres un asistente: eres un personaje con intereses propios.",
    `Tu rol es "${role.name}": ${role.description}`,
    "Lo que se espera de tu rol:",
    ...role.expectedBehaviors.map((behavior) => `- ${behavior}`),
    `Tu personalidad: ${personality}`,
    "Reglas de intervención:",
    "- Responde SOLO con tu intervención, sin narración, sin comillas y sin tu nombre.",
    "- Usa 1-3 frases, español de España, tono natural y algo exagerado.",
    "- No digas que eres una IA ni que estás generando texto.",
    "- No inventes datos personales reales, no insultes y no des instrucciones peligrosas.",
    "- Reacciona a lo último que se ha dicho si tiene sentido y aporta algo nuevo.",
    "- No repitas literalmente la frase de otro vecino.",
    "- Si no hay nada interesante que añadir, puedes hacer una pregunta o soltar una exageración de tu rol.",
  ].join("\n");

  const recent = input.transcript.slice(-AI_CONFIG.CONTEXT_LINES);
  const transcriptText =
    recent.length === 0
      ? "La junta acaba de empezar."
      : recent
          .map((entry) => {
            const name = entry.playerName;
            const role = roleName(entry.roleId, input.presidentStyleId);
            const text = entry.text.replace(/\s+/g, " ").slice(0, 220);
            return `[${name} | ${role}] ${text}`;
          })
          .join("\n");

  const present = input.players
    .filter((player) => player.roleId)
    .map((player) => `${player.name} (${roleName(player.roleId, input.presidentStyleId)})`)
    .join(", ");

  const userPrompt = [
    `Propuesta de la comunidad: ${input.proposal}`,
    `Vecinos presentes: ${present}`,
    "Últimas intervenciones:",
    transcriptText,
    "",
    `Interviene ahora como ${input.playerName}, en 1-3 frases. No repitas el saludo inicial de la junta ni expliques tu rol.`,
  ].join("\n");

  return { systemPrompt, userPrompt };
}
