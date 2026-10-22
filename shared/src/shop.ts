export type ShopCategory = "seating" | "lighting" | "art" | "plant" | "textile";

export interface ShopItem {
  id: string;
  name: string;
  description: string;
  price: number;
  /** Puntos de estilo base antes de rendimientos decrecientes. */
  stylePoints: number;
  category: ShopCategory;
  emoji: string;
  /** Dónde se coloca en el piso 2D. */
  slot: "floor" | "wall" | "surface";
}

export const SHOP_CATEGORY_LABELS: Record<ShopCategory, string> = {
  seating: "Asientos",
  lighting: "Iluminación",
  art: "Arte",
  plant: "Plantas",
  textile: "Textiles",
};

export const SHOP_ITEMS: ShopItem[] = [
  {
    id: "sofa",
    name: "Sofá modular",
    description: "Un sofá enorme para que quepan todos los vecinos, aunque no quieras.",
    price: 600,
    stylePoints: 80,
    category: "seating",
    emoji: "🛋️",
    slot: "floor",
  },
  {
    id: "armchair",
    name: "Sillón de orejas",
    description: "Para escuchar los cotilleos con comodidad y cara de circunstancias.",
    price: 350,
    stylePoints: 50,
    category: "seating",
    emoji: "🪑",
    slot: "floor",
  },
  {
    id: "lamp",
    name: "Lámpara de pie",
    description: "Luz cálida para que el acta parezca más seria de lo que es.",
    price: 150,
    stylePoints: 25,
    category: "lighting",
    emoji: "💡",
    slot: "floor",
  },
  {
    id: "neon",
    name: "Neón de comunidad",
    description: "Un letrero luminoso que dice «Vecinos». Muy de influencer.",
    price: 250,
    stylePoints: 40,
    category: "lighting",
    emoji: "🔆",
    slot: "wall",
  },
  {
    id: "painting",
    name: "Cuadro abstracto",
    description: "Nadie sabe qué representa, pero queda caro.",
    price: 300,
    stylePoints: 45,
    category: "art",
    emoji: "🖼️",
    slot: "wall",
  },
  {
    id: "poster",
    name: "Póster del ascensor",
    description: "Una lámina conmemorativa de la última avería del ascensor.",
    price: 80,
    stylePoints: 15,
    category: "art",
    emoji: "🖼️",
    slot: "wall",
  },
  {
    id: "monstera",
    name: "Monstera",
    description: "Una planta grande, verde y con más vida social que algunos vecinos.",
    price: 80,
    stylePoints: 15,
    category: "plant",
    emoji: "🪴",
    slot: "floor",
  },
  {
    id: "cactus",
    name: "Cactus",
    description: "No necesita agua ni conversación. El compañero perfecto.",
    price: 40,
    stylePoints: 8,
    category: "plant",
    emoji: "🌵",
    slot: "surface",
  },
  {
    id: "rug",
    name: "Alfombra persa",
    description: "Tapa las manchas del parqué y las tensiones de la comunidad.",
    price: 250,
    stylePoints: 35,
    category: "textile",
    emoji: "🧶",
    slot: "floor",
  },
  {
    id: "curtains",
    name: "Cortinas de terciopelo",
    description: "Para que no se vea lo que pasa en la junta desde la calle.",
    price: 180,
    stylePoints: 25,
    category: "textile",
    emoji: "🪟",
    slot: "wall",
  },
];

export const DIMINISHING_MULTIPLIERS = [1, 0.7, 0.5, 0.35, 0.25] as const;

export function getShopItem(itemId: string): ShopItem | null {
  return SHOP_ITEMS.find((item) => item.id === itemId) ?? null;
}

/**
 * Valor del piso: suma los puntos de estilo aplicando rendimientos decrecientes
 * por categoría (el orden de compra importa).
 */
export function computeApartmentValue(purchasedItemIds: readonly string[]): number {
  const counts = new Map<ShopCategory, number>();
  let total = 0;

  for (const itemId of purchasedItemIds) {
    const item = getShopItem(itemId);
    if (!item) continue;
    const count = counts.get(item.category) ?? 0;
    const multiplier =
      DIMINISHING_MULTIPLIERS[Math.min(count, DIMINISHING_MULTIPLIERS.length - 1)] ?? 0.25;
    total += Math.round(item.stylePoints * multiplier);
    counts.set(item.category, count + 1);
  }

  return total;
}

/** Precio total gastado por un jugador. */
export function computeSpent(purchasedItemIds: readonly string[]): number {
  return purchasedItemIds.reduce((total, itemId) => {
    const item = getShopItem(itemId);
    return item ? total + item.price : total;
  }, 0);
}

