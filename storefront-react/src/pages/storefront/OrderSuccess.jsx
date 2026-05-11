import { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import api, { formatPrice } from '../../api/client';
import '../../styles/store.css';

export default function OrderSuccess() {
  const [searchParams] = useSearchParams();
  const orderId = searchParams.get('id');
  const [order, setOrder] = useState(null);

  useEffect(() => {
    if (orderId) api.getPublicOrder(orderId).then(setOrder).catch(() => {});
  }, [orderId]);

  return (
    <div className="store-page" dir="rtl">
      <main className="store-main order-success">
        <div className="success-card">
          <div className="success-icon">✓</div>
          <h1>تم تأكيد طلبك بنجاح!</h1>
          <p>رقم الطلب: <strong>{orderId}</strong></p>
          {order && (
            <div className="order-summary-card">
              <p>الإجمالي: {formatPrice(order.totalPrice)}</p>
              <p>الشحن: {formatPrice(order.shippingFee)}</p>
            </div>
          )}
          <Link to="/" className="btn-primary">العودة للمتجر</Link>
        </div>
      </main>
    </div>
  );
}
