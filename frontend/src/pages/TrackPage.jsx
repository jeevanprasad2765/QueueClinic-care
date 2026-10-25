// src/pages/TrackPage.jsx
import React, { useState, useEffect, useRef } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Clock, Users, CheckCircle, Circle, RefreshCw, Search,
  AlertCircle, Phone, Ticket, ArrowRight, ShieldCheck, ChevronRight
} from 'lucide-react';
import toast from 'react-hot-toast';
import { apiGet } from '../api.js';
import { getDeptTheme } from '../utils/deptColors.js';

function Skeleton({ w = '100%', h = 20 }) {
  return <div className="skeleton" style={{ width: w, height: h }} />;
}

/** Circular position ring */
function PositionRing({ pos, total }) {
  const pct = total > 1 ? 1 - (pos - 1) / Math.max(total - 1, 1) : 1;
  const r = 50, cx = 60, cy = 60, circ = 2 * Math.PI * r;
  return (
    <svg width={120} height={120}>
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="#E2E8F0" strokeWidth={10} />
      <circle
        cx={cx} cy={cy} r={r} fill="none"
        stroke="#4F46E5" strokeWidth={10}
        strokeDasharray={circ}
        strokeDashoffset={circ * (1 - pct)}
        strokeLinecap="round"
        transform={`rotate(-90 ${cx} ${cy})`}
        style={{ transition: 'stroke-dashoffset .8s ease' }}
      />
      <text x={cx} y={cy - 6} textAnchor="middle" fontSize={24}
        fontWeight={800} fill="#0F172A" fontFamily="var(--font-heading)">{pos}</text>
      <text x={cx} y={cy + 14} textAnchor="middle" fontSize={11}
        fontWeight={600} fill="#64748B" fontFamily="var(--font-body)">POSITION</text>
    </svg>
  );
}

/** Status timeline */
const STATUS_STEPS = ['booked', 'arrived', 'in_consult', 'completed'];
const STATUS_LABELS = { booked: 'Booked', arrived: 'Arrived at Clinic', in_consult: 'In Consultation', completed: 'Completed' };

function Timeline({ status }) {
  const cur = STATUS_STEPS.indexOf(status);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
      {STATUS_STEPS.map((s, i) => {
        const done = i < cur;
        const active = i === cur;
        return (
          <div key={s} style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <div style={{
                width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
                background: done ? '#22C55E' : active ? '#4F46E5' : '#E2E8F0',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                position: 'relative',
                boxShadow: active ? '0 0 0 4px #EEF2FF' : 'none',
              }}>
                {done ? <CheckCircle size={16} color="#fff" /> :
                  active
                    ? <span style={{
                        width: 10, height: 10, borderRadius: '50%', background: '#fff',
                        boxShadow: '0 0 0 3px rgba(79, 70, 229, 0.4)',
                        animation: 'pulseTimelineDot 1.4s infinite',
                        display: 'inline-block',
                      }} />
                    : <Circle size={10} color="#94A3B8" />}
              </div>
              {i < STATUS_STEPS.length - 1 && (
                <div style={{
                  width: 2, height: 32,
                  background: done ? '#22C55E' : '#E2E8F0',
                  margin: '3px 0',
                }} />
              )}
            </div>
            <div style={{ paddingTop: 3, paddingBottom: 22 }}>
              <div style={{
                fontWeight: active ? 800 : done ? 700 : 500,
                fontSize: 15,
                color: active ? '#4F46E5' : done ? '#16A34A' : '#64748B',
              }}>
                {STATUS_LABELS[s]}
              </div>
              {active && (
                <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>
                  Current active stage
                </div>
              )}
            </div>
          </div>
        );
      })}
      <style>{`
        @keyframes pulseTimelineDot {
          0%, 100% { box-shadow: 0 0 0 3px rgba(79, 70, 229, 0.4); }
          50% { box-shadow: 0 0 0 7px rgba(79, 70, 229, 0.1); }
        }
      `}</style>
    </div>
  );
}

/** Animated wait time (counts down live) */
function WaitTimer({ eta }) {
  const [secs, setSecs] = useState(Math.round(eta * 60));
  useEffect(() => { setSecs(Math.round(eta * 60)); }, [eta]);
  useEffect(() => {
    const id = setInterval(() => setSecs(s => Math.max(0, s - 1)), 1000);
    return () => clearInterval(id);
  }, []);
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return (
    <span style={{ fontFamily: 'var(--font-heading)', fontSize: 46, fontWeight: 800, color: m < 5 ? '#16A34A' : '#4F46E5', lineHeight: 1 }}>
      {m}<span style={{ fontSize: 20, fontWeight: 600, color: '#64748B', marginLeft: 2 }}>m</span>
      {' '}{String(s).padStart(2, '0')}<span style={{ fontSize: 20, fontWeight: 600, color: '#64748B', marginLeft: 2 }}>s</span>
    </span>
  );
}

export default function TrackPage({ isDemoMode }) {
  const { id: paramId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();

  const queryParams = new URLSearchParams(location.search);
  const queryPhone = queryParams.get('phone') || '';

  const initialId = paramId || localStorage.getItem('queuecare_last_id') || '';
  const initialPhone = queryPhone || localStorage.getItem('queuecare_last_phone') || '';

  const [bookingIdInput, setBookingIdInput] = useState(initialId);
  const [phoneInput, setPhoneInput] = useState(initialPhone);
  const [activeLookup, setActiveLookup] = useState(
    initialId && initialPhone ? { id: initialId, phone: initialPhone } : null
  );

  const [appt, setAppt] = useState(null);
  const [loading, setLoading] = useState(Boolean(initialId && initialPhone));
  const [err, setErr] = useState(null);
  const [showLookupForm, setShowLookupForm] = useState(!initialId || !initialPhone);

  const wsRef = useRef(null);
  const pollRef = useRef(null);

  // If URL params change, update active lookup
  useEffect(() => {
    if (paramId && queryPhone) {
      setBookingIdInput(paramId);
      setPhoneInput(queryPhone);
      setActiveLookup({ id: paramId, phone: queryPhone });
      setShowLookupForm(false);
    }
  }, [paramId, queryPhone]);

  const fetchAppt = async () => {
    if (!activeLookup?.id || !activeLookup?.phone) {
      setLoading(false);
      return;
    }
    try {
      const cleanId = activeLookup.id.replace('#', '').trim();
      const cleanPhone = activeLookup.phone.trim();
      const d = await apiGet(`/api/appointments/${cleanId}?phone=${encodeURIComponent(cleanPhone)}`);
      setAppt(d);
      setErr(null);
      localStorage.setItem('queuecare_last_id', cleanId);
      localStorage.setItem('queuecare_last_phone', cleanPhone);
    } catch (e) {
      setAppt(null);
      setErr("We couldn't find a booking with those details.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!activeLookup?.id || !activeLookup?.phone) return;

    setLoading(true);
    fetchAppt();

    pollRef.current = setInterval(fetchAppt, 12000);

    if (appt?.doctor_id) {
      const ws = new WebSocket(`ws://localhost:8000/ws/${appt.doctor_id}`);
      ws.onmessage = () => fetchAppt();
      ws.onerror = () => {};
      wsRef.current = ws;
    }

    return () => {
      clearInterval(pollRef.current);
      wsRef.current?.close();
    };
  }, [activeLookup?.id, activeLookup?.phone, appt?.doctor_id]);

  const handleSearch = (e) => {
    e.preventDefault();
    const cleanId = bookingIdInput.replace('#', '').trim();
    const cleanPhone = phoneInput.trim();

    if (!cleanId || !cleanPhone) {
      toast.error('Please enter both your Booking ID and Phone number.');
      return;
    }

    setLoading(true);
    setErr(null);
    setActiveLookup({ id: cleanId, phone: cleanPhone });
    navigate(`/track/${cleanId}?phone=${encodeURIComponent(cleanPhone)}`);
  };

  const deptTheme = appt?.dept ? getDeptTheme(appt.dept) : getDeptTheme('General Medicine');
  const isDone = appt?.status === 'completed' || appt?.status === 'no_show';
  const eta = appt?.eta_min ?? appt?.wait_min ?? 0;

  return (
    <div style={{ maxWidth: 560, margin: '0 auto', padding: '40px 24px' }}>
      {/* Lookup Card / Form */}
      {(showLookupForm || !appt) && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          style={{
            background: '#FFFFFF',
            border: '1px solid var(--border)',
            borderRadius: 20,
            padding: '28px 24px',
            boxShadow: 'var(--shadow-sm)',
            marginBottom: 28,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
            <div style={{
              width: 36, height: 36, borderRadius: 10,
              background: 'var(--grad-primary)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#fff',
            }}>
              <Ticket size={20} />
            </div>
            <div>
              <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: 18, fontWeight: 800, color: 'var(--ink)' }}>
                Track your appointment
              </h2>
              <p style={{ fontSize: 13, color: 'var(--muted)' }}>
                Enter your Booking ID and Phone number for verified live queue tracking.
              </p>
            </div>
          </div>

          <form onSubmit={handleSearch} style={{ display: 'flex', flexDirection: 'column', gap: 14, marginTop: 18 }}>
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: 'var(--ink)', marginBottom: 6 }}>
                Booking ID / Token
              </label>
              <div style={{
                display: 'flex', alignItems: 'center', gap: 10,
                border: '1.5px solid var(--border)', borderRadius: 'var(--r-md)',
                padding: '9px 14px', background: '#FFFFFF',
              }}>
                <Search size={17} color="var(--muted)" />
                <input
                  style={{ border: 'none', outline: 'none', width: '100%', fontSize: 14, color: 'var(--ink)' }}
                  placeholder="e.g. QC-7F3K9"
                  value={bookingIdInput}
                  onChange={e => setBookingIdInput(e.target.value)}
                />
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: 'var(--ink)', marginBottom: 6 }}>
                Registered Phone Number
              </label>
              <div style={{
                display: 'flex', alignItems: 'center', gap: 10,
                border: '1.5px solid var(--border)', borderRadius: 'var(--r-md)',
                padding: '9px 14px', background: '#FFFFFF',
              }}>
                <Phone size={17} color="var(--muted)" />
                <input
                  type="tel"
                  style={{ border: 'none', outline: 'none', width: '100%', fontSize: 14, color: 'var(--ink)' }}
                  placeholder="e.g. 9876543210"
                  value={phoneInput}
                  onChange={e => setPhoneInput(e.target.value)}
                />
              </div>
            </div>

            <button type="submit" style={{
              background: 'var(--grad-primary)',
              color: '#FFFFFF',
              border: 'none',
              borderRadius: 'var(--r-pill)',
              padding: '12px 22px',
              fontWeight: 800,
              fontSize: 14,
              fontFamily: 'var(--font-heading)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              boxShadow: 'var(--primary-glow)',
              marginTop: 6,
            }}>
              Track live status <ArrowRight size={16} />
            </button>
          </form>

          <div style={{
            display: 'flex', alignItems: 'center', gap: 6,
            marginTop: 16, paddingTop: 14, borderTop: '1px solid var(--border)',
            color: 'var(--muted)', fontSize: 12,
          }}>
            <ShieldCheck size={14} color="#16A34A" />
            <span>Patient privacy protected. Only you can view your appointment data.</span>
          </div>
        </motion.div>
      )}

      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {[1, 2, 3].map(i => (
            <div key={i} className="skeleton" style={{ height: 90, borderRadius: 'var(--r-xl)' }} />
          ))}
        </div>
      ) : err ? (
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          style={{
            background: '#FFFFFF',
            border: '1px solid var(--border)',
            borderRadius: 'var(--r-xl)',
            padding: '40px 24px',
            textAlign: 'center',
            boxShadow: 'var(--shadow-sm)',
          }}
        >
          <AlertCircle size={44} color="#EF4444" style={{ margin: '0 auto 16px', display: 'block' }} />
          <h2 style={{ fontFamily: 'var(--font-heading)', fontWeight: 800, fontSize: 20, marginBottom: 8, color: 'var(--ink)' }}>
            We couldn't find a booking with those details.
          </h2>
          <p style={{ color: 'var(--muted)', fontSize: 14, marginBottom: 24, maxWidth: 380, margin: '0 auto 24px' }}>
            Please check that your Booking ID and Phone number match the details provided when making the appointment.
          </p>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
            <button
              onClick={() => {
                setShowLookupForm(true);
                setErr(null);
              }}
              style={{
                background: '#FFFFFF',
                border: '1px solid var(--border)',
                borderRadius: 'var(--r-pill)',
                padding: '10px 20px',
                fontWeight: 700,
                fontSize: 14,
                cursor: 'pointer',
                color: 'var(--ink)',
              }}
            >
              Try another lookup
            </button>
            <button
              onClick={() => navigate('/book')}
              style={{
                background: 'var(--grad-primary)',
                color: '#FFFFFF',
                border: 'none',
                borderRadius: 'var(--r-pill)',
                padding: '10px 22px',
                fontWeight: 700,
                fontSize: 14,
                cursor: 'pointer',
                boxShadow: 'var(--primary-glow)',
              }}
            >
              Book new appointment
            </button>
          </div>
        </motion.div>
      ) : appt ? (
        <div>
          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <div>
              <h1 style={{ fontFamily: 'var(--font-heading)', fontSize: 24, fontWeight: 800, color: 'var(--ink)' }}>
                Live Appointment Status
              </h1>
              <div style={{ fontSize: 13, color: 'var(--muted)' }}>
                Auto-updating via clinic live channel
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                onClick={() => setShowLookupForm(s => !s)}
                style={{
                  background: '#FFFFFF',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--r-pill)',
                  padding: '6px 14px',
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: 'pointer',
                  color: 'var(--muted)',
                }}
              >
                {showLookupForm ? 'Hide lookup' : 'Change token'}
              </button>
              <button
                onClick={fetchAppt}
                style={{
                  background: '#FFFFFF',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--r-pill)',
                  padding: '6px 14px',
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: 'pointer',
                  color: 'var(--muted)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                <RefreshCw size={13} /> Refresh
              </button>
            </div>
          </div>

          {/* Ticket Token Card */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            style={{
              background: '#FFFFFF',
              border: `1.5px solid ${deptTheme.border}`,
              borderRadius: 24,
              padding: '24px 28px',
              boxShadow: 'var(--shadow-md)',
              marginBottom: 20,
              position: 'relative',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <span style={{
                  fontSize: 12,
                  fontWeight: 800,
                  color: 'var(--primary)',
                  letterSpacing: '.06em',
                  textTransform: 'uppercase',
                }}>
                  QueueCare Token
                </span>
                <div style={{
                  fontFamily: 'var(--font-heading)',
                  fontSize: 42,
                  fontWeight: 800,
                  lineHeight: 1.1,
                  color: 'var(--ink)',
                  marginTop: 6,
                  letterSpacing: '-0.02em',
                }}>
                  {appt.id}
                </div>
              </div>

              <span style={{
                background: appt.urgency === 'urgent' ? '#FFE4E6' : '#DCFCE7',
                color: appt.urgency === 'urgent' ? '#E11D48' : '#15803D',
                border: `1px solid ${appt.urgency === 'urgent' ? '#FECDD3' : '#BBF7D0'}`,
                borderRadius: 'var(--r-pill)',
                padding: '4px 12px',
                fontSize: 12,
                fontWeight: 700,
                textTransform: 'capitalize',
              }}>
                {appt.urgency}
              </span>
            </div>

            <div style={{ height: 1, borderTop: '2px dashed #E2E8F0', margin: '18px 0' }} />

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
              <div>
                <div style={{ fontSize: 13, color: 'var(--muted)', fontWeight: 600, marginBottom: 2 }}>
                  Patient: <strong style={{ color: 'var(--ink)' }}>{appt.patient_name}</strong>
                </div>
                <div style={{ fontWeight: 800, fontSize: 16, color: 'var(--ink)' }}>
                  {appt.doctor_name}
                </div>
                <div style={{ fontSize: 13, fontWeight: 700, color: deptTheme.text }}>
                  {appt.dept}
                </div>
              </div>
              <div style={{ textAlign: 'right', fontSize: 13, fontWeight: 600, color: 'var(--muted)' }}>
                {appt.date} · {appt.slot}
              </div>
            </div>
          </motion.div>

          {/* Wait Time & Queue Position Ring */}
          {!isDone && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
              {/* Wait Box */}
              <div style={{
                background: '#FFFFFF',
                border: '1px solid var(--border)',
                borderRadius: 'var(--r-xl)',
                padding: '20px',
                textAlign: 'center',
                boxShadow: 'var(--shadow-sm)',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                alignItems: 'center',
              }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', marginBottom: 6 }}>
                  Estimated Wait
                </div>
                <WaitTimer eta={eta} />
                <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 8 }}>
                  Live countdown
                </div>
              </div>

              {/* Position Ring */}
              <div style={{
                background: '#FFFFFF',
                border: '1px solid var(--border)',
                borderRadius: 'var(--r-xl)',
                padding: '16px',
                boxShadow: 'var(--shadow-sm)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                <PositionRing pos={appt.position ?? 1} total={appt.total_in_queue ?? 1} />
                <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 4, fontWeight: 600 }}>
                  {appt.patients_ahead ?? Math.max(0, (appt.position ?? 1) - 1)} patients ahead
                </div>
              </div>
            </div>
          )}

          {/* "Leave Home" Alert when wait > 20 min */}
          {!isDone && eta > 20 && (
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              style={{
                background: '#FEF3C7',
                border: '1px solid #FDE68A',
                borderRadius: 'var(--r-lg)',
                padding: '14px 18px',
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                marginBottom: 20,
              }}
            >
              <Clock size={20} color="#D97706" />
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, color: '#92400e' }}>
                  You can leave home in ~{Math.max(0, Math.round(eta - 20))} min
                </div>
                <div style={{ fontSize: 12, color: '#B45309', marginTop: 1 }}>
                  Clinic recommended arrival window is 15-20 min before consultation.
                </div>
              </div>
            </motion.div>
          )}

          {/* Status Timeline Card */}
          <div style={{
            background: '#FFFFFF',
            border: '1px solid var(--border)',
            borderRadius: 'var(--r-xl)',
            padding: '24px 28px',
            boxShadow: 'var(--shadow-sm)',
          }}>
            <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: 17, fontWeight: 800, marginBottom: 20 }}>
              Live Progress
            </h3>
            <Timeline status={appt.status} />
          </div>
        </div>
      ) : null}
    </div>
  );
}