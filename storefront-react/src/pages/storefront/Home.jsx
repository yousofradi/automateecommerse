import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api, { formatPrice } from '../../api/client';
import { useSettings } from '../../context/SettingsContext';
import { useCart } from '../../context/CartContext';
import '../../styles/store.css';

export default function Home() {
  const [collections, setCollections] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const { settings } = useSettings();
  const { cartCount } = useCart();

  useEffect(() => {
    Promise.all([
      api.getCollections(),
      api.getProducts(1, 20, false)
    ]).then(([cols, prods]) => {
      setCollections(cols || []);
      setProducts(prods.products || prods || []);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const storeName = settings?.storeName || 'المتجر';

  return (
    <div className="store-page" dir="rtl">
      <header className="store-header">
        <div className="header-content">
          <Link to="/" className="store-logo">
            {settings?.storeLogo && <img src={settings.storeLogo} alt={storeName} className="store-logo-img" />}
            <span className="store-name-text">{storeName}</span>
          </Link>
          <div className="header-actions">
            <Link to="/cart" className="cart-icon-link">
              🛒 <span className="cart-badge">{cartCount}</span>
            </Link>
          </div>
        </div>
      </header>

      <main className="store-main">
        {/* Hero Section */}
        <section className="hero-section">
          <h1>مرحباً بك في {storeName}</h1>
          <p>اكتشف أحدث المنتجات والعروض</p>
          <Link to="/products" className="btn-primary">تسوق الآن</Link>
        </section>

        {/* Collections */}
        {collections.length > 0 && (
          <section className="section">
            <h2 className="section-title">التصنيفات</h2>
            <div className="collections-grid">
              {collections.map(col => (
                <Link to={`/collection?id=${col._id || col.id}`} key={col._id || col.id} className="collection-card">
                  {col.imageUrl && <img src={col.imageUrl} alt={col.name} />}
                  <h3>{col.name}</h3>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* Latest Products */}
        <section className="section">
          <h2 className="section-title">أحدث المنتجات</h2>
          {loading ? (
            <div className="loading-grid">
              {[...Array(4)].map((_, i) => <div key={i} className="skeleton-card" />)}
            </div>
          ) : (
            <div className="products-grid">
              {products.map(p => (
                <Link to={p.handle ? `/product/${p.handle}` : `/product/${p._id || p.id}`} key={p._id || p.id} className="product-card">
                  <div className="product-image-wrap">
                    <img src={p.imageUrl || p.image_url} alt={p.name} loading="lazy" />
                    {p.salePrice && <span className="sale-badge">خصم</span>}
                  </div>
                  <div className="product-info">
                    <h3>{p.name}</h3>
                    <div className="product-price">
                      {p.salePrice ? (
                        <>
                          <span className="sale-price">{formatPrice(p.salePrice)}</span>
                          <span className="original-price">{formatPrice(p.basePrice)}</span>
                        </>
                      ) : (
                        <span>{formatPrice(p.basePrice)}</span>
                      )}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>
      </main>

      <footer className="store-footer">
        <p>© {new Date().getFullYear()} {storeName}. جميع الحقوق محفوظة.</p>
      </footer>
    </div>
  );
}
