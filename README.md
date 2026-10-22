# Junta de Vecinos

Juego web multijugador por voz para hackathon. Cada jugador encarna un rol cliché de una
comunidad de propietarios, discute una propuesta (por ejemplo, instalar un ascensor), y un
juez IA puntúa lo bien que ha interpretado su papel. El porcentaje se convierte en dinero
para amueblar el piso; tras 3 rondas gana el piso de mayor valor.

## Estado actual

| Hito | Contenido | Estado |
| --- | --- | --- |
| 0 | Monorepo, scripts dev, docs, env | ✅ |
| 1 | Salas, lobby WS, roles y composición validada | ✅ |
| 2 | LiveKit, push-to-talk, STT, transcripción compartida | ✅ |
| 3 | Vecinos IA + TTS + cola de turnos | ✅ |
| 4 | Tareas por ronda, sucesos, temporizador y portal 2D | ✅ |
| 5 | Juez moderador en directo | ✅ |
| 6 | Juez de final de ronda, tareas y dinero | ✅ |
| 7 | Tienda, rendimientos decrecientes y edificio 2D | ✅ |
| 8 | Acciones de rol, sonidos, estadísticas, espectador y pulido | ⏳ |

## Requisitos

- Node.js 20 o superior (probado con 24).
- npm 10+.
- Micrófono y **HTTPS** (o `localhost`) para usar `getUserMedia`. Ver túneles más abajo.
- Opcional: claves de LiveKit Cloud / LiveKit local, DeepSeek, OpenAI o Deepgram.

## Instalación

```bash
npm install
cp .env.example .env   # en Windows: Copy-Item .env.example .env
```

Rellena `.env` con lo que tengas. La app arranca aunque falten claves:

- Sin LiveKit: el audio no se conecta y se avisa en pantalla; el resto sigue funcionando.
- Sin STT: usa `STT_PROVIDER=mock` para probar el flujo de transcripción sin gastar API.
- Sin DeepSeek: se usa `LLM_PROVIDER=mock` para vecinos IA y juez; el flujo completo sigue
  funcionando con contenido simulado.

## Arrancar en desarrollo

```bash
npm run dev
```

- Cliente: <http://localhost:5173>
- Servidor: <http://localhost:3001> (`/api/health`)
- Vite hace proxy de `/api` y `/ws` al servidor, así que en el móvil solo hay que exponer
  el puerto 5173.

Comandos útiles:

```bash
npm test          # tests unitarios (Vitest)
npm run typecheck # TypeScript estricto en server y client
npm run build     # build de producción
```

## LiveKit

### LiveKit Cloud

1. Crea un proyecto en <https://cloud.livekit.io>.
2. Copia `LIVEKIT_URL` (`wss://...livekit.cloud`), `LIVEKIT_API_KEY` y `LIVEKIT_API_SECRET` al `.env`.

### LiveKit local (modo dev)

```bash
docker run --rm -p 7880:7880 -p 7881:7881 -p 7882:7882/udp \
  -e LIVEKIT_KEYS="devkey: secret" livekit/livekit-server --dev
```

Sin Docker (Windows/macOS/Linux) puedes usar el binario oficial: descarga el release de
<https://github.com/livekit/livekit/releases> y ejecuta `livekit-server --dev`. En
`docs/hito-2.md` hay un ejemplo completo para PowerShell.

```env
LIVEKIT_URL=ws://localhost:7880
LIVEKIT_API_KEY=devkey
LIVEKIT_API_SECRET=secret
```

En móvil, `localhost` no apunta a tu PC: usa la IP de tu red o un túnel. Para WebRTC por
túnel necesitas además exponer los puertos UDP/TCP de LiveKit; lo más simple en el
hackathon es usar LiveKit Cloud.

## Audio y transcripción

- Al entrar en una sala, el cliente pide un token a `POST /api/livekit/token` y se conecta
  al room `junta-CODIGO` con micrófono publicado.
- **Silenciar micrófono** corta la publicación del micro (y deshabilita el push-to-talk).
- El indicador de hablantes usa `ActiveSpeakersChanged` de LiveKit; el cliente informa al
  servidor por WebSocket y la lista de vecinos se resalta en tiempo real.
- **Push-to-talk**: mantén pulsado el botón, habla y suelta. El clip se sube a
  `POST /api/stt` y el servidor lo transcribe con `STT_PROVIDER`:
  - `openai` → Whisper (`whisper-1`, español).
  - `deepgram` → Nova (`nova-3`, español).
  - `mock` → texto simulado para desarrollo, sin claves.
- La transcripción se difunde por WebSocket y se muestra como `[jugador | rol] texto`.
- El chat de texto comparte la misma lista y sirve de respaldo si falla el micro.
- Si LiveKit o el STT no están configurados, la partida no se cae: se muestra un aviso y
  se puede seguir con el chat.

Configuración de STT en `.env`:

```env
STT_PROVIDER=openai        # openai | deepgram | mock
OPENAI_API_KEY=sk-...
DEEPGRAM_API_KEY=...
```

## Vecinos IA

- Hasta **4 vecinos IA** por partida, con nombre y rol propios.
- Usan DeepSeek (`deepseek-chat`, `https://api.deepseek.com`) y hablan por turnos.
- Solo toman la palabra si ningún humano está hablando, han pasado ~2,5 s desde la última
  intervención humana, no hay otra IA hablando y no ha hablado el juez.
- Cada IA interviene como máximo **3 veces por ronda**.
- El servidor emite `neighbor_says`; el cliente lo reproduce con `speechSynthesis`, con una
  voz/pitch/rate distinto por rol.
- Si un humano empieza a hablar, se cancela el TTS y se descarta la respuesta IA pendiente.
- Sin `DEEPSEEK_API_KEY` se puede usar `LLM_PROVIDER=mock` para probar el flujo completo.

```env
LLM_PROVIDER=deepseek      # deepseek | mock
DEEPSEEK_API_KEY=sk-...
```

## Roles y presidencia

La bolsa tiene **14 roles** y cada partida sortea 10 (máximo 10 jugadores). Los roles no se
repiten. La presidencia tiene **3 estilos aleatorios**: dictador, a su pesar e influencer.
Si aparece el conserje, el presidente siempre está en la partida y el conserje IA conoce su
nombre.

## Tareas, sucesos y juicio

- Cada humano recibe **4 tareas secretas por ronda**: 3 de su rol/estilo y 1 universal.
  Cada rol tiene un mazo de **24 tareas**; no se repiten entre rondas.
- Las tareas pueden ser **combo**: si dos roles compatibles están en la partida, ambos
  reciben una misión compartida y ven el nombre de su compañero.
- Cada ronda lanza **4 sucesos de la comunidad** (de un total de 24), elegidos entre los
  que afectan a los roles presentes.
- El juez final evalúa tareas + cliché + participación + creatividad + reacción. El servidor
  calcula el total (50% tareas) y el dinero (`total_pct * 10`).
- El juez moderador avisa y silencia 3 s si **4 humanos** hablan a la vez durante 2 s, con
  cooldown de 15 s.
- No hay voto de jugadores para decidir el ganador. El flag `votes` queda como trasfondo
  de propietario/no propietario.

## Tienda y piso 2D

- 10 objetos en 5 categorías, con precio y puntos de estilo.
- Rendimientos decrecientes: el segundo objeto de la misma categoría da menos puntos.
- El dinero de cada ronda se gasta en la tienda al ver los resultados.
- El **Edificio Junta** muestra un piso por humano con los objetos comprados y su valor.
- Tras 3 rondas gana el piso con más puntos de estilo. El portal 2D muestra a los vecinos
  sentados por rol, el tablón de sucesos y el altavoz del juez.

## HTTPS en desarrollo (obligatorio para el micrófono)

En `localhost` el navegador permite el micrófono. Desde el móvil necesitas HTTPS:

### Cloudflare Tunnel

```bash
cloudflared tunnel --url http://localhost:5173
```

Copia la URL `https://...trycloudflare.com` que imprime y ábrela en el móvil.
El WebSocket viaja por el mismo túnel gracias al proxy de Vite.

### ngrok

```bash
ngrok http 5173
```

Abre la URL `https://...ngrok-free.app` en el móvil.

> Si usas LiveKit Cloud, añade el dominio del túnel a los orígenes permitidos del proyecto
> si tu configuración lo requiere. El token se genera en el servidor, nunca en el cliente.

## Estructura

```
/shared   Tipos, eventos, roles, configuración y reglas puras (tests incluidos)
/server   Fastify + ws, estado en memoria, LiveKit, STT, LLM
/client   React + Vite, mobile-first, sin librería de UI
```

## Cómo se juega (MVP)

1. Un jugador crea sala y comparte el código de 4 letras.
2. El resto entra con código + nombre (sin registro).
3. El anfitrión añade vecinos IA (máx. 4) hasta cumplir el mínimo de 3 participantes.
4. Al empezar se reparten roles aleatorios sin repetir, aplicando la regla
   **conserje ⇒ presidente**.
5. El anfitrión pulsa **Comenzar discusión**: 4 minutos por ronda. Hablas por LiveKit,
   mantienes pulsado el push-to-talk para dejar un clip transcrito y los vecinos IA
   intervienen cuando hay silencio. El chat de texto es el plan B.
6. Cada jugador recibe 4 tareas secretas y la comunidad lanza 4 sucesos durante la ronda.
7. Al acabar, el juez puntúa las tareas y las intervenciones; cada % se convierte en dinero.
8. En **Resultados y tienda** amueblas tu piso con 10 objetos; los de la misma categoría
   rinden menos.
9. Tras 3 rondas, gana el piso con más puntos de estilo.

## Endpoints

| Método | Ruta | Uso |
| --- | --- | --- |
| GET | `/api/health` | Estado del servidor |
| GET | `/api/config` | Configuración pública (LiveKit, límites) |
| POST | `/api/livekit/token` | Token JWT de audio para una sesión |
| POST | `/api/stt` | Subida binaria de un clip y transcripción |
| WS | `/ws` | Eventos de sala, lobby, chat y transcripción |
| GET | `/api/debug/room/:code` | Estado público de una sala (solo depuración) |

## Documentación

- `AGENTS.md`: reglas y convenciones para futuras sesiones.
- `DECISIONS.md`: decisiones tomadas ante ambigüedades.
- `docs/hito-1.md`: pruebas de salas, lobby y composición.
- `docs/hito-2.md`: pruebas de LiveKit, PTT y transcripción.
- `docs/hito-3.md`: pruebas de vecinos IA, TTS y turnos.
- `docs/hito-4.md`: tareas, sucesos y portal 2D.
- `docs/hito-5.md`: juez moderador y silencio forzado.
- `docs/hito-6.md`: juez final, puntuación y dinero.
- `docs/hito-7.md`: tienda, rendimientos decrecientes y edificio 2D.
