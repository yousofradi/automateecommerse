import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/client';
import '../styles/admin.css';

export default function Collections() {
  const [collections, setCollections] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getCollections().then(res => {
      setCollections(res || []);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  return (
    <div className="admin-layout" dir="rtl">
      <aside className="admin-sidebar">
        <nav className="admin-nav">
          <Link to="/admin">الرئيسية</Link>
          <Link to="/admin/orders">الطلبات</Link>
          <Link to="/admin/products">المنتجات</Link>
          <Link to="/admin/collections" className="active">التصنيفات</Link>
          <Link to="/admin/settings">الإعدادات</Link>
        </nav>
      </aside>
      <main className="admin-main">
        <div className="admin-header-row"><h1>التصنيفات</h1></div>
        {loading ? <p>جاري التحميل...</p> : (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead><tr><th>الصورة</th><th>الاسم</th><th>الترتيب</th></tr></thead>
              <tbody>
                {collections.map(c => (
                  <tr key={c._id || c.id}>
                    <td>{c.imageUrl ? <img src={c.imageUrl} alt="" style={{width:'50px'}}/> : '-'}</td>
                    <td>{c.name}</td>
                    <td>{c.sortOrder}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  );
}
