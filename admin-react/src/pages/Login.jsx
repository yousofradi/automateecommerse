import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import '../styles/admin.css';

export default function Login() {
  const [key, setKey] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!key.trim()) { setError('أدخل مفتاح الأدمن'); return; }
    localStorage.setItem('adminKey', key.trim());
    navigate('/admin');
  };

  return (
    <div className="admin-login" dir="rtl">
      <div className="login-card">
        <h1>تسجيل الدخول</h1>
        <form onSubmit={handleSubmit}>
          <input type="password" placeholder="مفتاح الأدمن" value={key} onChange={e => setKey(e.target.value)} />
          {error && <p className="error-text">{error}</p>}
          <button type="submit" className="btn-primary">دخول</button>
        </form>
      </div>
    </div>
  );
}
