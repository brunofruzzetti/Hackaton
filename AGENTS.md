# AGENTS.md — Reglas del proyecto

Este fichero es el contrato para futuras sesiones de agentes. Léelo antes de tocar código.

## Producto

Juego web multijugador por voz **"Junta de Vecinos"**. Humanos remotos + hasta 4 vecinos IA
discuten una propuesta de comunidad. Un juez IA modera en directo y puntúa al final de cada
ronda las tareas y la interpretación de cada humano. La puntuación es directa (puntos), sin
monedas ni tienda. Tras 3 rondas gana quien acumula más puntos.

## Stack obligatorio

- Monorepo `/server`, `/client`, `/shared`.
- Server: Node.js + TypeScript estricto, Fastify, WebSockets (`ws`). Estado en memoria, sin BD.
- Client: React + Vite + TypeScript, CSS simple, mobile-first.
- Audio: LiveKit (`livekit-server-sdk` para tokens, `livekit-client` en cliente).
- LLM: DeepSeek vía SDK `openai` (`baseURL: https://api.deepseek.com`, `deepseek-chat`).
  El juez usa `response_format: { type: "json_object" }` y se valida con zod.
- STT: `SttProvider` intercambiable (OpenAI Whisper, Deepgram, y `mock` solo para dev).
- IA sin voz: los vecinos IA y el juez publican **texto**. No se usa TTS.
- Env documentadas en `.env.example`.

## Mapa de código

- `shared/src/roles.ts`: 14 roles, 3 estilos de presidente y prompts.
  `shared/src/composition.ts`: composición y regla conserje ⇒ presidente.
  `shared/src/events.ts`: protocolo WS + zod del cliente.
- `server/src/roomStore.ts`: autoridad de salas y jugadores. `server/src/wsHub.ts`:
  transporte WS, heartbeats y difusión. `server/src/livekit.ts`: JWT de LiveKit.
- `server/src/stt/`: interfaz `SttProvider`, implementaciones OpenAI/Deepgram/mock y
  `transcribeWithRetry`.
- `server/src/ai/`: `llm.ts` (DeepSeek/mock), `prompt.ts` (prompt de rol), `director.ts`
  (cola de turnos IA) y `textTiming.ts` (ventana de texto activo).
- `server/src/judgeModerator.ts`: solapamiento, aviso y mute de 3 s.
- `server/src/judge/`: prompt, esquema zod, servicio DeepSeek/mock, scoring y orquestador
  de ronda.
- `shared/src/tasks.ts`: 24 tareas por rol, reparto y tareas combo.
- `shared/src/communityEvents.ts`: 24 sucesos y selección por roles presentes.
- `client/src/hooks/useGameSocket.ts`: conexión WS, reconexión y estado de sala.
  `client/src/hooks/useLiveKit.ts`: room de audio, hablantes y track local.
- `client/src/components/PushToTalk.tsx`: MediaRecorder sobre el track de LiveKit,
  subida HTTP y reintento. `AudioPanel.tsx` y `TranscriptPanel.tsx`: UI de audio/acta.
- `client/src/components/PortalScene.tsx`: portal 2D con puestos por rol y altavoz del juez.
  `TaskHand.tsx`: agenda privada.

## Convenciones de código

- TypeScript `strict`. **Prohibido `any`** salvo justificación en comentario.
- Todos los mensajes entrantes (WS y HTTP) se validan con zod.
- El servidor es la autoridad: fases, turnos, timers y puntuaciones. El cliente solo pinta
  estado y envía acciones.
- Lógica pura y testeable en `/shared`; efectos (I/O, red, timers) en `/server`.
- Nombres de tipos y funciones en inglés; textos de UI y prompts en español.
- Logs de servidor con prefijo `[rooms]`, `[ws]`, `[stt]`, `[judge]`, `[livekit]`.
- Errores de red/STT/LLM/LiveKit no deben tumbar la partida: se capturan, se loguean y se
  avisa al cliente con un mensaje claro.
- Mobile-first: botones grandes, una columna, sin hover como única affordance.
- Imports compartidos: `@shared/...` (alias en Vite y tsconfig; `tsup` bundlea shared).

## Reglas de juego que no se pueden romper

- Salas con código de 4 letras; entrada sin registro (código + nombre).
- Composición: mínimo 3 participantes (humanos + IA), mínimo 1 humano, máximo 4 IA,
  máximo 8 participantes (8 roles, sin repetir).
- **Conserje ⇒ Presidente**: si hay conserje, debe estar el presidente. Ver algoritmo y
  tests en `shared/src/composition.ts` y `shared/src/composition.test.ts`.
- Roles fijos toda la partida (salvo decisión documentada).
- Fases por ronda: `LOBBY → ROLES → DISCUSSION (4 min) → JUDGMENT → RESULTS`.
  3 rondas.
- IA publican **solo texto**, por turnos, nunca a la vez; no empiezan si un humano habló en
  los últimos 2–3 s o si el juez habla. Máximo 2 mensajes por IA y ronda, con 15 s de
  separación. Su texto cuenta como “hablando” mientras está destacado. Si un humano
  empieza, se cancela la generación pendiente, no el texto ya publicado.
- Transcripción compartida ordenada: `[jugador | rol | texto]`. El chat de texto también
  entra en la transcripción.
- Reconexión con mismo código + nombre sin romper la partida.
- Juez moderador: **4+ participantes activos** (humanos hablando o IA publicando texto)
  durante 2 s ⇒ aviso en pantalla, cooldown 15 s, silencio forzado opcional de 3 s
  (`JUDGE_FORCE_MUTE=true` por defecto) y contador de avisos por ronda. El juez no es un
  personaje: es un altavoz omnipresente.
- Puntuación final: el modelo devuelve notas 0–100 y el estado de cada tarea. El servidor
  calcula **puntos de tareas (1/2/3 por dificultad) + bonus de rol (0–5)**. No hay dinero,
  tienda ni voto de jugadores.
- Roles discretos: conserje y okupa no se penalizan por hablar poco si cumplen su cliché.
- Tareas: 4 por humano y ronda, 3 de rol/estilo + 1 universal, de un mazo de 24 por rol.
  3 rondas sin repetir; combo si hay pareja de roles compatible. Son secretas hasta el acta.
- Sucesos: 4 por ronda de un total de 24, relevantes para los roles presentes. Se anuncian
  en el tablón, el acta y el prompt de la IA.

## Roles (fuente única: `shared/src/roles.ts`)

14 roles: cotilla, moroso, presidente (3 estilos), derramas, despistado, okupa (sin voto),
gatos, conserje (sin voto), cuñado, manitas, ex-presidente, inquilino (sin voto),
teletrabajador y eco-vecino. Cada partida sortea 10 de 14.

Presidencia aleatoria: **dictador criticón**, **a su pesar** o **influencer**. Es un solo
rol (`president`) con estilo; no pueden coincidir dos presidentes. La regla
conserje ⇒ presidente sigue aplicándose.

Límites: **3-10 participantes**, **máximo 4 IA**, **4 minutos de discusión**. Las tasas de
tareas (Hito 4) son 4 por jugador y ronda, con un mazo de 24 por rol.

## Flujo de trabajo

- Trabajar por hitos. Ejecutar y probar cada uno antes de pasar al siguiente.
- Hacer commit al terminar cada hito.
- Si algo es ambiguo: elegir la opción más simple y anotarla en `DECISIONS.md`.
- Al terminar un hito: indicar cómo probarlo y qué falta.

## Hitos

0. Estructura, scripts, docs. ✅
1. Salas, lobby WS, roles, composición + tests. ✅
2. LiveKit, mute, hablantes, PTT + STT + transcripción. ✅
3. Vecinos IA (solo texto), cola de turnos, regla de silencio. ✅
4. Tareas por ronda, sucesos, temporizador y escena 2D del portal. ✅
5. Juez moderador en directo (solapamiento, aviso, mute forzado, cooldown). ✅
6. Juez de final de ronda, puntos y 3 rondas. ✅
7. Tienda y monedas: **descartadas**; puntuación directa por tareas. ✅
8. Acciones de rol, sonidos, estadísticas, modo espectador y pulido. ⏳

## Pruebas

- `npm test` ejecuta Vitest (tests de `/shared` y `/server`).
- `npm run typecheck` debe pasar antes de cada commit.
- Probar siempre el flujo móvil con túnel HTTPS antes de dar un hito por terminado.
- Pruebas manuales por hito: `docs/hito-1.md` … `docs/hito-6.md`.
- Para audio se puede usar LiveKit Cloud o el binario local `--dev` (ver `docs/hito-2.md`).
  Sin claves, `STT_PROVIDER=mock` permite probar el flujo de transcripción completo.
- Los navegadores automatizados pueden no tener micrófono: el audio remoto y el chat sí se
  pueden validar; la captura PTT se prueba en un dispositivo real.
