import { useEffect, useState, useCallback } from 'react';
import api from '../utils/api';
import { format } from 'date-fns';
import { Search, Filter, X, ChevronLeft, ChevronRight } from 'lucide-react';

const fmt = (n) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n || 0);

const CATEGORIES = ['all','Food & Dining','Transport','Shopping','Utilities','Healthcare','Entertainment','Salary','Transfer','Investment','Insurance','ATM','Other'];

const CATEGORY_COLORS = {
  'Food & Dining':'#f59e0b','Transport':'#3b82f6','Shopping':'#8b5cf6','Utilities':'#06b6d4',
  'Healthcare':'#10b981','Entertainment':'#ec4899','Salary':'#22c55e','Transfer':'#64748b',
  'Investment':'#6366f1','Insurance':'#f97316','ATM':'#94a3b8','Other':'#475569',
};

export default function Transactions() {
  const [transactions, setTransactions] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });
  const [filters, setFilters] = useState({ startDate:'', endDate:'', minAmount:'', maxAmount:'', keyword:'', type:'all', category:'all' });
  const [applied, setApplied] = useState({});
  const [showFilters, setShowFilters] = useState(false);

  const load = useCallback(async (page = 1, f = applied) => {
    setLoading(true);
    try {
      const params = { page, limit: 20, ...Object.fromEntries(Object.entries(f).filter(([,v]) => v && v !== 'all')) };
      const [t, s] = await Promise.all([
        api.get('/transactions', { params }),
        api.get('/transactions/summary', { params }),
      ]);
      setTransactions(t.data.transactions);
      setPagination(t.data.pagination);
      setSummary(s.data.summary);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [applied]);

  useEffect(() => { load(1, {}); }, []);

  const applyFilters = () => { setApplied({ ...filters }); load(1, filters); };
  const clearFilters = () => {
    const empty = { startDate:'', endDate:'', minAmount:'', maxAmount:'', keyword:'', type:'all', category:'all' };
    setFilters(empty); setApplied({}); load(1, {});
  };

  const hasFilters = Object.entries(applied).some(([k,v]) => v && v !== 'all');

  return (
    <div className="fade-in">
      {/* Summary */}
      {summary && (
        <div className="stats-grid" style={{ marginBottom: 20 }}>
          {[
            { label: 'Total Income', value: fmt(summary.total_income), cls: 'green', icon: '💰' },
            { label: 'Total Expenses', value: fmt(summary.total_expenses), cls: 'red', icon: '💸' },
            { label: 'Transactions', value: summary.total_transactions, cls: 'blue', icon: '🧾' },
            { label: 'Avg Amount', value: fmt(summary.avg_transaction), cls: 'purple', icon: '📊' },
          ].map((s,i) => (
            <div key={i} className={`stat-card ${s.cls}`}>
              <div className={`stat-icon ${s.cls}`}>{s.icon}</div>
              <div className="stat-label">{s.label}</div>
              <div className="stat-value">{s.value}</div>
            </div>
          ))}
        </div>
      )}

      {/* Filters */}
      <div className="card" style={{ marginBottom: 20 }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom: showFilters ? 16 : 0 }}>
          <div style={{ display:'flex', alignItems:'center', gap:12 }}>
            <div style={{ position:'relative', flex:1 }}>
              <Search size={16} style={{ position:'absolute', left:12, top:'50%', transform:'translateY(-50%)', color:'var(--text-muted)' }} />
              <input className="filter-input" placeholder="Search description…" value={filters.keyword}
                onChange={e => setFilters({...filters, keyword: e.target.value})}
                onKeyDown={e => e.key === 'Enter' && applyFilters()}
                style={{ paddingLeft: 38, minWidth: 260 }} />
            </div>
            <button className="btn btn-secondary btn-sm" onClick={() => setShowFilters(!showFilters)}>
              <Filter size={14} /> Filters {hasFilters && <span className="badge badge-blue" style={{ padding:'1px 6px' }}>ON</span>}
            </button>
            {hasFilters && <button className="btn btn-ghost btn-sm" onClick={clearFilters}><X size={14} /> Clear</button>}
          </div>
          <button className="btn btn-primary btn-sm" onClick={applyFilters}>Apply</button>
        </div>

        {showFilters && (
          <div className="filters-bar" style={{ margin: 0 }}>
            <div className="filter-group">
              <label className="filter-label">From Date</label>
              <input type="date" className="filter-input" value={filters.startDate} onChange={e => setFilters({...filters, startDate: e.target.value})} />
            </div>
            <div className="filter-group">
              <label className="filter-label">To Date</label>
              <input type="date" className="filter-input" value={filters.endDate} onChange={e => setFilters({...filters, endDate: e.target.value})} />
            </div>
            <div className="filter-group">
              <label className="filter-label">Min Amount (₹)</label>
              <input type="number" className="filter-input" placeholder="0" value={filters.minAmount} onChange={e => setFilters({...filters, minAmount: e.target.value})} />
            </div>
            <div className="filter-group">
              <label className="filter-label">Max Amount (₹)</label>
              <input type="number" className="filter-input" placeholder="Any" value={filters.maxAmount} onChange={e => setFilters({...filters, maxAmount: e.target.value})} />
            </div>
            <div className="filter-group">
              <label className="filter-label">Type</label>
              <select className="filter-input" value={filters.type} onChange={e => setFilters({...filters, type: e.target.value})}>
                <option value="all">All</option>
                <option value="credit">Credit</option>
                <option value="debit">Debit</option>
              </select>
            </div>
            <div className="filter-group">
              <label className="filter-label">Category</label>
              <select className="filter-input" value={filters.category} onChange={e => setFilters({...filters, category: e.target.value})}>
                {CATEGORIES.map(c => <option key={c} value={c}>{c === 'all' ? 'All Categories' : c}</option>)}
              </select>
            </div>
          </div>
        )}
      </div>

      {/* Table */}
      <div className="card">
        <div className="section-header">
          <div className="section-title">Transactions <span style={{ fontSize:13, color:'var(--text-muted)', fontWeight:400 }}>({pagination.total})</span></div>
        </div>

        {loading ? (
          <div className="loading-overlay"><div className="spinner" /><p>Loading…</p></div>
        ) : transactions.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">🔍</div>
            <div className="empty-state-title">No transactions found</div>
            <p style={{fontSize:14}}>Try adjusting your filters</p>
          </div>
        ) : (
          <>
            <div className="table-wrapper">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Date</th><th>Description</th><th>Category</th><th>Type</th><th style={{textAlign:'right'}}>Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.map(t => (
                    <tr key={t.id}>
                      <td style={{color:'var(--text-secondary)',fontSize:13,whiteSpace:'nowrap'}}>{format(new Date(t.date), 'dd MMM yyyy')}</td>
                      <td style={{maxWidth:260}}>
                        <span style={{display:'block',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',fontSize:14}}>{t.description}</span>
                        {t.statement_name && <span style={{fontSize:11,color:'var(--text-muted)'}}>{t.statement_name}</span>}
                      </td>
                      <td>
                        <span className="badge" style={{background:`${CATEGORY_COLORS[t.category]||'#64748b'}20`, color:CATEGORY_COLORS[t.category]||'#94a3b8'}}>
                          {t.category}
                        </span>
                      </td>
                      <td>
                        <span className={`badge ${t.type==='credit'?'badge-green':'badge-red'}`}>
                          {t.type==='credit'?'▲':'▼'} {t.type}
                        </span>
                      </td>
                      <td style={{textAlign:'right',fontWeight:600}} className={t.type==='credit'?'amount-credit':'amount-debit'}>
                        {t.type==='credit'?'+':'-'}{fmt(t.amount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {pagination.pages > 1 && (
              <div className="pagination">
                <button className="page-btn" disabled={pagination.page===1} onClick={() => load(pagination.page-1)}>
                  <ChevronLeft size={16} />
                </button>
                {Array.from({length: Math.min(5, pagination.pages)}, (_,i) => {
                  const p = pagination.page <= 3 ? i+1 : pagination.page-2+i;
                  if (p > pagination.pages) return null;
                  return <button key={p} className={`page-btn ${p===pagination.page?'active':''}`} onClick={() => load(p)}>{p}</button>;
                })}
                <button className="page-btn" disabled={pagination.page===pagination.pages} onClick={() => load(pagination.page+1)}>
                  <ChevronRight size={16} />
                </button>
                <span style={{fontSize:13,color:'var(--text-secondary)',marginLeft:8}}>
                  Page {pagination.page} of {pagination.pages}
                </span>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
