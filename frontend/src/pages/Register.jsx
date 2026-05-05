import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';
import toast from 'react-hot-toast';
import { Eye, EyeOff, Phone, Lock, User, Mail } from 'lucide-react';

export default function Register() {
  const [form, setForm] = useState({ name: '', phone: '', upiPin: '', confirmPin: '', email: '' });
  const [showPin, setShowPin] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const { login } = useAuth();
  const navigate = useNavigate();

  const validate = () => {
    const e = {};
    if (!form.name.trim()) e.name = 'Name is required';
    if (!/^[6-9]\d{9}$/.test(form.phone)) e.phone = 'Enter a valid 10-digit Indian mobile number';
    if (!/^\d{4,6}$/.test(form.upiPin)) e.upiPin = 'UPI PIN must be 4–6 digits';
    if (form.upiPin !== form.confirmPin) e.confirmPin = 'PINs do not match';
    if (form.email && !/\S+@\S+\.\S+/.test(form.email)) e.email = 'Enter a valid email (optional)';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (ev) => {
    ev.preventDefault();
    if (!validate()) return;
    setLoading(true);
    try {
      const { data } = await api.post('/auth/register', {
        name: form.name,
        phone: form.phone,
        upiPin: form.upiPin,
        email: form.email || undefined,
      });
      login(data.token, data.user);
      toast.success('Account created successfully!');
      navigate('/dashboard');
    } catch (err) {
      const msg = err.response?.data?.message || 'Registration failed';
      toast.error(msg);
      if (err.response?.data?.errors) {
        const fieldErrors = {};
        err.response.data.errors.forEach(e => { fieldErrors[e.path] = e.msg; });
        setErrors(fieldErrors);
      }
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
        <h1 className="auth-title">Create account</h1>
        <p className="auth-sub">Sign up with your mobile number & set a UPI PIN</p>

        <form onSubmit={handleSubmit}>
          {/* Name */}
          <div className="form-group">
            <label className="form-label">Full Name</label>
            <div style={{ position:'relative' }}>
              <User size={16} style={{ position:'absolute', left:14, top:'50%', transform:'translateY(-50%)', color:'var(--text-muted)' }} />
              <input className={`form-input ${errors.name?'error':''}`}
                placeholder="John Doe" value={form.name}
                onChange={e => setForm({...form, name: e.target.value})}
                style={{ paddingLeft: 42 }} />
            </div>
            {errors.name && <p className="form-error">{errors.name}</p>}
          </div>

          {/* Phone */}
          <div className="form-group">
            <label className="form-label">Mobile Number</label>
            <div style={{ position:'relative' }}>
              <Phone size={16} style={{ position:'absolute', left:14, top:'50%', transform:'translateY(-50%)', color:'var(--text-muted)' }} />
              <span style={{ position:'absolute', left:38, top:'50%', transform:'translateY(-50%)', color:'var(--text-secondary)', fontSize:14, pointerEvents:'none' }}>+91</span>
              <input className={`form-input ${errors.phone?'error':''}`}
                type="tel" maxLength={10} placeholder="9876543210" value={form.phone}
                onChange={e => setForm({...form, phone: e.target.value.replace(/\D/g,'').slice(0,10)})}
                style={{ paddingLeft: 68 }} />
            </div>
            {errors.phone && <p className="form-error">{errors.phone}</p>}
          </div>

          {/* UPI PIN */}
          <div className="form-group">
            <label className="form-label">Set UPI PIN <span style={{color:'var(--text-muted)',fontWeight:400}}>(4–6 digits)</span></label>
            <div style={{ position:'relative' }}>
              <Lock size={16} style={{ position:'absolute', left:14, top:'50%', transform:'translateY(-50%)', color:'var(--text-muted)' }} />
              <input className={`form-input ${errors.upiPin?'error':''}`}
                type={showPin?'text':'password'} inputMode="numeric"
                maxLength={6} placeholder="e.g. 1234" value={form.upiPin}
                onChange={e => setForm({...form, upiPin: e.target.value.replace(/\D/g,'').slice(0,6)})}
                style={{ paddingLeft:42, paddingRight:44, letterSpacing:'0.25em', fontSize:18 }} />
              <button type="button" onClick={() => setShowPin(!showPin)}
                style={{ position:'absolute', right:14, top:'50%', transform:'translateY(-50%)', background:'none', color:'var(--text-muted)' }}>
                {showPin ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            {errors.upiPin && <p className="form-error">{errors.upiPin}</p>}
          </div>

          {/* Confirm PIN */}
          <div className="form-group">
            <label className="form-label">Confirm UPI PIN</label>
            <div style={{ position:'relative' }}>
              <Lock size={16} style={{ position:'absolute', left:14, top:'50%', transform:'translateY(-50%)', color:'var(--text-muted)' }} />
              <input className={`form-input ${errors.confirmPin?'error':''}`}
                type={showPin?'text':'password'} inputMode="numeric"
                maxLength={6} placeholder="Repeat PIN" value={form.confirmPin}
                onChange={e => setForm({...form, confirmPin: e.target.value.replace(/\D/g,'').slice(0,6)})}
                style={{ paddingLeft:42, letterSpacing:'0.25em', fontSize:18 }} />
            </div>
            {errors.confirmPin && <p className="form-error">{errors.confirmPin}</p>}
          </div>

          {/* PIN match indicator */}
          {form.upiPin && form.confirmPin && (
            <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:14, fontSize:13 }}>
              {form.upiPin === form.confirmPin
                ? <><span style={{color:'var(--accent-green)'}}>✓</span><span style={{color:'var(--accent-green)'}}>PINs match</span></>
                : <><span style={{color:'var(--accent-red)'}}>✗</span><span style={{color:'var(--accent-red)'}}>PINs do not match</span></>}
            </div>
          )}

          {/* Email (optional) */}
          <div className="form-group">
            <label className="form-label">Email Address <span style={{color:'var(--text-muted)',fontWeight:400}}>(optional)</span></label>
            <div style={{ position:'relative' }}>
              <Mail size={16} style={{ position:'absolute', left:14, top:'50%', transform:'translateY(-50%)', color:'var(--text-muted)' }} />
              <input className={`form-input ${errors.email?'error':''}`}
                type="email" placeholder="you@example.com" value={form.email}
                onChange={e => setForm({...form, email: e.target.value})}
                style={{ paddingLeft: 42 }} />
            </div>
            {errors.email && <p className="form-error">{errors.email}</p>}
          </div>

          <button type="submit" className="btn btn-primary btn-full" disabled={loading} style={{ marginTop: 4 }}>
            {loading ? <span className="spinner" style={{width:18,height:18,borderWidth:2}} /> : '🚀 Create Account'}
          </button>
        </form>

        <p style={{ textAlign:'center', marginTop:20, fontSize:14, color:'var(--text-secondary)' }}>
          Already have an account? <Link to="/login" className="auth-link">Sign in</Link>
        </p>
      </div>
    </div>
  );
}
