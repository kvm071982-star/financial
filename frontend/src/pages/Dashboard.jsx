import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';
import { TrendingUp, TrendingDown, DollarSign, Receipt, Upload, ArrowUpRight } from 'lucide-react';
import { format } from 'date-fns';

const fmt = (n) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n || 0);

const CATEGORY_COLORS = {
  'Food & Dining': '#f59e0b', 'Transport': '#3b82f6', 'Shopping': '#8b5cf6',
  'Utilities': '#06b6d4', 'Healthcare': '#10b981', 'Entertainment': '#ec4899',
  'Salary': '#22c55e', 'Transfer': '#64748b', 'Investment': '#6366f1',
  'Insurance': '#f97316', 'ATM': '#94a3b8', 'Other': '#475569',
};

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [summary, setSummary] = useState(null);
  const [recent, setRecent] = useState([]);
  const [insights, setInsights] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const [s, t, i] = await Promise.all([
          api.get('/transactions/summary'),
          api.get('/transactions?limit=8&sortBy=date&sortOrder=DESC'),
          api.get('/transactions/insights'),
        ]);
        setSummary(s.data.summary);
        setRecent(t.data.transactions);
        setInsights(i.data.insights);
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    };
    load();
  }, []);

  if (loading) return <div className="loading-overlay"><div className="spinner" /><p>Loading dashboard…</p></div>;

  const net = (summary?.total_income || 0) - (summary?.total_expenses || 0);

  return (
    <div className="fade-in">
      {/* Welcome */}
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 24, fontWeight: 800, marginBottom: 4 }}>
          Good {new Date().getHours() < 12 ? 'Morning' : new Date().getHours() < 17 ? 'Afternoon' : 'Evening'}, {user?.name?.split(' ')[0]} 👋
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: 14 }}>
          Here's your financial overview for {format(new Date(), 'MMMM yyyy')}
        </p>
      </div>

      {/* Stats */}
      <div className="stats-grid">
        {[
          { label: 'Total Income', value: fmt(summary?.total_income), icon: '💰', cls: 'green', change: '+' },
          { label: 'Total Expenses', value: fmt(summary?.total_expenses), icon: '💸', cls: 'red', change: '-' },
          { label: 'Net Balance', value: fmt(Math.abs(net)), icon: net >= 0 ? '📈' : '📉', cls: net >= 0 ? 'blue' : 'red', change: net >= 0 ? 'Surplus' : 'Deficit' },
          { label: 'Transactions', value: summary?.total_transactions || 0, icon: '🧾', cls: 'purple', change: `${summary?.credit_count || 0} in / ${summary?.debit_count || 0} out` },
        ].map((s, i) => (
          <div key={i} className={`stat-card ${s.cls}`}>
            <div className={`stat-icon ${s.cls}`}>{s.icon}</div>
            <div className="stat-label">{s.label}</div>
            <div className="stat-value">{s.value}</div>
            <div className="stat-change">{s.change}</div>
          </div>
        ))}
      </div>

      {/* Insights Row */}
      {insights && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))', gap: 16, marginBottom: 28 }}>
          <div className="insight-card">
            <div className="insight-icon">🔥</div>
            <div>
              <div className="insight-label">Highest Expense Month</div>
              <div className="insight-value">{insights.highestExpenseMonth?.month || 'N/A'}</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{fmt(insights.highestExpenseMonth?.total)}</div>
            </div>
          </div>
          <div className="insight-card">
            <div className="insight-icon">🏆</div>
            <div>
              <div className="insight-label">Top Spending Category</div>
              <div className="insight-value">{insights.topCategory?.category || 'N/A'}</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{fmt(insights.topCategory?.total)}</div>
            </div>
          </div>
          <div className="insight-card">
            <div className="insight-icon">📊</div>
            <div>
              <div className="insight-label">Avg Monthly Spending</div>
              <div className="insight-value">{fmt(insights.avgMonthlySpending)}</div>
            </div>
          </div>
          <div className="insight-card">
            <div className="insight-icon">{insights.monthlyChange >= 0 ? '📈' : '📉'}</div>
            <div>
              <div className="insight-label">vs Last Month</div>
              <div className={`insight-value ${insights.monthlyChange >= 0 ? 'amount-debit' : 'amount-credit'}`}>
                {insights.monthlyChange >= 0 ? '+' : ''}{insights.monthlyChange}%
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>This month spending</div>
            </div>
          </div>
        </div>
      )}

      {/* Recent Transactions */}
      <div className="card">
        <div className="section-header">
          <div>
            <div className="section-title">Recent Transactions</div>
            <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Latest 8 entries</div>
          </div>
          <button className="btn btn-secondary btn-sm" onClick={() => navigate('/transactions')}>
            View All <ArrowUpRight size={14} />
          </button>
        </div>

        {recent.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">📂</div>
            <div className="empty-state-title">No transactions yet</div>
            <p style={{ marginBottom: 16, fontSize: 14 }}>Upload a bank statement to get started</p>
            <button className="btn btn-primary btn-sm" onClick={() => navigate('/upload')}>
              <Upload size={14} /> Upload Now
            </button>
          </div>
        ) : (
          <div className="table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Date</th><th>Description</th><th>Category</th><th>Type</th><th style={{ textAlign: 'right' }}>Amount</th>
                </tr>
              </thead>
              <tbody>
                {recent.map(t => (
                  <tr key={t.id}>
                    <td style={{ color: 'var(--text-secondary)', fontSize: 13 }}>{format(new Date(t.date), 'dd MMM yyyy')}</td>
                    <td style={{ maxWidth: 220 }}>
                      <span style={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.description}</span>
                    </td>
                    <td>
                      <span className="badge badge-blue" style={{ background: `${CATEGORY_COLORS[t.category] || '#64748b'}20`, color: CATEGORY_COLORS[t.category] || '#94a3b8' }}>
                        {t.category}
                      </span>
                    </td>
                    <td>
                      <span className={`badge ${t.type === 'credit' ? 'badge-green' : 'badge-red'}`}>
                        {t.type === 'credit' ? '▲' : '▼'} {t.type}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <span className={t.type === 'credit' ? 'amount-credit' : 'amount-debit'}>
                        {t.type === 'credit' ? '+' : '-'}{fmt(t.amount)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
