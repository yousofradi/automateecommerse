import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api, { formatPrice } from '../api/client';
import AdminLayout from '../components/AdminLayout';

export default function Orders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [showBulkMenu, setShowBulkMenu] = useState(false);

  useEffect(() => {
    loadOrders();
  }, [page, limit, filter, search]);

  const loadOrders = async () => {
    setLoading(true);
    try {
      const isArchived = filter === 'archived';
      const statusFilter = filter === 'pending' ? 'pending' : null;
      // In a real app we'd pass pagination to getOrders if supported by backend
      const res = await api.getOrders(isArchived);
      let filtered = res || [];
      if (statusFilter) filtered = filtered.filter(o => o.status === statusFilter);
      if (search) {
        const q = search.toLowerCase();
        filtered = filtered.filter(o => 
          o.orderId?.toLowerCase().includes(q) || 
          o.customerName?.toLowerCase().includes(q) || 
          o.phone?.includes(q)
        );
      }
      setOrders(filtered);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const toggleSelectAll = (e) => {
    if (e.target.checked) setSelectedIds(new Set(orders.map(o => o.id)));
    else setSelectedIds(new Set());
  };

  const toggleSelect = (id) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setSelectedIds(newSet);
  };

  const getStatusBadge = (status) => {
    const map = {
      pending: { text: 'بانتظار التجهيز', class: 'badge-neutral', color: '#94a3b8' },
      processing: { text: 'جاري التجهيز', class: 'badge-partial', color: '#16a34a' },
      shipped: { text: 'تم الشحن', class: 'badge-paid', color: 'var(--primary)' },
      delivered: { text: 'مكتمل', class: 'badge-paid', color: 'var(--primary)' },
      cancelled: { text: 'ملغي', class: 'badge-unpaid', color: '#ef4444' }
    };
    const s = map[status] || map.pending;
    return (
      <span className={`status-badge-pill ${s.class}`}>
        <span className="dot" style={{backgroundColor: s.color}}></span> {s.text}
      </span>
    );
  };

  const getPaymentBadge = (status) => {
    if (status === 'paid') return <span className="status-badge-pill badge-paid"><span className="dot"></span> مدفوع</span>;
    if (status === 'partial') return <span className="status-badge-pill badge-partial"><span className="dot"></span> جزئي</span>;
    return <span className="status-badge-pill badge-unpaid"><span className="dot"></span> غير مدفوع</span>;
  };

  return (
    <AdminLayout>
      <div style={{maxWidth:'1300px'}}>
        <div className="flex-between mb-24 align-center">
          <div>
            <h1 className="page-title" style={{marginBottom:0, fontSize: '1.5rem', color:'#1e293b', fontWeight:700}}>الطلبات</h1>
          </div>
          <div className="page-actions-container" style={{display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap'}}>
            <Link to="/admin/orders/new" className="btn btn-primary" style={{gap:'6px', background:'var(--primary)', border:'none', borderRadius:'20px', padding:'8px 20px', fontWeight:600}}>+ أنشئ طلب</Link>
            <button className="btn btn-secondary" style={{gap:'6px', borderRadius:'20px', padding:'8px 20px', background:'#fff', border:'1px solid #e2e8f0', color:'#475569', fontWeight:600}}>
              الفواتير <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{verticalAlign: 'middle'}}>
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
            </button>
          </div>
        </div>

        <div style={{background:'#fff', border:'1px solid #e2e8f0', borderRadius:'12px', overflow:'hidden'}}>
          <div id="filter-bar" style={{display:'flex', justifyContent:'space-between', alignItems:'center', padding:'16px 20px', borderBottom:'1px solid #f1f5f9', flexWrap:'wrap', gap:'16px'}}>
            <div className="order-tabs">
              <span className={`order-tab ${filter === 'all' ? 'active' : ''}`} onClick={() => setFilter('all')}>الجميع</span>
              <span className={`order-tab ${filter === 'pending' ? 'active' : ''}`} onClick={() => setFilter('pending')}>بانتظار التجهيز</span>
              <span className={`order-tab ${filter === 'archived' ? 'active' : ''}`} onClick={() => setFilter('archived')}>الأرشيف</span>
            </div>
            <div style={{position:'relative', width:'300px', maxWidth:'100%'}}>
              <input type="text" placeholder="البحث والتصنيفات" style={{width:'100%', padding:'8px 16px', paddingLeft:'40px', border:'1px solid #e2e8f0', borderRadius:'8px', fontSize:'0.9rem'}} value={search} onChange={e => setSearch(e.target.value)} />
              <span style={{position:'absolute', left:'12px', top:'50%', transform:'translateY(-50%)', color:'#94a3b8', pointerEvents:'none'}}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{verticalAlign: 'middle'}}><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
              </span>
            </div>
          </div>

          {selectedIds.size > 0 && (
            <div id="bulk-actions-bar" style={{display:'flex', justifyContent:'flex-start', alignItems:'center', padding:'16px 20px', borderBottom:'1px solid #f1f5f9', background:'#fff', gap:'12px'}}>
              <button className="btn btn-primary" onClick={() => setSelectedIds(new Set())} style={{borderRadius:'20px', padding:'8px 16px', border:'none', background:'#0f766e', color:'#fff', fontWeight:600, display:'flex', alignItems:'center', gap:'8px'}}>
                تم تحديد <span>{selectedIds.size}</span>
              </button>
              <div style={{position:'relative'}}>
                <button className="btn btn-secondary" onClick={() => setShowBulkMenu(!showBulkMenu)} style={{borderRadius:'20px', padding:'8px 16px', border:'1px solid #e2e8f0', background:'#fff', color:'#475569', fontWeight:600, display:'flex', alignItems:'center', gap:'8px'}}>
                  المزيد
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6" /></svg>
                </button>
                {showBulkMenu && (
                  <div className="dropdown-menu-box" style={{right: 0, left: 'auto', position: 'absolute', top: '100%', marginTop: '8px', background: '#fff', border: '1px solid #e2e8f0', borderRadius: '12px', boxShadow: '0 10px 25px -3px rgba(0,0,0,0.15)', width: '200px', zIndex: 100}}>
                    <button className="dropdown-item-btn" style={{width:'100%', textAlign:'right', padding:'12px 14px', background:'none', border:'none', cursor:'pointer', display:'flex', alignItems:'center', gap:'10px', color:'#475569'}}>
                      أرشفة
                    </button>
                    <button className="dropdown-item-btn danger" style={{width:'100%', textAlign:'right', padding:'12px 14px', background:'none', border:'none', cursor:'pointer', display:'flex', alignItems:'center', gap:'10px', color:'#ef4444'}}>
                      إلغاء الطلب
                    </button>
                    <div className="dropdown-divider" style={{height:'1px', background:'#e2e8f0', margin:'4px 0'}}></div>
                    <button className="dropdown-item-btn danger" style={{width:'100%', textAlign:'right', padding:'12px 14px', background:'none', border:'none', cursor:'pointer', display:'flex', alignItems:'center', gap:'10px', color:'#ef4444', fontWeight:600}}>
                      حذف نهائي
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="table-wrapper orders-table-wrap" style={{boxShadow:'none', borderRadius:0, margin:0, border:'none'}}>
            <table style={{width:'100%', borderCollapse:'collapse', textAlign:'right'}}>
              <thead>
                <tr>
                  <th style={{width: '40px', textAlign: 'center'}}>
                    <input type="checkbox" checked={orders.length > 0 && selectedIds.size === orders.length} onChange={toggleSelectAll} style={{width:'16px', height:'16px', borderRadius:'4px', accentColor:'#0f766e'}} />
                  </th>
                  <th style={{textAlign: 'center'}}>رقم</th>
                  <th style={{textAlign: 'center'}}>العميل</th>
                  <th style={{textAlign: 'center'}}>المنتجات</th>
                  <th style={{textAlign: 'center'}}>الحالة</th>
                  <th style={{textAlign: 'center'}}>الدفع</th>
                  <th style={{textAlign: 'center'}}>الإجمالي</th>
                  <th style={{textAlign: 'center'}}>التاريخ</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan="8" className="text-center" style={{padding:'32px'}}>
                      <div className="spinner"></div>
                    </td>
                  </tr>
                ) : orders.length === 0 ? (
                  <tr><td colSpan="8" className="text-center text-muted" style={{padding:'32px'}}>لا توجد طلبات</td></tr>
                ) : (
                  orders.map(o => (
                    <tr key={o.id}>
                      <td style={{textAlign: 'center'}}><input type="checkbox" checked={selectedIds.has(o.id)} onChange={() => toggleSelect(o.id)} style={{width:'16px', height:'16px'}} /></td>
                      <td style={{textAlign: 'center'}}><Link to={`/admin/orders/${o.id}`} style={{color:'var(--primary)', fontWeight:600, textDecoration:'none'}}>{o.orderId}</Link></td>
                      <td style={{textAlign: 'center'}}>
                        <div style={{fontWeight:600}}>{o.customerName}</div>
                        <div className="text-sm text-muted">{o.phone}</div>
                      </td>
                      <td style={{textAlign: 'center'}}>{o.items?.reduce((s, i) => s + i.quantity, 0) || 0}</td>
                      <td style={{textAlign: 'center'}}>{getStatusBadge(o.status)}</td>
                      <td style={{textAlign: 'center'}}>{getPaymentBadge(o.paymentStatus)}</td>
                      <td style={{textAlign: 'center', fontWeight:600}}>{formatPrice(o.totalAmount)}</td>
                      <td style={{textAlign: 'center', direction:'ltr'}} className="text-sm text-muted">{new Date(o.createdAt).toLocaleString('en-GB')}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', padding:'16px 20px', borderTop:'1px solid #f1f5f9', background:'#fff'}}>
            <div style={{fontSize:'0.85rem', color:'#64748b'}}>
              عدد الطلبات: <span>{orders.length}</span>
            </div>
            <div style={{display:'flex', alignItems:'center', gap:'12px'}}>
              <button disabled={page === 1} onClick={() => setPage(p => p - 1)} className="btn btn-sm" style={{display:'flex', alignItems:'center', gap:'6px'}}>
                السابق
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>
              </button>
              <select value={page} onChange={e => setPage(Number(e.target.value))} style={{border:'1px solid #e2e8f0', borderRadius:'6px', padding:'4px 8px', appearance:'none', textAlign:'center', minWidth:'50px'}}>
                <option value={page}>{page}</option>
              </select>
              <button onClick={() => setPage(p => p + 1)} className="btn btn-sm" style={{display:'flex', alignItems:'center', gap:'6px'}}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"></polyline></svg>
                التالي
              </button>
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
