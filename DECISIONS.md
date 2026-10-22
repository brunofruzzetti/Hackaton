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
