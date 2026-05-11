import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import api, { formatPrice } from '../../api/client';
import { useCart } from '../../context/CartContext';
import '../../styles/store.css';

export default function ProductDetail() {
  const { idOrHandle } = useParams();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedOptions, setSelectedOptions] = useState([]);
  const [qty, setQty] = useState(1);
  const { addToCart } = useCart();

  useEffect(() => {
    const isUUID = /^[0-9a-f]{8}-/.test(idOrHandle);
    const fetch = isUUID ? api.getProduct(idOrHandle) : api.getProductByHandle(idOrHandle);
    fetch.then(p => { setProduct(p); setLoading(false); }).catch(() => setLoading(false));
  }, [idOrHandle]);

  if (loading) return <div className="store-page" dir="rtl"><p className="loading-text">جاري التحميل...</p></div>;
  if (!product) return <div className="store-page" dir="rtl"><p>المنتج غير موجود</p></div>;

  const basePrice = product.salePrice || product.basePrice;
  const optionExtra = selectedOptions.reduce((s, o) => s + (o.price || 0), 0);
  const finalPrice = basePrice + optionExtra;

  const handleAddToCart = () => {
    addToCart({
      productId: product._id || product.id,
      name: product.name,
      imageUrl: product.imageUrl || product.image_url,
      basePrice: finalPrice,
      finalPrice,
      selectedOptions,
      quantity: qty
    });
  };

  return (
    <div className="store-page" dir="rtl">
      <header className="store-header"><div className="header-content"><Link to="/products">← المنتجات</Link></div></header>
      <main className="store-main product-detail">
        <div className="product-gallery">
          <img src={product.imageUrl || product.image_url} alt={product.name} className="main-image" />
          {product.images?.length > 1 && (
            <div className="thumb-row">{product.images.map((img, i) => <img key={i} src={img} alt="" className="thumb" />)}</div>
          )}
        </div>
        <div className="product-detail-info">
          <h1>{product.name}</h1>
          <div className="product-price">
            <span className="sale-price">{formatPrice(finalPrice)}</span>
            {product.salePrice && <span className="original-price">{formatPrice(product.basePrice)}</span>}
          </div>
          {product.description && <p className="product-desc" dangerouslySetInnerHTML={{ __html: product.description }} />}
          {product.options?.map((opt, i) => (
            <div key={i} className="option-group">
              <label>{opt.name}</label>
              <div className="option-values">
                {opt.values.map((v, j) => (
                  <button key={j}
                    className={`option-btn ${selectedOptions.find(s => s.groupName === opt.name && s.label === v.label) ? 'active' : ''}`}
                    onClick={() => {
                      setSelectedOptions(prev => {
                        const without = prev.filter(s => s.groupName !== opt.name);
                        return [...without, { groupName: opt.name, label: v.label, price: v.price }];
                      });
                    }}>
                    {v.label} {v.price > 0 && `(+${v.price})`}
                  </button>
                ))}
              </div>
            </div>
          ))}
          <div className="qty-row">
            <button onClick={() => setQty(q => Math.max(1, q - 1))}>-</button>
            <span>{qty}</span>
            <button onClick={() => setQty(q => q + 1)}>+</button>
          </div>
          <button className="btn-primary add-to-cart-btn" onClick={handleAddToCart}>أضف للسلة - {formatPrice(finalPrice * qty)}</button>
        </div>
      </main>
    </div>
  );
}
