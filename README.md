# Junta de Ruina

Party game web de deducción social para **5–8 jugadores** ambientado en una comunidad de
vecinos. Una constructora ha comprado a una parte de la junta: los vecinos honestos deben
aprobar contratos limpios, mientras los **comerciales encubiertos** intentan colar sabotajes
sin que se note.

## Reglas

- **5–8 jugadores** por sala, sin registro: código de 4 letras + nombre.
- **Bandos secretos**:
  - 5–7 jugadores: 2 deshonestos.
  - 8 jugadores: 3 deshonestos.
- **Bo3**: gana el primer bando que consigue **2 puntos**.
- **Pisos**: cada jugador recibe un piso (`Bajo`, `1ºA`, `1ºB`, `2ºA`, `2ºB`, `3ºA`, `3ºB`,
  `Ático`).
- **Secretos circulares**: cada jugador recibe un expediente sobre el vecino de su derecha
  (el siguiente del anillo):
  - si es deshonesto: `SOSPECHOSO`;
  - si es honesto: 50% `LIMPIO`, 50% `TRAPO_SUCIO`.
- **Ciclo de ronda**:
  1. **NOMINACIÓN**: el presidente de turno elige a un vocal para la Comisión de Obras.
  2. **VOTACIÓN**: toda la sala vota `APROBAR` o `RECHAZAR`; los votos son públicos al cerrar.
     Si se rechaza, el turno de presidente pasa al siguiente. A los **3 rechazos seguidos**,
     los deshonestos ganan el punto automáticamente.
  3. **FIRMA SECRETA**: solo presidente y vocal firman. Un honesto solo puede firmar limpio;
     un deshonesto puede firmar limpio o colar sabotaje.
  4. **RESOLUCIÓN**: 0 sabotajes ⇒ punto para honestos; 1+ ⇒ punto para deshonestos. Se
     muestra el sobre, pero no se revela quién firmó el sabotaje.
- El presidente rota al siguiente índice del array tras cada rechazo y al empezar una nueva
  ronda. La partida termina en cuanto un bando llega a 2 puntos.
- Si el presidente no nomina en **60 s**, el servidor elige un vocal al azar. La votación y
  la firma también caducan a los 60 s. El anfitrión tiene además un botón de emergencia
  **Forzar siguiente fase**.
- Los deshonestos se conocen entre sí y reciben la lista de compinches. El resto de la sala
  no ve equipos ni expedientes ajenos.
- Efectos de sonido sintéticos con Web Audio API: martillazo al cerrar la votación, sobre al
  revelar el resultado y fanfarria de victoria. Se pueden silenciar.

## Stack

- **Servidor autoritativo**: Node.js + TypeScript estricto, Fastify, WebSockets (`ws`), estado
  en memoria. Fases, timers, votos, firmas y puntuaciones viven en el servidor.
- **Cliente**: React + Vite + TypeScript + **Tailwind CSS v4**.
- **Voz**: LiveKit (`livekit-server-sdk` para tokens y `livekit-client` en el navegador).
- **Supabase Realtime (opcional)**: espejo de `salas` y `jugadores` para suscripciones en
  vivo. El WebSocket sigue siendo la autoridad; si Supabase falla, la partida continúa.

## Arranque

```bash
npm install
cp .env.example .env       # Windows: copy .env.example .env
npm run dev
```

- Cliente: `http://localhost:5173`
- Servidor: `http://localhost:3001`
- WebSocket: `ws://localhost:3001/ws`

`server` y `client` cargan el `.env` de la raíz (`envDir: ".."` en Vite y `dotenv` con
`[".env", "../.env"]` en el servidor).

### LiveKit

Rellena `LIVEKIT_URL`, `LIVEKIT_API_KEY` y `LIVEKIT_API_SECRET` en `.env`. Sin LiveKit, el
juego sigue funcionando con chat.

### Supabase Realtime (opcional)

1. Ejecuta [`supabase/schema.sql`](supabase/schema.sql) en el SQL Editor del proyecto.
2. Rellena en `.env`:

```bash
SUPABASE_URL=https://<tu-proyecto>.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<service-role>   # espejo servidor
SUPABASE_ANON_KEY=<anon-key>
VITE_SUPABASE_URL=https://<tu-proyecto>.supabase.co
VITE_SUPABASE_ANON_KEY=<anon-key>
```

El servidor hace un `upsert` best-effort del estado en `salas` y `jugadores`; el cliente
escucha `postgres_changes` con [`useSupabaseRoom`](client/src/hooks/useSupabaseRoom.ts).
Sin credenciales, la UI muestra `WS local` y todo funciona igual.

> **Privacidad**: `jugadores` contiene solo datos públicos (nombre, piso, conexión). Los
> equipos, compañeros y secretos se guardan en `expedientes`, una tabla **sin políticas
> para `anon`**; solo el servidor con `service_role` puede leerla. `jugadores` y `salas`
> siguen con RLS abierta para el prototipo, así que no metas datos privados ahí.
>
> En el cliente, `useRuinaSocket` solo recibe tu `privateInfo` por tu propio socket, y
> `useSupabaseRoom` selecciona explícitamente columnas públicas.

## Arquitectura

```text
/shared
  src/ruina.ts        Tipos, constantes, zod del cliente y lógica pura iniciarPartida()
/server
  src/ruinaStore.ts   Máquina de estados autoritativa y reglas de sala
  src/ruinaWs.ts      Transporte WS, sesiones, reconexión, heartbeats y difusión
  src/supabaseMirror.ts Espejo opcional Supabase (REST + Realtime)
  src/livekit.ts      Tokens JWT de LiveKit
  src/index.ts        Fastify: health, config, token y arranque
/client
  src/components/Lobby.tsx           Crear/unirse y lista de vecinos
  src/components/PlayerDashboard.tsx Marcador Bo3 + expediente privado post-it
  src/components/VotingPanel.tsx     Nominación, votación pública y firma secreta
  src/components/ResolutionModal.tsx Sobre animado y resultado de ronda
  src/hooks/useRuinaSocket.ts        Conexión WS, reconexión y acciones
  src/hooks/useSupabaseRoom.ts       Suscripción Realtime opcional
  src/hooks/useLiveKit.ts            Audio de sala
```

### Función pura de arranque

[`iniciarPartida`](shared/src/ruina.ts) recibe `{ id, nombre }[]`, valida 5–8 jugadores y
devuelve, sin tocar red ni timers:

- jugadores con `piso`, `equipo`, `esDeshonesto` e `informacionPrivada`;
- mapa de secretos circulares;
- baraja de contratos;
- índice inicial de presidente.

Se usa tanto en el servidor como en tests deterministas con un `rng` inyectable.

### Fases

`LOBBY → NOMINACION → VOTACION_COMISION → FIRMA_CONTRATO → RESOLUCION_RONDA → VICTORIA`

- Nominación: 60 s; si no hay vocal, el servidor nomina al azar.
- Votación: 60 s; los votos ausentes cuentan como rechazo.
- Firma: 60 s; las firmas ausentes cuentan como limpias.
- Resolución: 8 s y paso automático a la siguiente ronda o a victoria.
- Emergencia: el anfitrión puede forzar la resolución de la fase actual con
  `force_advance`.

## Tests y verificación

```bash
npm test
npm run typecheck
npm run build
```

Cubren reparto de pisos/bandos, secretos circulares, ocultación de equipos en el estado
público, nominación, votos públicos, rechazos, sabotaje, timeout, victoria Bo3 y tokens de
LiveKit.

## Prueba manual rápida

1. Abre 5 pestañas (o 5 dispositivos) en `http://localhost:5173`.
2. Crea una sala y comparte el código; entra con 5 nombres.
3. El anfitrión pulsa **Empezar la junta**.
4. Comprueba que cada pestaña ve su expediente y su piso, pero no los de los demás.
5. El presidente nomina, la sala vota y la comisión firma. Al cerrar la votación, los votos
   son públicos; al firmar, solo se revela el número de sabotajes.
6. Repite hasta que un bando llegue a 2 puntos; el sobre final muestra la victoria.

## Limitaciones conocidas

- Estado en memoria: reiniciar el servidor borra las salas.
- No hay cuentas ni historial; la reconexión usa `playerId` + token en `localStorage`.
- Si no hay LiveKit, no hay voz; el chat sigue disponible.
- El espejo Supabase es best-effort y las RLS son solo para desarrollo.
- La primera presidencia es el primer asiento de la sala; después rota.
