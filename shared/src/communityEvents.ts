import { shuffle, type Rng } from "./composition.js";
import type { RoleId } from "./roles.js";

export interface CommunityEvent {
  id: string;
  title: string;
  description: string;
  /** Roles a los que les afecta especialmente el suceso. */
  roles: RoleId[];
  tags: string[];
}

/** Momentos (segundos desde el inicio de la ronda) en los que salta cada suceso. */
export const COMMUNITY_EVENT_OFFSETS_SECONDS = [0, 60, 120, 180] as const;

export const COMMUNITY_EVENTS: CommunityEvent[] = [
  {
    id: "lift_broken",
    title: "El ascensor se queda parado",
    description: "El ascensor se ha quedado entre el 2.º y el 3.º. Hay un vecino dentro y el técnico no llega hasta mañana.",
    roles: ["handyman", "remote", "catlady", "tenant"],
    tags: ["averia", "ascensor"],
  },
  {
    id: "extra_fee",
    title: "Llega una derrama extra",
    description: "El administrador avisa de una derrama imprevista del 30% para arreglar la cubierta.",
    roles: ["debtor", "spender", "tenant", "president"],
    tags: ["dinero", "derrama"],
  },
  {
    id: "damp_portal",
    title: "Humedades en el portal",
    description: "Aparecen manchas de humedad en la pared del portal y huele a cerrado.",
    roles: ["tenant", "handyman", "eco", "catlady"],
    tags: ["averia", "humedad"],
  },
  {
    id: "buzzer_opens",
    title: "El portero automático se abre solo",
    description: "A las tres de la mañana el portero automático abre la puerta sin que nadie llame.",
    roles: ["gossip", "remote", "concierge", "handyman"],
    tags: ["misterio", "portero"],
  },
  {
    id: "graffiti",
    title: "Pintada en la fachada",
    description: "Ha aparecido una pintada enorme en la fachada. Nadie sabe quién ha sido.",
    roles: ["gossip", "inlaw", "eco", "president"],
    tags: ["misterio", "fachada"],
  },
  {
    id: "antenna_offer",
    title: "Oferta de antena de telefonía",
    description: "Una empresa ofrece instalar una antena en la azotea a cambio de 300 € al mes para la comunidad.",
    roles: ["eco", "remote", "inlaw", "president"],
    tags: ["dinero", "salud"],
  },
  {
    id: "heating",
    title: "La calefacción no funciona",
    description: "En pleno enero la calefacción central ha dejado de funcionar en todo el edificio.",
    roles: ["catlady", "tenant", "remote", "president"],
    tags: ["averia", "calefaccion"],
  },
  {
    id: "attic_party",
    title: "Fiesta en el ático",
    description: "Anoche hubo una fiesta en el ático hasta las cuatro de la mañana. Varios vecinos no durmieron.",
    roles: ["remote", "catlady", "expresident", "inlaw"],
    tags: ["ruido", "fiesta"],
  },
  {
    id: "dog_barking",
    title: "Un perro ladra toda la noche",
    description: "Un perro lleva tres noches ladrando en el 4.º. Los vecinos están al límite.",
    roles: ["catlady", "remote", "tenant", "gossip"],
    tags: ["ruido", "mascotas"],
  },
  {
    id: "garage_door",
    title: "Se rompe la puerta del garaje",
    description: "La puerta del garaje se ha quedado abierta y hay coches bloqueados.",
    roles: ["handyman", "spender", "concierge", "remote"],
    tags: ["averia", "garaje"],
  },
  {
    id: "inspection",
    title: "Inspección municipal",
    description: "El ayuntamiento anuncia una inspección del edificio la semana que viene.",
    roles: ["president", "concierge", "tenant", "handyman"],
    tags: ["procedimiento", "inspeccion"],
  },
  {
    id: "bins",
    title: "El contenedor lleva una semana sin vaciar",
    description: "El contenedor del patio está desbordado y los gatos han empezado a investigar.",
    roles: ["eco", "catlady", "gossip", "concierge"],
    tags: ["olor", "residuos"],
  },
  {
    id: "airbnb",
    title: "Un vecino quiere poner un Airbnb",
    description: "Un propietario quiere alquilar su piso a turistas y los vecinos han oído la palabra «fiestas».",
    roles: ["tenant", "expresident", "inlaw", "president"],
    tags: ["convivencia", "alquiler"],
  },
  {
    id: "cleaning_price",
    title: "Sube el precio de la limpieza",
    description: "La empresa de limpieza sube la cuota mensual un 20% a partir del próximo mes.",
    roles: ["spender", "debtor", "president", "concierge"],
    tags: ["dinero", "limpieza"],
  },
  {
    id: "wifi_down",
    title: "Se cae el WiFi de la comunidad",
    description: "El WiFi del portal lleva caído dos días y varios vecinos teletrabajan desde casa.",
    roles: ["remote", "eco", "inlaw", "gossip"],
    tags: ["averia", "wifi"],
  },
  {
    id: "leak_4b",
    title: "Goteras en el 4.º B",
    description: "El techo del 4.º B gotea y el vecino de arriba dice que él no tiene nada que ver.",
    roles: ["catlady", "tenant", "handyman", "gossip"],
    tags: ["averia", "humedad"],
  },
  {
    id: "rooftop_garden",
    title: "Propuesta de huerto en la azotea",
    description: "Un vecino propone convertir la azotea en un huerto comunitario con compost y aparcabicis.",
    roles: ["eco", "spender", "president", "catlady"],
    tags: ["propuesta", "sostenibilidad"],
  },
  {
    id: "ex_president_commission",
    title: "El ex-presidente pide una comisión",
    description: "El ex-presidente asegura que se le debe una comisión por una gestión de hace años.",
    roles: ["expresident", "president", "inlaw", "gossip"],
    tags: ["dinero", "presidente"],
  },
  {
    id: "real_estate_letter",
    title: "Carta de una inmobiliaria",
    description: "Una inmobiliaria ofrece comprar el edificio entero. Alguien ha filtrado la carta.",
    roles: ["tenant", "president", "expresident", "spender"],
    tags: ["dinero", "edificio"],
  },
  {
    id: "storage_break_in",
    title: "Alguien ha entrado en el trastero",
    description: "Aparece la puerta del trastero forzada y varias cajas revueltas.",
    roles: ["squatter", "gossip", "concierge", "tenant"],
    tags: ["misterio", "seguridad"],
  },
  {
    id: "no_funds",
    title: "La comunidad se queda sin fondos",
    description: "La cuenta de la comunidad está en números rojos y hay facturas pendientes.",
    roles: ["debtor", "spender", "president", "tenant"],
    tags: ["dinero", "derrama"],
  },
  {
    id: "noise_inspector",
    title: "Inspección de ruidos",
    description: "Un inspector de ruidos va a medir los decibelios del patio esta semana.",
    roles: ["remote", "catlady", "inlaw", "concierge"],
    tags: ["ruido", "inspeccion"],
  },
  {
    id: "cat_smell",
    title: "El ascensor huele a gato",
    description: "El ascensor huele raro y todo el mundo mira a la vecina de los gatos.",
    roles: ["catlady", "gossip", "handyman", "remote"],
    tags: ["olor", "mascotas"],
  },
  {
    id: "solar_budget",
    title: "Presupuesto de placas solares",
    description: "Llega un presupuesto para instalar placas solares en la azotea. La inversión se amortiza en ocho años.",
    roles: ["eco", "spender", "president", "tenant"],
    tags: ["propuesta", "sostenibilidad"],
  },
];

/**
 * Elige 4 sucesos relevantes para los roles presentes, intentando que no
 * compartan la misma etiqueta principal.
 */
export function selectRoundEvents(
  presentRoles: readonly RoleId[],
  rng: Rng = Math.random,
  count = 4,
): CommunityEvent[] {
  const present = new Set(presentRoles);
  const relevant = COMMUNITY_EVENTS.filter((event) =>
    event.roles.some((roleId) => present.has(roleId)),
  );
  const pool = relevant.length >= count ? relevant : COMMUNITY_EVENTS;

  const shuffled = shuffle(pool, rng);
  const chosen: CommunityEvent[] = [];
  const usedPrimaryTags = new Set<string>();

  for (const event of shuffled) {
    if (chosen.length >= count) break;
    const primary = event.tags[0] ?? event.id;
    if (usedPrimaryTags.has(primary)) continue;
    chosen.push(event);
    usedPrimaryTags.add(primary);
  }

  for (const event of shuffled) {
    if (chosen.length >= count) break;
    if (chosen.some((item) => item.id === event.id)) continue;
    chosen.push(event);
  }

  return chosen.slice(0, count);
}
