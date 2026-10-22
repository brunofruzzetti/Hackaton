# Pruebas del Hito 6 — Juez final, puntuación y dinero

## Qué evalúa

- Las 4 tareas privadas de cada humano (cumplida / no cumplida + evidencia).
- Fidelidad al cliché, participación, creatividad y reacción a otros.
- Avisos de orden del juez moderador.
- No hay voto de jugadores para decidir el resultado.

El modelo devuelve notas y tareas; **el servidor** calcula:

```
total_pct = 50% tareas + 20% fidelidad + 15% participación
          + 10% creatividad + 5% reacción
dinero = round(total_pct * 10)
```

La participación baja 10 puntos por cada aviso de orden (mínimo 0).

## Manual

1. Juega una ronda con 2 humanos y 2 IA.
2. Habla o escribe algunas intervenciones para que el acta tenga contenido.
3. El anfitrión pulsa **Terminar discusión ahora** (o espera los 4 minutos).
4. Durante unos segundos verás **El juez está deliberando**.
5. Al terminar:
   - Tarjeta del acta por jugador con % y dinero.
   - Tareas con ✓/✗ y cita de evidencia.
   - Notas de cliché, participación, creatividad y reacción.
   - Comentario gracioso y cita del acta.
   - Ranking por dinero/valor del piso.
6. El juez lee un resumen breve por TTS; el resto queda en pantalla.
7. Pulsa **Siguiente ronda**. Se reparte una agenda nueva sin repetir tareas y cambia el
   suceso.
8. Tras la tercera ronda aparece el ganador provisional por valor del piso. La tienda sigue
   abierta y el ganador puede cambiar al amueblar.

## Sin clave de DeepSeek

Si no hay `DEEPSEEK_API_KEY` o `LLM_PROVIDER=mock`, se usa un juez mock heurístico para no
bloquear la partida. Marca tareas según cuántas intervenciones tiene cada jugador y genera
notas de ejemplo. El flujo de UI, dinero y rondas es idéntico.

## Limitaciones

- El juez real tarda unos segundos y puede fallar; hay un fallback mock y un reintento.
- La evidencia se cita, pero no se valida semánticamente contra el acta; se muestra para
  que el grupo juzgue.
- No hay votación de la propuesta; el resultado es del juez.
