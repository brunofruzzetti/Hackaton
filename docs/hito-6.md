# Pruebas del Hito 6 — Juez final y puntuación por tareas

## Qué evalúa

- Las 4 tareas privadas de cada humano (cumplida / no cumplida + evidencia).
- Fidelidad al cliché, participación, creatividad y reacción a otros.
- Avisos de orden del juez moderador.
- No hay voto de jugadores ni monedas.

El modelo devuelve notas y el estado de cada tarea; **el servidor** calcula:

```
puntos de tareas = suma de puntos (1 fácil, 2 media, 3 difícil) de las tareas cumplidas
bonus de rol     = 0-5 según la media ponderada de las notas del juez
puntos ronda     = puntos de tareas + bonus de rol
```

La participación baja 10 puntos por cada aviso de orden (mínimo 0). La puntuación se acumula
durante las 3 rondas; gana quien tenga más puntos.

## Manual

1. Juega una ronda con 2 humanos y 2 IA.
2. Habla o escribe algunas intervenciones para que el acta tenga contenido.
3. El anfitrión pulsa **Terminar discusión ahora** (o espera los 4 minutos).
4. Durante unos segundos verás **El juez está deliberando**.
5. Al terminar:
   - Tarjeta del acta por jugador con puntos y desglose.
   - Tareas con ✓/✗ y cita de evidencia.
   - “X/Y por tareas + Z por rol”.
   - Notas de cliché, participación, creatividad y reacción.
   - Comentario gracioso y cita del acta.
   - Clasificación por puntos acumulados.
6. Pulsa **Siguiente ronda**. Se reparte una agenda nueva sin repetir tareas y cambia el
   suceso.
7. Tras la tercera ronda aparece el ganador por puntos totales.

## Sin clave de DeepSeek

Si no hay `DEEPSEEK_API_KEY` o `LLM_PROVIDER=mock`, se usa un juez mock heurístico para no
bloquear la partida. Marca tareas según cuántas intervenciones tiene cada jugador y genera
notas de ejemplo. El flujo de UI, puntos y rondas es idéntico.

## Limitaciones

- El juez real tarda unos segundos y puede fallar; hay un fallback mock y un reintento.
- La evidencia se cita, pero no se valida semánticamente contra el acta; se muestra para
  que el grupo juzgue.
- No hay votación de la propuesta; el resultado es del juez.
