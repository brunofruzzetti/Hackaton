import { describe, expect, it } from "vitest";
import {
  RUINA_CONTRACTS,
  RUINA_FLOORS,
  RUINA_MAX_PLAYERS,
  RUINA_MIN_PLAYERS,
  RUINA_TEAM_SPLITS,
  iniciarPartida,
  ruinaClientMessageSchema,
  ruinaTeamSplit,
  secretText,
} from "./ruina.js";

describe("Junta de Ruina · configuración", () => {
  it("acepta entre 5 y 8 jugadores y reparte los bandos pedidos", () => {
    expect(RUINA_MIN_PLAYERS).toBe(5);
    expect(RUINA_MAX_PLAYERS).toBe(8);
    expect(ruinaTeamSplit(6)).toEqual({ honestos: 4, deshonestos: 2 });
    expect(ruinaTeamSplit(8)).toEqual({ honestos: 5, deshonestos: 3 });
    expect(ruinaTeamSplit(5)).toEqual({ honestos: 3, deshonestos: 2 });
    expect(ruinaTeamSplit(7)).toEqual({ honestos: 5, deshonestos: 2 });
  });

  it("iniciarPartida asigna pisos, bandos y cadena circular de secretos", () => {
    const players = Array.from({ length: 6 }, (_, index) => ({
      id: `p${index}`,
      nombre: `Vecino ${index}`,
    }));
    let calls = 0;
    const rng = () => {
      calls += 1;
      return (calls * 37) % 100 / 100;
    };
    const result = iniciarPartida(players, rng);
    expect(result.players).toHaveLength(6);
    expect(new Set(result.players.map((player) => player.piso)).size).toBe(6);
    expect(result.players.filter((player) => player.equipo === "DESHONESTOS")).toHaveLength(2);
    expect(result.players.filter((player) => player.equipo === "HONESTOS")).toHaveLength(4);
    expect(result.players.map((player) => player.id)).toEqual(players.map((player) => player.id));
    for (let index = 0; index < result.players.length; index += 1) {
      const watched = result.players[(index + 1) % result.players.length]!;
      const secret = result.secrets[result.players[index]!.id]!;
      expect(secret.sobrePiso).toBe(watched.piso);
      expect(secret.texto).toContain(watched.piso);
    }
    expect(result.contracts).toHaveLength(RUINA_CONTRACTS.length);
  });

  it("iniciarPartida usa 2 deshonestos de 5 a 7 y 3 con 8", () => {
    for (const count of [5, 6, 7]) {
      const result = iniciarPartida(
        Array.from({ length: count }, (_, index) => ({ id: `u${index}`, nombre: `N${index}` })),
        () => 0.42,
      );
      expect(result.players.filter((player) => player.equipo === "DESHONESTOS")).toHaveLength(2);
    }
    const eight = iniciarPartida(
      Array.from({ length: 8 }, (_, index) => ({ id: `u${index}`, nombre: `N${index}` })),
      () => 0.42,
    );
    expect(eight.players.filter((player) => player.equipo === "DESHONESTOS")).toHaveLength(3);
  });

  it("tiene 8 pisos únicos y contratos suficientes", () => {
    expect(new Set(RUINA_FLOORS).size).toBe(8);
    expect(RUINA_CONTRACTS.length).toBeGreaterThanOrEqual(4);
  });

  it("genera textos distintos para cada tipo de secreto", () => {
    const sospechoso = secretText("SOSPECHOSO", "2ºB");
    const limpio = secretText("LIMPIO", "2ºB");
    const trapo = secretText("TRAPO_SUCIO", "2ºB");
    expect(sospechoso).toContain("2ºB");
    expect(limpio).toContain("2ºB");
    expect(trapo).toContain("2ºB");
    expect(new Set([sospechoso, limpio, trapo]).size).toBe(3);
  });

  it("valida los mensajes del cliente", () => {
    expect(
      ruinaClientMessageSchema.safeParse({ type: "create_room", nombre: "Ana" }).success,
    ).toBe(true);
    expect(ruinaClientMessageSchema.safeParse({ type: "force_advance" }).success).toBe(true);
    expect(
      ruinaClientMessageSchema.safeParse({ type: "nominate", vocalId: "p2" }).success,
    ).toBe(true);
    expect(
      ruinaClientMessageSchema.safeParse({ type: "vote_commission", approve: true }).success,
    ).toBe(true);
    expect(
      ruinaClientMessageSchema.safeParse({ type: "sign_contract", choice: "SABOTAJE" }).success,
    ).toBe(true);
    expect(ruinaClientMessageSchema.safeParse({ type: "nominate" }).success).toBe(false);
  });
});
