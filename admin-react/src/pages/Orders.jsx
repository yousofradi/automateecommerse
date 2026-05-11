import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api, { formatPrice } from '../api/client';
import '../styles/admin.css';

export default function Orders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getOrders().then(res => {
      setOrders(res || []);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  return (
    <div className="admin-layout" dir="rtl">
      <aside className="admin-sidebar">
        <nav className="admin-nav">
          <Link to="/admin">الرئيسية</Link>
          <Link to="/admin/orders" className="active">الطلبات</Link>
          <Link to="/admin/products">المنتجات</Link>
          <Link to="/admin/collections">التصنيفات</Link>
          <Link to="/admin/settings">الإعدادات</Link>
        </nav>
      </aside>
      <main className="admin-main">
        <div className="admin-header-row"><h1>الطلبات</h1></div>
        {loading ? <p>جاري التحميل...</p> : (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead><tr><th>الطلب</th><th>العميل</th><th>التاريخ</th><th>الإجمالي</th><th>الحالة</th></tr></thead>
              <tbody>
                {orders.map(o => (
                  <tr key={o._id || o.id}>
                    <td><Link to={`/admin/orders/${o._id || o.id}`}>{o.orderId}</Link></td>
                    <td>{o.customer?.name}</td>
                    <td>{new Date(o.createdAt).toLocaleDateString('ar-EG')}</td>
                    <td>{formatPrice(o.totalPrice)}</td>
                    <td><span className={`status-badge ${o.status}`}>{o.status}</span></td>
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
