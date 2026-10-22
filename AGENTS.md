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
  los clientes llaman a `speechSynthesis.cancel()`.
- Transcripción compartida ordenada: `[jugador | rol | texto]`. El chat de texto también
  entra en la transcripción.
- Reconexión con mismo código + nombre sin romper la partida.
- Juez moderador: 3+ humanos solapados >2 s ⇒ aviso TTS, cooldown 15 s, silencio forzado
  opcional de 3 s (`JUDGE_FORCE_MUTE=true` por defecto) y contador de avisos por ronda.
- Puntuación final: el modelo devuelve notas 0–100; `total_pct` se calcula **en código**
  como media ponderada. Dinero = `total_pct * 10` (configurable).
- Roles discretos: conserje y okupa no se penalizan por hablar poco si cumplen su cliché.

## Roles (fuente única: `shared/src/roles.ts`)

Cotilla, moroso, presidente buenazo, el de las derramas, el que no se entera, okupa
(sin voto), la vieja de los gatos, conserje (sin voto, sujetavelas del presidente).

## Flujo de trabajo

- Trabajar por hitos. Ejecutar y probar cada uno antes de pasar al siguiente.
- Hacer commit al terminar cada hito.
- Si algo es ambiguo: elegir la opción más simple y anotarla en `DECISIONS.md`.
- Al terminar un hito: indicar cómo probarlo y qué falta.

## Hitos

0. Estructura, scripts, docs. ✅
1. Salas, lobby WS, roles, composición + tests. ✅
2. LiveKit, mute, hablantes, PTT + STT + transcripción. ✅
3. Vecinos IA, TTS, cola de turnos, regla de silencio.
4. Asignación de roles en partida y prompts de personalidad.
5. Juez moderador en directo (solapamiento, aviso, mute forzado, cooldown).
6. Juez de final de ronda y dinero.
7. Tienda y piso.
8. Pulido.

## Pruebas

- `npm test` ejecuta Vitest (tests de `/shared` y `/server`).
- `npm run typecheck` debe pasar antes de cada commit.
- Probar siempre el flujo móvil con túnel HTTPS antes de dar un hito por terminado.
