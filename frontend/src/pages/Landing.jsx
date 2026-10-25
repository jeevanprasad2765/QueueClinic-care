// src/pages/Landing.jsx
import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Clock, Zap, ShieldCheck, ArrowRight, CheckCircle, Activity, Sparkles, HeartPulse } from 'lucide-react';

/** Animated count-up hook */
function useCountUp(target, duration = 1500) {
  const [val, setVal] = useState(0);
  useEffect(() => {
    let start = 0;
    const step = Math.max(1, Math.ceil(duration / target));
    const timer = setInterval(() => {
      start += Math.ceil(target / (duration / 20));
      if (start >= target) {
        setVal(target);
        clearInterval(timer);
      } else {
        setVal(start);
      }
    }, 20);
    return () => clearInterval(timer);
  }, [target, duration]);
  return val;
}

/** Floating live demo token card with glassmorphism */
function LiveDemoCard() {
  const [wait, setWait] = useState(14);
  useEffect(() => {
    const id = setInterval(() => setWait(w => (w <= 1 ? 14 : w - 1)), 2500);
    return () => clearInterval(id);
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.35, duration: 0.5 }}
      style={{
        background: 'rgba(255, 255, 255, 0.95)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        border: '1.5px solid rgba(255, 255, 255, 0.8)',
        borderRadius: 24,
        padding: '28px 32px',
        boxShadow: '0 20px 48px rgba(15, 23, 42, 0.25), 0 0 0 1px rgba(255,255,255,0.4)',
        minWidth: 320,
        maxWidth: 360,
        textAlign: 'left',
        position: 'relative',
        color: 'var(--ink)',
      }}
    >
      {/* Top Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#22C55E' }} />
          <span style={{ fontFamily: 'var(--font-heading)', fontWeight: 800, fontSize: 12, color: '#4F46E5', letterSpacing: '.06em', textTransform: 'uppercase' }}>
            QueueCare Live Token
          </span>
        </div>
        <span style={{
          background: '#DCFCE7',
          color: '#15803D',
          borderRadius: 'var(--r-pill)',
          padding: '4px 10px',
          fontSize: 12,
          fontWeight: 700,
          border: '1px solid #BBF7D0',
        }}>
          Arrived
        </span>
      </div>

      <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
        <div style={{ fontSize: 54, fontFamily: 'var(--font-heading)', fontWeight: 800, color: '#0F172A', lineHeight: 1 }}>
          #042
        </div>
        <span style={{
          background: '#FFF1F2',
          color: '#E11D48',
          border: '1px solid #FECDD3',
          padding: '2px 8px',
          borderRadius: 'var(--r-pill)',
          fontSize: 11,
          fontWeight: 700,
        }}>
          Urgent
        </span>
      </div>

      <div style={{ color: '#64748B', fontSize: 14, marginTop: 6, fontWeight: 500 }}>
        Dr. Rajesh Kumar · <span style={{ color: '#E11D48', fontWeight: 600 }}>Cardiology</span>
      </div>

      {/* Dashed divider */}
      <div style={{ height: 1, borderTop: '2px dashed #E2E8F0', margin: '20px 0' }} />

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <div>
          <div style={{ fontSize: 12, color: '#64748B', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.05em' }}>
            Estimated wait
          </div>
          <div style={{ fontFamily: 'var(--font-heading)', fontWeight: 800, fontSize: 32, color: wait <= 5 ? '#16A34A' : '#4F46E5' }}>
            {wait} <span style={{ fontSize: 16, fontWeight: 600, color: '#64748B' }}>min</span>
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 12, color: '#64748B', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.05em' }}>
            Queue Position
          </div>
          <div style={{ fontFamily: 'var(--font-heading)', fontWeight: 800, fontSize: 32, color: '#0F172A' }}>
            2 <span style={{ fontSize: 16, fontWeight: 500, color: '#64748B' }}>ahead</span>
          </div>
        </div>
      </div>

      {/* Pulsing live dot */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 18, paddingTop: 12, borderTop: '1px solid #F1F5F9' }}>
        <span style={{
          width: 8, height: 8, borderRadius: '50%', background: '#22C55E',
          boxShadow: '0 0 0 3px rgba(34, 197, 94, 0.25)',
          animation: 'pulseHeroDot 1.6s infinite',
          display: 'inline-block',
        }} />
        <span style={{ fontSize: 12, color: '#64748B', fontWeight: 500 }}>Live · updating via WebSocket</span>
      </div>

      <style>{`
        @keyframes pulseHeroDot {
          0%, 100% { box-shadow: 0 0 0 3px rgba(34, 197, 94, 0.35); }
          50% { box-shadow: 0 0 0 7px rgba(34, 197, 94, 0.1); }
        }
      `}</style>
    </motion.div>
  );
}

const features = [
  {
    icon: <Clock size={24} color="#fff" />,
    iconBg: 'linear-gradient(135deg, #6366F1 0%, #8B5CF6 100%)',
    badge: 'Real-time ETA',
    title: 'Live wait time',
    desc: 'See exactly how long you will wait — recalculating every second with exponential moving average duration updates.',
  },
  {
    icon: <Zap size={24} color="#fff" />,
    iconBg: 'linear-gradient(135deg, #F59E0B 0%, #EA580C 100%)',
    badge: 'ML USP',
    title: 'Smart overbooking',
    desc: 'Gradient-boosting predicts no-show probability. Safe high-demand slots unlock extra capacity automatically.',
  },
  {
    icon: <ShieldCheck size={24} color="#fff" />,
    iconBg: 'linear-gradient(135deg, #14B8A6 0%, #0D9488 100%)',
    badge: 'Regex Triage',
    title: 'Instant triage',
    desc: 'Describe symptoms. Our rule engine routes to the specialist and flags urgent cases immediately.',
  },
];

const steps = [
  { n: '01', title: 'Describe your symptoms', desc: 'Type symptoms naturally. Triage suggests the right department & flags urgency.' },
  { n: '02', title: 'Pick a doctor & slot',   desc: 'Choose from 7 specialized departments. High-demand smart slots are highlighted in amber.' },
  { n: '03', title: 'Track from home',        desc: 'Your token updates live. Get a reminder when it is time to leave home.' },
];

export default function Landing({ onBook, onClinic }) {
  const patients = useCountUp(1840);

  return (
    <div>
      {/* ── Hero Section with Indigo-to-Violet gradient ── */}
      <section style={{
        background: 'var(--grad-hero)',
        color: '#FFFFFF',
        padding: '80px 24px 84px',
        textAlign: 'center',
        position: 'relative',
        overflow: 'hidden',
      }}>
        {/* Decorative blur spheres */}
        <div style={{
          position: 'absolute', top: '-10%', left: '-5%',
          width: 380, height: 380, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(236,72,153,0.35) 0%, transparent 70%)',
          filter: 'blur(40px)', pointerEvents: 'none',
        }} />
        <div style={{
          position: 'absolute', bottom: '-15%', right: '-5%',
          width: 440, height: 440, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(20,184,166,0.3) 0%, transparent 70%)',
          filter: 'blur(50px)', pointerEvents: 'none',
        }} />

        <div style={{ maxWidth: 840, margin: '0 auto', position: 'relative', zIndex: 1 }}>
          <motion.div
            initial={{ opacity: 0, y: -16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            {/* Pill badge */}
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              background: 'rgba(255, 255, 255, 0.16)',
              backdropFilter: 'blur(10px)',
              WebkitBackdropFilter: 'blur(10px)',
              border: '1px solid rgba(255, 255, 255, 0.3)',
              color: '#FFFFFF',
              borderRadius: 'var(--r-pill)',
              padding: '6px 16px',
              fontSize: 13,
              fontWeight: 700,
              marginBottom: 24,
            }}>
              <Sparkles size={14} color="#FDE047" /> Smart Clinic Scheduling Platform
            </div>

            <h1 style={{
              fontFamily: 'var(--font-heading)',
              fontSize: 'clamp(44px, 6.5vw, 72px)',
              fontWeight: 800,
              letterSpacing: '-0.04em',
              lineHeight: 1.1,
              marginBottom: 22,
              color: '#FFFFFF',
            }}>
              Skip the<br />
              <span style={{
                background: 'linear-gradient(135deg, #A7F3D0 0%, #38BDF8 50%, #FBCFE8 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}>
                waiting room.
              </span>
            </h1>

            <p style={{
              fontSize: 'clamp(16px, 2vw, 20px)',
              color: 'rgba(255, 255, 255, 0.9)',
              maxWidth: 580,
              margin: '0 auto 36px',
              lineHeight: 1.65,
              fontWeight: 400,
            }}>
              Smart overbooking predicts no-shows, eliminates empty doctor slots, and gives every patient a live, transparent wait time.
            </p>

            {/* CTAs */}
            <div style={{ display: 'flex', gap: 14, justifyContent: 'center', flexWrap: 'wrap' }}>
              <button onClick={onBook} style={{
                display: 'flex', alignItems: 'center', gap: 8,
                background: '#FFFFFF',
                color: '#4F46E5',
                border: 'none',
                borderRadius: 'var(--r-pill)',
                padding: '14px 30px',
                fontFamily: 'var(--font-heading)',
                fontWeight: 800,
                fontSize: 15,
                boxShadow: '0 8px 24px rgba(0, 0, 0, 0.25)',
                transition: 'transform .15s, box-shadow .15s',
                cursor: 'pointer',
              }}
                onMouseOver={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 12px 28px rgba(0,0,0,0.3)'; }}
                onMouseOut={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.25)'; }}
              >
                Book appointment <ArrowRight size={17} />
              </button>

              <button onClick={onClinic} style={{
                background: 'rgba(255, 255, 255, 0.14)',
                backdropFilter: 'blur(10px)',
                WebkitBackdropFilter: 'blur(10px)',
                color: '#FFFFFF',
                border: '1.5px solid rgba(255, 255, 255, 0.4)',
                borderRadius: 'var(--r-pill)',
                padding: '14px 28px',
                fontFamily: 'var(--font-heading)',
                fontWeight: 700,
                fontSize: 15,
                cursor: 'pointer',
                transition: 'background .15s, border-color .15s',
              }}
                onMouseOver={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.25)'; }}
                onMouseOut={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.14)'; }}
              >
                Clinic dashboard
              </button>
            </div>
          </motion.div>

          {/* Floating live demo card */}
          <div style={{ marginTop: 52, display: 'flex', justifyContent: 'center' }}>
            <LiveDemoCard />
          </div>

          {/* Stat ticker */}
          <div style={{ marginTop: 32, color: 'rgba(255, 255, 255, 0.85)', fontSize: 14, fontWeight: 500 }}>
            Trusted by <strong style={{ color: '#FFFFFF', fontWeight: 800 }}>{patients.toLocaleString()}+</strong> patients across 7 clinical departments
          </div>
        </div>
      </section>

      {/* ── Feature Tiles ── */}
      <section style={{ padding: '72px 24px', maxWidth: 1140, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: 44 }}>
          <span style={{ color: '#4F46E5', fontWeight: 700, fontSize: 13, textTransform: 'uppercase', letterSpacing: '.06em' }}>
            Clinically Proven Scheduling
          </span>
          <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: 34, fontWeight: 800, color: 'var(--ink)', marginTop: 6 }}>
            Designed for busy modern practices
          </h2>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 24 }}>
          {features.map((f, i) => (
            <motion.div
              key={f.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1, duration: 0.4 }}
              whileHover={{ y: -4, transition: { duration: 0.2 } }}
              style={{
                background: '#FFFFFF',
                border: '1px solid var(--border)',
                borderRadius: 'var(--r-xl)',
                padding: '32px 28px',
                boxShadow: 'var(--shadow-md)',
                display: 'flex',
                flexDirection: 'column',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <div style={{
                  width: 52, height: 52, borderRadius: 16,
                  background: f.iconBg,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  boxShadow: '0 8px 16px rgba(15, 23, 42, 0.12)',
                }}>
                  {f.icon}
                </div>
                <span style={{
                  fontSize: 11, fontWeight: 700, color: '#4F46E5', background: '#EEF2FF',
                  padding: '3px 10px', borderRadius: 'var(--r-pill)',
                }}>
                  {f.badge}
                </span>
              </div>
              <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: 20, fontWeight: 700, marginBottom: 8, color: 'var(--ink)' }}>
                {f.title}
              </h3>
              <p style={{ color: 'var(--muted)', lineHeight: 1.65, fontSize: 14 }}>
                {f.desc}
              </p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ── 3-Step "How It Works" Strip ── */}
      <section style={{
        background: '#FFFFFF',
        borderTop: '1px solid var(--border)',
        borderBottom: '1px solid var(--border)',
        padding: '72px 24px',
      }}>
        <div style={{ maxWidth: 960, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 48 }}>
            <span style={{ color: '#4F46E5', fontWeight: 700, fontSize: 13, textTransform: 'uppercase', letterSpacing: '.06em' }}>
              Seamless Experience
            </span>
            <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: 32, fontWeight: 800, marginTop: 6 }}>
              How QueueCare works in 3 simple steps
            </h2>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 32 }}>
            {steps.map((s, i) => (
              <motion.div
                key={s.n}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.12 }}
                style={{
                  background: '#F8FAFC',
                  borderRadius: 'var(--r-lg)',
                  padding: 24,
                  border: '1px solid var(--border)',
                }}
              >
                <div style={{
                  fontFamily: 'var(--font-heading)',
                  fontSize: 38,
                  fontWeight: 800,
                  color: '#C7D2FE',
                  lineHeight: 1,
                  marginBottom: 12,
                }}>
                  {s.n}
                </div>
                <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: 17, fontWeight: 700, marginBottom: 8, color: 'var(--ink)' }}>
                  {s.title}
                </h3>
                <p style={{ color: 'var(--muted)', fontSize: 14, lineHeight: 1.6 }}>
                  {s.desc}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Bottom CTA ── */}
      <section style={{
        background: 'linear-gradient(135deg, #1E1B4B 0%, #312E81 50%, #4338CA 100%)',
        padding: '64px 24px',
        textAlign: 'center',
        color: '#FFFFFF',
      }}>
        <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: 34, fontWeight: 800, marginBottom: 12 }}>
          Experience healthcare with zero waiting
        </h2>
        <p style={{ opacity: 0.85, fontSize: 16, marginBottom: 28, maxWidth: 480, margin: '0 auto 28px' }}>
          Join thousands of patients who get seen right on schedule.
        </p>
        <button onClick={onBook} style={{
          background: 'var(--grad-primary)',
          color: '#FFFFFF',
          border: 'none',
          borderRadius: 'var(--r-pill)',
          padding: '14px 36px',
          fontFamily: 'var(--font-heading)',
          fontWeight: 800,
          fontSize: 16,
          boxShadow: 'var(--primary-glow)',
          cursor: 'pointer',
        }}>
          Book your consultation
        </button>
      </section>
    </div>
  );
}
