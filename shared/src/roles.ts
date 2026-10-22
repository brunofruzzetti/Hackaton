/**
 * Fuente única de verdad de los 8 roles.
 * Editable: añadir/quitar comportamientos o prompts no rompe el resto del juego.
 */

export const ROLE_IDS = [
  "gossip",
  "debtor",
  "president",
  "spender",
  "clueless",
  "squatter",
  "catlady",
  "concierge",
] as const;

export type RoleId = (typeof ROLE_IDS)[number];

export interface RoleDefinition {
  id: RoleId;
  /** Nombre visible en UI y transcripción. */
  name: string;
  /** Una línea para el lobby / reparto. */
  description: string;
  /** 3-4 comportamientos que el juez usa para puntuar. */
  expectedBehaviors: string[];
  /** true si vota como propietario; false para okupa y conserje. */
  votes: boolean;
  /** Personalidad para cuando la encarna una IA. */
  aiPersonalityPrompt: string;
  /** true si el rol es discreto y no debe penalizarse por hablar poco. */
  discrete?: boolean;
}

export const ROLES: Record<RoleId, RoleDefinition> = {
  gossip: {
    id: "gossip",
    name: "El cotilla",
    description:
      "Se pasa el día al tanto de la vida de los demás y no hay reunión en la que no suelte un rumor.",
    expectedBehaviors: [
      "Suelta rumores sobre otros vecinos, aunque no vengan a cuento.",
      "Pregunta por vidas ajenas y por quién entra o sale del edificio.",
      "Interrumpe con la muletilla «yo me enteré de que...».",
      "Relaciona cualquier propuesta con un cotilleo del vecindario.",
    ],
    votes: true,
    aiPersonalityPrompt:
      "Eres El cotilla de una junta de vecinos española. Hablas de forma cercana y un poco teatral. " +
      "Suelta rumores inventados del edificio, pregunta por la vida de los demás y siempre tienes un " +
      "«me han dicho que...» preparado. No uses datos personales reales. Responde en 2-3 frases.",
  },
  debtor: {
    id: "debtor",
    name: "El moroso",
    description:
      "Lleva tres derramas sin pagar y tiene una excusa nueva para cada recibo.",
    expectedBehaviors: [
      "Evita comprometerse a pagar cualquier cuota o derrama.",
      "Pone excusas creativas (la transferencia que no llegó, el banco, la crisis).",
      "Cambia de tema en cuanto se habla de dinero.",
    ],
    votes: true,
    aiPersonalityPrompt:
      "Eres El moroso de una comunidad de vecinos. Nunca reconoces que no quieres pagar: tienes excusas " +
      "creativas y elaboradas para cada cuota y cambias de tema en cuanto aparece el dinero. " +
      "Responde en 2-3 frases, sin insultos.",
  },
  president: {
    id: "president",
    name: "El presidente buenazo",
    description:
      "Preside la comunidad con buen corazón: quiere que todos estén contentos y sufre con cada discusión. " +
      "Arquetipo entrañable de presidente de comunidad, sin citar series.",
    expectedBehaviors: [
      "Intenta que todos estén contentos y busca acuerdos.",
      "Evita el conflicto y pide calma.",
      "Intenta calmar los ánimos cuando la reunión se desmadra.",
      "Se agobia cuando todos hablan a la vez y pide orden con buenas palabras.",
    ],
    votes: true,
    aiPersonalityPrompt:
      "Eres El presidente buenazo de la comunidad: bonachón, conciliador y un poco sobrepasado. " +
      "Quieres contentar a todo el mundo, evitas tomar partido y te agobias cuando la gente se grita. " +
      "No cites frases ni personajes de ninguna serie; interpreta solo el arquetipo. Responde en 2-3 frases.",
  },
  spender: {
    id: "spender",
    name: "El de las derramas",
    description:
      "Para él todo se aprueba y nada es caro: «son cuatro duros por vecino».",
    expectedBehaviors: [
      "Aprueba cualquier gasto que se proponga.",
      "Propone gastos absurdos o innecesarios.",
      "Minimiza los costes con la frase «son cuatro duros por vecino».",
      "Tira la casa por la ventana con entusiasmo.",
    ],
    votes: true,
    aiPersonalityPrompt:
      "Eres El de las derramas: te encanta aprobar gastos, propones reformas absurdas y carísimas, " +
      "y siempre minimizas el coste diciendo que «son cuatro duros por vecino». Responde en 2-3 frases.",
  },
  clueless: {
    id: "clueless",
    name: "El que no se entera",
    description:
      "Asiente con seguridad mientras pregunta de qué se está hablando.",
    expectedBehaviors: [
      "Pregunta de qué se habla o qué se está votando.",
      "Confunde unas propuestas con otras.",
      "Responde a preguntas que nadie ha hecho.",
      "Asiente con seguridad aunque no haya entendido nada.",
    ],
    votes: true,
    aiPersonalityPrompt:
      "Eres El que no se entera de nada en una junta de vecinos. Preguntas lo obvio, confundes unas " +
      "propuestas con otras y respondes a cosas que nadie ha preguntado, pero lo haces con total " +
      "confianza. Responde en 2-3 frases.",
  },
  squatter: {
    id: "squatter",
    name: "El okupa",
    description:
      "Vive en el 3.º C y no es propietario, aunque prefiere no sacar el tema.",
    expectedBehaviors: [
      "Intenta pasar desapercibido y hablar poco.",
      "Defiende arreglos que le benefician sin mencionar que no paga.",
      "Se pone nervioso si preguntan quién es o desde cuándo vive ahí.",
      "Esquiva cualquier pregunta sobre cuotas o propiedad.",
    ],
    votes: false,
    discrete: true,
    aiPersonalityPrompt:
      "Eres El okupa del edificio. No eres propietario y no quieres que se note. Defiendes mejoras que " +
      "te benefician (portal, ascensor, calefacción) pero esquivas hablar de pagos o de quién eres. " +
      "Si te presionan, te pones nervioso y cambias de tema. Habla poco salvo que te pregunten. " +
      "Responde en 1-3 frases.",
  },
  catlady: {
    id: "catlady",
    name: "La vieja de los gatos",
    description:
      "Tiene cinco gatos y una anécdota para cada uno; todo afecta a sus gatos.",
    expectedBehaviors: [
      "Relaciona cualquier tema con sus gatos.",
      "Se queja de olores y ruidos que molestan a los gatos.",
      "Cuenta anécdotas de cada gato con nombre propio.",
      "Defiende los intereses felinos del edificio.",
    ],
    votes: true,
    aiPersonalityPrompt:
      "Eres La vieja de los gatos del edificio. Tienes cinco gatos con nombre (Michi, Lulú, Tofu, " +
      "Canela y Bigotes) y relacionas absolutamente todo con ellos: olores, ruidos, obras y vecinos. " +
      "Cuenta anécdotas cortas de tus gatos. Responde en 2-3 frases.",
  },
  concierge: {
    id: "concierge",
    name: "El conserje",
    description:
      "No es propietario y no tiene opinión propia: lo que diga el presidente.",
    expectedBehaviors: [
      "Secunda siempre al presidente.",
      "Asiente y repite lo que dice el presidente.",
      "Si le preguntan su opinión, responde «lo que diga el presidente».",
      "No propone nada por iniciativa propia.",
    ],
    votes: false,
    discrete: true,
    aiPersonalityPrompt:
      "Eres El conserje del edificio. No eres propietario, no tienes opinión propia y secundas al " +
      "presidente {presidentName}. Repites lo que dice, asientes y, si te preguntan, respondes " +
      "«lo que diga el presidente». Habla poco y en tono servicial. Responde en 1-2 frases.",
  },
};

export const ROLE_LIST: RoleDefinition[] = ROLE_IDS.map((id) => ROLES[id]);

export function getRole(id: RoleId): RoleDefinition {
  return ROLES[id];
}

/**
 * Devuelve el prompt de personalidad listo para usar.
 * El conserje IA necesita el nombre del presidente de la partida.
 */
export function buildRolePrompt(roleId: RoleId, options?: { presidentName?: string }): string {
  return ROLES[roleId].aiPersonalityPrompt.replaceAll(
    "{presidentName}",
    options?.presidentName ?? "el presidente",
  );
}
