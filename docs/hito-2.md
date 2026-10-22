# Pruebas del Hito 2 — Audio LiveKit, push-to-talk y transcripción

## Requisitos

- LiveKit configurado (Cloud o local). Sin LiveKit la app sigue funcionando con chat.
- STT configurado. Para probar sin gastar API: `STT_PROVIDER=mock`.
- Micrófono y HTTPS (o `localhost`).

## Automáticas

```bash
npm test
npm run typecheck
npm run build
```

Cubren:

- `SttProvider` mock, reintento único ante fallo transitorio y no-reintento de errores de
  configuración.
- Generación de JWT de LiveKit: identidad, nombre, metadata con rol, room `junta-CODIGO`
  y grants de publicación/suscripción.
- Tests del Hito 1 (roles, composición y regla conserje ⇒ presidente).

## LiveKit local en Windows (sin Docker)

```powershell
# Descargar el binario oficial (una vez)
$dir = "$env:LOCALAPPDATA\livekit-local"
New-Item -ItemType Directory -Force -Path $dir | Out-Null
Invoke-WebRequest -Uri "https://github.com/livekit/livekit/releases/download/v1.13.10/livekit_1.13.10_windows_amd64.zip" -OutFile "$env:TEMP\livekit.zip"
Expand-Archive "$env:TEMP\livekit.zip" -DestinationPath $dir -Force

# Arrancar en modo dev (keys devkey/secret)
& "$dir\livekit-server.exe" --dev --bind 127.0.0.1
```

En otra terminal:

```powershell
$env:LIVEKIT_URL="ws://localhost:7880"
$env:LIVEKIT_API_KEY="devkey"
$env:LIVEKIT_API_SECRET="secret"
$env:STT_PROVIDER="mock"
npm run dev
```

También vale Docker:

```bash
docker run --rm -p 7880:7880 -p 7881:7881 -p 7882:7882/udp \
  -e LIVEKIT_KEYS="devkey: secret" livekit/livekit-server --dev
```

## Humo de servidor (sin navegador)

Con el servidor arrancado, crear una sala por WebSocket, pedir el token en
`POST /api/livekit/token` y subir un clip de prueba a `POST /api/stt` con las cabeceras:

```
Content-Type: application/octet-stream
x-room-code: ABCD
x-player-id: <uuid>
x-session-token: <token del mensaje joined>
x-audio-mime: audio/webm;codecs=opus
```

Respuestas esperadas:

- Token: `{ url, token, roomName: "junta-ABCD" }`.
- STT mock: `{ text, provider: "mock", entry }` y evento `transcript_append` en la sala.
- Token inválido: 401. Clip vacío: 400. MIME no permitido: 415.

## Manual (dos dispositivos, el flujo importante)

1. Abre la app en el móvil con túnel HTTPS y en el portátil en `localhost`.
2. Crea una sala en el portátil (Ana) y entra desde el móvil (Beto) con el código.
3. Acepta el permiso de micrófono en ambos. La tarjeta **Audio de la sala** debe pasar a
   **Audio conectado**.
4. Comprueba que se oyen entre sí. El botón **Silenciar micrófono** corta el audio del que
   lo pulsa; el otro deja de oírle.
5. Habla por turnos: el nombre del hablante se resalta en la lista de vecinos con la
   etiqueta **Hablando**, y aparece en la línea "Hablando: …".
6. Push-to-talk: mantén pulsado **Mantén pulsado para hablar**, di una frase y suelta.
   - La transcripción aparece en ambos dispositivos como `[Ana | Vecino] texto`.
   - Con `STT_PROVIDER=mock` el texto será simulado; con Whisper/Deepgram será real.
   - El clip se corta solo a los 30 s. Los toques de menos de 0,4 s se ignoran.
7. Silencia el micro y comprueba que el push-to-talk queda deshabilitado con el aviso
   "Tienes el micrófono silenciado".
8. Chat de respaldo: escribe un mensaje; aparece en la transcripción compartida de todos
   con el icono 💬 y el rol correspondiente.
9. Empieza la partida: el audio y la transcripción siguen disponibles en la fase de roles.
10. Reconexión: recarga el móvil; debe volver a la sala, reconectar el audio y conservar
    el rol. Si el STT falla, se muestra el error y se reintenta una vez de forma automática.

## Comprobaciones de error

- Sin claves de LiveKit: la tarjeta muestra "Audio no configurado" y el chat sigue activo.
- Permiso de micrófono denegado: se muestra el aviso, la sala de audio sigue conectada para
  oír a los demás y el push-to-talk queda deshabilitado.
- Sin clave de OpenAI/Deepgram con el proveedor correspondiente: el servidor responde 503
  "La transcripción no está configurada" y la partida no se cae.
- Proveedor caído o red lenta: 502, un reintento automático y mensaje en pantalla.

## Limitaciones conocidas del Hito 2

- Los vecinos IA todavía no hablan (Hito 3) ni hay TTS.
- La fase sigue siendo `ROLES`: no hay temporizador de discusión ni juicio.
- La transcripción vive en memoria y se pierde al reiniciar el servidor.
- El push-to-talk graba con el mismo track de LiveKit; si LiveKit no está configurado no
  hay captura de voz (solo chat).
- Los clips no se almacenan: solo se guarda el texto transcrito.
