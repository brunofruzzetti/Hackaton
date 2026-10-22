import { describe, expect, it } from "vitest";
import { RuinaStore } from "./ruinaStore.js";
import { buildExpedienteRows, buildPublicPlayerRows } from "./supabaseMirror.js";

function startedRoom() {
  const store = new RuinaStore();
  const host = store.createRoom("Vecino 1");
  const code = host.room.code;
  for (let index = 2; index <= 5; index += 1) {
    store.joinRoom({ code, nombre: `Vecino ${index}` });
  }
  const room = store.startGame(code, host.player.id, () => 0.35);
  return { room };
}

describe("Supabase · separación público/privado", () => {
  it("las filas públicas de jugadores no filtran equipo ni secretos", () => {
    const { room } = startedRoom();
    const rows = buildPublicPlayerRows(room, "sala-1");
    expect(rows).toHaveLength(5);
    expect(Object.keys(rows[0]!).sort()).toEqual(
      ["conectado", "es_anfitrion", "id", "nombre", "piso", "sala_id"].sort(),
    );
    const serialized = JSON.stringify(rows);
    expect(serialized).not.toContain("DESHONESTOS");
    expect(serialized).not.toContain("HONESTOS");
    expect(serialized).not.toContain("secreto");
    expect(serialized).not.toContain("companeros");
  });

  it("las filas privadas de expedientes sí contienen el equipo y el secreto", () => {
    const { room } = startedRoom();
    const rows = buildExpedienteRows(room, "sala-1");
    expect(rows).toHaveLength(5);
    expect(rows.filter((row) => row.equipo === "DESHONESTOS")).toHaveLength(2);
    expect(rows[0]?.secreto.texto.length).toBeGreaterThan(10);
    expect(rows[0]?.companeros).toBeDefined();
  });
});
