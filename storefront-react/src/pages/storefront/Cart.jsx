import { Link } from 'react-router-dom';
import { useCart } from '../../context/CartContext';
import { formatPrice } from '../../api/client';
import '../../styles/store.css';

export default function Cart() {
  const { cart, removeFromCart, updateQuantity, cartTotal } = useCart();

  if (cart.length === 0) {
    return (
      <div className="store-page" dir="rtl">
        <header className="store-header"><div className="header-content"><Link to="/">← الرئيسية</Link><h1>السلة</h1></div></header>
        <main className="store-main"><div className="empty-state"><p>السلة فارغة</p><Link to="/products" className="btn-primary">تسوق الآن</Link></div></main>
      </div>
    );
  }

  return (
    <div className="store-page" dir="rtl">
      <header className="store-header"><div className="header-content"><Link to="/">← الرئيسية</Link><h1>السلة</h1></div></header>
      <main className="store-main">
        <div className="cart-items">
          {cart.map((item, i) => (
            <div key={i} className="cart-item">
              {item.imageUrl && <img src={item.imageUrl} alt={item.name} className="cart-item-img" />}
              <div className="cart-item-info">
                <h3>{item.name}</h3>
                {item.selectedOptions?.length > 0 && (
                  <p className="cart-item-options">{item.selectedOptions.map(o => o.label).join(' / ')}</p>
                )}
                <div className="cart-item-price">{formatPrice(item.finalPrice)}</div>
                <div className="qty-row">
                  <button onClick={() => updateQuantity(i, item.quantity - 1)}>-</button>
                  <span>{item.quantity}</span>
                  <button onClick={() => updateQuantity(i, item.quantity + 1)}>+</button>
                </div>
              </div>
              <button className="remove-btn" onClick={() => removeFromCart(i)}>✕</button>
            </div>
          ))}
        </div>
        <div className="cart-summary">
          <div className="cart-total"><span>الإجمالي:</span><span>{formatPrice(cartTotal)}</span></div>
          <Link to="/checkout" className="btn-primary">إتمام الطلب</Link>
        </div>
      </main>
    </div>
  );
}
