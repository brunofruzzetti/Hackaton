import { describe, expect, it } from "vitest";
import {
  SHOP_ITEMS,
  computeApartmentValue,
  computeSpent,
  getShopItem,
} from "./shop.js";

describe("tienda y valor del piso", () => {
  it("hay 10 objetos con ids únicos y categorías válidas", () => {
    expect(SHOP_ITEMS).toHaveLength(10);
    expect(new Set(SHOP_ITEMS.map((item) => item.id)).size).toBe(10);
    for (const item of SHOP_ITEMS) {
      expect(item.price).toBeGreaterThan(0);
      expect(item.stylePoints).toBeGreaterThan(0);
      expect(item.emoji.length).toBeGreaterThan(0);
      expect(getShopItem(item.id)?.id).toBe(item.id);
    }
  });

  it("aplica rendimientos decrecientes por categoría y orden de compra", () => {
    const sofaThenArmchair = computeApartmentValue(["sofa", "armchair"]);
    const armchairThenSofa = computeApartmentValue(["armchair", "sofa"]);
    expect(sofaThenArmchair).toBe(80 + Math.round(50 * 0.7));
    expect(armchairThenSofa).toBe(50 + Math.round(80 * 0.7));
    expect(sofaThenArmchair).not.toBe(130);
  });

  it("suma categorías distintas sin penalización", () => {
    expect(computeApartmentValue(["sofa", "lamp"])).toBe(80 + 25);
  });

  it("calcula el dinero gastado", () => {
    expect(computeSpent(["sofa", "lamp"])).toBe(600 + 150);
  });

  it("ignora objetos inexistentes", () => {
    expect(computeApartmentValue(["sofa", "no-existe"])).toBe(80);
  });
});
