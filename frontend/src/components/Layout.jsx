import { useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  LayoutDashboard, Upload, Receipt, History,
  BarChart3, User, LogOut, X, Menu, TrendingUp
} from 'lucide-react';

const navItems = [
  { path: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { path: '/upload', icon: Upload, label: 'Upload Statement' },
  { path: '/transactions', icon: Receipt, label: 'Transactions' },
  { path: '/analytics', icon: BarChart3, label: 'Analytics' },
  { path: '/history', icon: History, label: 'History' },
];

const pageTitles = {
  '/dashboard': 'Dashboard',
  '/upload': 'Upload Statement',
  '/transactions': 'Transactions',
  '/analytics': 'Analytics',
  '/history': 'Upload History',
  '/profile': 'My Profile',
};

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const NavLink = ({ item }) => {
    const Icon = item.icon;
    const active = location.pathname === item.path;
    return (
      <div
        className={`nav-item ${active ? 'active' : ''}`}
        onClick={() => { navigate(item.path); setSidebarOpen(false); }}
      >
        <Icon className="nav-icon" size={18} />
        <span>{item.label}</span>
      </div>
    );
  };

  return (
    <div className="app-layout">
      {sidebarOpen && <div className="sidebar-overlay" onClick={() => setSidebarOpen(false)} />}

      <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="sidebar-logo">
          <div className="sidebar-logo-icon">💳</div>
          <div>
            <div className="sidebar-logo-text">FinAnalyzer</div>
            <div className="sidebar-logo-sub">Smart Bank Analytics</div>
          </div>
        </div>

        <nav className="sidebar-nav">
          <div className="nav-section-label">Main Menu</div>
          {navItems.map(item => <NavLink key={item.path} item={item} />)}
          <div className="nav-section-label" style={{ marginTop: 12 }}>Account</div>
          <div
            className={`nav-item ${location.pathname === '/profile' ? 'active' : ''}`}
            onClick={() => { navigate('/profile'); setSidebarOpen(false); }}
          >
            <User className="nav-icon" size={18} />
            <span>Profile</span>
          </div>
        </nav>

        <div className="sidebar-footer">
          <div className="sidebar-user" onClick={() => navigate('/profile')}>
            <div className="user-avatar">{user?.name?.[0]?.toUpperCase()}</div>
            <div className="user-info">
              <div className="user-name">{user?.name}</div>
              <div className="user-email">+91 {user?.phone}</div>
            </div>
          </div>
          <div className="nav-item" style={{ marginTop: 6 }} onClick={handleLogout}>
            <LogOut size={18} style={{ color: '#ef4444' }} />
            <span style={{ color: '#ef4444' }}>Logout</span>
          </div>
        </div>
      </aside>

      <div className="main-content">
        <header className="topbar">
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <button className="menu-toggle btn" onClick={() => setSidebarOpen(true)}>
              <Menu size={20} />
            </button>
            <div>
              <div className="topbar-title">{pageTitles[location.pathname] || 'FinAnalyzer'}</div>
            </div>
          </div>
          <div className="topbar-actions">
            <button className="btn btn-primary btn-sm" onClick={() => navigate('/upload')}>
              <Upload size={14} /> Upload
            </button>
            <div className="user-avatar" style={{ width: 34, height: 34, fontSize: 13, cursor: 'pointer' }}
              onClick={() => navigate('/profile')}>
              {user?.name?.[0]?.toUpperCase()}
            </div>
          </div>
        </header>
        <main className="page-content fade-in">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
