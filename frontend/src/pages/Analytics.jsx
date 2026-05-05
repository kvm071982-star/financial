import { useEffect, useState } from 'react';
import api from '../utils/api';
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';

const fmt = (n) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n || 0);

const COLORS = ['#3b82f6','#10b981','#f59e0b','#8b5cf6','#ef4444','#06b6d4','#ec4899','#22c55e','#6366f1','#f97316','#94a3b8','#475569'];

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background:'var(--bg-card)', border:'1px solid var(--border)', borderRadius:10, padding:'12px 16px', minWidth:150 }}>
      <p style={{ fontSize:13, fontWeight:600, marginBottom:8, color:'var(--text-secondary)' }}>{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ fontSize:14, color: p.color, fontWeight:600 }}>
          {p.name}: {typeof p.value === 'number' && p.value > 100 ? fmt(p.value) : p.value}
        </p>
      ))}
    </div>
  );
};

export default function Analytics() {
  const [monthly, setMonthly] = useState([]);
  const [categories, setCategories] = useState([]);
  const [insights, setInsights] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const [m, c, i] = await Promise.all([
          api.get('/transactions/monthly'),
          api.get('/transactions/categories'),
          api.get('/transactions/insights'),
        ]);
        setMonthly(m.data.monthly);
        setCategories(c.data.categories);
        setInsights(i.data.insights);
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    };
    load();
  }, []);

  if (loading) return <div className="loading-overlay"><div className="spinner" /><p>Loading analytics…</p></div>;

  const noData = monthly.length === 0 && categories.length === 0;

  return (
    <div className="fade-in">
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, marginBottom: 6 }}>Analytics</h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: 14 }}>Visual insights into your spending patterns</p>
      </div>

      {noData ? (
        <div className="empty-state">
          <div className="empty-state-icon">📊</div>
          <div className="empty-state-title">No data to display</div>
          <p style={{ fontSize: 14 }}>Upload a bank statement to see analytics</p>
        </div>
      ) : (
        <>
          {/* Insight Cards */}
          {insights && (
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(200px,1fr))', gap:16, marginBottom:28 }}>
              {[
                { icon:'🔥', label:'Highest Expense Month', value: insights.highestExpenseMonth?.month || 'N/A', sub: fmt(insights.highestExpenseMonth?.total) },
                { icon:'🏆', label:'Top Category', value: insights.topCategory?.category || 'N/A', sub: fmt(insights.topCategory?.total) },
                { icon:'📊', label:'Avg Monthly Spend', value: fmt(insights.avgMonthlySpending) },
                { icon: insights.monthlyChange >= 0 ? '📈':'📉', label:'Month-over-Month', value: `${insights.monthlyChange>=0?'+':''}${insights.monthlyChange}%`, sub:'vs last month' },
              ].map((s,i) => (
                <div key={i} className="insight-card">
                  <div className="insight-icon">{s.icon}</div>
                  <div>
                    <div className="insight-label">{s.label}</div>
                    <div className="insight-value">{s.value}</div>
                    {s.sub && <div style={{ fontSize:12, color:'var(--text-muted)' }}>{s.sub}</div>}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Monthly Bar Chart */}
          {monthly.length > 0 && (
            <div className="chart-card" style={{ marginBottom: 20 }}>
              <div className="chart-header">
                <div className="chart-title">📅 Monthly Income vs Expenses</div>
                <span className="badge badge-blue">Last 12 Months</span>
              </div>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={monthly} margin={{ top:5, right:20, left:10, bottom:5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="month_label" tick={{ fill:'var(--text-secondary)', fontSize:12 }} tickLine={false} />
                  <YAxis tick={{ fill:'var(--text-secondary)', fontSize:12 }} tickLine={false} axisLine={false} tickFormatter={v => `₹${(v/1000).toFixed(0)}k`} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend wrapperStyle={{ color:'var(--text-secondary)', fontSize:13 }} />
                  <Bar dataKey="income" name="Income" fill="#10b981" radius={[4,4,0,0]} />
                  <Bar dataKey="expenses" name="Expenses" fill="#ef4444" radius={[4,4,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          <div className="chart-grid">
            {/* Pie Chart */}
            {categories.length > 0 && (
              <div className="chart-card">
                <div className="chart-header">
                  <div className="chart-title">🥧 Expenses by Category</div>
                </div>
                <ResponsiveContainer width="100%" height={280}>
                  <PieChart>
                    <Pie data={categories} dataKey="total" nameKey="category" cx="50%" cy="50%" outerRadius={100} label={({ category, percent }) => `${category} ${(percent*100).toFixed(0)}%`} labelLine={false}>
                      {categories.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Pie>
                    <Tooltip formatter={(v) => fmt(v)} contentStyle={{ background:'var(--bg-card)', border:'1px solid var(--border)', borderRadius:10 }} />
                  </PieChart>
                </ResponsiveContainer>
                <div style={{ display:'flex', flexWrap:'wrap', gap:'8px 16px', marginTop:12 }}>
                  {categories.slice(0,8).map((c,i) => (
                    <div key={i} style={{ display:'flex', alignItems:'center', gap:6, fontSize:12 }}>
                      <div style={{ width:10, height:10, borderRadius:'50%', background:COLORS[i%COLORS.length], flexShrink:0 }} />
                      <span style={{ color:'var(--text-secondary)' }}>{c.category}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Line Chart */}
            {monthly.length > 0 && (
              <div className="chart-card">
                <div className="chart-header">
                  <div className="chart-title">📈 Spending Trend</div>
                </div>
                <ResponsiveContainer width="100%" height={280}>
                  <LineChart data={monthly} margin={{ top:5, right:20, left:10, bottom:5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                    <XAxis dataKey="month_label" tick={{ fill:'var(--text-secondary)', fontSize:11 }} tickLine={false} />
                    <YAxis tick={{ fill:'var(--text-secondary)', fontSize:11 }} tickLine={false} axisLine={false} tickFormatter={v => `₹${(v/1000).toFixed(0)}k`} />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend wrapperStyle={{ color:'var(--text-secondary)', fontSize:13 }} />
                    <Line type="monotone" dataKey="expenses" name="Expenses" stroke="#ef4444" strokeWidth={2.5} dot={{ r:4 }} activeDot={{ r:6 }} />
                    <Line type="monotone" dataKey="income" name="Income" stroke="#10b981" strokeWidth={2.5} dot={{ r:4 }} activeDot={{ r:6 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          {/* Category Breakdown Table */}
          {categories.length > 0 && (
            <div className="card">
              <div className="section-title" style={{ marginBottom:16 }}>Category Breakdown</div>
              <div className="table-wrapper">
                <table className="data-table">
                  <thead>
                    <tr><th>#</th><th>Category</th><th>Transactions</th><th style={{textAlign:'right'}}>Total Spent</th><th>Share</th></tr>
                  </thead>
                  <tbody>
                    {categories.map((c,i) => {
                      const total = categories.reduce((s,x) => s + Number(x.total), 0);
                      const pct = total > 0 ? ((c.total / total) * 100).toFixed(1) : 0;
                      return (
                        <tr key={i}>
                          <td style={{ color:'var(--text-muted)', fontSize:13 }}>{i+1}</td>
                          <td>
                            <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                              <div style={{ width:10, height:10, borderRadius:'50%', background:COLORS[i%COLORS.length] }} />
                              {c.category}
                            </div>
                          </td>
                          <td style={{ color:'var(--text-secondary)' }}>{c.count}</td>
                          <td style={{ textAlign:'right', fontWeight:600, color:'#f87171' }}>{fmt(c.total)}</td>
                          <td style={{ width:140 }}>
                            <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                              <div className="progress-bar" style={{ flex:1 }}>
                                <div className="progress-fill" style={{ width:`${pct}%`, background:COLORS[i%COLORS.length] }} />
                              </div>
                              <span style={{ fontSize:12, color:'var(--text-secondary)', minWidth:36 }}>{pct}%</span>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
