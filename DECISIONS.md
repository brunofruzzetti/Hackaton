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

## Hito 3 · Nuevo diseño de roles, IA y TTS

### D-027 · 14 roles, máximo 10 jugadores y 4 IA
Se añaden cuñado, manitas, ex-presidente, inquilino, teletrabajador y eco-vecino a los 8
roles originales. La bolsa tiene 14 roles y cada partida sortea 10; por tanto, 4 roles
quedan fuera. El máximo sube a 10 participantes y se mantiene en 4 el número de IA.
La ronda de discusión sube a 4 minutos para dar espacio a 10 jugadores y 4 tareas.

### D-028 · Tres estilos de presidencia, no tres roles
El rol `president` conserva su id para que la regla conserje ⇒ presidente siga siendo
simple. Al empezar la partida se elige al azar uno de tres estilos: dictador, a su pesar o
influencer. El estilo cambia nombre, descripción, comportamientos y prompt, y se guarda en
`RoomState.presidentStyleId`. No puede haber dos presidentes en la misma partida.

### D-029 · Vecinos IA: DeepSeek con fallback mock
`server/src/ai/llm.ts` usa el SDK de OpenAI con `baseURL: https://api.deepseek.com` y
`model: deepseek-chat`. Si falta `DEEPSEEK_API_KEY` o `LLM_PROVIDER=mock`, se usa un
generador local con líneas por rol. Esto permite probar turnos y TTS sin gastar API.
El proveedor efectivo se anuncia en logs y en `/api/config`.

### D-030 · Reglas de turno de las IA
El director hace tick cada segundo. Una IA solo puede empezar si:
- la fase es `DISCUSSION`,
- ningún humano está hablando,
- han pasado 2,5 s desde la última intervención humana,
- han pasado 9 s desde la última IA,
- no hay otra IA hablando o generando,
- el juez no está hablando (campo preparado para el Hito 5),
- le quedan turnos (máximo 3 por ronda).

La duración del estado “hablando” se estima con base + ms por carácter. Si un humano
empieza a hablar, el servidor invalida la generación en curso, corta el TTS de los clientes
y desmarca a la IA. Los clientes también llaman a `speechSynthesis.cancel()`.

### D-031 · TTS con speechSynthesis, tras una interfaz
`client/src/lib/tts.ts` define `TtsProvider`. La implementación actual usa
`speechSynthesis` y elige voz, pitch y rate según el perfil que envía el servidor. El juez
tiene un perfil propio, más grave y lento. El volumen es moderado (0,85) y la megafonía no
se usa para cada evento, solo para intervenciones y avisos importantes.

### D-032 · La fase de discusión empieza a mano
Tras el reparto (`ROLES`), el anfitrión pulsa **Comenzar discusión**. Así se puede leer el
rol y probar el micro antes de que corra el temporizador. El servidor fija
`discussionEndsAt` y, al agotarse, pasa a `JUDGMENT`. La puntuación de esa fase llega en el
Hito 6.

### D-033 · Cuatro hablantes para el aviso del juez
Con 10 jugadores, avisar con 3 hablantes sería constante. Se sube el umbral a **4 humanos
simultáneos durante 2 s**, con cooldown de 15 s y mute de 3 s. Se documenta como cambio
consciente respecto al 3+ original. El juez silenciará la voz, no el chat de texto.

## Hitos 4–7

### D-034 · 24 tareas por rol, 4 por jugador y ronda
Cada rol tiene un mazo de 24 tareas (3 fáciles, 6 medias, 3 difíciles de rol + 14
universales, ajustado por el estilo presidencial). Cada ronda se reparten 4: 1 fácil, 2
medias y 1 difícil, garantizando 3 tareas de rol/estilo y 1 universal. Las tareas son
secretas, se envían solo al jugador y se recuperan al reconectar. Se excluyen las ya usadas
por ese jugador para no repetirlas entre las 3 rondas.

### D-035 · Tareas combo
Si dos humanos tienen una pareja de roles compatible (cotilla/okupa, presidente/conserje,
moroso/derramas, gatos/teletrabajador, manitas/eco, cuñado/ex-presidente, inquilino/
presidente, cotilla/gatos), se sustituye su tarea difícil por una combo compartida. Ambos
reciben el nombre del compañero y ven “Combo con …”. No se generan combos con IA porque los
IA no tienen agenda puntuable.

### D-036 · 24 sucesos y 4 por ronda
Los sucesos viven en `shared/src/communityEvents.ts`, etiquetados por roles. Cada ronda se
elige 4, priorizando los relevantes para los roles presentes y evitando repetir la misma
etiqueta principal. Se anuncian a los 0, 60, 120 y 180 segundos, quedan en el acta como
entrada de sistema y alimentan el prompt de los vecinos IA. El juicio final solo ve los
sucesos ya ocurridos.

### D-037 · El juez final devuelve tareas, no el total
El prompt del juez incluye propuesta, roles, comportamientos, tareas, avisos de orden,
sucesos y transcripción. El modelo devuelve `tasks` (cumplida + cita), cuatro notas 0–100,
una evidencia y un comentario. El servidor calcula `taskScore` con los puntos de dificultad
y el `total_pct` con los pesos de `SCORING_CONFIG`. El dinero es `total_pct * 10`. Se
reintenta una vez y, si DeepSeek falla o no hay clave, se usa un juez mock para no bloquear
la partida.

### D-038 · Sin voto de jugadores para el resultado
El ganador y el dinero los decide el juez. El flag `votes` queda como trasfondo de
propietario/no propietario y no se usa para puntuar. No hay votación de la propuesta en el
MVP; el foco está en tareas y actuación.

### D-039 · 3 rondas con cierre manual de discusión y paso de ronda
El anfitrión puede terminar la discusión antes de los 4 minutos y pasar a `JUDGMENT`. Tras
los resultados, el anfitrión pulsa **Siguiente ronda**; las tareas se renuevan sin repetir,
los sucesos cambian, se reinician avisos y el dinero se acumula. Tras la tercera ronda la
partida queda en `RESULTS_SHOP` con ganador provisional y la tienda abierta.

### D-040 · Tienda de 10 objetos y rendimientos decrecientes
10 objetos en 5 categorías, compra única por jugador. El valor del piso se calcula en
servidor agrupando por categoría y aplicando multiplicadores 1, 0,7, 0,5, 0,35, 0,25 según
el orden de compra. El precio se resta del dinero; el ganador es el mayor valor de piso, no
quien conserva más dinero. Tras la ronda 3 el ganador se recalcula con cada compra.

### D-041 · Portal 2D sin motor gráfico
La escena es React + SVG para el portal (avatares por rol, mesa presidencial con conserje,
tablón, ascensor, altavoz del juez) y HTML/CSS para el edificio de pisos y la tienda. No se
usa Phaser/Pixi: el servidor es la autoridad y no hay física. La información importante
sigue en listas y texto para accesibilidad; el color no es la única diferencia (emoji +
nombre + rol). En móvil se oculta el texto de rol del portal y la lista de vecinos manda.

### D-042 · Juez omnipresente, no personaje
El juez se representa con un altavoz de megafonía, luz roja y subtítulos; no ocupa un
asiento. El silencio forzado usa `RoomServiceClient` cuando LiveKit está configurado y,
además, el cliente silencia su track durante 3 s como fallback. Se reactivan solo los tracks
que silenció el juez, no los que el jugador ya tenía silenciados.

## Revisión de diseño: sin tienda y con IA solo texto

### D-043 · Se elimina la tienda, las monedas y el piso
La economía de monedas y la tienda de 10 objetos se descartan. La partida dura 3 rondas y
el ganador es quien acumula más puntos. Se eliminan `shared/src/shop.ts`, `ShopPanel`,
`ApartmentScene`, los campos de dinero/objetos y la acción `buy_item`. La fase final pasa a
llamarse `RESULTS`. La tienda y el piso quedan fuera del alcance de esta versión.

### D-044 · Los vecinos IA y el juez solo publican texto
No se usa TTS ni `speechSynthesis`: no hay voz de IA. Cada mensaje de IA aparece en la
transcripción y cuenta como “hablando” durante una ventana calculada (2,2 s + 22 ms por
carácter, máximo 6 s). Mientras está activa, el juez la cuenta como un participante más.
Cada IA publica como máximo **2 mensajes por ronda**, con **15 s** entre mensajes. Si un
humano empieza a hablar se invalida la generación pendiente, pero el texto ya publicado
sigue visible hasta que termina su ventana. El juez también corta el texto IA cuando pide
silencio. Esto sustituye a D-031 y D-032.

### D-045 · Puntuación directa: puntos de tareas + bonus de rol
Se abandona el porcentaje monetizable. Por ronda:
- Puntos de tareas: 1/2/3 según dificultad de cada tarea cumplida (máximo 8 por mano).
- Bonus de rol: 0-5 según la media ponderada de fidelidad, participación, creatividad y
  reacción (pesos 40/20/20/20; la participación resta 10 por aviso de orden).
- `totalPoints = taskPoints + roleBonus`.
Los puntos se acumulan durante las 3 rondas y el ganador es quien tiene más. No hay dinero,
tienda ni voto de jugadores. Esto sustituye a D-037 y D-038.

### D-046 · El solapamiento cuenta también el texto IA
El juez moderador cuenta como activos a los humanos que hablan y a las IA cuyo texto está
en su ventana de “hablando”. Con 4 activos durante 2 s interviene. Solo silencia a los
humanos; a las IA les corta el estado de habla y la generación. Así el texto IA cuenta para
el orden de la sala sin necesidad de TTS.
