import { useEffect, useMemo, useState } from "react";

type Product = { id: number; name: string; price: number };
type SortKey = "new" | "price-asc" | "price-desc" | "name";
type Toast = { text: string; error?: boolean };

const API = `${import.meta.env.VITE_API_URL ?? "http://localhost:5001"}/api/products`;

const rub = new Intl.NumberFormat("ru-RU", {
  style: "currency",
  currency: "RUB",
  maximumFractionDigits: 0,
});

// Фон плитки зависит от названия, поэтому у каждого товара свой стабильный оттенок
const TONES = ["#e7e1d4", "#dde4dd", "#e8dcd6", "#dbe1e8", "#eae4cf", "#e0dce6"];

function toneOf(name: string) {
  let h = 0;
  for (const ch of name) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return TONES[h % TONES.length];
}

function initials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
}

function ProductDialog({
  product,
  onSave,
  onClose,
}: {
  product: Product | null;
  onSave: (name: string, price: number, id?: number) => void;
  onClose: () => void;
}) {
  const [name, setName] = useState(product?.name ?? "");
  const [price, setPrice] = useState(product ? String(product.price) : "");
  const valid = name.trim().length > 0 && Number(price) > 0;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="backdrop" onMouseDown={onClose}>
      <form
        className="dialog"
        onMouseDown={(e) => e.stopPropagation()}
        onSubmit={(e) => {
          e.preventDefault();
          if (valid) onSave(name.trim(), Number(price), product?.id);
        }}
      >
        <h2>{product ? "Изменить товар" : "Новый товар"}</h2>
        <label>
          Название
          <input autoFocus value={name} onChange={(e) => setName(e.target.value)} />
        </label>
        <label>
          Цена, ₽
          <input
            type="number"
            min="1"
            step="1"
            inputMode="numeric"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
          />
        </label>
        <div className="dialog-actions">
          <button type="button" className="btn ghost" onClick={onClose}>
            Отмена
          </button>
          <button type="submit" className="btn" disabled={!valid}>
            Сохранить
          </button>
        </div>
      </form>
    </div>
  );
}

export default function App() {
  const [items, setItems] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<SortKey>("new");
  const [editing, setEditing] = useState<Product | "new" | null>(null);
  const [toast, setToast] = useState<Toast | null>(null);

  const notify = (text: string, error = false) => setToast({ text, error });

  async function load() {
    try {
      const res = await fetch(API);
      if (!res.ok) throw new Error();
      setItems(await res.json());
    } catch {
      notify("Не удалось загрузить каталог. Проверьте, что сервер запущен.", true);
    } finally {
      setLoading(false);
    }
  }

  async function save(name: string, price: number, id?: number) {
    try {
      const res = await fetch(id ? `${API}/${id}` : API, {
        method: id ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, price }),
      });
      if (!res.ok) throw new Error();
      setEditing(null);
      notify(id ? "Изменения сохранены" : "Товар добавлен");
      await load();
    } catch {
      notify("Не удалось сохранить товар", true);
    }
  }

  async function remove(p: Product) {
    if (!window.confirm(`Удалить «${p.name}»?`)) return;
    try {
      const res = await fetch(`${API}/${p.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      notify("Товар удалён");
      await load();
    } catch {
      notify("Не удалось удалить товар", true);
    }
  }

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3000);
    return () => clearTimeout(t);
  }, [toast]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = items.filter((p) => p.name.toLowerCase().includes(q));
    switch (sort) {
      case "price-asc":
        return [...list].sort((a, b) => a.price - b.price);
      case "price-desc":
        return [...list].sort((a, b) => b.price - a.price);
      case "name":
        return [...list].sort((a, b) => a.name.localeCompare(b.name, "ru"));
      default:
        return [...list].sort((a, b) => b.id - a.id);
    }
  }, [items, query, sort]);

  return (
    <>
      <header className="bar">
        <div className="bar-inner">
          <a className="brand" href="/">
            ShopZenny
          </a>
          <input
            className="search"
            type="search"
            placeholder="Поиск по каталогу"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <button className="btn" onClick={() => setEditing("new")}>
            Добавить товар
          </button>
        </div>
      </header>

      <main className="page">
        <div className="head">
          <div>
            <h1>Каталог</h1>
            <p className="count">
              {loading ? "Загрузка…" : `${visible.length} из ${items.length} позиций`}
            </p>
          </div>
          <label className="sort">
            Сортировка
            <select value={sort} onChange={(e) => setSort(e.target.value as SortKey)}>
              <option value="new">Сначала новые</option>
              <option value="price-asc">Дешевле</option>
              <option value="price-desc">Дороже</option>
              <option value="name">По названию</option>
            </select>
          </label>
        </div>

        {loading ? (
          <div className="grid">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="skeleton" />
            ))}
          </div>
        ) : visible.length === 0 ? (
          <div className="empty">
            <strong>{items.length === 0 ? "Каталог пока пуст" : "Ничего не найдено"}</strong>
            {items.length === 0
              ? "Добавьте первый товар кнопкой в шапке."
              : "Попробуйте изменить запрос."}
          </div>
        ) : (
          <ul className="grid">
            {visible.map((p) => (
              <li key={p.id} className="card">
                <div className="tile" style={{ background: toneOf(p.name) }}>
                  <span className="sku">№ {String(p.id).padStart(3, "0")}</span>
                  <span className="mono">{initials(p.name)}</span>
                  <div className="actions">
                    <button onClick={() => setEditing(p)}>Изменить</button>
                    <button onClick={() => remove(p)}>Удалить</button>
                  </div>
                </div>
                <div className="info">
                  <h3>{p.name}</h3>
                  <span className="price">{rub.format(p.price)}</span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </main>

      {editing && (
        <ProductDialog
          key={editing === "new" ? "new" : editing.id}
          product={editing === "new" ? null : editing}
          onSave={save}
          onClose={() => setEditing(null)}
        />
      )}

      {toast && (
        <div className={`toast${toast.error ? " err" : ""}`} role="status">
          {toast.text}
        </div>
      )}
    </>
  );
}