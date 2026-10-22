# Pruebas del Hito 3 — Vecinos IA, texto y cola de turnos

## Configuración

```env
# DeepSeek real
LLM_PROVIDER=deepseek
DEEPSEEK_API_KEY=sk-...

# O modo de desarrollo, sin llamadas externas
LLM_PROVIDER=mock
```

Si `LLM_PROVIDER=deepseek` pero falta `DEEPSEEK_API_KEY`, el servidor arranca en modo
`mock` y lo avisa por consola.

## Automáticas

```bash
npm test
npm run typecheck
npm run build
```

Cubren:

- 14 roles y 3 estilos de presidencia.
- Composición con máximo 10 y 4 IA, y la regla conserje ⇒ presidente con 10 participantes.
- Construcción del prompt de cada vecino IA: rol, estilo, propuesta, sucesos y transcripción.
- El conserje IA recibe el nombre del presidente.
- Generador mock para los 14 roles.
- Duración del texto IA que cuenta como “hablando”.

## Manual

1. Arranca el servidor y el cliente.
2. Crea una sala y añade 4 vecinos IA.
3. Pulsa **Empezar la junta** y **Comenzar discusión**.
4. Quédate callado unos segundos:
   - Una IA publica un mensaje **en texto** en la transcripción. No hay voz.
   - Su nombre se resalta en la lista de vecinos mientras el texto cuenta como “hablando”.
   - El mensaje lleva el icono 🤖 y su rol.
5. Habla tú: se descarta la siguiente generación pendiente; el texto ya publicado sigue
   visible hasta que termina su ventana.
6. Comprueba que nunca hay dos IA publicando a la vez y que cada IA interviene como máximo
   **2 veces por ronda**, con al menos 15 s entre mensajes.
7. Si 3 humanos hablan mientras una IA publica texto, el juez puede intervenir: hay 4
   participantes activos.
8. Deja pasar 4 minutos (o pulsa **Terminar discusión ahora**): la fase cambia a `JUDGMENT`.

## Detalles

- Sin TTS: no se usa `speechSynthesis` para las IA ni para el juez. Todo es texto en el acta
  y avisos en pantalla.
- La duración “hablando” se calcula con base + ms por carácter, con un máximo de 6 s.
- El director IA hace tick cada segundo y solo escribe si:
  - la fase es `DISCUSSION`,
  - ningún humano está hablando,
  - han pasado 2,5 s desde la última intervención humana,
  - han pasado 15 s desde el último mensaje IA,
  - no hay otra IA publicando o generando,
  - el juez no está hablando,
  - quedan turnos disponibles.
- Máximo 2 intervenciones por IA y ronda.

## Limitaciones

- El modelo puede tardar; si falla, la IA simplemente no publica y se reintenta más tarde.
- Los vecinos IA no tienen tareas propias: reaccionan a la conversación y a los sucesos.
- Las respuestas son texto, no audio.
