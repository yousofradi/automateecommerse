import { Link } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import '../styles/store.css';

export default function StoreLayout({ children }) {
  const { cart } = useCart();
  const cartItemCount = cart.reduce((total, item) => total + item.quantity, 0);

  return (
    <div className="has-bottom-nav">
      <header className="store-header">
        <div className="container" style={{display:'flex', alignItems:'center', justifyContent:'space-between'}}>
          <button className="header-icon hamburger-btn">☰</button>
          <Link to="/" className="store-logo-link">
            <span style={{fontWeight:'bold', fontSize:'1.2rem', color:'var(--primary)'}}>AutoEcommerce</span>
          </Link>
          
          <div className="header-icons" style={{display:'flex', gap:'12px'}}>
            <button className="header-icon search-icon-btn">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="22" height="22"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            </button>
            <Link to="/cart" className="nav-item" id="header-cart-link" style={{position:'relative'}}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg>
              {cartItemCount > 0 && <span className="mobile-nav-badge">{cartItemCount}</span>}
            </Link>
          </div>
        </div>
      </header>

      <main style={{minHeight: '70vh'}}>
        {children}
      </main>

      <footer className="store-footer">
        <nav className="footer-nav">
          <Link to="/">الرئيسية</Link>
          <Link to="/products">المتجر</Link>
          <a href="https://wa.me/" target="_blank" rel="noreferrer">تواصل معنا</a>
        </nav>
        <div className="footer-bottom-bar">© 2026 AutoEcommerce. جميع الحقوق محفوظة.</div>
      </footer>

      {/* Bottom Mobile Nav */}
      <nav className="mobile-bottom-nav">
        <div className="nav-items">
          <Link to="/" className="nav-item">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="24" height="24"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
            <span>الرئيسية</span>
          </Link>
          <Link to="/products" className="nav-item">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="24" height="24"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>
            <span>متجر</span>
          </Link>
          <Link to="/cart" className="nav-item" style={{position:'relative'}}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="24" height="24"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg>
            <span>السلة</span>
            {cartItemCount > 0 && <span className="mobile-nav-badge">{cartItemCount}</span>}
          </Link>
          <a href="#" target="_blank" rel="noreferrer" className="nav-item">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="24" height="24"><path d="M3 21l1.65-3.8a9 9 0 1 1 3.4 2.9L3 21"/><path d="M9 10a.5.5 0 0 0 1 0V9a.5.5 0 0 0-1 0v1a5 5 0 0 0 5 5h1a.5.5 0 0 0 0-1h-1a.5.5 0 0 0 0 1"/></svg>
            <span>واتساب</span>
          </a>
        </div>
      </nav>
    </div>
  );
}
