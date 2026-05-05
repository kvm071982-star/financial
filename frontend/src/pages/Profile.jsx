import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';
import toast from 'react-hot-toast';
import { User, Mail, Shield, Save, Phone } from 'lucide-react';
import { format } from 'date-fns';

export default function Profile() {
  const { user, updateUser } = useAuth();
  const [form, setForm] = useState({ name: user?.name || '', email: user?.email || '' });
  const [pinForm, setPinForm] = useState({ currentPin: '', newPin: '', confirmNew: '' });
  const [saving, setSaving] = useState(false);
  const [savingPin, setSavingPin] = useState(false);
  const [errors, setErrors] = useState({});

  const handleProfile = async (e) => {
    e.preventDefault();
    const err = {};
    if (!form.name.trim()) err.name = 'Name is required';
    if (form.email && !/\S+@\S+\.\S+/.test(form.email)) err.email = 'Invalid email';
    if (Object.keys(err).length) { setErrors(err); return; }
    setSaving(true);
    try {
      const { data } = await api.put('/auth/profile', form);
      updateUser(data.user);
      toast.success('Profile updated!');
      setErrors({});
    } catch (err) {
      toast.error(err.response?.data?.message || 'Update failed');
    } finally { setSaving(false); }
  };

  const handlePin = async (e) => {
    e.preventDefault();
    const err = {};
    if (!pinForm.currentPin) err.currentPin = 'Required';
    if (!/^\d{4,6}$/.test(pinForm.newPin)) err.newPin = 'Must be 4–6 digits';
    if (pinForm.newPin !== pinForm.confirmNew) err.confirmNew = 'PINs do not match';
    if (Object.keys(err).length) { setErrors(err); return; }
    setSavingPin(true);
    try {
      await api.put('/auth/profile', { ...form, currentPin: pinForm.currentPin, newPin: pinForm.newPin });
      toast.success('UPI PIN changed successfully!');
      setPinForm({ currentPin: '', newPin: '', confirmNew: '' });
      setErrors({});
    } catch (err) {
      toast.error(err.response?.data?.message || 'PIN update failed');
    } finally { setSavingPin(false); }
  };

  return (
    <div className="fade-in" style={{ maxWidth: 640, margin: '0 auto' }}>
      {/* Avatar Header */}
      <div className="card" style={{ textAlign:'center', marginBottom:20, padding:'40px 24px' }}>
        <div style={{ width:80, height:80, background:'var(--gradient-blue)', borderRadius:'50%', display:'grid', placeItems:'center', margin:'0 auto 16px', fontSize:32, fontWeight:700 }}>
          {user?.name?.[0]?.toUpperCase()}
        </div>
        <h2 style={{ fontSize:22, fontWeight:800, marginBottom:4 }}>{user?.name}</h2>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:6, color:'var(--text-secondary)', fontSize:14 }}>
          <Phone size={14} /> +91 {user?.phone}
        </div>
        {user?.email && <p style={{ color:'var(--text-muted)', fontSize:13, marginTop:4 }}>{user.email}</p>}
        {user?.created_at && (
          <p style={{ color:'var(--text-muted)', fontSize:12, marginTop:8 }}>
            Member since {format(new Date(user.created_at), 'MMMM yyyy')}
          </p>
        )}
      </div>

      {/* Profile Info */}
      <div className="card" style={{ marginBottom:20 }}>
        <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:20 }}>
          <User size={18} color="var(--accent-blue)" />
          <div className="card-title">Personal Information</div>
        </div>
        <form onSubmit={handleProfile}>
          <div className="form-group">
            <label className="form-label">Full Name</label>
            <input className={`form-input ${errors.name?'error':''}`}
              value={form.name} placeholder="Your name"
              onChange={e => setForm({...form, name: e.target.value})} />
            {errors.name && <p className="form-error">{errors.name}</p>}
          </div>

          <div className="form-group">
            <label className="form-label">Mobile Number <span style={{color:'var(--text-muted)',fontWeight:400}}>(cannot change)</span></label>
            <div style={{ position:'relative' }}>
              <input className="form-input" value={`+91 ${user?.phone || ''}`} disabled
                style={{ opacity:0.5, cursor:'not-allowed', paddingLeft:14 }} />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Email Address <span style={{color:'var(--text-muted)',fontWeight:400}}>(optional)</span></label>
            <input className={`form-input ${errors.email?'error':''}`}
              type="email" value={form.email} placeholder="you@example.com"
              onChange={e => setForm({...form, email: e.target.value})} />
            {errors.email && <p className="form-error">{errors.email}</p>}
          </div>

          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? <><span className="spinner" style={{width:16,height:16,borderWidth:2}} /> Saving…</> : <><Save size={15} /> Save Changes</>}
          </button>
        </form>
      </div>

      {/* Change UPI PIN */}
      <div className="card">
        <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:20 }}>
          <Shield size={18} color="var(--accent-purple)" />
          <div className="card-title">Change UPI PIN</div>
        </div>
        <form onSubmit={handlePin}>
          {[
            { key:'currentPin', label:'Current UPI PIN', ph:'Your existing PIN' },
            { key:'newPin', label:'New UPI PIN', ph:'4–6 digit new PIN' },
            { key:'confirmNew', label:'Confirm New PIN', ph:'Repeat new PIN' },
          ].map(f => (
            <div className="form-group" key={f.key}>
              <label className="form-label">{f.label}</label>
              <input className={`form-input ${errors[f.key]?'error':''}`}
                type="password" inputMode="numeric" maxLength={6}
                value={pinForm[f.key]} placeholder={f.ph}
                onChange={e => setPinForm({...pinForm, [f.key]: e.target.value.replace(/\D/g,'').slice(0,6)})}
                style={{ letterSpacing:'0.2em', fontSize:18 }} />
              {errors[f.key] && <p className="form-error">{errors[f.key]}</p>}
            </div>
          ))}
          <button type="submit" className="btn btn-secondary" disabled={savingPin}>
            {savingPin ? <><span className="spinner" style={{width:16,height:16,borderWidth:2}} /> Updating…</> : <>🔐 Update PIN</>}
          </button>
        </form>
      </div>
    </div>
  );
}
