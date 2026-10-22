import { describe, expect, it } from "vitest";
import { RuinaStore } from "./ruinaStore.js";

function seededRng(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state += 0x6d2b79f5;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function setup(count = 5, seed = 1) {
  const store = new RuinaStore();
  const host = store.createRoom("Vecino 1");
  const code = host.room.code;
  for (let i = 2; i <= count; i += 1) {
    store.joinRoom({ code, nombre: `Vecino ${i}` });
  }
  const room = store.startGame(code, host.player.id, seededRng(seed));
  return { store, room, code, host };
}

function everyoneVotes(store: RuinaStore, code: string, room: ReturnType<typeof setup>["room"], approve: boolean) {
  for (const player of room.players) {
    store.voteCommission(code, player.id, approve);
  }
}

function president(room: ReturnType<typeof setup>["room"]) {
  return room.players[room.presidentIndex]!;
}

function otherPlayer(room: ReturnType<typeof setup>["room"], id: string) {
  return room.players.find((player) => player.id !== id)!;
}

describe("Sabotea la junta · lobby y reparto", () => {
  it("exige mínimo 5 jugadores para empezar", () => {
    const store = new RuinaStore();
    const host = store.createRoom("Ana");
    store.joinRoom({ code: host.room.code, nombre: "Beto" });
    expect(() => store.startGame(host.room.code, host.player.id)).toThrow(/al menos 5/i);
  });

  it("reparte 4/2 con 6 jugadores y 5/3 con 8", () => {
    const six = setup(6, 2);
    expect(six.room.players.filter((p) => p.team === "HONESTOS")).toHaveLength(4);
    expect(six.room.players.filter((p) => p.team === "DESHONESTOS")).toHaveLength(2);

    const eight = setup(8, 3);
    expect(eight.room.players.filter((p) => p.team === "HONESTOS")).toHaveLength(5);
    expect(eight.room.players.filter((p) => p.team === "DESHONESTOS")).toHaveLength(3);
  });

  it("asigna pisos únicos y un secreto circular por jugador", () => {
    const { room } = setup(6, 4);
    expect(new Set(room.players.map((player) => player.piso)).size).toBe(6);
    for (let index = 0; index < room.players.length; index += 1) {
      const player = room.players[index]!;
      const watched = room.players[(index + 1) % room.players.length]!;
      const secret = room.secrets.get(player.id);
      expect(secret?.sobrePiso).toBe(watched.piso);
      if (watched.team === "DESHONESTOS") {
        expect(secret?.tipo).toBe("SOSPECHOSO");
      } else {
        expect(["LIMPIO", "TRAPO_SUCIO"]).toContain(secret?.tipo);
      }
    }
  });

  it("el estado público no filtra equipos ni secretos", () => {
    const { store, room } = setup(6, 5);
    const publicState = store.getPublicState(room);
    const json = JSON.stringify(publicState);
    expect(json).not.toContain("DESHONESTOS");
    expect(json).not.toContain("SOSPECHOSO");
    expect(json).not.toContain("secreto");
    expect(publicState.players).toHaveLength(6);
  });

  it("permite reconectar con playerId y token", () => {
    const { store, code, room } = setup(5, 6);
    const player = room.players[1]!;
    store.disconnect(code, player.id);
    const rejoined = store.joinRoom({
      code,
      nombre: player.nombre,
      playerId: player.id,
      token: player.token,
    });
    expect(rejoined.reconnected).toBe(true);
    expect(rejoined.player.id).toBe(player.id);
    expect(store.getPrivateInfo(rejoined.room, player.id)?.equipo).toBe(player.team);
  });
});

describe("Sabotea la junta · IAs de prueba", () => {
  function withAis(count = 4) {
    const store = new RuinaStore();
    const host = store.createRoom("Humano");
    const code = host.room.code;
    for (let index = 0; index < count; index += 1) {
      store.addAi(code, host.player.id);
    }
    return { store, code, host, room: host.room };
  }

  it("el anfitrión puede añadir y quitar hasta 4 IAs en el lobby", () => {
    const { store, code, host, room } = withAis(4);
    expect(room.players.filter((player) => player.isAi)).toHaveLength(4);
    expect(room.players).toHaveLength(5);
    expect(store.getPublicState(room).players.filter((player) => player.isAi)).toHaveLength(4);
    expect(() => store.addAi(code, host.player.id)).toThrow(/Máximo 4 IAs/i);
    const ai = room.players.find((player) => player.isAi)!;
    store.removeAi(code, host.player.id, ai.id);
    expect(room.players.filter((player) => player.isAi)).toHaveLength(3);
    store.addAi(code, host.player.id);
    expect(room.players.filter((player) => player.isAi)).toHaveLength(4);
  });

  it("solo el anfitrión puede añadir IAs y no se pueden añadir con la partida empezada", () => {
    const store = new RuinaStore();
    const host = store.createRoom("Humano");
    const code = host.room.code;
    const other = store.joinRoom({ code, nombre: "Otro" }).player;
    expect(() => store.addAi(code, other.id)).toThrow(/anfitrión/i);
    for (let index = 0; index < 4; index += 1) store.addAi(code, host.player.id);
    store.startGame(code, host.player.id);
    expect(() => store.addAi(code, host.player.id)).toThrow(/lobby/i);
  });

  it("las IAs votan y firman automáticamente", () => {
    const { store, code, room } = withAis(4);
    store.startGame(code, room.players[0]!.id);
    const pres = president(room);
    const aiVocal = room.players.find((player) => player.isAi)!;
    store.nominate(code, pres.id, aiVocal.id);
    store.voteCommission(code, pres.id, true);
    store.tick();
    expect(room.votes.size).toBe(5);
    if (room.phase === "FIRMA_CONTRATO") {
      store.tick();
      expect(room.signatures.has(aiVocal.id)).toBe(true);
    }
  });

  it("si la presidencia cae en una IA, nomina sola", () => {
    const { store, code, room } = withAis(4);
    store.startGame(code, room.players[0]!.id);
    const firstPresident = president(room);
    const vocal = room.players.find((player) => player.id !== firstPresident.id)!;
    store.nominate(code, firstPresident.id, vocal.id);
    for (const player of room.players) {
      store.voteCommission(code, player.id, false);
    }
    expect(room.phase).toBe("NOMINACION");
    expect(president(room).isAi).toBe(true);
    store.tick();
    expect(room.phase).toBe("VOTACION_COMISION");
    expect(room.vocalId).not.toBeNull();
  });
});

describe("Sabotea la junta · fases", () => {
  it("el presidente nomina y la comisión se aprueba con mayoría", () => {
    const { store, code, room } = setup(5, 7);
    const pres = president(room);
    const vocal = otherPlayer(room, pres.id);
    store.nominate(code, pres.id, vocal.id);
    expect(room.phase).toBe("VOTACION_COMISION");
    expect(room.vocalId).toBe(vocal.id);

    everyoneVotes(store, code, room, true);
    expect(room.phase).toBe("FIRMA_CONTRATO");
    expect(room.voteResult?.aprobada).toBe(true);
    expect(room.voteResult?.votos).toBeDefined();
    expect(store.getPublicState(room).votes).toEqual(room.voteResult?.votos);
  });

  it("rechaza la comisión y rota el presidente", () => {
    const { store, code, room } = setup(5, 8);
    const firstPresident = president(room);
    store.nominate(code, firstPresident.id, otherPlayer(room, firstPresident.id).id);
    everyoneVotes(store, code, room, false);
    expect(room.phase).toBe("NOMINACION");
    expect(room.rejectionCount).toBe(1);
    expect(president(room).id).not.toBe(firstPresident.id);
  });

  it("un empate 3-3 rechaza la comisión", () => {
    const { store, code, room } = setup(6, 16);
    const pres = president(room);
    store.nominate(code, pres.id, otherPlayer(room, pres.id).id);
    const voters = room.players;
    voters.slice(0, 3).forEach((player) => store.voteCommission(code, player.id, true));
    voters.slice(3).forEach((player) => store.voteCommission(code, player.id, false));
    expect(room.voteResult?.si).toBe(3);
    expect(room.voteResult?.no).toBe(3);
    expect(room.voteResult?.aprobada).toBe(false);
    expect(room.phase).toBe("NOMINACION");
    expect(room.rejectionCount).toBe(1);
  });

  it("si el presidente no nomina en 60 s, el servidor nomina al azar", () => {
    const { store, room } = setup(5, 17);
    const pres = president(room);
    store.tick(Date.now() + 61_000);
    expect(room.phase).toBe("VOTACION_COMISION");
    expect(room.vocalId).not.toBeNull();
    expect(room.vocalId).not.toBe(pres.id);
  });

  it("el anfitrión puede forzar el siguiente turno si alguien se cuelga", () => {
    const { store, code, room, host } = setup(5, 18);
    const firstPresident = president(room);
    expect(() => store.forceAdvance(code, otherPlayer(room, host.player.id).id)).toThrow(
      /anfitrión/i,
    );
    store.forceAdvance(code, host.player.id);
    expect(room.phase).toBe("NOMINACION");
    expect(president(room).id).not.toBe(firstPresident.id);
  });

  it("tres rechazos seguidos dan el punto a los deshonestos", () => {
    const { store, code, room } = setup(5, 9);
    for (let i = 0; i < 3; i += 1) {
      const pres = president(room);
      store.nominate(code, pres.id, otherPlayer(room, pres.id).id);
      everyoneVotes(store, code, room, false);
    }
    expect(room.phase).toBe("RESOLUCION_RONDA");
    expect(room.points.deshonestos).toBe(1);
    expect(room.lastResult?.motivo).toBe("TRES_RECHAZOS");
  });

  it("un sabotaje en la firma da el punto a los deshonestos", () => {
    const { store, code, room } = setup(6, 10);
    const pres = president(room);
    const corrupt = room.players.find((player) => player.team === "DESHONESTOS")!;
    const vocal = corrupt.id === pres.id ? otherPlayer(room, pres.id) : corrupt;
    store.nominate(code, pres.id, vocal.id);
    everyoneVotes(store, code, room, true);
    expect(room.phase).toBe("FIRMA_CONTRATO");

    if (pres.team === "DESHONESTOS") {
      store.signContract(code, pres.id, "SABOTAJE");
      store.signContract(code, room.vocalId!, "LIMPIO");
    } else {
      store.signContract(code, pres.id, "LIMPIO");
      store.signContract(code, room.vocalId!, "SABOTAJE");
    }

    expect(room.phase).toBe("RESOLUCION_RONDA");
    expect(room.points.deshonestos).toBe(1);
    expect(room.lastResult?.saboteada).toBe(true);
    expect(room.lastResult?.sabotajes).toBe(1);
  });

  it("una firma limpia da el punto a los honestos", () => {
    const { store, code, room } = setup(5, 11);
    const pres = president(room);
    store.nominate(code, pres.id, otherPlayer(room, pres.id).id);
    everyoneVotes(store, code, room, true);
    store.signContract(code, pres.id, "LIMPIO");
    store.signContract(code, room.vocalId!, "LIMPIO");
    expect(room.points.honestos).toBe(1);
    expect(room.lastResult?.motivo).toBe("OBRA_LIMPIA");
  });

  it("el voto de un honesto siempre es limpio aunque intente sabotear", () => {
    const { store, code, room } = setup(5, 12);
    const pres = president(room);
    const honest = room.players.find((player) => player.team === "HONESTOS")!;
    store.nominate(code, pres.id, honest.id === pres.id ? otherPlayer(room, pres.id).id : honest.id);
    everyoneVotes(store, code, room, true);
    const commission = [pres, room.players.find((player) => player.id === room.vocalId)!];
    const honestInCommission = commission.find((player) => player.team === "HONESTOS");
    if (honestInCommission) {
      store.signContract(code, honestInCommission.id, "SABOTAJE");
      expect(room.signatures.get(honestInCommission.id)).toBe("LIMPIO");
    }
  });

  it("el voto público se revela solo al cerrar la votación", () => {
    const { store, code, room } = setup(5, 13);
    const pres = president(room);
    store.nominate(code, pres.id, otherPlayer(room, pres.id).id);
    store.voteCommission(code, pres.id, true);
    expect(store.getPublicState(room).votes).toBeNull();
    expect(store.getPublicState(room).votedIds).toHaveLength(1);
  });

  it("el timeout de votación cuenta los votos ausentes como rechazo", () => {
    const { store, code, room } = setup(5, 14);
    const pres = president(room);
    store.nominate(code, pres.id, otherPlayer(room, pres.id).id);
    store.voteCommission(code, pres.id, true);
    store.tick(Date.now() + 61_000);
    expect(room.rejectionCount).toBe(1);
    expect(room.phase).toBe("NOMINACION");
  });

  it("el anfitrión puede abrir una revancha al terminar la partida", () => {
    const { store, code, room, host } = setup(5, 19);
    for (let round = 0; round < 2; round += 1) {
      const pres = president(room);
      store.nominate(code, pres.id, otherPlayer(room, pres.id).id);
      everyoneVotes(store, code, room, true);
      store.signContract(code, pres.id, "LIMPIO");
      store.signContract(code, room.vocalId!, "LIMPIO");
      if (round === 0) store.tick(Date.now() + 10_000);
    }
    store.tick(Date.now() + 10_000);
    expect(room.phase).toBe("VICTORIA");
    expect(() => store.returnToLobby(code, otherPlayer(room, host.player.id).id)).toThrow(
      /anfitrión/i,
    );
    store.returnToLobby(code, host.player.id);
    expect(room.phase).toBe("LOBBY");
    expect(room.points).toEqual({ honestos: 0, deshonestos: 0 });
    expect(room.players).toHaveLength(5);
    expect(room.players.every((player) => player.team === null)).toBe(true);
    store.startGame(code, host.player.id);
    expect(room.phase).toBe("NOMINACION");
  });

  it("gana el primero que llega a 2 puntos y pasa a VICTORIA", () => {
    const { store, code, room } = setup(5, 15);
    for (let round = 0; round < 2; round += 1) {
      const pres = president(room);
      store.nominate(code, pres.id, otherPlayer(room, pres.id).id);
      everyoneVotes(store, code, room, true);
      store.signContract(code, pres.id, "LIMPIO");
      store.signContract(code, room.vocalId!, "LIMPIO");
      expect(room.points.honestos).toBe(round + 1);
      if (round === 0) {
        store.tick(Date.now() + 10_000);
        expect(room.phase).toBe("NOMINACION");
      }
    }
    expect(room.winner).toBe("HONESTOS");
    store.tick(Date.now() + 10_000);
    expect(room.phase).toBe("VICTORIA");
  });
});
