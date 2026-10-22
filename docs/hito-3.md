# Pruebas del Hito 3 — Vecinos IA, TTS y cola de turnos

## Configuración

```env
# DeepSeek real
LLM_PROVIDER=deepseek
DEEPSEEK_API_KEY=sk-...

# O modo de desarrollo, sin llamadas externas
LLM_PROVIDER=mock
```

Si `LLM_PROVIDER=deepseek` pero falta `DEEPSEEK_API_KEY`, el servidor arranca en modo
`mock` y lo avisa por consola. El resto del juego funciona igual.

## Automáticas

```bash
npm test
npm run typecheck
npm run build
```

Cubren, además de lo anterior:

- 14 roles y 3 estilos de presidencia.
- Composición con máximo 10 y 4 IA, y la regla conserje ⇒ presidente con 10 participantes.
- Construcción del prompt de cada vecino IA: rol, estilo, propuesta y transcripción.
- El conserje IA recibe el nombre del presidente.
- Generador mock para los 14 roles.
- Perfiles de voz distintos y estimación de duración del TTS.

## Manual

1. Arranca el servidor y el cliente.
2. Crea una sala y añade 4 vecinos IA.
3. Pulsa **Empezar la junta**. Verás los roles y, si hay presidente, uno de los tres estilos
   (dictador, a su pesar o influencer).
4. Pulsa **Comenzar discusión**. La fase pasa a `DISCUSSION` con temporizador de 4:00.
5. Quédate callado unos segundos:
   - Una IA empieza a hablar.
   - Su nombre se resalta en la lista de vecinos.
   - Su intervención aparece en la transcripción con el icono 🤖.
   - Si el navegador tiene voces en español, la escucharás por TTS.
6. Habla tú (o pulsa el push-to-talk): el TTS se corta y la IA deja de estar marcada como
   hablante. El servidor descarta cualquier respuesta IA que estuviera generándose.
7. Comprueba que nunca hay dos IA hablando a la vez y que cada IA interviene como máximo
   3 veces por ronda.
8. Deja pasar 4 minutos: la fase cambia a `JUDGMENT` y termina la discusión.

## Detalles de implementación

- El director IA hace tick cada segundo.
- Solo habla si:
  - la fase es `DISCUSSION`,
  - ningún humano está hablando,
  - han pasado 2,5 s desde la última intervención humana,
  - han pasado 9 s desde la última IA,
  - no hay otra IA hablando/generando,
  - el juez no está hablando (preparado para el Hito 5),
  - quedan turnos disponibles para esa IA.
- La duración del “hablando” se estima a partir del texto (base + ms por carácter).
- Los clientes usan `speechSynthesis` con voz, pitch y rate distintos por IA. El juez tendrá
  una voz propia, más grave y lenta.
- Si un humano empieza a hablar, el servidor envía `tts_cancel` y el cliente llama a
  `speechSynthesis.cancel()`.

## Limitaciones del Hito 3

- El TTS depende de las voces instaladas en el navegador; en algunos móviles solo hay una
  voz española y las diferencias se notan sobre todo por pitch/rate.
- Todavía no hay tareas ni puntuación (Hito 4/6).
- El juez solo existe como preparación (`judge_says`); su moderación llega en el Hito 5.
- Los vecinos IA no tienen tareas propias: reaccionan a la conversación y a los sucesos.
