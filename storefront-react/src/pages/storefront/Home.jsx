import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api, { formatPrice } from '../api/client';
import StoreLayout from '../components/StoreLayout';

export default function Home() {
  const [collections, setCollections] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Note: The original site loaded homepage layout dynamically from API
    // Here we will fetch collections that contain products to show
    api.getCollections().then(cols => {
      // In a real port, we'd fetch the exact layout from /api/homepage
      // For now, we render the collections that have products
      const validCols = cols.filter(c => c.products && c.products.length > 0);
      setCollections(validCols);
    }).finally(() => {
      setLoading(false);
    });
  }, []);

  return (
    <StoreLayout>
      <div className="container" style={{paddingTop:'20px'}}>
        <div id="home-content">
          {loading ? (
            <div className="skeleton-section" style={{marginBottom:'40px'}}>
              <div className="skeleton skeleton-title" style={{width:'160px', marginBottom:'24px'}}></div>
              <div className="products-grid" style={{'--cols': 2}}>
                <div className="store-product-card" style={{border:'none', boxShadow:'none'}}>
                  <div className="skeleton" style={{width:'100%', height:'280px', borderRadius:'12px'}}></div>
                  <div style={{padding:'16px 0'}}>
                    <div className="skeleton skeleton-text" style={{width:'80%'}}></div>
                    <div className="skeleton skeleton-text" style={{width:'40%'}}></div>
                  </div>
                </div>
                <div className="store-product-card" style={{border:'none', boxShadow:'none'}}>
                  <div className="skeleton" style={{width:'100%', height:'280px', borderRadius:'12px'}}></div>
                  <div style={{padding:'16px 0'}}>
                    <div className="skeleton skeleton-text" style={{width:'80%'}}></div>
                    <div className="skeleton skeleton-text" style={{width:'40%'}}></div>
                  </div>
                </div>
              </div>
            </div>
          ) : collections.length === 0 ? (
            <div style={{textAlign:'center', padding:'40px 0'}}>
              <h3>لا توجد منتجات حالياً</h3>
              <p className="text-muted">ترقبوا المزيد من المنتجات قريباً!</p>
            </div>
          ) : (
            collections.map(collection => (
              <div key={collection.id} style={{marginBottom: '40px'}}>
                <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'16px'}}>
                  <h2 className="section-title">{collection.title}</h2>
                  <Link to={`/collection?id=${collection.id}`} style={{color:'var(--primary)', fontWeight:'bold', fontSize:'0.9rem', textDecoration:'none'}}>عرض الكل</Link>
                </div>
                <div className="products-grid" style={{'--cols': window.innerWidth < 640 ? 2 : 4}}>
                  {collection.products.slice(0, 4).map(product => (
                    <Link to={`/product/${product.id}`} className="store-product-card" key={product.id} style={{textDecoration:'none', color:'inherit'}}>
                      <div className="product-image-wrap">
                        {product.salePrice && product.basePrice && product.salePrice < product.basePrice && (
                          <div className="discount-badge">وفر {formatPrice(product.basePrice - product.salePrice)}</div>
                        )}
                        {product.imageUrl ? (
                          <img src={product.imageUrl} alt={product.name} loading="lazy" />
                        ) : (
                          <div style={{width:'100%', height:'100%', background:'#f1f5f9', display:'flex', alignItems:'center', justifyContent:'center'}}>
                            <span style={{color:'#cbd5e1'}}>بدون صورة</span>
                          </div>
                        )}
                        <button className="add-to-cart-btn-circle" onClick={(e) => { e.preventDefault(); /* Handle Quick Add */ }}>+</button>
                      </div>
                      <div className="product-info">
                        <h3 className="product-name">{product.name}</h3>
                        <div className="product-price-row">
                          {product.salePrice ? (
                            <>
                              <span className="price-sale">{formatPrice(product.salePrice)}</span>
                              <span className="price-old">{formatPrice(product.basePrice)}</span>
                            </>
                          ) : (
                            <span className="price-sale">{formatPrice(product.basePrice)}</span>
                          )}
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </StoreLayout>
  );
}
