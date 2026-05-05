import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';
import toast from 'react-hot-toast';
import { Eye, EyeOff, Phone, Lock } from 'lucide-react';

export default function Login() {
  const [form, setForm] = useState({ phone: '', upiPin: '' });
  const [showPin, setShowPin] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const { login } = useAuth();
  const navigate = useNavigate();

  const validate = () => {
    const e = {};
    if (!/^[6-9]\d{9}$/.test(form.phone)) e.phone = 'Enter a valid 10-digit mobile number';
    if (!/^\d{4,6}$/.test(form.upiPin)) e.upiPin = 'UPI PIN must be 4–6 digits';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (ev) => {
    ev.preventDefault();
    if (!validate()) return;
    setLoading(true);
    try {
      const { data } = await api.post('/auth/login', form);
      login(data.token, data.user);
      toast.success(`Welcome back, ${data.user.name}!`);
      navigate('/dashboard');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card slide-up">
        <div className="auth-logo">
          <div className="auth-logo-icon">💳</div>
          <span>FinAnalyzer</span>
        </div>
        <h1 className="auth-title">Welcome back</h1>
        <p className="auth-sub">Sign in with your mobile number & UPI PIN</p>

        <form onSubmit={handleSubmit}>
          {/* Phone */}
          <div className="form-group">
            <label className="form-label">Mobile Number</label>
            <div style={{ position: 'relative' }}>
              <Phone size={16} style={{ position:'absolute', left:14, top:'50%', transform:'translateY(-50%)', color:'var(--text-muted)' }} />
              <span style={{ position:'absolute', left:38, top:'50%', transform:'translateY(-50%)', color:'var(--text-secondary)', fontSize:14, pointerEvents:'none' }}>+91</span>
              <input
                className={`form-input ${errors.phone ? 'error' : ''}`}
                type="tel"
                maxLength={10}
                placeholder="9876543210"
                value={form.phone}
                onChange={e => setForm({ ...form, phone: e.target.value.replace(/\D/g, '').slice(0,10) })}
                style={{ paddingLeft: 68 }}
              />
            </div>
            {errors.phone && <p className="form-error">{errors.phone}</p>}
          </div>

          {/* UPI PIN */}
          <div className="form-group">
            <label className="form-label">UPI PIN</label>
            <div style={{ position: 'relative' }}>
              <Lock size={16} style={{ position:'absolute', left:14, top:'50%', transform:'translateY(-50%)', color:'var(--text-muted)' }} />
              <input
                className={`form-input ${errors.upiPin ? 'error' : ''}`}
                type={showPin ? 'text' : 'password'}
                inputMode="numeric"
                maxLength={6}
                placeholder="4–6 digit PIN"
                value={form.upiPin}
                onChange={e => setForm({ ...form, upiPin: e.target.value.replace(/\D/g, '').slice(0,6) })}
                style={{ paddingLeft: 42, paddingRight: 44, letterSpacing: '0.25em', fontSize: 18 }}
              />
              <button type="button" onClick={() => setShowPin(!showPin)}
                style={{ position:'absolute', right:14, top:'50%', transform:'translateY(-50%)', background:'none', color:'var(--text-muted)' }}>
                {showPin ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            {errors.upiPin && <p className="form-error">{errors.upiPin}</p>}
          </div>

          {/* PIN dots preview */}
          {form.upiPin.length > 0 && (
            <div style={{ display:'flex', gap:8, marginBottom:16, justifyContent:'center' }}>
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} style={{
                  width: 12, height: 12, borderRadius: '50%',
                  background: i < form.upiPin.length ? 'var(--accent-blue)' : 'var(--border)',
                  transition: 'background 0.2s',
                }} />
              ))}
            </div>
          )}

          <button type="submit" className="btn btn-primary btn-full" disabled={loading} style={{ marginTop: 8 }}>
            {loading ? <span className="spinner" style={{ width:18, height:18, borderWidth:2 }} /> : '🔐 Sign In'}
          </button>
        </form>

        <p style={{ textAlign:'center', marginTop:20, fontSize:14, color:'var(--text-secondary)' }}>
          Don't have an account? <Link to="/register" className="auth-link">Create one</Link>
        </p>
      </div>
    </div>
  );
}
