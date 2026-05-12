import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api, { formatPrice } from '../api/client';
import AdminLayout from '../components/AdminLayout';

export default function Products() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [total, setTotal] = useState(0);
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [showBulkMenu, setShowBulkMenu] = useState(false);

  useEffect(() => {
    loadProducts();
  }, [page, limit, filter, search]);

  const loadProducts = async () => {
    setLoading(true);
    try {
      const hasOptions = filter === 'variable';
      const res = await api.getProducts(page, limit, true, null, search, hasOptions);
      setProducts(res.products || []);
      setTotal(res.total || 0);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const toggleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedIds(new Set(products.map(p => p.id)));
    } else {
      setSelectedIds(new Set());
    }
  };

  const toggleSelect = (id) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setSelectedIds(newSet);
  };

  return (
    <AdminLayout>
      <div style={{maxWidth:'1200px'}}>
        <div className="flex-between mb-24">
          <div>
            <h1 className="page-title" style={{marginBottom:'4px'}}>المنتجات</h1>
            <p className="page-subtitle" style={{marginBottom:'0'}}>إدارة منتجات متجرك</p>
          </div>
          <div className="flex gap-12">
            <button className="btn btn-secondary" onClick={() => setShowBulkModal(true)}>+ إضافة عدة منتجات</button>
            <Link to="/admin/products/new" className="btn btn-primary">+ إضافة منتج</Link>
          </div>
        </div>

        <div style={{background:'#fff', border:'1px solid #e2e8f0', borderRadius:'12px', overflow:'hidden'}}>
          <div id="filter-bar" style={{display:'flex', justifyContent:'space-between', alignItems:'center', padding:'16px 20px', borderBottom:'1px solid #f1f5f9', flexWrap:'wrap', gap:'16px'}}>
            <div style={{display:'flex', gap:'24px', alignItems:'center'}} className="order-tabs">
              <span className={`order-tab ${filter === 'all' ? 'active' : ''}`} onClick={() => setFilter('all')}>الجميع</span>
              <span className={`order-tab ${filter === 'variable' ? 'active' : ''}`} onClick={() => setFilter('variable')}>متعدد</span>
            </div>
            
            <div style={{position:'relative', width:'300px', maxWidth:'100%'}}>
              <input type="text" placeholder="البحث في المنتجات" style={{width:'100%', padding:'8px 16px', paddingLeft:'40px', border:'1px solid #e2e8f0', borderRadius:'8px', fontSize:'0.9rem'}} value={search} onChange={e => setSearch(e.target.value)} />
              <span style={{position:'absolute', left:'12px', top:'50%', transform:'translateY(-50%)', color:'#94a3b8', pointerEvents:'none'}}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{verticalAlign: 'middle'}}><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg></span>
            </div>
          </div>
          
          {selectedIds.size > 0 && (
            <div id="bulk-actions-bar" style={{display:'flex', justifyContent:'flex-start', alignItems:'center', padding:'16px 20px', borderBottom:'1px solid #f1f5f9', background:'#fff', gap:'12px'}}>
              <button className="btn btn-primary" onClick={() => setSelectedIds(new Set())} style={{borderRadius:'20px', padding:'8px 16px', border:'none', background:'var(--primary)', color:'#fff', fontWeight:600, display:'flex', alignItems:'center', gap:'8px'}}>
                تم تحديد <span id="selected-count-badge">{selectedIds.size}</span>
                <span style={{background:'rgba(255,255,255,0.2)', borderRadius:'4px', width:'18px', height:'18px', display:'inline-flex', alignItems:'center', justifyContent:'center', fontWeight:'bold'}}>-</span>
              </button>
              <div style={{position:'relative'}}>
                <button className="btn btn-secondary" onClick={() => setShowBulkMenu(!showBulkMenu)} style={{borderRadius:'20px', padding:'8px 16px', border:'1px solid #e2e8f0', background:'#fff', color:'#475569', fontWeight:600, display:'flex', alignItems:'center', gap:'8px'}}>
                  إجراءات
                  <span style={{fontSize:'0.8rem', marginTop:'2px'}}><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{verticalAlign: 'middle', marginTop: '-2px'}}><path d="M6 9l6 6 6-6"/></svg></span>
                </button>
                {showBulkMenu && (
                  <div id="bulk-menu" style={{position:'absolute', top:'100%', right:0, marginTop:'8px', background:'#fff', border:'1px solid #e2e8f0', borderRadius:'12px', boxShadow:'0 10px 25px -3px rgba(0,0,0,0.15)', width:'220px', zIndex:100, overflow:'hidden', padding:'6px'}}>
                    <button style={{width:'100%', textAlign:'right', padding:'12px 14px', background:'none', border:'none', borderRadius:'8px', cursor:'pointer', display:'flex', alignItems:'center', gap:'10px', color:'#475569', fontSize:'0.95rem', fontFamily:'inherit'}}>
                      اجعله <span style={{width:'10px',height:'10px',borderRadius:'50%',background:'#10b981',display:'inline-block'}}></span> نشط
                    </button>
                    <button style={{width:'100%', textAlign:'right', padding:'12px 14px', background:'none', border:'none', borderRadius:'8px', cursor:'pointer', display:'flex', alignItems:'center', gap:'10px', color:'#ef4444', fontSize:'0.95rem', fontFamily:'inherit', fontWeight:600}}>
                      حذف المنتجات
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="table-wrapper" style={{boxShadow:'none', borderRadius:0, margin:0, border:'none'}}>
            <table className="products-table" style={{width:'100%', borderCollapse:'collapse', textAlign:'right'}}>
            <thead>
              <tr>
                <th style={{width: '40px'}}><input type="checkbox" onChange={toggleSelectAll} checked={products.length > 0 && selectedIds.size === products.length} /></th>
                <th>الصورة</th>
                <th>الاسم</th>
                <th>السعر</th>
                <th>الحالة</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="5" className="text-center"><div className="spinner"></div></td></tr>
              ) : products.length === 0 ? (
                <tr><td colSpan="5" className="text-center text-muted">لا توجد منتجات</td></tr>
              ) : (
                products.map(p => (
                  <tr key={p.id}>
                    <td><input type="checkbox" checked={selectedIds.has(p.id)} onChange={() => toggleSelect(p.id)} /></td>
                    <td>
                      {p.imageUrl ? <img src={p.imageUrl} alt={p.name} style={{width:'40px', height:'40px', borderRadius:'6px', objectFit:'cover'}} /> : <div style={{width:'40px',height:'40px',background:'#f1f5f9',borderRadius:'6px'}}></div>}
                    </td>
                    <td>
                      <div style={{fontWeight:600}}>{p.name}</div>
                      <div className="text-sm text-muted">{p.options?.length ? 'منتج متعدد' : 'منتج بسيط'}</div>
                    </td>
                    <td>
                      {p.salePrice ? (
                        <div>
                          <div style={{color:'var(--danger)', fontWeight:600}}>{formatPrice(p.salePrice)}</div>
                          <div className="text-sm text-muted" style={{textDecoration:'line-through'}}>{formatPrice(p.basePrice)}</div>
                        </div>
                      ) : (
                        <div style={{fontWeight:600}}>{formatPrice(p.basePrice)}</div>
                      )}
                    </td>
                    <td>
                      <span className={`badge ${p.active ? 'badge-success' : 'badge-secondary'}`}>{p.active ? 'نشط' : 'غير نشط'}</span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
          
          <div className="pagination-bar" style={{display:'flex', justifyContent:'space-between', alignItems:'center', padding:'16px 24px', borderTop:'1px solid #e2e8f0', background:'#f8fafc', fontSize:'0.95rem', flexWrap:'wrap', gap:'16px'}}>
            <div style={{display:'flex', alignItems:'center', gap:'16px'}}>
              <button disabled={page === 1} onClick={() => setPage(p => p - 1)} style={{background:'none', border:'none', color:'var(--primary)', fontWeight:600, cursor:'pointer', display:'flex', alignItems:'center', gap:'6px', padding:'4px 8px', opacity: page===1 ? 0.5 : 1}}>
                السابق
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>
              </button>
              <select value={page} onChange={e => setPage(Number(e.target.value))} style={{border:'1px solid #e2e8f0', borderRadius:'6px', padding:'4px 8px', appearance:'none', textAlign:'center', minWidth:'50px'}}>
                {Array.from({length: Math.ceil(total / limit) || 1}).map((_, i) => (
                  <option key={i+1} value={i+1}>{i+1}</option>
                ))}
              </select>
              <button disabled={page >= Math.ceil(total / limit)} onClick={() => setPage(p => p + 1)} style={{background:'none', border:'none', color:'var(--primary)', fontWeight:600, cursor:'pointer', display:'flex', alignItems:'center', gap:'6px', padding:'4px 8px', opacity: page >= Math.ceil(total/limit) ? 0.5 : 1}}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"></polyline></svg>
                التالي
              </button>
            </div>
            
            <div style={{display:'flex', alignItems:'center', gap:'12px'}}>
              <span style={{color:'#64748b'}}>أظهر</span>
              <select value={limit} onChange={e => {setLimit(Number(e.target.value)); setPage(1);}} style={{border:'1px solid #e2e8f0', borderRadius:'6px', padding:'4px 8px', appearance:'none', textAlign:'center', minWidth:'60px'}}>
                <option value="20">20</option>
                <option value="30">30</option>
                <option value="50">50</option>
                <option value="100">100</option>
              </select>
              <span style={{color:'#64748b'}}>المنتجات</span>
            </div>
          </div>
        </div>

        {showBulkModal && (
          <div className="modal-overlay" onClick={() => setShowBulkModal(false)}>
            <div className="modal" style={{maxWidth:'520px'}} onClick={e => e.stopPropagation()}>
              <div className="modal-header">
                <h3 className="modal-title">استيراد منتجات</h3>
                <button className="modal-close" onClick={() => setShowBulkModal(false)}>×</button>
              </div>
              <p className="text-muted text-sm mb-16">هذه الميزة تحت التطوير حالياً.</p>
              <div className="flex gap-12" style={{justifyContent:'flex-end'}}>
                <button className="btn btn-secondary" onClick={() => setShowBulkModal(false)}>إلغاء</button>
              </div>
            </div>
          </div>
        )}

      </div>
      </div>
    </AdminLayout>
  );
}
