# Pruebas del Hito 5 — Juez moderador

## Regla

- 4 participantes activos a la vez durante 2 segundos. Cuentan los humanos que hablan y las
  IA que están publicando texto.
- Cooldown de 15 segundos.
- Aviso en pantalla (megafonía) y silencio de 3 segundos a los humanos que estaban hablando.
- Cada humano recibe un aviso de orden; se resta de participación en el juicio final.
- El texto de una IA que estaba publicándose también se corta.

## Manual (necesitas 4 personas, o 3 personas + 1 IA publicando texto)

1. Entra con 4-5 humanos y empieza la discusión.
2. Espera a que una IA publique un mensaje de texto.
3. Mientras el mensaje de la IA sigue visible, que 3 personas hablen a la vez durante más de
   2 segundos: hay 4 participantes activos.
4. El altavoz del portal se ilumina y aparece una frase como:
   - “¡Orden en la sala, que esto es una junta y no un mercado!”
   - “¡Menos gritar y más firmar el acta, por favor!”
5. Los humanos que hablaban ven **El juez te ha silenciado durante 3 segundos** y el
   push-to-talk queda bloqueado.
6. A los 3 segundos se levanta el silencio y se puede volver a hablar.
7. En la lista de vecinos aparecen los avisos acumulados.
8. El aviso queda en la transcripción como entrada del **Juez**.
9. Repite el solapamiento inmediatamente: no debe haber un segundo aviso hasta que pasen
   15 segundos.

## LiveKit

Si `JUDGE_FORCE_MUTE=true` y LiveKit está configurado, el servidor usa
`RoomServiceClient.mutePublishedTrack` para silenciar los tracks de los humanos. Si no hay
LiveKit, el cliente aplica el silencio local durante 3 segundos.

## Limitaciones

- El texto ya publicado de una IA permanece en la transcripción; solo se corta su estado
  de “hablando”.
- Si un jugador se silencia a mano justo durante la intervención del juez, la reactivación
  puede dejarle el micro activo al terminar.
- El umbral es 4 participantes activos, no 3.
