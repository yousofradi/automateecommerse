import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api, { formatPrice } from '../../api/client';
import { useCart } from '../../context/CartContext';
import '../../styles/store.css';

export default function Checkout() {
  const { cart, cartTotal, clearCart } = useCart();
  const navigate = useNavigate();
  const [shipping, setShipping] = useState({});
  const [paymentMethods, setPaymentMethods] = useState([]);
  const [form, setForm] = useState({ name: '', phone: '', address: '', government: '', notes: '' });
  const [paymentMethod, setPaymentMethod] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    api.getShipping().then(setShipping).catch(() => {});
    api.getSetting('autoecommerce_global_settings').then(s => {
      if (s?.paymentMethods) setPaymentMethods(s.paymentMethods);
    }).catch(() => {});
  }, []);

  const shippingFee = shipping[form.government] || 0;
  const total = cartTotal + shippingFee;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (cart.length === 0) return;
    setSubmitting(true);
    try {
      const order = await api.createOrder({
        customer: form,
        items: cart.map(i => ({
          productId: i.productId, name: i.name, imageUrl: i.imageUrl,
          basePrice: i.finalPrice, finalPrice: i.finalPrice,
          quantity: i.quantity, selectedOptions: i.selectedOptions || []
        })),
        paymentMethod
      });
      clearCart();
      navigate(`/order-success?id=${order.orderId}`);
    } catch (err) {
      alert(err.message);
    }
    setSubmitting(false);
  };

  if (cart.length === 0) { navigate('/cart'); return null; }

  return (
    <div className="store-page" dir="rtl">
      <header className="store-header"><div className="header-content"><h1>إتمام الطلب</h1></div></header>
      <main className="store-main">
        <form onSubmit={handleSubmit} className="checkout-form">
          <input required placeholder="الاسم" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
          <input required placeholder="رقم الهاتف" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} />
          <select required value={form.government} onChange={e => setForm(f => ({ ...f, government: e.target.value }))}>
            <option value="">اختر المحافظة</option>
            {Object.keys(shipping).map(gov => <option key={gov} value={gov}>{gov} ({shipping[gov]} ج)</option>)}
          </select>
          <input required placeholder="العنوان بالتفصيل" value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} />
          <textarea placeholder="ملاحظات (اختياري)" value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
          {paymentMethods.length > 0 && (
            <div className="payment-methods">
              <label>طريقة الدفع:</label>
              {paymentMethods.map(m => (
                <label key={m.name} className="radio-label">
                  <input type="radio" name="payment" value={m.name} checked={paymentMethod === m.name} onChange={() => setPaymentMethod(m.name)} />
                  {m.name}
                </label>
              ))}
            </div>
          )}
          <div className="checkout-summary">
            <p>المنتجات: {formatPrice(cartTotal)}</p>
            <p>الشحن: {formatPrice(shippingFee)}</p>
            <p className="total">الإجمالي: {formatPrice(total)}</p>
          </div>
          <button type="submit" className="btn-primary" disabled={submitting}>{submitting ? 'جاري الإرسال...' : 'تأكيد الطلب'}</button>
        </form>
      </main>
    </div>
  );
}
