import { useEffect, useState } from "react";

type Product = { id: number; name: string; price: number };

const API = "http://localhost:5001/api/products";

export default function App() {
  const [products, setProducts] = useState<Product[]>([]);
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");

  async function load() {
    const res = await fetch(API);
    setProducts(await res.json());
  }

  async function add() {
    await fetch(API, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, price: Number(price) }),
    });
    setName("");
    setPrice("");
    load();
  }

  async function remove(id: number) {
    await fetch(`${API}/${id}`, { method: "DELETE" });
    load();
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <div style={{ maxWidth: 480, margin: "40px auto", fontFamily: "sans-serif" }}>
      <h1>Товары</h1>

      <input placeholder="Название" value={name} onChange={(e) => setName(e.target.value)} />
      <input placeholder="Цена" value={price} onChange={(e) => setPrice(e.target.value)} />
      <button onClick={add}>Добавить</button>

      <ul>
        {products.map((p) => (
          <li key={p.id}>
            {p.name}: {p.price} руб.{" "}
            <button onClick={() => remove(p.id)}>Удалить</button>
          </li>
        ))}
      </ul>
    </div>
  );
}