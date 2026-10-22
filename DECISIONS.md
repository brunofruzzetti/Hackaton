# DECISIONS.md

Registro de decisiones tomadas ante ambigüedades. Formato: fecha, decisión, motivo.

## 2026-10-22

### D-001 · WebSockets con `ws` directamente sobre Fastify
Se usa `ws` con `server.on("upgrade")` en lugar de Socket.IO. Menos dependencias, protocolo
tipado en `/shared` y validación zod explícita de cada mensaje. El servidor sigue siendo la
única autoridad.

### D-002 · `/shared` se consume como fuente TypeScript
Server (`tsx`, `tsup`) y cliente (Vite alias) importan `@shared/...` directamente desde
`shared/src`. Evita un paso de build intermedio y mantiene una sola fuente de verdad. El
build del servidor bundlea `@junta/shared`.

### D-003 · Fases en inglés, UI en español
Las fases son `LOBBY | ROLES | DISCUSSION | JUDGMENT | RESULTS_SHOP` (enum compartido).
Los textos visibles se traducen en el cliente. Los roles se identifican por id en inglés
(`gossip`, `debtor`, `president`, `spender`, `clueless`, `squatter`, `catlady`, `concierge`).

### D-004 · Empezar partida en Hito 1 revela roles (fase ROLES)
El Hito 1 no incluye timers ni discusión. Para poder validar el reparto, el anfitrión pulsa
"Empezar" y la sala pasa a `ROLES`, mostrando el rol asignado a cada participante. En el
Hito 4 esa pantalla se convertirá en la asignación/prompts definitivos. Los roles se
mantienen durante toda la partida.

### D-005 · Nombres y reconexión sin cuentas
Cada jugador recibe un `playerId` y un `sessionToken` aleatorios que el cliente guarda en
`localStorage`. Al recargar se reconecta con ellos. Si se pierde el token (otro dispositivo),
se permite recuperar el asiento por código + nombre **solo si ese jugador está desconectado**.
Con la partida ya empezada no se admiten jugadores nuevos, solo reconexiones.

### D-006 · Anfitrión = primer humano de la sala
No hay transferencia de anfitrión en el MVP. Si se desconecta, conserva el asiento y puede
volver; mientras tanto nadie más puede iniciar la partida.

### D-007 · Vecinos IA en el lobby
El anfitrión añade y quita IA con un botón. Cada IA ocupa un asiento con nombre español
predefinido y un `playerId` propio (`ai-...`). El reparto de roles mezcla humanos e IA al
azar, por lo que el conserje y el presidente pueden caer en cualquier combinación.

### D-008 · `STT_PROVIDER=mock` para desarrollo
Además de `openai` y `deepgram`, se admite `mock`: devuelve una transcripción simulada sin
llamar a ninguna API. Sirve para probar el flujo completo sin claves y está documentado.
Nunca se selecciona por defecto (`openai` es el valor por defecto de `.env.example`).

### D-009 · Un único flujo de audio propio para LiveKit y push-to-talk
El cliente obtiene un `LocalAudioTrack` de LiveKit y lo publica. El mismo track alimenta un
`MediaRecorder` para los clips de STT, así que no se piden dos permisos ni se duplica el
micro. El botón de silencio desactiva el track (y por tanto también el PTT). El clip se
envía por HTTP como cuerpo binario, con el MIME real (`audio/webm` o `audio/mp4` en Safari).

### D-010 · Transcripción por HTTP, no por WebSocket
Los clips se suben a `POST /api/stt` (cuerpo binario, máx. 10 MB) y el servidor emite la
entrada resultante por WebSocket a toda la sala. Evita bloquear el canal de eventos con
binarios y permite reintentar la subida de forma sencilla.

### D-011 · El chat de texto entra en la transcripción desde el Hito 2
Aunque el chat es "respaldo", se implementa ya porque comparte la misma lista y permite
probar la UI sin micrófono. Cada entrada lleva `source: "voice" | "chat"`.

### D-012 · El rol en la transcripción antes de ROLES es "Vecino"
En el lobby todavía no hay roles repartidos. Las entradas de voz/chat de esa fase se
etiquetan con el rol `null` y se muestran como "Vecino". Al empezar la partida las nuevas
entradas ya llevan el rol asignado.

## Hito 1

### D-013 · Los roles son públicos
El reparto se muestra a todos los participantes (y la transcripción etiqueta cada
intervención con el rol, como pide el enunciado). No hay roles secretos: el juego consiste
en interpretar el cliché abiertamente.

### D-014 · El WebSocket es el único punto de entrada a la sala
Crear/unirse se hace con los mensajes `create_room` / `join` del WebSocket, no con endpoints
HTTP. Así hay una sola ruta de validación y reconexión. HTTP queda para health, config,
tokens de LiveKit y STT (hitos siguientes). El token de sesión se entrega en el mensaje
`joined` y el cliente lo guarda en `localStorage`.

### D-015 · Auto-relleno de IA al empezar
`planComposition` calcula cuántos IA faltan para llegar a 3. El servidor los crea en el
mismo instante de pulsar "Empezar". Por eso el botón puede estar activo con 1 humano:
la composición **final** es válida (1 humano + 2 IA). Se deshabilita si el plan no es
válido (sin humanos, más de 4 IA, más de 8 participantes o imposible llegar al mínimo).

### D-016 · Códigos sin vocales
El alfabeto de códigos excluye vocales (`ABCDEFGHJKLMNPQRSTUVWXYZ`) para que no se formen
palabras ni se confundan letras al dictar el código por voz.

### D-017 · Campos de hitos futuros ya presentes en el estado
`PlayerState` incluye `speaking`, `silencedUntil` y `orderWarnings`, y `RoomState` incluye
`discussionEndsAt`. Están a `false`/`null`/`0` hasta que se implementen los hitos 2 y 5.
Evita romper el protocolo compartido más adelante.

### D-018 · Endpoint de depuración de salas
`GET /api/debug/room/:code` devuelve el estado público (sin tokens) de una sala. Es solo
para pruebas manuales del hackathon; no expone datos secretos.

## Hito 2

### D-019 · El audio se conecta al entrar en la sala, no al empezar la partida
Al recibir `joined`, el cliente pide el token de LiveKit y se une al room `junta-<código>`.
Así se puede probar el micro en el lobby y la sala está lista al repartir roles. Si el
usuario sale o el WebSocket se reconecta, el audio se desconecta y se vuelve a conectar.

### D-020 · Un solo track para LiveKit y los clips
Se crea un `LocalAudioTrack` con cancelación de eco/ruido, se publica en LiveKit y el mismo
`mediaStreamTrack` alimenta `MediaRecorder`. El botón de silencio silencia el track y
bloquea el push-to-talk para que no se grabe audio que los demás no oyen. Los clips duran
como máximo 30 s y los toques de menos de 0,4 s se descartan.

### D-021 · Formato de subida STT
El clip viaja como cuerpo binario (`application/octet-stream`) con cabeceras
`x-room-code`, `x-player-id`, `x-session-token` y `x-audio-mime`. Evita meter base64 en el
WebSocket y permite reintentar la petición. El servidor valida sesión, MIME y tamaño
(máx. 10 MB) y responde 401/400/415/422/502/503 según el caso.

### D-022 · Reintento de STT en el cliente y en el servidor
El servidor reintenta una vez los errores transitorios del proveedor; el cliente reintenta
una vez la subida si el fallo es de red o 5xx. Los errores de configuración (falta de API
key) y los 4xx no se reintentan. El texto del error se muestra en pantalla sin tumbar la
partida.

### D-023 · Indicador de hablantes
El cliente usa `ActiveSpeakersChanged` de LiveKit (que ya aplica un umbral de nivel de
audio) y envía su propio estado `speaker_state` al servidor. La lista de vecinos combina
el estado del servidor con el de LiveKit para dar feedback inmediato. El servidor sigue
siendo la autoridad para los futuros avisos de orden del juez.

### D-024 · Audio remoto sin librería de componentes
Los tracks remotos se adjuntan a elementos `<audio>` ocultos creados por el hook. Si el
navegador bloquea el autoplay, se muestra el botón **Activar sonido** (`room.startAudio`).
No se añade `@livekit/components-react` para mantener el cliente ligero.

### D-025 · Sin claves se puede seguir jugando con chat
Si `POST /api/livekit/token` responde 503, la tarjeta de audio muestra "Audio no
configurado" y el push-to-talk queda deshabilitado, pero el WebSocket, el lobby, el chat y
la transcripción de texto siguen funcionando. `STT_PROVIDER=mock` permite probar el flujo
completo de voz sin llamar a APIs externas.

### D-026 · LiveKit local probado con el binario oficial
El entorno de desarrollo no tenía Docker; se validó el flujo con
`livekit-server --dev` (release oficial de Windows) en `ws://localhost:7880` y las claves
`devkey`/`secret`. El README y `docs/hito-2.md` documentan ambas opciones.
