import { SHOP_ITEMS, getEffectiveRole, getShopItem, type PlayerState, type PresidentStyleId } from "@shared/index";

interface ApartmentSceneProps {
  players: PlayerState[];
  youId: string;
  winnerId: string | null;
  isGameOver: boolean;
  presidentStyleId: PresidentStyleId | null;
}

export function ApartmentScene({
  players,
  youId,
  winnerId,
  isGameOver,
  presidentStyleId,
}: ApartmentSceneProps) {
  const humans = players.filter((player) => player.kind === "human");
  const sorted = isGameOver
    ? [...humans].sort((a, b) => b.apartmentValue - a.apartmentValue || b.money - a.money)
    : humans;

  return (
    <section className="building-wrap" aria-label="Edificio de pisos de los vecinos">
      <div className="building-roof">
        <span>EDIFICIO JUNTA · 3.º B</span>
        <span>Valor del piso = puntos de estilo</span>
      </div>
      <div className="building-grid">
        {sorted.map((player) => {
          const role = player.roleId
            ? getEffectiveRole(player.roleId, presidentStyleId)
            : null;
          const items = player.purchasedItems
            .map((id) => getShopItem(id))
            .filter((item): item is NonNullable<typeof item> => item !== null);
          const isWinner = isGameOver && player.id === winnerId;
          return (
            <article
              key={player.id}
              className={`flat ${player.id === youId ? "own" : ""} ${isWinner ? "winner" : ""}`}
            >
              <header className="flat-head">
                <div>
                  <strong>{player.name}</strong>
                  <p className="label">{role?.name ?? "Vecino"}</p>
                </div>
                <span className="flat-value">{player.apartmentValue} pts</span>
              </header>
              <div className="flat-room">
                {items.length === 0 ? (
                  <span className="flat-empty">Piso vacío · compra algo en la tienda</span>
                ) : (
                  items.map((item) => (
                    <span
                      key={item.id}
                      className={`flat-item flat-${item.slot}`}
                      title={`${item.name} · ${item.stylePoints} pts`}
                    >
                      {item.emoji}
                    </span>
                  ))
                )}
              </div>
              <footer className="flat-foot">
                <span>{player.money} € restantes</span>
                {isWinner && <span className="badge badge-vote">Piso ganador</span>}
              </footer>
            </article>
          );
        })}
      </div>
      <p className="building-caption">
        {SHOP_ITEMS.length} objetos disponibles · los objetos de la misma categoría dan menos
        puntos a partir del segundo.
      </p>
    </section>
  );
}
