import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../api/client';
import '../styles/admin.css';

export default function Dashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState({ orders: 0, products: 0, collections: 0 });

  useEffect(() => {
    api.checkAdmin().then(ok => { if (!ok) navigate('/admin/login'); });
    Promise.all([
      api.getOrders().then(o => o.length).catch(() => 0),
      api.getProducts(1, 1, true).then(r => r.total || 0).catch(() => 0),
      api.getCollections().then(c => c.length).catch(() => 0)
    ]).then(([orders, products, collections]) => setStats({ orders, products, collections }));
  }, [navigate]);

  return (
    <div className="admin-layout" dir="rtl">
      <aside className="admin-sidebar">
        <div className="admin-brand"><h2>لوحة التحكم</h2></div>
        <nav className="admin-nav">
          <Link to="/admin" className="active">الرئيسية</Link>
          <Link to="/admin/orders">الطلبات</Link>
          <Link to="/admin/products">المنتجات</Link>
          <Link to="/admin/collections">التصنيفات</Link>
          <Link to="/admin/settings">الإعدادات</Link>
          <Link to="/" target="_blank">المتجر ↗</Link>
        </nav>
      </aside>
      <main className="admin-main">
        <h1>مرحباً 👋</h1>
        <div className="stats-grid">
          <div className="stat-card"><h3>{stats.orders}</h3><p>طلب</p></div>
          <div className="stat-card"><h3>{stats.products}</h3><p>منتج</p></div>
          <div className="stat-card"><h3>{stats.collections}</h3><p>تصنيف</p></div>
        </div>
      </main>
    </div>
  );
}
