import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import api, { formatPrice } from '../api/client';
import '../styles/admin.css';

export default function OrderDetails() {
  const { id } = useParams();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getOrder(id).then(res => {
      setOrder(res);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [id]);

  if (loading) return <p>جاري التحميل...</p>;
  if (!order) return <p>الطلب غير موجود</p>;

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
        <div className="admin-header-row">
          <h1>تفاصيل الطلب: {order.orderId}</h1>
          <span className={`status-badge ${order.status}`}>{order.status}</span>
        </div>
        <div className="order-details-card">
          <h3>معلومات العميل</h3>
          <p>الاسم: {order.customer.name}</p>
          <p>الهاتف: {order.customer.phone}</p>
          <p>العنوان: {order.customer.address}, {order.customer.government}</p>
          <hr />
          <h3>المنتجات</h3>
          <ul>
            {order.items.map((i, idx) => (
              <li key={idx}>
                {i.name} (x{i.quantity}) - {formatPrice(i.finalPrice)}
              </li>
            ))}
          </ul>
          <hr />
          <h3>الإجمالي</h3>
          <p>المنتجات: {formatPrice(order.totalPrice - order.shippingFee)}</p>
          <p>الشحن: {formatPrice(order.shippingFee)}</p>
          <p><strong>النهائي: {formatPrice(order.totalPrice)}</strong></p>
        </div>
      </main>
    </div>
  );
}
