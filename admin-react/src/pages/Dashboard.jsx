import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api, { formatPrice } from '../api/client';
import AdminLayout from '../components/AdminLayout';

export default function Dashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState({ orders: 0, products: 0, revenue: 0 });

  useEffect(() => {
    api.checkAdmin().then(ok => { if (!ok) navigate('/admin/login'); });
    Promise.all([
      api.getOrders(),
      api.getProducts(1, 1, true)
    ]).then(([orders, productsRes]) => {
      const revenue = (orders || []).reduce((s, o) => s + (o.paidAmount || 0), 0);
      setStats({
        orders: orders?.length || 0,
        products: productsRes?.total || 0,
        revenue
      });
    }).catch(() => {});
  }, [navigate]);

  return (
    <AdminLayout>
      <div style={{maxWidth:'1000px'}}>
        <h1 className="page-title">لوحة التحكم</h1>
        <p className="page-subtitle">نظرة عامة على أداء متجرك</p>

        <div className="grid grid-3 mb-24" id="stats">
          <div className="admin-card text-center">
            <div style={{fontSize:'2rem', fontWeight:700, color:'var(--primary)'}}>
              {stats.products}
            </div>
            <div className="text-muted mt-8">المنتجات</div>
          </div>
          <div className="admin-card text-center">
            <div style={{fontSize:'2rem', fontWeight:700, color:'var(--primary)'}}>
              {stats.orders}
            </div>
            <div className="text-muted mt-8">الطلبات</div>
          </div>
          <div className="admin-card text-center">
            <div style={{fontSize:'2rem', fontWeight:700, color:'var(--success)'}}>
              {formatPrice(stats.revenue)}
            </div>
            <div className="text-muted mt-8">الإيرادات</div>
          </div>
        </div>

        <div className="grid grid-2">
          <Link to="/admin/products" className="admin-card" style={{textDecoration:'none', display:'block', transition:'box-shadow .2s'}}>
            <h3 style={{marginBottom:'8px'}}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{verticalAlign: 'middle'}}><path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/><path d="m3.3 7 8.7 5 8.7-5"/><path d="M12 22V12"/></svg> إدارة المنتجات
            </h3>
            <p className="text-muted">إضافة وتعديل وحذف منتجاتك</p>
          </Link>
          <Link to="/admin/orders" className="admin-card" style={{textDecoration:'none', display:'block', transition:'box-shadow .2s'}}>
            <h3 style={{marginBottom:'8px', display:'flex', alignItems:'center', gap:'8px'}}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="9" cy="21" r="1"></circle><circle cx="20" cy="21" r="1"></circle><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path></svg>
              إدارة الطلبات
            </h3>
            <p className="text-muted">متابعة ومعالجة طلبات العملاء</p>
          </Link>
        </div>
      </div>
    </AdminLayout>
  );
}
