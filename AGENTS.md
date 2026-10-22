# AGENTS.md — Reglas del proyecto

Este fichero es el contrato para futuras sesiones de agentes. Léelo antes de tocar código.

## Producto

Juego web multijugador por voz **"Junta de Vecinos"**. Humanos remotos + hasta 4 vecinos IA
discuten una propuesta de comunidad. Un juez IA modera en directo y puntúa al final de cada
ronda cuánto ha cumplido cada humano su rol cliché. El % se convierte en dinero para
amueblar el piso. Tras 3 rondas gana el piso de mayor valor.

## Stack obligatorio

- Monorepo `/server`, `/client`, `/shared`.
- Server: Node.js + TypeScript estricto, Fastify, WebSockets (`ws`). Estado en memoria, sin BD.
- Client: React + Vite + TypeScript, CSS simple, mobile-first.
- Audio: LiveKit (`livekit-server-sdk` para tokens, `livekit-client` en cliente).
- LLM: DeepSeek vía SDK `openai` (`baseURL: https://api.deepseek.com`, `deepseek-chat`).
  El juez usa `response_format: { type: "json_object" }` y se valida con zod.
- STT: `SttProvider` intercambiable (OpenAI Whisper, Deepgram, y `mock` solo para dev).
- TTS: `speechSynthesis` en cliente para el MVP, tras una interfaz `TtsProvider`.
- Env documentadas en `.env.example`.

## Mapa de código (estado tras Hito 2)

- `shared/src/roles.ts`: 8 roles y prompts. `shared/src/composition.ts`: composición y
  regla conserje ⇒ presidente. `shared/src/events.ts`: protocolo WS + zod del cliente.
- `server/src/roomStore.ts`: autoridad de salas y jugadores. `server/src/wsHub.ts`:
  transporte WS, heartbeats y difusión. `server/src/livekit.ts`: JWT de LiveKit.
- `server/src/stt/`: interfaz `SttProvider`, implementaciones OpenAI/Deepgram/mock y
  `transcribeWithRetry`.
- `server/src/ai/`: `llm.ts` (DeepSeek/mock), `prompt.ts` (prompt de rol), `director.ts`
  (cola de turnos IA) y `voices.ts` (perfiles TTS).
- `client/src/hooks/useGameSocket.ts`: conexión WS, reconexión, estado de sala y eventos TTS.
  `client/src/hooks/useLiveKit.ts`: room de audio, hablantes y track local.
  `client/src/lib/tts.ts`: `TtsProvider` sobre `speechSynthesis`.
- `client/src/components/PushToTalk.tsx`: MediaRecorder sobre el track de LiveKit,
  subida HTTP y reintento. `AudioPanel.tsx` y `TranscriptPanel.tsx`: UI de audio/acta.

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
- Fases por ronda: `LOBBY → ROLES → DISCUSSION (3 min) → JUDGMENT → RESULTS_SHOP`.
  3 rondas.
- IA hablan por turnos, nunca a la vez; no empiezan si un humano habló en los últimos
  2–3 s o si el juez habla. Si un humano empieza, se cancelan respuestas IA pendientes y
  los clientes llaman a `speechSynthesis.cancel()`. Máximo 3 turnos por IA y ronda.
- Transcripción compartida ordenada: `[jugador | rol | texto]`. El chat de texto también
  entra en la transcripción.
- Reconexión con mismo código + nombre sin romper la partida.
- Juez moderador: **4+ humanos** solapados >2 s ⇒ aviso TTS, cooldown 15 s, silencio
  forzado opcional de 3 s (`JUDGE_FORCE_MUTE=true` por defecto) y contador de avisos por
  ronda. El juez no es un personaje: es un altavoz omnipresente.
- Puntuación final: el modelo devuelve notas 0–100 y el estado de cada tarea; `total_pct`
  se calcula **en código** como media ponderada (50% tareas). Dinero = `total_pct * 10`
  (configurable). No hay voto de jugadores para decidir el resultado.
- Roles discretos: conserje y okupa no se penalizan por hablar poco si cumplen su cliché.

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
3. Vecinos IA, TTS, cola de turnos, regla de silencio. ✅
4. Tareas por ronda, temporizador y escena 2D del portal.
5. Juez moderador en directo (solapamiento, aviso, mute forzado, cooldown).
6. Juez de final de ronda, tareas y dinero.
7. Tienda y piso 2D.
8. Acciones de rol, sonidos, estadísticas, modo espectador y pulido.

## Pruebas

- `npm test` ejecuta Vitest (tests de `/shared` y `/server`).
- `npm run typecheck` debe pasar antes de cada commit.
- Probar siempre el flujo móvil con túnel HTTPS antes de dar un hito por terminado.
- Para audio se puede usar LiveKit Cloud o el binario local `--dev` (ver `docs/hito-2.md`).
  Sin claves, `STT_PROVIDER=mock` permite probar el flujo de transcripción completo.
- Los navegadores automatizados pueden no tener micrófono: el audio remoto y el chat sí se
  pueden validar; la captura PTT se prueba en un dispositivo real.
