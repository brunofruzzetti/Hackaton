# Pruebas del Hito 4 — Tareas, sucesos y portal 2D

## Automáticas

```bash
npm test
npm run typecheck
npm run build
```

Cubren:

- 24 tareas por cada uno de los 14 roles, con ids únicos.
- Reparto de 4 tareas por jugador: 1 fácil, 2 medias, 1 difícil.
- 3 tareas de rol/estilo + 1 universal por mano.
- No repetición de tareas entre rondas (exclusión de usadas).
- Tareas combo: se asignan a los dos participantes y ambos ven el nombre del compañero.
- 24 sucesos comunitarios con roles y etiquetas; selección de 4 relevantes por ronda.

## Manual

1. Crea una sala con 2 humanos y 2-4 IA.
2. Pulsa **Empezar la junta** y después **Comenzar discusión**.
3. Cada humano recibe una tarjeta **Tu agenda secreta** con 4 tareas:
   - Solo la ve él.
   - La dificultad y los puntos aparecen en la tarjeta.
   - Si hay una pareja de roles compatible, verá una tarea **Combo con …**.
4. Pasados unos segundos aparece el primer **suceso de la comunidad**:
   - Banner con título y descripción.
   - Entrada de sistema `📢` en la transcripción.
   - El tablón del portal 2D cambia.
5. El temporizador de la ronda dura 4 minutos. El anfitrión puede acortar con
   **Terminar discusión ahora**.
6. La escena 2D muestra a cada jugador en su puesto por rol: presidente y conserje en la
   mesa, gatos junto a las macetas, manitas junto a la caja de herramientas, etc.
7. Recarga la página durante la discusión: la agenda privada vuelve a aparecer.

## Limitaciones

- Las tareas combo solo se generan si coinciden roles compatibles entre humanos.
- Los sucesos se seleccionan entre los 24 existentes; añadir más es ampliar
  `shared/src/communityEvents.ts`.
- El portal se ve completo en escritorio; en móvil el texto de rol se oculta y la lista de
  vecinos es la fuente principal de nombres.
