# Pruebas del Hito 5 — Juez moderador

## Regla

- 4 o más humanos hablando a la vez durante 2 segundos.
- Cooldown de 15 segundos.
- Aviso por TTS con voz grave de megafonía.
- Silencio de 3 segundos a los hablantes (LiveKit + cliente).
- Cada hablante recibe un aviso de orden; se resta de participación en el juicio final.

## Manual (necesitas 4 personas, o 4 pestañas con micrófono)

1. Entra con 4-5 humanos y empieza la discusión.
2. Que 4 personas hablen a la vez durante más de 2 segundos.
3. El altavoz del portal se ilumina y suena una frase como:
   - “¡Orden en la sala, que esto es una junta y no un mercado!”
   - “¡Menos gritar y más firmar el acta, por favor!”
4. Los 4 hablantes ven **El juez te ha silenciado durante 3 segundos** y el
   push-to-talk queda bloqueado.
5. A los 3 segundos se levanta el silencio y se puede volver a hablar.
6. En la lista de vecinos aparecen los avisos acumulados.
7. El aviso queda en la transcripción como entrada del **Juez**.
8. Repite el solapamiento inmediatamente: no debe haber un segundo aviso hasta que pasen
   15 segundos.

## LiveKit

Si `JUDGE_FORCE_MUTE=true` y LiveKit está configurado, el servidor usa
`RoomServiceClient.mutePublishedTrack` para silenciar los tracks de los hablantes. Si no
hay LiveKit, el cliente aplica el silencio local durante 3 segundos y la partida sigue.

## Limitaciones

- Si un jugador se silencia a mano justo durante la intervención del juez, la reactivación
  puede dejarle el micro activo al terminar; es una de las aristas del MVP.
- El umbral es 4, no 3, para que con 10 jugadores el juez no intervenga constantemente.
