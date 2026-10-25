// src/components/Navbar.jsx
import React, { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Activity, Calendar, LayoutDashboard, Lock } from 'lucide-react';
import { getAuthToken } from '../api.js';

export default function Navbar() {
  const location = useLocation();
  const navigate = useNavigate();
  const [scrolled, setScrolled] = useState(false);
  const isAuthenticated = Boolean(getAuthToken());

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 8);
    window.addEventListener('scroll', fn, { passive: true });
    return () => window.removeEventListener('scroll', fn);
  }, []);

  const clinicPath = isAuthenticated ? '/clinic' : '/clinic/login';

  const navLinks = [
    { to: '/book', label: 'Book', icon: <Calendar size={16} /> },
    { to: '/track', label: 'Track', icon: <Activity size={16} /> },
    {
      to: clinicPath,
      label: 'Clinic',
      icon: <Lock size={14} style={{ color: '#4F46E5' }} />,
    },
  ];

  return (
    <header style={{
      position: 'sticky',
      top: 0,
      zIndex: 100,
      background: scrolled ? 'rgba(255,255,255,0.92)' : 'rgba(255,255,255,0.85)',
      backdropFilter: 'blur(16px)',
      WebkitBackdropFilter: 'blur(16px)',
      borderBottom: scrolled ? '1px solid var(--border)' : '1px solid rgba(226, 232, 240, 0.6)',
      transition: 'border-color .2s, background .2s, box-shadow .2s',
      boxShadow: scrolled ? '0 4px 20px rgba(15, 23, 42, 0.04)' : 'none',
    }}>
      <div style={{
        maxWidth: 1200,
        margin: '0 auto',
        padding: '0 24px',
        height: 68,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 24,
      }}>
        {/* Logo */}
        <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}>
          <div style={{
            width: 36,
            height: 36,
            background: 'var(--grad-primary)',
            borderRadius: 10,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 4px 12px rgba(79, 70, 229, 0.3)',
          }}>
            <Activity size={20} color="#fff" />
          </div>
          <span style={{
            fontFamily: 'var(--font-heading)',
            fontWeight: 800,
            fontSize: 20,
            color: 'var(--ink)',
            letterSpacing: '-0.03em',
          }}>QueueCare</span>
        </Link>

        {/* Nav links */}
        <nav style={{ display: 'flex', alignItems: 'center', gap: 6 }} className="desktop-nav">
          {navLinks.map(({ to, label, icon }) => {
            const active = location.pathname.startsWith(to) || (to.startsWith('/clinic') && location.pathname.startsWith('/clinic'));
            return (
              <Link key={label} to={to} style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '8px 16px',
                borderRadius: 'var(--r-pill)',
                fontWeight: 600,
                fontSize: 14,
                color: active ? 'var(--primary)' : 'var(--muted)',
                background: active ? '#EEF2FF' : 'transparent',
                border: active ? '1px solid #C7D2FE' : '1px solid transparent',
                transition: 'all .15s ease',
                textDecoration: 'none',
              }}>
                {icon} {label}
              </Link>
            );
          })}
        </nav>

        {/* CTA Button */}
        <button
          onClick={() => navigate('/book')}
          style={{
            background: 'var(--grad-primary)',
            color: '#fff',
            border: 'none',
            borderRadius: 'var(--r-pill)',
            padding: '10px 22px',
            fontWeight: 700,
            fontSize: 14,
            fontFamily: 'var(--font-heading)',
            cursor: 'pointer',
            whiteSpace: 'nowrap',
            boxShadow: '0 4px 14px rgba(79, 70, 229, 0.35)',
            transition: 'transform .15s, box-shadow .15s',
          }}
          onMouseOver={e => {
            e.currentTarget.style.transform = 'translateY(-1px)';
            e.currentTarget.style.boxShadow = '0 6px 20px rgba(79, 70, 229, 0.45)';
          }}
          onMouseOut={e => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = '0 4px 14px rgba(79, 70, 229, 0.35)';
          }}
        >
          Book appointment
        </button>
      </div>

      <style>{`
        @media (max-width: 640px) {
          .desktop-nav { display: none !important; }
        }
      `}</style>
    </header>
  );
}
