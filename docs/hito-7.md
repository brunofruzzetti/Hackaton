# Pruebas del Hito 7 — Tienda y edificio 2D

## Tienda

10 objetos agrupados en 5 categorías:

- Asientos: sofá (600 € / 80 pts), sillón (350 € / 50 pts).
- Iluminación: lámpara (150 € / 25), neón (250 € / 40).
- Arte: cuadro (300 € / 45), póster (80 € / 15).
- Plantas: monstera (80 € / 15), cactus (40 € / 8).
- Textiles: alfombra (250 € / 35), cortinas (180 € / 25).

Cada objeto se compra una vez por jugador. El segundo objeto de la misma categoría aplica
un multiplicador de 0,7; el tercero 0,5; el cuarto 0,35. El valor del piso es la suma de
puntos de estilo efectivos. Gana el piso con más valor, no quien tenga más dinero sin gastar.

## Manual

1. Llega a la fase **Resultados y tienda**.
2. Abajo del acta verás el **Edificio Junta** con un piso por humano.
3. Compra el sofá:
   - Se descuentan 600 €.
   - Aparece 🛋️ en tu piso.
   - Sube el valor del piso a 80.
4. Compra el sillón:
   - Se descuentan 350 €.
   - Sube a 115 puntos (80 + 35), no a 130, por rendimiento decreciente.
5. Intenta comprar otro sofá: el servidor responde que ya lo tienes.
6. Si no te llega el dinero, el botón queda en **Sin dinero**.
7. Tras la ronda 3, el banner muestra el piso que va ganando. Puedes seguir comprando y el
   ganador se recalcula.

## Automáticas

- 10 objetos con ids únicos.
- Rendimientos decrecientes por categoría y orden de compra.
- Categorías distintas no se penalizan.
- Servidor: descuenta dinero, impide duplicados y actualiza el ganador.
- E2E: sofá + sillón = 115 puntos y 950 € gastados.

## Limitaciones

- No hay drag & drop: los objetos se colocan automáticamente por tipo.
- La tienda se abre en cada fase de resultados; los objetos comprados persisten.
- No hay cierre formal de la partida: la tienda queda abierta tras la ronda 3 y el ganador
  se actualiza con cada compra.
