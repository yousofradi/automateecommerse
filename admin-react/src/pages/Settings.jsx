import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/client';
import '../styles/admin.css';

export default function Settings() {
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.getSetting('store_global_settings').then(res => {
      setSettings(res || { storeName: '', storeLogo: '', primaryColor: '#000000' });
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.updateSetting('store_global_settings', settings);
      alert('تم الحفظ بنجاح');
    } catch (err) {
      alert('فشل الحفظ');
    }
    setSaving(false);
  };

  return (
    <div className="admin-layout" dir="rtl">
      <aside className="admin-sidebar">
        <nav className="admin-nav">
          <Link to="/admin">الرئيسية</Link>
          <Link to="/admin/orders">الطلبات</Link>
          <Link to="/admin/products">المنتجات</Link>
          <Link to="/admin/collections">التصنيفات</Link>
          <Link to="/admin/settings" className="active">الإعدادات</Link>
        </nav>
      </aside>
      <main className="admin-main">
        <div className="admin-header-row"><h1>الإعدادات</h1></div>
        {loading ? <p>جاري التحميل...</p> : (
          <form onSubmit={handleSubmit} className="settings-form">
            <div className="form-group">
              <label>اسم المتجر</label>
              <input type="text" value={settings.storeName || ''} onChange={e => setSettings({...settings, storeName: e.target.value})} />
            </div>
            <div className="form-group">
              <label>رابط اللوجو</label>
              <input type="text" value={settings.storeLogo || ''} onChange={e => setSettings({...settings, storeLogo: e.target.value})} />
            </div>
            <div className="form-group">
              <label>اللون الأساسي</label>
              <input type="color" value={settings.primaryColor || '#000000'} onChange={e => setSettings({...settings, primaryColor: e.target.value})} />
            </div>
            <button type="submit" className="btn-primary" disabled={saving}>{saving ? 'جاري الحفظ...' : 'حفظ'}</button>
          </form>
        )}
      </main>
    </div>
  );
}
