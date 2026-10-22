import { SHOP_CATEGORY_LABELS, SHOP_ITEMS, type ShopCategory } from "@shared/index";

interface ShopPanelProps {
  money: number;
  purchasedItems: string[];
  onBuyItem: (itemId: string) => void;
}

const CATEGORY_ORDER: ShopCategory[] = ["seating", "lighting", "art", "plant", "textile"];

export function ShopPanel({ money, purchasedItems, onBuyItem }: ShopPanelProps) {
  const owned = new Set(purchasedItems);

  return (
    <section className="card shop-card">
      <div className="card-head">
        <h2>Tienda de la comunidad</h2>
        <span className="badge badge-money">{money} €</span>
      </div>
      <p className="hint">
        Amuebla tu piso. Cada objeto comprado suma puntos de estilo, pero el segundo objeto de
        la misma categoría da menos que el primero. Gana el piso con más valor.
      </p>

      {CATEGORY_ORDER.map((category) => {
        const items = SHOP_ITEMS.filter((item) => item.category === category);
        return (
          <div className="shop-category" key={category}>
            <p className="label">{SHOP_CATEGORY_LABELS[category]}</p>
            <div className="shop-grid">
              {items.map((item) => {
                const isOwned = owned.has(item.id);
                const canAfford = money >= item.price;
                return (
                  <article
                    key={item.id}
                    className={`shop-item ${isOwned ? "owned" : ""} ${
                      !isOwned && !canAfford ? "unaffordable" : ""
                    }`}
                  >
                    <div className="shop-item-icon" aria-hidden="true">
                      {item.emoji}
                    </div>
                    <div className="shop-item-main">
                      <strong>{item.name}</strong>
                      <p>{item.description}</p>
                      <div className="shop-item-meta">
                        <span>{item.price} €</span>
                        <span>{item.stylePoints} pts base</span>
                      </div>
                    </div>
                    <button
                      className="btn btn-small btn-secondary"
                      type="button"
                      disabled={isOwned || !canAfford}
                      onClick={() => onBuyItem(item.id)}
                    >
                      {isOwned ? "Comprado" : canAfford ? "Comprar" : "Sin dinero"}
                    </button>
                  </article>
                );
              })}
            </div>
          </div>
        );
      })}
    </section>
  );
}
