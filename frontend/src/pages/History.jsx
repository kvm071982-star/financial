import { useEffect, useState } from 'react';
import api from '../utils/api';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { Trash2, Eye, FileText, ChevronDown, ChevronUp } from 'lucide-react';

const fmt = (n) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n || 0);
const fmtSize = (b) => b < 1024*1024 ? `${(b/1024).toFixed(1)} KB` : `${(b/1024/1024).toFixed(1)} MB`;

export default function History() {
  const [uploads, setUploads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(null);
  const [txMap, setTxMap] = useState({});

  const load = async () => {
    try {
      const { data } = await api.get('/upload/history');
      setUploads(data.uploads);
    } catch { toast.error('Failed to load history'); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const handleDelete = async (id) => {
    if (!confirm('Delete this statement and all its transactions?')) return;
    try {
      await api.delete(`/upload/${id}`);
      toast.success('Statement deleted');
      setUploads(prev => prev.filter(u => u.id !== id));
    } catch { toast.error('Delete failed'); }
  };

  const toggleExpand = async (id) => {
    if (expanded === id) { setExpanded(null); return; }
    setExpanded(id);
    if (!txMap[id]) {
      try {
        const { data } = await api.get('/transactions', { params: { uploadId: id, limit: 100 } });
        setTxMap(prev => ({ ...prev, [id]: data.transactions }));
      } catch { toast.error('Failed to load transactions'); }
    }
  };

  const statusBadge = (s) => {
    const map = { completed: 'badge-green', processing: 'badge-orange', failed: 'badge-red' };
    return <span className={`badge ${map[s] || 'badge-gray'}`}>{s}</span>;
  };

  if (loading) return <div className="loading-overlay"><div className="spinner" /><p>Loading history…</p></div>;

  return (
    <div className="fade-in">
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, marginBottom: 6 }}>Upload History</h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: 14 }}>All your uploaded bank statements</p>
      </div>

      {uploads.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">📂</div>
          <div className="empty-state-title">No uploads yet</div>
          <p style={{ fontSize: 14 }}>Upload your first bank statement to get started</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {uploads.map(u => (
            <div key={u.id} className="card" style={{ padding: 0 }}>
              <div style={{ display:'flex', alignItems:'center', gap:14, padding:'18px 24px' }}>
                <div style={{ width:44, height:44, background:'rgba(59,130,246,0.12)', borderRadius:10, display:'grid', placeItems:'center', fontSize:22, flexShrink:0 }}>📑</div>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontWeight:600, fontSize:15, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{u.original_name}</div>
                  <div style={{ fontSize:12, color:'var(--text-secondary)', marginTop:2 }}>
                    {format(new Date(u.upload_date), 'dd MMM yyyy, hh:mm a')} · {fmtSize(u.file_size)} · {u.transaction_count} transactions
                  </div>
                </div>
                <div style={{ display:'flex', alignItems:'center', gap:10, flexShrink:0 }}>
                  {statusBadge(u.status)}
                  <button className="btn btn-ghost btn-sm" onClick={() => toggleExpand(u.id)}>
                    <Eye size={14} /> View
                    {expanded === u.id ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                  </button>
                  <button className="btn btn-ghost btn-sm" style={{ color:'var(--accent-red)' }} onClick={() => handleDelete(u.id)}>
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>

              {expanded === u.id && (
                <div style={{ borderTop: '1px solid var(--border)', padding: '16px 24px' }}>
                  {!txMap[u.id] ? (
                    <div style={{ textAlign:'center', padding:'20px' }}><div className="spinner" /></div>
                  ) : txMap[u.id].length === 0 ? (
                    <p style={{ color:'var(--text-secondary)', fontSize:14 }}>No transactions found</p>
                  ) : (
                    <div className="table-wrapper">
                      <table className="data-table">
                        <thead>
                          <tr><th>Date</th><th>Description</th><th>Category</th><th>Type</th><th style={{textAlign:'right'}}>Amount</th></tr>
                        </thead>
                        <tbody>
                          {txMap[u.id].slice(0, 20).map(t => (
                            <tr key={t.id}>
                              <td style={{fontSize:12,color:'var(--text-secondary)'}}>{format(new Date(t.date),'dd MMM yy')}</td>
                              <td style={{fontSize:13,maxWidth:200,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{t.description}</td>
                              <td><span className="badge badge-blue" style={{fontSize:10}}>{t.category}</span></td>
                              <td><span className={`badge ${t.type==='credit'?'badge-green':'badge-red'}`} style={{fontSize:10}}>{t.type}</span></td>
                              <td style={{textAlign:'right'}} className={t.type==='credit'?'amount-credit':'amount-debit'}>
                                {t.type==='credit'?'+':'-'}{fmt(t.amount)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      {txMap[u.id].length > 20 && (
                        <p style={{textAlign:'center',padding:'12px',fontSize:13,color:'var(--text-secondary)'}}>
                          Showing 20 of {txMap[u.id].length} — go to Transactions for full view
                        </p>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
