# AGENTS.md — Junta de Ruina

Contrato para futuras sesiones de agentes. Léelo antes de tocar código.

## Producto

Party game web de deducción social **"Junta de Ruina"** para **5–8 jugadores**. Vecinos
honestos y comerciales encubiertos debaten y votan contratos de una comunidad. Al mejor de
3 rondas, gana el primer bando que consigue 2 puntos.

No hay juez IA, tareas, monedas, tienda, apartamento, elección de presidente ni roles
cliché. La presidencia es un cargo rotatorio, no un rol. Los roles del prototipo anterior
fueron eliminados.

## Stack obligatorio

- Monorepo `/shared`, `/server`, `/client`.
- Server: Node.js + TypeScript estricto, Fastify, WebSockets (`ws`). Estado autoritativo en
  memoria, sin base de datos obligatoria.
- Client: React + Vite + TypeScript, **Tailwind CSS v4** (`@tailwindcss/vite`), mobile-first.
- Audio: LiveKit (`livekit-server-sdk` en servidor, `livekit-client` en cliente).
- Supabase Realtime: **opcional**. El servidor espeja `salas` y `jugadores` por REST cuando
  hay credenciales; el cliente escucha `postgres_changes`. Sin credenciales, todo funciona
  por WebSocket.
- Env documentadas en `.env.example`; servidor y Vite cargan el `.env` de la raíz.

## Mapa de código

- `shared/src/ruina.ts`
  - Constantes (jugadores, pisos, contratos, reparto de bandos).
  - Tipos `RuinaState`, `RuinaPrivateInfo`, `RuinaSecret`, fases, eventos.
  - Esquema zod `ruinaClientMessageSchema` para todo mensaje entrante.
  - Lógica pura `iniciarPartida(jugadores, rng)`: pisos, bandos y secretos circulares.
- `server/src/ruinaStore.ts`: autoridad de salas, lobby, equipos, fases, votos, firmas,
  timers, puntuación y reconexión.
- `server/src/ruinaWs.ts`: transporte WS, sesiones, heartbeats, difusión y errores.
- `server/src/supabaseMirror.ts`: espejo best-effort a Supabase (`salas`/`jugadores`).
- `server/src/livekit.ts`: JWT de LiveKit.
- `server/src/index.ts`: Fastify (health, config, token, reloj de timers y WS).
- `client/src/components/Lobby.tsx`: crear/unirse, tablón, código y lista de conectados.
- `client/src/components/JuntaHeader.tsx`: sellos Bo3, llave del portal, fase y calaveras.
- `client/src/components/PlayerCredential.tsx`: credencial privada plegable y post-it.
- `client/src/components/NeighborBoard.tsx`: tablero de buzones 2/4 columnas.
- `client/src/components/PortalScene.tsx`: panorámica cenital con avatares pixel-art sentados
  en U, alfombra y mesa frontal; el presidente y el vocal se sientan delante.
- `client/src/components/ContractFolder.tsx`: carpeta azul del contrato de obra.
- `client/src/components/PlayerDashboard.tsx`: compone header, credencial, contrato y tablero.
- `client/src/components/VotingPanel.tsx`: nominación, votación pública y firma secreta.
- `client/src/components/ResolutionModal.tsx`: sobre animado, sello y resultado/victoria.
- `client/src/lib/ui.ts`: constantes de estilo neobrutalista y etiquetas de fase.
- `client/src/hooks/useRuinaSocket.ts`: WS, reconexión y acciones.
- `client/src/hooks/useSupabaseRoom.ts`: suscripción Realtime opcional.
- `client/src/hooks/useLiveKit.ts`: audio de sala.
- `supabase/schema.sql`: tablas, RLS de desarrollo y publicación Realtime.

## Reglas de juego que no se pueden romper

- 5–8 jugadores; mínimo 5 para empezar; máximo 8.
- **IAs de prueba**: máximo 4 por sala, solo el anfitrión las añade/quita en `LOBBY`. Ocupan
  asiento, reciben bando/secreto y actúan solas: nominan si son presidentas, votan y firman
  (sabotaje probabilístico si son deshonestas). Se procesan una acción por tick en servidor.
- Bandos: 5–7 jugadores ⇒ 2 deshonestos; 8 ⇒ 3 deshonestos.
- Pisos únicos del array `RUINA_FLOORS`; el anillo de secretos es el orden de jugadores.
- Cada jugador recibe un expediente sobre el jugador **siguiente** del array:
  - siguiente deshonesto ⇒ `SOSPECHOSO`;
  - siguiente honesto ⇒ 50% `LIMPIO` / 50% `TRAPO_SUCIO`.
- Los deshonestos se conocen y reciben `companeros`. El estado público **nunca** incluye
  equipos, secretos ni elecciones de firma.
- Fases: `LOBBY → NOMINACION → VOTACION_COMISION → FIRMA_CONTRATO → RESOLUCION_RONDA →
  VICTORIA`.
- El presidente nomina a un vocal distinto de sí mismo.
- Votación pública y simultánea; los votos se revelan solo al cerrar. Mayoría simple:
  aprueba solo si `sí > no`. Empate ⇒ rechazo.
- 3 rechazos seguidos en la misma ronda ⇒ punto automático para deshonestos.
- Firma: solo presidente y vocal. Honesto solo `LIMPIO`; deshonesto `LIMPIO` o `SABOTAJE`.
  0 sabotajes ⇒ punto honesto; 1+ ⇒ punto deshonesto.
- No se revela qué jugador sabotó, solo cuántos sabotajes hubo.
- El presidente rota al siguiente índice tras cada rechazo y al empezar cada ronda.
- Bo3: al llegar a 2 puntos se pasa a `VICTORIA`; no se juega la ronda 3 si ya hay 2-0.
- Timeouts: 60 s por nominación (auto-nominación aleatoria), 60 s por votación (ausente =
  rechazo), 60 s por firma (ausente = limpio), 8 s de resolución antes de avanzar.
- El anfitrión puede enviar `force_advance` para desatascar la fase actual; no sustituye a
  los timers.
- La primera presidencia es el índice 0 (primer asiento).
- La reconexión usa `playerId` + token de sesión; no se admiten jugadores nuevos con la
  partida empezada.

## Convenciones

- TypeScript `strict`. **Prohibido `any`** salvo justificación en comentario.
- Todo mensaje WS se valida con zod antes de tocar estado.
- El servidor es la autoridad: fases, timers, votos, firmas y puntos. El cliente solo pinta y
  envía acciones.
- Lógica pura y testeable en `/shared`; I/O y timers en `/server`.
- Nombres de tipos/funciones en inglés; UI y textos de juego en español.
- Logs de servidor con prefijo `[ruina]`, `[ruina/ws]`, `[ruina/livekit]`, `[supabase]`,
  `[env]`.
- Errores de red/LiveKit/Supabase no deben tumbar la partida: se capturan, se loguean y se
  avisa al cliente.
- Sonidos con Web Audio API en `client/src/lib/sfx.ts` y `useGameSounds`; sin assets
  externos. Mantener un toggle de silencio.
- Voz: el micro solo se pide tras pulsar `ENTRAR EN LA VOZ`; el chat de texto es siempre el
  respaldo. La escena del portal muestra las sillas y la mesa frontal presidente/vocal.
- Mobile-first: 390 px primero, botones grandes, Tailwind, sin hover como única affordance.
- Estilo visual: tablón de vecinos + neobrutalismo (papel `#f4efe6`, bordes negros, sombras
  sólidas, post-its, sellos y carpetas), centralizado en `client/src/lib/ui.ts` y
  `styles.css`.
- Imports compartidos con alias `@shared/...` (Vite y tsconfig).
- Supabase RLS abierta es **solo para desarrollo**. `salas`/`jugadores` son públicos;
  equipos y secretos viven en `expedientes`, sin políticas para `anon`. No añadir
  `expedientes` a Realtime ni volver a meter campos privados en `jugadores`.

## Pruebas

- `npm test`: Vitest (`shared/src/**/*.test.ts`, `server/src/**/*.test.ts`).
- `npm run typecheck` obligatorio antes de commit.
- `npm run build` debe compilar servidor y cliente (Tailwind incluido).
- Pruebas manuales: 5 pestañas, crear sala, empezar, nominar, votar, firmar, ver sobre y
  repetir hasta 2 puntos.
- Para probar Supabase: ejecutar `supabase/schema.sql`, rellenar credenciales y comprobar la
  insignia `Supabase live`.

## Flujo de trabajo

- Trabajar por incrementos pequeños y verificables.
- Si algo es ambiguo: elegir la opción más simple, anotarla en `DECISIONS.md` y avisar.
- Al terminar un incremento: indicar cómo probarlo y qué falta.
- No reintroducir juez IA, tareas, tienda, monedas ni roles cliché sin una decisión nueva.
