import { useState, useEffect, type FormEvent } from 'react';
import './App.css';

// ===== ТИПЫ =====
interface Product {
  id: number;
  name: string;
  price: number;
}

interface ProductDto {
  name: string;
  price: number;
}

interface ToastData {
  message: string;
  type: 'success' | 'error';
}

const API_URL = 'http://localhost:5001/api/products';

// ===== КОМПОНЕНТ: HEADER =====
function Header({ onAddClick }: { onAddClick: () => void }) {
  return (
    <header className="header">
      <div className="header-content">
        <div className="logo">
          <span className="logo-icon">🛍️</span>
          <h1>ShopZenny</h1>
        </div>
        <button className="btn-add" onClick={onAddClick}>
          <span className="btn-icon">+</span>
          Добавить товар
        </button>
      </div>
    </header>
  );
}

// ===== КОМПОНЕНТ: PRODUCT CARD =====
const EMOJI_MAP: Record<string, string> = {
  mac: '💻', galaxy: '📱', пылесос: '🤖', xiaomi: '🤖', iphone: '📱', samsung: '📱'
};

function getEmoji(name: string): string {
  const lower = name.toLowerCase();
  for (const key of Object.keys(EMOJI_MAP)) {
    if (lower.includes(key)) return EMOJI_MAP[key];
  }
  return '📦';
}

const COLORS = ['#667eea', '#f093fb', '#4facfe', '#43e97b', '#fa709a', '#fee140'];

function ProductCard({ product, onDelete }: { product: Product; onDelete: (id: number, name: string) => void }) {
  const color = COLORS[product.id % COLORS.length];

  return (
    <div className="card" style={{ '--accent': color } as React.CSSProperties}>
      <div className="card-image">
        <span className="card-emoji">{getEmoji(product.name)}</span>
      </div>
      <div className="card-body">
        <h3 className="card-title">{product.name}</h3>
        <p className="card-price">{product.price.toLocaleString('ru-RU')} ₽</p>
        <button className="btn-delete" onClick={() => onDelete(product.id, product.name)}>
          🗑 Удалить
        </button>
      </div>
    </div>
  );
}

// ===== КОМПОНЕНТ: PRODUCT LIST =====
function ProductList({ products, onDelete }: { products: Product[]; onDelete: (id: number, name: string) => void }) {
  return (
    <div className="product-grid">
      {products.map((product, i) => (
        <div key={product.id} className="fade-in" style={{ animationDelay: `${i * 80}ms` }}>
          <ProductCard product={product} onDelete={onDelete} />
        </div>
      ))}
    </div>
  );
}

// ===== КОМПОНЕНТ: PRODUCT FORM (MODAL) =====
function ProductForm({ onSubmit, onClose }: { onSubmit: (product: ProductDto) => void; onClose: () => void }) {
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !price) return;
    onSubmit({ name: name.trim(), price: Number(price) });
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}>✕</button>
        <h2>Новый товар</h2>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Название</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Например: iPhone 15"
              autoFocus
            />
          </div>
          <div className="form-group">
            <label>Цена (₽)</label>
            <input
              type="number"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder="0"
              min="0"
            />
          </div>
          <button type="submit" className="btn-submit" disabled={!name.trim() || !price}>
            Добавить
          </button>
        </form>
      </div>
    </div>
  );
}

// ===== КОМПОНЕНТ: TOAST =====
function Toast({ message, type }: ToastData) {
  return (
    <div className={`toast toast-${type}`}>
      <span className="toast-icon">{type === 'success' ? '✅' : '❌'}</span>
      {message}
    </div>
  );
}

// ===== ГЛАВНЫЙ КОМПОНЕНТ: APP =====
function App() {
  const [products, setProducts] = useState<Product[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [toast, setToast] = useState<ToastData | null>(null);
  const [loading, setLoading] = useState(true);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const fetchProducts = async () => {
    try {
      const res = await fetch(API_URL);
      const data: Product[] = await res.json();
      setProducts(data);
    } catch {
      showToast('Ошибка загрузки товаров', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  const addProduct = async (product: ProductDto) => {
    try {
      const res = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(product),
      });
      if (res.ok) {
        await fetchProducts();
        showToast(`Товар "${product.name}" добавлен!`);
        setShowForm(false);
      }
    } catch {
      showToast('Ошибка добавления', 'error');
    }
  };

  const deleteProduct = async (id: number, name: string) => {
    try {
      const res = await fetch(`${API_URL}/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setProducts((prev) => prev.filter((p) => p.id !== id));
        showToast(`Товар "${name}" удалён`);
      }
    } catch {
      showToast('Ошибка удаления', 'error');
    }
  };

  return (
    <div className="app">
      <Header onAddClick={() => setShowForm(true)} />

      <main className="main">
        {loading ? (
          <div className="loader">
            <div className="spinner"></div>
            <p>Загрузка товаров...</p>
          </div>
        ) : products.length === 0 ? (
          <div className="empty">
            <div className="empty-icon">🛒</div>
            <h2>Товаров пока нет</h2>
            <p>Нажмите «Добавить товар», чтобы создать первый</p>
          </div>
        ) : (
          <ProductList products={products} onDelete={deleteProduct} />
        )}
      </main>

      {showForm && <ProductForm onSubmit={addProduct} onClose={() => setShowForm(false)} />}
      {toast && <Toast message={toast.message} type={toast.type} />}
    </div>
  );
}

export default App;