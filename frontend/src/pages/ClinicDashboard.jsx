// src/pages/ClinicDashboard.jsx
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import toast from 'react-hot-toast';
import {
  LayoutDashboard, Users, Clock, TrendingDown, AlertCircle,
  CheckCircle, Play, XCircle, UserCheck, ChevronDown, Activity,
  Stethoscope, ArrowRight, User, LogOut, ShieldCheck
} from 'lucide-react';
import { apiGet, apiPatch, getAuthToken, getAuthStaff, setAuthToken, setOnAuthError } from '../api.js';
import { getDeptTheme } from '../utils/deptColors.js';

/* ── Status and Risk Pills ── */
function RiskBadge({ prob }) {
  const pct = Math.round(prob * 100);
  if (pct >= 50) {
    return <span style={pill('#FFE4E6', '#E11D48', '#FECDD3')}>High {pct}%</span>;
  }
  if (pct >= 25) {
    return <span style={pill('#FEF3C7', '#D97706', '#FDE68A')}>Med {pct}%</span>;
  }
  return <span style={pill('#DCFCE7', '#15803D', '#BBF7D0')}>Low {pct}%</span>;
}

function UrgencyBadge({ urgency }) {
  return urgency === 'urgent' ? (
    <span style={pill('#FFE4E6', '#E11D48', '#FECDD3')}>Urgent</span>
  ) : (
    <span style={pill('#F1F5F9', '#475569', '#E2E8F0')}>Normal</span>
  );
}

function StatusPill({ status }) {
  switch (status) {
    case 'booked':
      return <span style={pill('#EFF6FF', '#2563EB', '#BFDBFE')}>Booked</span>;
    case 'arrived':
      return <span style={pill('#FEF3C7', '#D97706', '#FDE68A')}>Arrived</span>;
    case 'in_consult':
      return <span style={pill('#EDE9FE', '#7C3AED', '#DDD6FE')}>In consultation</span>;
    case 'completed':
      return <span style={pill('#DCFCE7', '#15803D', '#BBF7D0')}>Completed</span>;
    case 'no_show':
      return <span style={pill('#F1F5F9', '#475569', '#E2E8F0')}>No-show</span>;
    default:
      return <span style={pill('#F8FAFC', '#64748B', '#E2E8F0')}>{status}</span>;
  }
}

const pill = (bg, color, border) => ({
  background: bg,
  color,
  border: border ? `1px solid ${border}` : 'none',
  borderRadius: 'var(--r-pill)',
  padding: '3px 10px',
  fontSize: 12,
  fontWeight: 700,
  display: 'inline-flex',
  alignItems: 'center',
  whiteSpace: 'nowrap',
});

/* ── KPI Cards with Rich Colored Icon Tiles ── */
function KpiCard({ icon, label, value, sub, grad, glow }) {
  return (
    <motion.div
      whileHover={{ y: -3, transition: { duration: 0.15 } }}
      style={{
        background: '#FFFFFF',
        border: '1px solid var(--border)',
        borderRadius: 'var(--r-xl)',
        padding: '22px 24px',
        boxShadow: 'var(--shadow-sm)',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
        <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--muted)', letterSpacing: '.02em' }}>
          {label}
        </span>
        <div style={{
          width: 44,
          height: 44,
          borderRadius: 12,
          background: grad,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#FFFFFF',
          boxShadow: glow,
        }}>
          {icon}
        </div>
      </div>
      <div style={{ fontFamily: 'var(--font-heading)', fontSize: 36, fontWeight: 800, color: 'var(--ink)', lineHeight: 1 }}>
        {value}
      </div>
      {sub && <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 6, fontWeight: 500 }}>{sub}</div>}
    </motion.div>
  );
}

const ACTIONS = {
  booked: [
    { label: 'Mark arrived', status: 'arrived', icon: <UserCheck size={14} />, color: '#4F46E5', bg: '#EEF2FF', border: '#C7D2FE' },
  ],
  arrived: [
    { label: 'Start consult', status: 'in_consult', icon: <Play size={14} />, color: '#7C3AED', bg: '#EDE9FE', border: '#DDD6FE' },
    { label: 'No-show', status: 'no_show', icon: <XCircle size={14} />, color: '#E11D48', bg: '#FFE4E6', border: '#FECDD3' },
  ],
  in_consult: [
    { label: 'Complete', status: 'completed', icon: <CheckCircle size={14} />, color: '#16A34A', bg: '#DCFCE7', border: '#BBF7D0' },
  ],
};

const PIE_COLORS = {
  booked: '#3B82F6',
  arrived: '#F59E0B',
  in_consult: '#8B5CF6',
  completed: '#22C55E',
  no_show: '#94A3B8',
};

export default function ClinicDashboard({ isDemoMode }) {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('queue'); // 'queue' | 'doctors'
  const [doctors, setDoctors] = useState([]);
  const [selectedDoc, setSelectedDoc] = useState(null);
  const [queue, setQueue] = useState([]);
  const [loading, setLoading] = useState(true);
  const [docStats, setDocStats] = useState({});
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const staffUser = getAuthStaff();
  const wsRef = useRef(null);
  const pollRef = useRef(null);
  const demoRef = useRef(null);

  // 1. ROUTE GUARD: If no token, redirect to /clinic/login
  useEffect(() => {
    if (!getAuthToken()) {
      navigate('/clinic/login', { replace: true });
    }
  }, [navigate]);

  // 2. 401 INTERCEPTOR: On auth error, redirect to login
  useEffect(() => {
    setOnAuthError(() => {
      toast.error('Session expired or unauthorized. Please sign in.');
      navigate('/clinic/login', { replace: true });
    });
  }, [navigate]);

  // 3. AUTO-LOGOUT AFTER 15 MINUTES OF INACTIVITY
  useEffect(() => {
    const INACTIVITY_TIMEOUT = 15 * 60 * 1000; // 15 mins
    let timer;

    const resetTimer = () => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        setAuthToken(null, null);
        toast.error('Logged out due to 15 minutes of inactivity.');
        navigate('/clinic/login', { replace: true });
      }, INACTIVITY_TIMEOUT);
    };

    const events = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll'];
    events.forEach(e => window.addEventListener(e, resetTimer, { passive: true }));
    resetTimer();

    return () => {
      clearTimeout(timer);
      events.forEach(e => window.removeEventListener(e, resetTimer));
    };
  }, [navigate]);

  // Handle manual sign out
  const handleSignOut = () => {
    setAuthToken(null, null);
    toast.success('Signed out successfully.');
    navigate('/clinic/login', { replace: true });
  };

  // Load all doctors
  useEffect(() => {
    if (!getAuthToken()) return;
    apiGet('/api/doctors').then(docs => {
      setDoctors(docs);
      if (docs.length > 0 && !selectedDoc) {
        setSelectedDoc(docs[0]);
      }
    }).catch(e => {
      if (e.message !== 'Unauthorized') {
        toast.error('Failed to load doctors: ' + e.message);
      }
    });
  }, []);

  // Fetch queue for the selected doctor
  const fetchQueue = useCallback(async () => {
    if (!selectedDoc || !getAuthToken()) return;
    try {
      const q = await apiGet(`/api/queue/${selectedDoc.id}`);
      setQueue(q);
      setLoading(false);
    } catch (e) {
      if (e.message !== 'Unauthorized') {
        toast.error('Queue load failed: ' + e.message);
      }
      setLoading(false);
    }
  }, [selectedDoc]);

  // Fetch stats for all doctors for the Doctors View
  const fetchAllDoctorStats = useCallback(async () => {
    if (!doctors.length || !getAuthToken()) return;
    const stats = {};
    for (const d of doctors) {
      try {
        const q = await apiGet(`/api/queue/${d.id}`);
        const inConsult = q.some(p => p.status === 'in_consult');
        stats[d.id] = {
          count: q.length,
          inConsult,
          activeCount: q.filter(p => ['booked', 'arrived', 'in_consult'].includes(p.status)).length,
        };
      } catch {
        stats[d.id] = { count: 0, inConsult: false, activeCount: 0 };
      }
    }
    setDocStats(stats);
  }, [doctors]);

  useEffect(() => {
    if (activeTab === 'doctors') {
      fetchAllDoctorStats();
    }
  }, [activeTab, fetchAllDoctorStats]);

  // WebSocket + Polling fallback
  useEffect(() => {
    if (!selectedDoc || !getAuthToken()) return;
    setLoading(true);
    fetchQueue();

    clearInterval(pollRef.current);
    pollRef.current = setInterval(fetchQueue, 12000);

    wsRef.current?.close();
    const ws = new WebSocket(`ws://localhost:8000/ws/${selectedDoc.id}`);
    ws.onmessage = fetchQueue;
    wsRef.current = ws;

    return () => {
      clearInterval(pollRef.current);
      ws.close();
    };
  }, [selectedDoc, fetchQueue]);

  // Demo mode: auto-advance queue every 10s
  useEffect(() => {
    if (!isDemoMode || !getAuthToken()) return;
    demoRef.current = setInterval(async () => {
      const nextStatus = { booked: 'arrived', arrived: 'in_consult', in_consult: 'completed' };
      const p = queue.find(q => nextStatus[q.status]);
      if (p) {
        try {
          await apiPatch(`/api/appointments/${p.id}/status`, { status: nextStatus[p.status] });
          fetchQueue();
        } catch {}
      }
    }, 10000);

    return () => clearInterval(demoRef.current);
  }, [isDemoMode, queue, fetchQueue]);

  const updateStatus = async (apptId, status) => {
    try {
      await apiPatch(`/api/appointments/${apptId}/status`, { status });
      toast.success(`Patient marked as ${status.replace('_', ' ')}`);
      fetchQueue();
    } catch (e) {
      toast.error(e.message);
    }
  };

  // KPIs
  const total = queue.length;
  const avgWait = queue.length
    ? Math.round(queue.reduce((s, q) => s + (q.eta_min || q.wait_min || 0), 0) / queue.length)
    : 0;
  const noShows = queue.filter(q => q.no_show_prob >= 0.4).length;
  const urgentCount = queue.filter(q => q.urgency === 'urgent').length;

  // Hourly load
  const hourMap = {};
  queue.forEach(q => {
    const h = q.slot?.split(':')[0] || '09';
    hourMap[h] = (hourMap[h] || 0) + 1;
  });
  const hourData = ['09', '10', '11', '12', '14', '15', '16'].map(h => ({
    hour: `${h}:00`,
    patients: hourMap[h] || 0,
  }));

  // Status donut
  const statusCount = {};
  queue.forEach(q => {
    statusCount[q.status] = (statusCount[q.status] || 0) + 1;
  });
  const pieData = Object.entries(statusCount).map(([name, value]) => ({ name, value }));

  const initials = name =>
    name
      .replace(/^Dr\.\s*/i, '')
      .split(' ')
      .filter(Boolean)
      .map(w => w[0])
      .slice(0, 2)
      .join('')
      .toUpperCase();

  const selectedTheme = selectedDoc ? getDeptTheme(selectedDoc.dept) : getDeptTheme('General Medicine');

  return (
    <div style={{ display: 'flex', minHeight: 'calc(100vh - 68px)', background: 'var(--bg)' }}>
      {/* ── Left Sidebar ── */}
      <aside style={{
        width: sidebarOpen ? 240 : 72,
        background: '#FFFFFF',
        borderRight: '1px solid var(--border)',
        display: 'flex',
        flexDirection: 'column',
        transition: 'width .2s ease',
        flexShrink: 0,
        position: 'relative',
        zIndex: 20,
      }}>
        {/* Sidebar Brand header */}
        <div style={{
          padding: '24px 20px',
          borderBottom: '1px solid var(--border)',
          display: 'flex',
          alignItems: 'center',
          gap: 12,
        }}>
          <div style={{
            width: 34,
            height: 34,
            borderRadius: 10,
            background: 'var(--grad-primary)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff',
            flexShrink: 0,
          }}>
            <Stethoscope size={18} />
          </div>
          {sidebarOpen && (
            <div>
              <div style={{ fontFamily: 'var(--font-heading)', fontWeight: 800, fontSize: 16, color: 'var(--ink)' }}>
                Clinic Portal
              </div>
              <div style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 500 }}>Staff Authenticated</div>
            </div>
          )}
        </div>

        {/* Navigation Tabs */}
        <div style={{ padding: '16px 12px', display: 'flex', flexDirection: 'column', gap: 6 }}>
          {[
            { id: 'queue', label: 'Live Queue', icon: <LayoutDashboard size={19} /> },
            { id: 'doctors', label: 'Doctors', icon: <Users size={19} /> },
          ].map(({ id, label, icon }) => {
            const active = activeTab === id;
            return (
              <button
                key={id}
                onClick={() => setActiveTab(id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  padding: sidebarOpen ? '12px 16px' : '12px',
                  justifyContent: sidebarOpen ? 'flex-start' : 'center',
                  background: active ? '#EEF2FF' : 'transparent',
                  color: active ? '#4F46E5' : 'var(--muted)',
                  border: active ? '1px solid #C7D2FE' : '1px solid transparent',
                  borderRadius: 'var(--r-md)',
                  fontWeight: active ? 700 : 600,
                  fontSize: 14,
                  cursor: 'pointer',
                  transition: 'all .15s ease',
                }}
              >
                {icon}
                {sidebarOpen && <span>{label}</span>}
              </button>
            );
          })}
        </div>

        {/* Demo Mode Notice */}
        {isDemoMode && sidebarOpen && (
          <div style={{
            margin: '12px 16px',
            background: '#FEF3C7',
            border: '1px solid #FDE68A',
            borderRadius: 'var(--r-md)',
            padding: '10px 12px',
            fontSize: 12,
            fontWeight: 700,
            color: '#B45309',
          }}>
            ⚡ Demo Mode Active<br />
            <span style={{ fontWeight: 500, fontSize: 11 }}>Auto-advancing every 10s</span>
          </div>
        )}

        {/* Collapse toggle */}
        <button
          onClick={() => setSidebarOpen(o => !o)}
          style={{
            marginTop: 'auto',
            background: 'none',
            borderTop: '1px solid var(--border)',
            borderBottom: 'none',
            borderLeft: 'none',
            borderRight: 'none',
            cursor: 'pointer',
            padding: '16px',
            color: 'var(--muted)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <ChevronDown
            size={18}
            style={{
              transform: sidebarOpen ? 'rotate(90deg)' : 'rotate(-90deg)',
              transition: 'transform .2s ease',
            }}
          />
        </button>
      </aside>

      {/* ── Main Dashboard Workspace ── */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {/* Top bar with doctor selector, staff profile, sign out button, and live pulse */}
        <div style={{
          background: '#FFFFFF',
          borderBottom: '1px solid var(--border)',
          padding: '16px 28px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 16,
          position: 'sticky',
          top: 0,
          zIndex: 10,
        }}>
          <div>
            <h1 style={{ fontFamily: 'var(--font-heading)', fontSize: 22, fontWeight: 800, color: 'var(--ink)' }}>
              {activeTab === 'queue' ? "Today's Patient Queue" : 'Clinic Medical Staff'}
            </h1>
            <div style={{ fontSize: 13, color: 'var(--muted)', marginTop: 2 }}>
              {activeTab === 'queue'
                ? `Managing queue for ${selectedDoc?.name || 'Doctor'} (${selectedDoc?.dept || ''})`
                : 'Overview of all 7 clinical departments and doctor availability'}
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            {activeTab === 'queue' && (
              <select
                value={selectedDoc?.id || ''}
                onChange={e => {
                  const doc = doctors.find(d => d.id === Number(e.target.value));
                  setSelectedDoc(doc);
                }}
                style={{
                  border: '1.5px solid var(--border)',
                  borderRadius: 'var(--r-pill)',
                  padding: '8px 16px',
                  fontSize: 14,
                  fontWeight: 600,
                  fontFamily: 'var(--font-body)',
                  color: 'var(--ink)',
                  background: '#FFFFFF',
                  cursor: 'pointer',
                  outline: 'none',
                  boxShadow: 'var(--shadow-sm)',
                }}
              >
                {doctors.map(d => (
                  <option key={d.id} value={d.id}>
                    {d.name} — {d.dept}
                  </option>
                ))}
              </select>
            )}

            {/* Staff User Badge */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              background: '#F1F5F9',
              padding: '6px 14px',
              borderRadius: 'var(--r-pill)',
              border: '1px solid #E2E8F0',
            }}>
              <div style={{
                width: 24,
                height: 24,
                borderRadius: '50%',
                background: 'var(--grad-primary)',
                color: '#FFFFFF',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 12,
                fontWeight: 700,
              }}>
                {staffUser?.name?.[0] || 'S'}
              </div>
              <div style={{ textAlign: 'left' }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--ink)', lineHeight: 1.1 }}>
                  {staffUser?.name || 'Staff'}
                </div>
                <div style={{ fontSize: 10, color: 'var(--muted)', textTransform: 'capitalize' }}>
                  {staffUser?.role || 'authorized'}
                </div>
              </div>
            </div>

            {/* Sign Out Button */}
            <button
              onClick={handleSignOut}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '7px 14px',
                borderRadius: 'var(--r-pill)',
                border: '1px solid #FECDD3',
                background: '#FFF1F2',
                color: '#E11D48',
                fontWeight: 700,
                fontSize: 12,
                cursor: 'pointer',
                transition: 'all .12s ease',
              }}
              onMouseOver={e => {
                e.currentTarget.style.background = '#E11D48';
                e.currentTarget.style.color = '#FFFFFF';
              }}
              onMouseOut={e => {
                e.currentTarget.style.background = '#FFF1F2';
                e.currentTarget.style.color = '#E11D48';
              }}
              title="Sign out of clinic portal"
            >
              <LogOut size={13} />
              Sign out
            </button>

            {/* Live Indicator */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              background: '#DCFCE7',
              border: '1px solid #BBF7D0',
              padding: '6px 12px',
              borderRadius: 'var(--r-pill)',
            }}>
              <span style={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                background: '#16A34A',
                boxShadow: '0 0 0 3px rgba(34, 197, 94, 0.35)',
                display: 'inline-block',
                animation: 'pulseLiveDot 1.5s infinite',
              }} />
              <span style={{ fontSize: 12, color: '#15803D', fontWeight: 700 }}>LIVE</span>
            </div>
          </div>
        </div>

        {/* ── VIEW 1: LIVE QUEUE ── */}
        {activeTab === 'queue' && (
          <div style={{ padding: '28px' }}>
            {/* KPI Cards Grid */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
              gap: 18,
              marginBottom: 28,
            }}>
              <KpiCard
                icon={<Users size={22} />}
                label="Patients Today"
                value={total}
                sub={`${queue.filter(q => q.status === 'completed').length} completed`}
                grad="linear-gradient(135deg, #4F46E5 0%, #8B5CF6 100%)"
                glow="0 4px 14px rgba(79, 70, 229, 0.35)"
              />
              <KpiCard
                icon={<Clock size={22} />}
                label="Average Wait"
                value={`${avgWait}m`}
                sub="EMA updated"
                grad="linear-gradient(135deg, #0EA5E9 0%, #38BDF8 100%)"
                glow="0 4px 14px rgba(14, 165, 233, 0.35)"
              />
              <KpiCard
                icon={<TrendingDown size={22} />}
                label="Predicted No-shows"
                value={noShows}
                sub="High risk (prob ≥ 40%)"
                grad="linear-gradient(135deg, #F59E0B 0%, #EA580C 100%)"
                glow="0 4px 14px rgba(245, 158, 11, 0.35)"
              />
              <KpiCard
                icon={<AlertCircle size={22} />}
                label="Urgent Cases"
                value={urgentCount}
                sub="Prioritized at top"
                grad="linear-gradient(135deg, #F43F5E 0%, #E11D48 100%)"
                glow="0 4px 14px rgba(244, 63, 94, 0.35)"
              />
            </div>

            {/* Queue Table */}
            <div style={{
              background: '#FFFFFF',
              border: '1px solid var(--border)',
              borderRadius: 'var(--r-xl)',
              boxShadow: 'var(--shadow-md)',
              marginBottom: 28,
              overflow: 'hidden',
            }}>
              <div style={{
                padding: '20px 24px',
                borderBottom: '1px solid var(--border)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}>
                <div>
                  <h2 style={{ fontFamily: 'var(--font-heading)', fontWeight: 800, fontSize: 17, color: 'var(--ink)' }}>
                    Patient Consultation Queue
                  </h2>
                  <div style={{ fontSize: 13, color: 'var(--muted)', marginTop: 2 }}>
                    Sorted by urgency and appointment slot
                  </div>
                </div>
                <span style={{
                  fontSize: 13,
                  fontWeight: 700,
                  color: selectedTheme.text,
                  background: selectedTheme.soft,
                  border: `1px solid ${selectedTheme.border}`,
                  padding: '4px 12px',
                  borderRadius: 'var(--r-pill)',
                }}>
                  {selectedDoc?.name} · {total} in queue
                </span>
              </div>

              {loading ? (
                <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {[1, 2, 3, 4].map(i => (
                    <div key={i} className="skeleton" style={{ height: 60, borderRadius: 'var(--r-md)' }} />
                  ))}
                </div>
              ) : queue.length === 0 ? (
                <div style={{ padding: '64px 24px', textAlign: 'center', color: 'var(--muted)' }}>
                  <Users size={48} style={{ opacity: 0.25, margin: '0 auto 16px', display: 'block' }} />
                  <p style={{ fontWeight: 600, fontSize: 16 }}>No appointments booked for this doctor today.</p>
                  <p style={{ fontSize: 13, marginTop: 4 }}>Book an appointment from the Book tab or run seed.</p>
                </div>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
                    <thead>
                      <tr style={{ background: '#F8FAFC', borderBottom: '1px solid var(--border)' }}>
                        {['Token', 'Patient', 'Slot', 'Urgency', 'No-show Risk', 'Est. Consult', 'Status', 'Actions'].map(h => (
                          <th key={h} style={{
                            padding: '12px 18px',
                            textAlign: 'left',
                            fontSize: 12,
                            fontWeight: 700,
                            color: 'var(--muted)',
                            textTransform: 'uppercase',
                            letterSpacing: '.05em',
                            whiteSpace: 'nowrap',
                          }}>
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      <AnimatePresence>
                        {queue.map((p, i) => (
                          <motion.tr
                            key={p.id}
                            layout
                            initial={{ opacity: 0, y: 6 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0 }}
                            transition={{ delay: i * 0.03 }}
                            style={{
                              borderTop: '1px solid var(--border)',
                              background: p.status === 'in_consult' ? '#F5F3FF' : '#FFFFFF',
                            }}
                          >
                            <td style={{
                              padding: '14px 18px',
                              fontFamily: 'var(--font-heading)',
                              fontWeight: 800,
                              color: 'var(--ink)',
                              fontSize: 15,
                            }}>
                              {p.id}
                            </td>

                            <td style={{ padding: '14px 18px' }}>
                              <div style={{ fontWeight: 700, color: 'var(--ink)' }}>{p.patient_name}</div>
                              <div style={{ fontSize: 12, color: 'var(--muted)' }}>
                                Age {p.age} · {p.phone}
                              </div>
                            </td>

                            <td style={{ padding: '14px 18px', fontWeight: 600, color: 'var(--ink)' }}>
                              {p.slot}
                            </td>

                            <td style={{ padding: '14px 18px' }}>
                              <UrgencyBadge urgency={p.urgency} />
                            </td>

                            <td style={{ padding: '14px 18px' }}>
                              <RiskBadge prob={p.no_show_prob} />
                            </td>

                            <td style={{ padding: '14px 18px', color: 'var(--muted)', fontWeight: 600 }}>
                              {Math.round(p.pred_min)} min
                            </td>

                            <td style={{ padding: '14px 18px' }}>
                              <StatusPill status={p.status} />
                            </td>

                            <td style={{ padding: '14px 18px' }}>
                              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                                {(ACTIONS[p.status] || []).map(act => (
                                  <button
                                    key={act.status}
                                    onClick={() => updateStatus(p.id, act.status)}
                                    style={{
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: 6,
                                      padding: '6px 12px',
                                      background: act.bg,
                                      border: `1.5px solid ${act.border}`,
                                      borderRadius: 'var(--r-pill)',
                                      color: act.color,
                                      fontWeight: 700,
                                      fontSize: 12,
                                      cursor: 'pointer',
                                      whiteSpace: 'nowrap',
                                      transition: 'all .12s ease',
                                    }}
                                    onMouseOver={e => {
                                      e.currentTarget.style.background = act.color;
                                      e.currentTarget.style.color = '#FFFFFF';
                                    }}
                                    onMouseOut={e => {
                                      e.currentTarget.style.background = act.bg;
                                      e.currentTarget.style.color = act.color;
                                    }}
                                  >
                                    {act.icon} {act.label}
                                  </button>
                                ))}
                              </div>
                            </td>
                          </motion.tr>
                        ))}
                      </AnimatePresence>
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Recharts Analytics Row */}
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 24 }}>
              <div style={{
                background: '#FFFFFF',
                border: '1px solid var(--border)',
                borderRadius: 'var(--r-xl)',
                padding: '24px',
                boxShadow: 'var(--shadow-sm)',
              }}>
                <h3 style={{ fontFamily: 'var(--font-heading)', fontWeight: 800, fontSize: 16, marginBottom: 20 }}>
                  Hourly Patient Load
                </h3>
                <ResponsiveContainer width="100%" height={200}>
                  <AreaChart data={hourData}>
                    <defs>
                      <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#4F46E5" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#8B5CF6" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="hour" tick={{ fontSize: 12, fill: '#64748B' }} axisLine={false} tickLine={false} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: '#64748B' }} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={{ border: '1px solid #E2E8F0', borderRadius: 12, fontSize: 13, boxShadow: 'var(--shadow-md)' }} />
                    <Area type="monotone" dataKey="patients" stroke="#4F46E5" strokeWidth={3} fill="url(#areaGrad)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>

              <div style={{
                background: '#FFFFFF',
                border: '1px solid var(--border)',
                borderRadius: 'var(--r-xl)',
                padding: '24px',
                boxShadow: 'var(--shadow-sm)',
              }}>
                <h3 style={{ fontFamily: 'var(--font-heading)', fontWeight: 800, fontSize: 16, marginBottom: 16 }}>
                  Status Split
                </h3>
                {pieData.length === 0 ? (
                  <div style={{ color: 'var(--muted)', fontSize: 13, textAlign: 'center', marginTop: 48 }}>
                    No queue data today
                  </div>
                ) : (
                  <>
                    <PieChart width={180} height={180} style={{ margin: '0 auto' }}>
                      <Pie data={pieData} cx={90} cy={90} innerRadius={50} outerRadius={80} dataKey="value" paddingAngle={3}>
                        {pieData.map((e, i) => (
                          <Cell key={i} fill={PIE_COLORS[e.name] || '#94A3B8'} />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={{ border: '1px solid #E2E8F0', borderRadius: 8, fontSize: 12 }} />
                    </PieChart>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 12 }}>
                      {pieData.map(e => (
                        <div key={e.name} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12 }}>
                          <div style={{
                            width: 10,
                            height: 10,
                            borderRadius: 3,
                            background: PIE_COLORS[e.name] || '#94A3B8',
                          }} />
                          <span style={{ color: 'var(--muted)', textTransform: 'capitalize' }}>
                            {e.name.replace('_', ' ')}
                          </span>
                          <span style={{ marginLeft: 'auto', fontWeight: 800, color: 'var(--ink)' }}>
                            {e.value}
                          </span>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ── VIEW 2: DOCTORS STAFF VIEW ── */}
        {activeTab === 'doctors' && (
          <div style={{ padding: '28px' }}>
            <div style={{ marginBottom: 24 }}>
              <p style={{ color: 'var(--muted)', fontSize: 15 }}>
                Click on any doctor card or "View queue" to switch directly to their live consultation queue.
              </p>
            </div>

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
              gap: 20,
            }}>
              {doctors.map(doc => {
                const theme = getDeptTheme(doc.dept);
                const stats = docStats[doc.id] || { count: 0, inConsult: false, activeCount: 0 };
                const isInConsult = stats.inConsult;

                return (
                  <motion.div
                    key={doc.id}
                    whileHover={{ y: -4, transition: { duration: 0.15 } }}
                    style={{
                      background: '#FFFFFF',
                      border: `1.5px solid ${theme.border}`,
                      borderRadius: 'var(--r-xl)',
                      padding: '24px',
                      boxShadow: 'var(--shadow-sm)',
                      display: 'flex',
                      flexDirection: 'column',
                      cursor: 'pointer',
                      transition: 'all .15s ease',
                    }}
                    onClick={() => {
                      setSelectedDoc(doc);
                      setActiveTab('queue');
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
                      <div style={{
                        width: 54,
                        height: 54,
                        borderRadius: 16,
                        background: theme.gradient,
                        color: '#FFFFFF',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontFamily: 'var(--font-heading)',
                        fontWeight: 800,
                        fontSize: 18,
                        boxShadow: `0 6px 16px ${theme.border}`,
                      }}>
                        {initials(doc.name)}
                      </div>

                      <span style={{
                        background: isInConsult ? '#EDE9FE' : '#DCFCE7',
                        color: isInConsult ? '#7C3AED' : '#15803D',
                        border: `1px solid ${isInConsult ? '#DDD6FE' : '#BBF7D0'}`,
                        borderRadius: 'var(--r-pill)',
                        padding: '4px 10px',
                        fontSize: 12,
                        fontWeight: 700,
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 6,
                      }}>
                        <span style={{
                          width: 7,
                          height: 7,
                          borderRadius: '50%',
                          background: isInConsult ? '#7C3AED' : '#16A34A',
                        }} />
                        {isInConsult ? 'In consultation' : 'Available'}
                      </span>
                    </div>

                    <h3 style={{
                      fontFamily: 'var(--font-heading)',
                      fontWeight: 800,
                      fontSize: 18,
                      color: 'var(--ink)',
                      marginBottom: 4,
                    }}>
                      {doc.name}
                    </h3>

                    <div style={{
                      display: 'inline-block',
                      alignSelf: 'flex-start',
                      fontSize: 12,
                      fontWeight: 700,
                      color: theme.text,
                      background: theme.soft,
                      border: `1px solid ${theme.border}`,
                      padding: '3px 10px',
                      borderRadius: 'var(--r-pill)',
                      marginBottom: 16,
                    }}>
                      {doc.dept}
                    </div>

                    <div style={{
                      background: '#F8FAFC',
                      border: '1px solid #E2E8F0',
                      borderRadius: 'var(--r-md)',
                      padding: '12px 16px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginBottom: 18,
                    }}>
                      <div>
                        <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase' }}>
                          Today's Patients
                        </div>
                        <div style={{ fontFamily: 'var(--font-heading)', fontWeight: 800, fontSize: 20, color: 'var(--ink)' }}>
                          {stats.count}
                        </div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase' }}>
                          Active Waiting
                        </div>
                        <div style={{ fontFamily: 'var(--font-heading)', fontWeight: 800, fontSize: 20, color: theme.text }}>
                          {stats.activeCount}
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={e => {
                        e.stopPropagation();
                        setSelectedDoc(doc);
                        setActiveTab('queue');
                      }}
                      style={{
                        marginTop: 'auto',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 8,
                        background: theme.soft,
                        color: theme.text,
                        border: `1.5px solid ${theme.border}`,
                        borderRadius: 'var(--r-pill)',
                        padding: '10px 18px',
                        fontWeight: 700,
                        fontSize: 13,
                        cursor: 'pointer',
                        transition: 'all .12s ease',
                      }}
                      onMouseOver={e => {
                        e.currentTarget.style.background = theme.primary;
                        e.currentTarget.style.color = '#FFFFFF';
                      }}
                      onMouseOut={e => {
                        e.currentTarget.style.background = theme.soft;
                        e.currentTarget.style.color = theme.text;
                      }}
                    >
                      View queue <ArrowRight size={15} />
                    </button>
                  </motion.div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      <style>{`
        @keyframes pulseLiveDot {
          0%, 100% { box-shadow: 0 0 0 3px rgba(34, 197, 94, 0.35); }
          50% { box-shadow: 0 0 0 7px rgba(34, 197, 94, 0.1); }
        }
        @media (max-width: 840px) {
          aside { display: none !important; }
        }
      `}</style>
    </div>
  );
}
