import { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import api, { formatPrice } from '../../api/client';
import '../../styles/store.css';

export default function Products() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [searchParams] = useSearchParams();
  const search = searchParams.get('search') || '';

  useEffect(() => {
    setLoading(true);
    api.getProducts(page, 20, false, '', search).then(res => {
      setProducts(res.products || res || []);
      setTotalPages(res.totalPages || 1);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [page, search]);

  return (
    <div className="store-page" dir="rtl">
      <header className="store-header">
        <div className="header-content">
          <Link to="/">← الرئيسية</Link>
          <h1>جميع المنتجات</h1>
        </div>
      </header>
      <main className="store-main">
        {loading ? <p className="loading-text">جاري التحميل...</p> : (
          <div className="products-grid">
            {products.map(p => (
              <Link to={p.handle ? `/product/${p.handle}` : `/product/${p._id || p.id}`} key={p._id || p.id} className="product-card">
                <div className="product-image-wrap">
                  <img src={p.imageUrl || p.image_url} alt={p.name} loading="lazy" />
                </div>
                <div className="product-info">
                  <h3>{p.name}</h3>
                  <div className="product-price">{formatPrice(p.salePrice || p.basePrice)}</div>
                </div>
              </Link>
            ))}
          </div>
        )}
        {totalPages > 1 && (
          <div className="pagination">
            <button disabled={page <= 1} onClick={() => setPage(p => p - 1)}>السابق</button>
            <span>{page} / {totalPages}</span>
            <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>التالي</button>
          </div>
        )}
      </main>
    </div>
  );
}
