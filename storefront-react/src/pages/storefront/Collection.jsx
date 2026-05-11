import { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import api, { formatPrice } from '../../api/client';
import '../../styles/store.css';

export default function Collection() {
  const [searchParams] = useSearchParams();
  const collectionId = searchParams.get('id');
  const [collection, setCollection] = useState(null);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!collectionId) return;
    Promise.all([
      api.getCollection(collectionId),
      api.getProducts(1, 100, false, collectionId)
    ]).then(([col, prods]) => {
      setCollection(col);
      setProducts(prods.products || prods || []);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [collectionId]);

  return (
    <div className="store-page" dir="rtl">
      <header className="store-header"><div className="header-content"><Link to="/">← الرئيسية</Link><h1>{collection?.name || 'التصنيف'}</h1></div></header>
      <main className="store-main">
        {loading ? <p className="loading-text">جاري التحميل...</p> : (
          <div className="products-grid">
            {products.map(p => (
              <Link to={p.handle ? `/product/${p.handle}` : `/product/${p._id || p.id}`} key={p._id || p.id} className="product-card">
                <div className="product-image-wrap"><img src={p.imageUrl || p.image_url} alt={p.name} loading="lazy" /></div>
                <div className="product-info"><h3>{p.name}</h3><div className="product-price">{formatPrice(p.salePrice || p.basePrice)}</div></div>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
