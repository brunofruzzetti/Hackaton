# Pruebas del Hito 1 — Salas, lobby y composición

## Automáticas

```bash
npm test
npm run typecheck
```

Cubren:

- Los 8 roles: ids únicos, 3-4 comportamientos, votos (okupa y conserje sin voto), prompts.
- `planComposition`: mínimo 3, máximo 4 IA, máximo 8, al menos 1 humano, auto-relleno de IA.
- `ensureConciergePresident`: sustitución de un rol no-conserje por presidente, caso ya válido,
  caso sin conserje y caso extremo de un solo asiento.
- `assignRoles`: 3 participantes, 8 participantes (los 8 roles), mezcla de 2 humanos + 2 IA,
  reparto aleatorio del conserje/presidente entre humanos e IA, 300-400 semillas deterministas.

## Manual (dos móviles/navegadores)

1. `npm run dev` y abre <http://localhost:5173>.
2. Pestaña A: nombre "Ana" → **Crear una junta nueva**. Apunta el código de 4 letras.
3. Pestaña B (o móvil con túnel HTTPS): nombre "Beto" → introduce el código → **Unirme**.
4. Comprueba que la lista de vecinos se actualiza en ambas pestañas al instante.
5. En A (anfitriona), pulsa **+ Añadir vecino IA** varias veces:
   - Se añaden IA con nombres españoles.
   - Se desactiva al llegar a 4 IA o a 8 participantes.
   - Solo A ve el botón de quitar IA.
6. Con 1 humano y 0 IA, la tarjeta avisa de que al empezar se añadirán 2 IA.
   El botón **Empezar la junta** está habilitado porque la composición final es válida;
   se deshabilita si la composición no cumple las reglas (sin humanos, >8, >4 IA).
7. Pulsa **Empezar la junta**: la fase pasa a **Reparto de roles** y todos ven su rol,
   su descripción, sus comportamientos y si tiene voto.
8. Con 8 participantes deben aparecer los 8 roles sin repetir. Si sale el conserje,
   siempre está también el presidente.
9. Recarga la página de A: debe volver a la misma sala, conservar su rol y seguir como
   anfitriona (reconexión por `playerId` + token en `localStorage`).
10. En una pestaña nueva, intenta entrar con la partida ya empezada: error controlado
    "La partida ya ha empezado" (los jugadores existentes sí pueden reconectar).
11. Pulsa **Salir de la sala**: vuelve a la portada y se borra la sesión local.

## Limitaciones conocidas del Hito 1

- No hay audio ni transcripción todavía (Hito 2).
- La fase se queda en `ROLES`: la discusión con temporizador llega en el Hito 4.
- No hay transferencia de anfitrión ni expulsión de humanos.
- Las salas viven en memoria: reiniciar el servidor las borra.
