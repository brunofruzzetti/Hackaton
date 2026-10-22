import { TASK_CONFIG } from "./config.js";
import { shuffle, type Rng } from "./composition.js";
import type { PresidentStyleId, RoleId } from "./roles.js";

export type TaskDifficulty = "easy" | "medium" | "hard";

export type TaskKind = "solo" | "combo";

export type TaskSource = "role" | "style" | "universal";

export interface TaskDefinition {
  /** Id estable dentro del mazo del rol. */
  id: string;
  roleId: RoleId;
  text: string;
  difficulty: TaskDifficulty;
  tags: string[];
  points: number;
  kind: TaskKind;
  source: TaskSource;
}

export interface PlayerTask extends TaskDefinition {
  /** Si es combo, el compañero con el que se comparte la tarea. */
  partnerId?: string;
  partnerName?: string;
}

export interface ComboParticipant {
  id: string;
  name: string;
  roleId: RoleId;
}

interface TaskSeed {
  text: string;
  difficulty: TaskDifficulty;
  tags: string[];
}

const ROLE_TASKS: Record<RoleId, TaskSeed[]> = {
  gossip: [
    { text: "Suelta la frase «yo me enteré de que...» y cuenta un rumor inventado.", difficulty: "easy", tags: ["rumor", "tic"] },
    { text: "Pregunta a alguien por su vida privada.", difficulty: "easy", tags: ["pregunta", "cotilleo"] },
    { text: "Menciona a tres vecinos por su nombre.", difficulty: "easy", tags: ["nombres"] },
    { text: "Relaciona el suceso de la ronda con un cotilleo del edificio.", difficulty: "medium", tags: ["reaccion", "rumor"] },
    { text: "Pregunta quién entra y sale del edificio a deshoras.", difficulty: "medium", tags: ["pregunta", "cotilleo"] },
    { text: "Cuenta un rumor sobre el presidente, sin insultos.", difficulty: "medium", tags: ["rumor", "presidente"] },
    { text: "Haz que otro vecino te cuente un rumor.", difficulty: "medium", tags: ["social"] },
    { text: "Descubre en voz alta un secreto inventado del edificio.", difficulty: "hard", tags: ["revelacion"] },
    { text: "Consigue que dos vecinos hablen de un tercero.", difficulty: "hard", tags: ["social"] },
    { text: "Averigua quién ha causado el suceso de la ronda.", difficulty: "hard", tags: ["investigacion"] },
  ],
  debtor: [
    { text: "Di que la transferencia «se quedó en el limbo».", difficulty: "easy", tags: ["dinero", "tic"] },
    { text: "Pregunta cuánto cuesta, pero sin comprometerte a pagar.", difficulty: "easy", tags: ["dinero"] },
    { text: "Cambia de tema en cuanto se mencione una derrama.", difficulty: "easy", tags: ["dinero", "evasion"] },
    { text: "Pon una excusa creativa para no pagar.", difficulty: "medium", tags: ["dinero", "excusa"] },
    { text: "Propón pagar «la semana que viene» sin concretar.", difficulty: "medium", tags: ["dinero", "evasion"] },
    { text: "Queja de la crisis o del banco.", difficulty: "medium", tags: ["excusa"] },
    { text: "Defiende que tú ya pagaste algo, aunque no recuerdes qué.", difficulty: "medium", tags: ["dinero"] },
    { text: "Consigue que otro vecino se ofrezca a adelantar tu parte.", difficulty: "hard", tags: ["social", "dinero"] },
    { text: "Evita pagar al menos dos veces en la misma ronda.", difficulty: "hard", tags: ["evasion"] },
    { text: "Haz que la conversación pase de dinero a otra cosa sin que se note.", difficulty: "hard", tags: ["evasion"] },
  ],
  president: [
    { text: "Preside la ronda y pide orden al menos una vez.", difficulty: "easy", tags: ["orden"] },
    { text: "Di el nombre de la propuesta y pide opiniones.", difficulty: "easy", tags: ["moderacion"] },
    { text: "Agradece la asistencia a la junta.", difficulty: "easy", tags: ["moderacion"] },
    { text: "Resume lo que se ha dicho hasta ahora.", difficulty: "medium", tags: ["moderacion"] },
    { text: "Propón cómo votar o cómo decidir la propuesta.", difficulty: "medium", tags: ["procedimiento"] },
    { text: "Defiende una postura y luego matízala.", difficulty: "medium", tags: ["discurso"] },
    { text: "Pide al conserje su opinión (si está en la partida).", difficulty: "medium", tags: ["conserje"] },
    { text: "Consigue que la junta llegue a un acuerdo parcial.", difficulty: "hard", tags: ["acuerdo"] },
    { text: "Aplaza o cierra una decisión con una excusa.", difficulty: "hard", tags: ["procedimiento"] },
    { text: "Responde a una crítica sin perder la compostura.", difficulty: "hard", tags: ["presion"] },
  ],
  spender: [
    { text: "Di «son cuatro duros por vecino».", difficulty: "easy", tags: ["dinero", "tic"] },
    { text: "Aprueba cualquier gasto que se mencione.", difficulty: "easy", tags: ["dinero"] },
    { text: "Propón una mejora estética para el portal.", difficulty: "easy", tags: ["propuesta"] },
    { text: "Propón un gasto que nadie ha pedido.", difficulty: "medium", tags: ["propuesta", "dinero"] },
    { text: "Minimiza el coste de una obra carísima.", difficulty: "medium", tags: ["dinero"] },
    { text: "Defiende una derrama extra.", difficulty: "medium", tags: ["dinero"] },
    { text: "Pide un presupuesto para algo absurdo.", difficulty: "medium", tags: ["propuesta"] },
    { text: "Consigue que alguien apoye tu gasto absurdo.", difficulty: "hard", tags: ["social", "dinero"] },
    { text: "Que la junta discuta tu propuesta durante 30 segundos.", difficulty: "hard", tags: ["social"] },
    { text: "Propón un capricho y luego otro en la misma ronda.", difficulty: "hard", tags: ["propuesta"] },
  ],
  clueless: [
    { text: "Pregunta de qué se está hablando.", difficulty: "easy", tags: ["pregunta"] },
    { text: "Confunde la propuesta con otra cosa.", difficulty: "easy", tags: ["confusion"] },
    { text: "Asiente sin decir nada concreto.", difficulty: "easy", tags: ["confusion"] },
    { text: "Responde a una pregunta que nadie ha hecho.", difficulty: "medium", tags: ["confusion"] },
    { text: "Pide que te repitan la propuesta desde el principio.", difficulty: "medium", tags: ["pregunta"] },
    { text: "Apoya algo sin saber muy bien qué es.", difficulty: "medium", tags: ["confusion"] },
    { text: "Menciona un tema que no venga a cuento.", difficulty: "medium", tags: ["desvio"] },
    { text: "Haz que alguien te explique la propuesta desde cero.", difficulty: "hard", tags: ["social"] },
    { text: "Confunde a otro vecino con una pregunta.", difficulty: "hard", tags: ["social"] },
    { text: "Resume la ronda de forma completamente equivocada.", difficulty: "hard", tags: ["confusion"] },
  ],
  squatter: [
    { text: "Esquiva una pregunta sobre quién eres.", difficulty: "easy", tags: ["evasion"] },
    { text: "Di que llevas poco tiempo en el edificio.", difficulty: "easy", tags: ["evasion"] },
    { text: "Habla lo justo y asiente.", difficulty: "easy", tags: ["discreto"] },
    { text: "Defiende una mejora que te beneficia.", difficulty: "medium", tags: ["interes"] },
    { text: "Cambia de tema si te preguntan por pagos.", difficulty: "medium", tags: ["evasion"] },
    { text: "Pregunta quién ha dicho eso.", difficulty: "medium", tags: ["evasion"] },
    { text: "Di que tú «pago lo que haga falta» sin concretar.", difficulty: "medium", tags: ["evasion"] },
    { text: "Consigue que no te pregunten por tu situación.", difficulty: "hard", tags: ["evasion"] },
    { text: "Que otro vecino te defienda sin saber que no eres propietario.", difficulty: "hard", tags: ["social"] },
    { text: "Esquiva tres preguntas directas.", difficulty: "hard", tags: ["evasion"] },
  ],
  catlady: [
    { text: "Menciona a Michi, Lulú o Tofu.", difficulty: "easy", tags: ["gatos"] },
    { text: "Queja de un olor o ruido que molesta a tus gatos.", difficulty: "easy", tags: ["gatos", "queja"] },
    { text: "Cuenta una anécdota corta de un gato.", difficulty: "easy", tags: ["gatos"] },
    { text: "Relaciona el suceso de la ronda con tus gatos.", difficulty: "medium", tags: ["gatos", "reaccion"] },
    { text: "Pide una zona o un horario para los gatos.", difficulty: "medium", tags: ["propuesta", "gatos"] },
    { text: "Menciona a los cinco gatos por su nombre.", difficulty: "medium", tags: ["gatos"] },
    { text: "Defiende que los gatos son vecinos de pleno derecho.", difficulty: "medium", tags: ["gatos"] },
    { text: "Consigue que otro vecino hable de tus gatos.", difficulty: "hard", tags: ["social", "gatos"] },
    { text: "Haz que la junta discuta un problema felino.", difficulty: "hard", tags: ["social", "gatos"] },
    { text: "Cuenta una anécdota de cada gato sin repetirte.", difficulty: "hard", tags: ["gatos"] },
  ],
  concierge: [
    { text: "Di «lo que diga el presidente».", difficulty: "easy", tags: ["presidente", "tic"] },
    { text: "Asiente y repite una frase del presidente.", difficulty: "easy", tags: ["presidente"] },
    { text: "Ofrécete a hacer una gestión.", difficulty: "easy", tags: ["servicio"] },
    { text: "Secunda al presidente dos veces.", difficulty: "medium", tags: ["presidente"] },
    { text: "Repite una orden del presidente con tus palabras.", difficulty: "medium", tags: ["presidente"] },
    { text: "Di que tú no tienes opinión propia.", difficulty: "medium", tags: ["presidente"] },
    { text: "Menciona las llaves o el cuarto de contadores.", difficulty: "medium", tags: ["conserje"] },
    { text: "Haz que alguien te pregunte tu opinión y responde con el presidente.", difficulty: "hard", tags: ["social"] },
    { text: "Consigue que el presidente te dé una instrucción.", difficulty: "hard", tags: ["social"] },
    { text: "Defiende al presidente de una crítica.", difficulty: "hard", tags: ["presidente"] },
  ],
  inlaw: [
    { text: "Di «yo tengo un primo que se dedica a eso».", difficulty: "easy", tags: ["tic", "cuñado"] },
    { text: "Suelta un dato falso con total seguridad.", difficulty: "easy", tags: ["dato falso"] },
    { text: "Menciona el precio de la luz o la política.", difficulty: "easy", tags: ["desvio"] },
    { text: "Desvía el tema a fútbol, política o economía.", difficulty: "medium", tags: ["desvio"] },
    { text: "Critica una solución sin proponer otra.", difficulty: "medium", tags: ["critica"] },
    { text: "Presume de saber cómo funciona una obra.", difficulty: "medium", tags: ["cuñado"] },
    { text: "Corrige a alguien con un dato inventado.", difficulty: "medium", tags: ["dato falso"] },
    { text: "Consigue que alguien repita tu dato falso.", difficulty: "hard", tags: ["social"] },
    { text: "Haz que la junta discuta de política sin venir a cuento.", difficulty: "hard", tags: ["desvio"] },
    { text: "Defiende dos posturas contrarias en la misma ronda.", difficulty: "hard", tags: ["cuñado"] },
  ],
  handyman: [
    { text: "Di «eso lo hago yo en un rato».", difficulty: "easy", tags: ["tic", "manitas"] },
    { text: "Presume de una herramienta.", difficulty: "easy", tags: ["manitas"] },
    { text: "Critica el precio de un profesional.", difficulty: "easy", tags: ["dinero"] },
    { text: "Propón arreglar el suceso de la ronda tú mismo.", difficulty: "medium", tags: ["propuesta"] },
    { text: "Explica una chapuza que hiciste y funcionó.", difficulty: "medium", tags: ["manitas"] },
    { text: "Pide cinta aislante o una radial.", difficulty: "medium", tags: ["manitas"] },
    { text: "Minimiza la gravedad de una avería.", difficulty: "medium", tags: ["manitas"] },
    { text: "Consigue que te dejen encargarte de un arreglo.", difficulty: "hard", tags: ["social"] },
    { text: "Convence a alguien de no contratar al profesional.", difficulty: "hard", tags: ["social"] },
    { text: "Propón un arreglo absurdo y que parezca buena idea.", difficulty: "hard", tags: ["propuesta"] },
  ],
  expresident: [
    { text: "Di «yo lo hacía mejor».", difficulty: "easy", tags: ["tic", "nostalgia"] },
    { text: "Recuerda una obra de tu mandato.", difficulty: "easy", tags: ["nostalgia"] },
    { text: "Suspira cuando hable el presidente actual.", difficulty: "easy", tags: ["presidente"] },
    { text: "Critica una decisión del presidente actual.", difficulty: "medium", tags: ["presidente"] },
    { text: "Compara la junta actual con la tuya.", difficulty: "medium", tags: ["nostalgia"] },
    { text: "Ofrécete a volver a la presidencia.", difficulty: "medium", tags: ["propuesta"] },
    { text: "Menciona el acta de tu época.", difficulty: "medium", tags: ["nostalgia"] },
    { text: "Consigue que alguien apoye tu vuelta.", difficulty: "hard", tags: ["social"] },
    { text: "Haz que el presidente actual se justifique.", difficulty: "hard", tags: ["presidente"] },
    { text: "Critica y luego propone lo mismo que criticaste.", difficulty: "hard", tags: ["nostalgia"] },
  ],
  tenant: [
    { text: "Recuerda que no eres propietario.", difficulty: "easy", tags: ["inquilino"] },
    { text: "Pregunta quién paga la derrama.", difficulty: "easy", tags: ["dinero"] },
    { text: "Menciona a tu casero o tu contrato.", difficulty: "easy", tags: ["inquilino"] },
    { text: "Defiende una mejora sin asumir el coste.", difficulty: "medium", tags: ["interes"] },
    { text: "Pregunta si el alquiler subirá con la obra.", difficulty: "medium", tags: ["dinero"] },
    { text: "Di que tú pagas religiosamente cada mes.", difficulty: "medium", tags: ["inquilino"] },
    { text: "Pide que las decisiones no recaigan en los inquilinos.", difficulty: "medium", tags: ["inquilino"] },
    { text: "Consigue que alguien explique quién paga tu parte.", difficulty: "hard", tags: ["social", "dinero"] },
    { text: "Que la junta discuta los derechos de los inquilinos.", difficulty: "hard", tags: ["social"] },
    { text: "Esquiva comprometerte a pagar una derrama.", difficulty: "hard", tags: ["evasion"] },
  ],
  remote: [
    { text: "Menciona una videollamada importante.", difficulty: "easy", tags: ["teletrabajo"] },
    { text: "Queja de ruido u obras.", difficulty: "easy", tags: ["ruido"] },
    { text: "Pide más fibra o mejor WiFi.", difficulty: "easy", tags: ["teletrabajo"] },
    { text: "Propón un horario de silencio.", difficulty: "medium", tags: ["propuesta"] },
    { text: "Di que no puedes trabajar con ese ruido.", difficulty: "medium", tags: ["ruido"] },
    { text: "Pregunta si la obra se puede hacer por la tarde.", difficulty: "medium", tags: ["pregunta"] },
    { text: "Menciona el coworking o el teletrabajo.", difficulty: "medium", tags: ["teletrabajo"] },
    { text: "Consigue que la junta apruebe un horario de silencio.", difficulty: "hard", tags: ["social"] },
    { text: "Haz que otro vecino baje el tono.", difficulty: "hard", tags: ["social"] },
    { text: "Consigue que la obra se retrase o se cambie de hora.", difficulty: "hard", tags: ["social"] },
  ],
  eco: [
    { text: "Menciona las placas solares.", difficulty: "easy", tags: ["eco"] },
    { text: "Habla de la huella de carbono o del reciclaje.", difficulty: "easy", tags: ["eco"] },
    { text: "Pide un aparcabicis o un huerto.", difficulty: "easy", tags: ["propuesta", "eco"] },
    { text: "Critica el derroche energético.", difficulty: "medium", tags: ["eco"] },
    { text: "Propón una solución sostenible al suceso de la ronda.", difficulty: "medium", tags: ["propuesta", "eco"] },
    { text: "Menciona la factura de la luz.", difficulty: "medium", tags: ["eco", "dinero"] },
    { text: "Pide compost o recogida selectiva.", difficulty: "medium", tags: ["eco"] },
    { text: "Consigue que la junta apoye una medida ecológica.", difficulty: "hard", tags: ["social", "eco"] },
    { text: "Haz que otro vecino hable de reciclar.", difficulty: "hard", tags: ["social"] },
    { text: "Defiende el huerto de la azotea frente a una obra.", difficulty: "hard", tags: ["eco"] },
  ],
};

const PRESIDENT_STYLE_TASKS: Record<PresidentStyleId, TaskSeed[]> = {
  dictator: [
    { text: "Manda callar a alguien.", difficulty: "easy", tags: ["orden"] },
    { text: "Critica la gestión anterior del edificio.", difficulty: "medium", tags: ["critica"] },
    { text: "Impón una norma sin votación.", difficulty: "medium", tags: ["norma"] },
    { text: "Consigue que la junta acate una orden tuya.", difficulty: "hard", tags: ["social"] },
  ],
  reluctant: [
    { text: "Di que no querías ser presidente.", difficulty: "easy", tags: ["presidente"] },
    { text: "Aplaza una decisión para la próxima junta.", difficulty: "medium", tags: ["evasion"] },
    { text: "Delega una tarea en el conserje o en otro vecino.", difficulty: "medium", tags: ["delegacion"] },
    { text: "Intenta cerrar la ronda antes de tiempo.", difficulty: "hard", tags: ["evasion"] },
  ],
  influencer: [
    { text: "Menciona a tus seguidores.", difficulty: "easy", tags: ["influencer"] },
    { text: "Graba o narra la junta para tu audiencia.", difficulty: "medium", tags: ["influencer"] },
    { text: "Propón una reforma estética para el portal.", difficulty: "medium", tags: ["propuesta"] },
    { text: "Consigue que otro vecino salga en tu vídeo.", difficulty: "hard", tags: ["social"] },
  ],
};

const UNIVERSAL_TASKS: TaskSeed[] = [
  { text: "Menciona a otro vecino por su nombre y por su rol.", difficulty: "easy", tags: ["social"] },
  { text: "Haz una pregunta directa a otro vecino.", difficulty: "easy", tags: ["pregunta"] },
  { text: "Interrumpe a alguien sin pedir perdón.", difficulty: "easy", tags: ["interrupcion"] },
  { text: "Di una muletilla de tu personaje en voz alta.", difficulty: "easy", tags: ["tic"] },
  { text: "Propón una solución concreta al problema de la ronda.", difficulty: "medium", tags: ["propuesta"] },
  { text: "Acusa a alguien de no pagar o de no implicarse.", difficulty: "medium", tags: ["acusacion"] },
  { text: "Defiende a otro vecino en público.", difficulty: "medium", tags: ["alianza"] },
  { text: "Cambia de tema cuando se hable de dinero.", difficulty: "medium", tags: ["dinero"] },
  { text: "Reacciona al suceso de la ronda con una anécdota.", difficulty: "medium", tags: ["reaccion"] },
  { text: "Menciona el acta, el reglamento o una votación.", difficulty: "medium", tags: ["procedimiento"] },
  { text: "Consigue que otro vecino repita una de tus frases.", difficulty: "hard", tags: ["social"] },
  { text: "Haz que alguien se ría o proteste por algo que digas.", difficulty: "hard", tags: ["social"] },
  { text: "Habla durante al menos 15 segundos seguidos.", difficulty: "hard", tags: ["participacion"] },
  { text: "Haz una promesa y cúmplela antes de que acabe la ronda.", difficulty: "hard", tags: ["promesa"] },
];

export interface ComboSeed {
  id: string;
  roleA: RoleId;
  roleB: RoleId;
  text: string;
}

const COMBO_TASKS: ComboSeed[] = [
  {
    id: "combo_gossip_squatter",
    roleA: "gossip",
    roleB: "squatter",
    text: "Que el cotilla pregunte al okupa desde cuándo vive en el edificio y que el okupa esquive la respuesta.",
  },
  {
    id: "combo_president_concierge",
    roleA: "president",
    roleB: "concierge",
    text: "Que el conserje repita en voz alta una orden del presidente y que el presidente se la dé.",
  },
  {
    id: "combo_debtor_spender",
    roleA: "debtor",
    roleB: "spender",
    text: "Que el moroso y el de las derramas discutan por una cuota sin ponerse de acuerdo.",
  },
  {
    id: "combo_catlady_remote",
    roleA: "catlady",
    roleB: "remote",
    text: "Que la de los gatos y el teletrabajador negocien un horario de silencio para los gatos.",
  },
  {
    id: "combo_handyman_eco",
    roleA: "handyman",
    roleB: "eco",
    text: "Que el manitas y el eco-vecino propongan juntos un arreglo sostenible para el portal.",
  },
  {
    id: "combo_inlaw_expresident",
    roleA: "inlaw",
    roleB: "expresident",
    text: "Que el cuñado y el ex-presidente critiquen al presidente actual y propongan volver.",
  },
  {
    id: "combo_tenant_president",
    roleA: "tenant",
    roleB: "president",
    text: "Que el inquilino pregunte quién paga la derrama y que el presidente tenga que responder.",
  },
  {
    id: "combo_gossip_catlady",
    roleA: "gossip",
    roleB: "catlady",
    text: "Que el cotilla y la de los gatos intercambien un rumor sobre lo que pasa en el portal.",
  },
];

function pointsFor(difficulty: TaskDifficulty): number {
  return TASK_CONFIG.DIFFICULTY_POINTS[difficulty];
}

function toDefinition(
  roleId: RoleId,
  seed: TaskSeed,
  id: string,
  source: TaskSource,
): TaskDefinition {
  return {
    id,
    roleId,
    text: seed.text,
    difficulty: seed.difficulty,
    tags: [...seed.tags],
    points: pointsFor(seed.difficulty),
    kind: "solo",
    source,
  };
}

/** Mazo completo de 24 tareas para un rol. */
export function buildTaskDeck(
  roleId: RoleId,
  presidentStyleId?: PresidentStyleId | null,
): TaskDefinition[] {
  const seeds = ROLE_TASKS[roleId];
  const deck: TaskDefinition[] = seeds.map((seed, index) =>
    toDefinition(roleId, seed, `${roleId}_${index + 1}`, "role"),
  );

  if (roleId === "president" && presidentStyleId) {
    const styleSeeds = PRESIDENT_STYLE_TASKS[presidentStyleId];
    for (const [index, seed] of styleSeeds.entries()) {
      deck.push(
        toDefinition(roleId, seed, `pres_${presidentStyleId}_${index + 1}`, "style"),
      );
    }
  }

  const missing = TASK_CONFIG.TASKS_PER_ROLE - deck.length;
  for (let i = 0; i < missing; i += 1) {
    const seed = UNIVERSAL_TASKS[i];
    if (!seed) break;
    deck.push(toDefinition(roleId, seed, `univ_${i + 1}`, "universal"));
  }

  return deck.slice(0, TASK_CONFIG.TASKS_PER_ROLE);
}

/**
 * Saca 4 tareas: 1 fácil, 2 medias y 1 difícil, sin repetir.
 * Garantiza 3 tareas de rol/estilo y 1 universal para que la agenda tenga sabor
 * propio sin agotar el mazo específico en una sola ronda.
 */
export function drawTaskHand(
  deck: readonly TaskDefinition[],
  rng: Rng = Math.random,
  exclude: ReadonlySet<string> = new Set(),
): TaskDefinition[] {
  const available = deck.filter((task) => !exclude.has(task.id));
  const wanted = TASK_CONFIG.DRAW_BY_DIFFICULTY;
  const slots: TaskDifficulty[] = [
    ...Array<TaskDifficulty>(wanted.easy).fill("easy"),
    ...Array<TaskDifficulty>(wanted.medium).fill("medium"),
    ...Array<TaskDifficulty>(wanted.hard).fill("hard"),
  ];
  const sources = shuffle<TaskSource>(
    [
      "role",
      "role",
      "role",
      "universal",
    ],
    rng,
  );

  const chosen: TaskDefinition[] = [];
  const used = new Set<string>();

  for (const [index, difficulty] of slots.entries()) {
    if (chosen.length >= TASK_CONFIG.TASKS_PER_PLAYER) break;
    const preferred = sources[index] ?? "role";
    const pool = shuffle(
      available.filter((task) => task.difficulty === difficulty && !used.has(task.id)),
      rng,
    );
    const preferredTask = pool.find((task) =>
      preferred === "universal" ? task.source === "universal" : task.source !== "universal",
    );
    const task = preferredTask ?? pool[0];
    if (!task) continue;
    chosen.push(task);
    used.add(task.id);
  }

  if (chosen.length < TASK_CONFIG.TASKS_PER_PLAYER) {
    const rest = shuffle(available.filter((task) => !used.has(task.id)), rng);
    for (const task of rest) {
      if (chosen.length >= TASK_CONFIG.TASKS_PER_PLAYER) break;
      chosen.push(task);
      used.add(task.id);
    }
  }

  return shuffle(chosen, rng).slice(0, TASK_CONFIG.TASKS_PER_PLAYER);
}

export interface ComboAssignment {
  combo: ComboSeed;
  players: [ComboParticipant, ComboParticipant];
}

/**
 * Busca una pareja de roles con tarea combo y se la asigna a ambos jugadores,
 * sustituyendo su tarea difícil (o la última). Devuelve la asignación para logs.
 */
export function assignComboTask(
  hands: Map<string, PlayerTask[]>,
  participants: readonly ComboParticipant[],
  rng: Rng = Math.random,
): ComboAssignment | null {
  const byRole = new Map<RoleId, ComboParticipant>();
  for (const participant of participants) {
    if (!byRole.has(participant.roleId)) byRole.set(participant.roleId, participant);
  }

  const eligible = COMBO_TASKS.filter(
    (combo) => byRole.has(combo.roleA) && byRole.has(combo.roleB),
  );
  if (eligible.length === 0) return null;

  const combo = shuffle(eligible, rng)[0];
  if (!combo) return null;
  const playerA = byRole.get(combo.roleA);
  const playerB = byRole.get(combo.roleB);
  if (!playerA || !playerB) return null;

  for (const [player, partner] of [
    [playerA, playerB],
    [playerB, playerA],
  ] as const) {
    const hand = hands.get(player.id);
    if (!hand) continue;
    const base =
      hand.find((task) => task.difficulty === "hard") ?? hand[hand.length - 1];
    if (!base) continue;
    const index = hand.indexOf(base);
    hand[index] = {
      ...base,
      id: `${combo.id}_${player.id}`,
      text: `Combo con ${partner.name}: ${combo.text}`,
      difficulty: "hard",
      points: pointsFor("hard"),
      kind: "combo",
      source: "role",
      partnerId: partner.id,
      partnerName: partner.name,
    };
  }

  return { combo, players: [playerA, playerB] };
}
