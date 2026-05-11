import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api, { formatPrice } from '../api/client';
import '../styles/admin.css';

export default function AdminProducts() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  const load = () => {
    setLoading(true);
    api.getProducts(page, 20, true).then(res => {
      setProducts(res.products || []);
      setTotal(res.total || 0);
      setLoading(false);
    }).catch(() => setLoading(false));
  };
  useEffect(load, [page]);

  return (
    <div className="admin-layout" dir="rtl">
      <aside className="admin-sidebar">
        <nav className="admin-nav">
          <Link to="/admin">الرئيسية</Link>
          <Link to="/admin/orders">الطلبات</Link>
          <Link to="/admin/products" className="active">المنتجات</Link>
          <Link to="/admin/collections">التصنيفات</Link>
          <Link to="/admin/settings">الإعدادات</Link>
        </nav>
      </aside>
      <main className="admin-main">
        <div className="admin-header-row"><h1>المنتجات ({total})</h1></div>
        {loading ? <p>جاري التحميل...</p> : (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead><tr><th>المنتج</th><th>السعر</th><th>الحالة</th></tr></thead>
              <tbody>
                {products.map(p => (
                  <tr key={p._id || p.id}>
                    <td><div className="product-cell"><img src={p.imageUrl || p.image_url} alt="" /><span>{p.name}</span></div></td>
                    <td>{formatPrice(p.salePrice || p.basePrice)}</td>
                    <td><span className={`status-badge ${p.status}`}>{p.status === 'active' ? 'نشط' : 'مسودة'}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  );
}
