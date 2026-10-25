// src/components/MobileTabBar.jsx
import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Home, Calendar, Activity, LayoutDashboard } from 'lucide-react';

export default function MobileTabBar({ lastApptId }) {
  const location = useLocation();
  const navigate = useNavigate();

  const tabs = [
    { path: '/',       icon: <Home size={20} />,            label: 'Home' },
    { path: '/book',   icon: <Calendar size={20} />,        label: 'Book' },
    { path: lastApptId ? `/track/${lastApptId}` : '/track',
                       icon: <Activity size={20} />,        label: 'Track' },
    { path: '/clinic', icon: <LayoutDashboard size={20} />, label: 'Clinic' },
  ];

  return (
    <nav style={{
      display: 'none',
      position: 'fixed',
      bottom: 0, left: 0, right: 0,
      zIndex: 200,
      background: 'rgba(255,255,255,0.96)',
      backdropFilter: 'blur(20px)',
      WebkitBackdropFilter: 'blur(20px)',
      borderTop: '1px solid var(--border)',
      padding: '8px 0 env(safe-area-inset-bottom, 8px)',
      boxShadow: '0 -4px 16px rgba(15, 23, 42, 0.05)',
    }} className="mobile-tab-bar">
      {tabs.map(({ path, icon, label }) => {
        const active = location.pathname === path || (path !== '/' && location.pathname.startsWith(path));
        return (
          <button key={path} onClick={() => navigate(path)} style={{
            flex: 1,
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
            background: 'none', border: 'none',
            color: active ? '#4F46E5' : 'var(--muted)',
            fontSize: 11, fontWeight: active ? 700 : 500,
            padding: '4px 0',
            minHeight: 44,
            transition: 'color .15s',
          }}>
            {icon}
            {label}
          </button>
        );
      })}

      <style>{`
        @media (max-width: 640px) {
          .mobile-tab-bar { display: flex !important; }
          main { padding-bottom: 72px; }
        }
      `}</style>
    </nav>
  );
}
