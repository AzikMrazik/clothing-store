import { useState, useEffect } from 'react';
import { ProductService } from '../services/ProductService';

export const ProductList = () => {
  const [products, setProducts] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    const loadProducts = async () => {
      try {
        setError(null);
        const data = await ProductService.fetchProducts();
        setProducts(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load products');
      } finally {
        setIsLoading(false);
      }
    };

    if (isOnline) {
      loadProducts();
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [isOnline]);

  if (!isOnline) {
    return <div>You are offline. Please check your internet connection.</div>;
  }

  if (isLoading) {
    return <div>Loading products...</div>;
  }

  if (error) {
    return (
      <div>
        <p>{error}</p>
        <button onClick={() => window.location.reload()}>Retry</button>
      </div>
    );
  }

  return (
    <div className="product-list">
      <h2>Наши товары</h2>
      {products.length === 0 ? (
        <p>No products available right now.</p>
      ) : (
        <div className="product-grid">
          {products.map((product) => (
            <div key={product.id} className="product-card">
              {product.imageUrl && (
                <img src={product.imageUrl} alt={product.name} className="product-image" />
              )}
              <h3>{product.name}</h3>
              <p className="product-price">{product.price} ₽</p>
              <p className="product-description">{product.description}</p>
              <button className="add-to-cart-btn">Добавить в корзину</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
