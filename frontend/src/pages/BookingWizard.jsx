// src/pages/BookingWizard.jsx
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { CheckCircle2, ChevronRight, ChevronLeft, AlertCircle, Loader2, Sparkles, User, Calendar, Clock } from 'lucide-react';
import { apiPost, apiGet } from '../api.js';
import { getDeptTheme } from '../utils/deptColors.js';

const today = () => new Date().toISOString().slice(0, 10);

/* ── Step 1: Symptoms & AI Triage ── */
function StepSymptoms({ data, setData, onNext }) {
  const [loading, setLoading] = useState(false);
  const [triage, setTriage] = useState(data.triage || null);

  const analyse = async () => {
    if (!data.symptoms?.trim()) {
      toast.error('Please describe your symptoms.');
      return;
    }
    const ageVal = data.age ? Number(data.age) : null;
    if (data.age && (ageVal < 1 || ageVal > 120)) {
      toast.error('Please enter a realistic age (1-120).');
      return;
    }

    setLoading(true);
    try {
      const res = await apiPost('/api/triage', {
        symptoms: data.symptoms,
        age: ageVal,
      });
      setTriage(res);
      setData(d => ({
        ...d,
        triage: res,
        urgency: res.urgency,
        dept: res.dept || res.department,
      }));
      toast.success(`Triage complete: ${res.dept || res.department}`);
    } catch (e) {
      toast.error('Triage failed: ' + e.message);
    } finally {
      setLoading(false);
    }
  };

  const canContinue = Boolean(triage && data.name?.trim() && data.phone?.trim());
  const deptTheme = triage ? getDeptTheme(triage.dept || triage.department) : null;

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <h2 style={styles.stepTitle}>Tell us how you are feeling</h2>
        <p style={styles.stepSub}>Our clinical triage will suggest the right specialist and check urgency.</p>
      </div>

      <div style={styles.fieldGroup}>
        <label style={styles.label}>Patient name</label>
        <input
          style={styles.input}
          placeholder="e.g. Rahul Sharma"
          value={data.name || ''}
          onChange={e => setData(d => ({ ...d, name: e.target.value }))}
        />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
        <div style={styles.fieldGroup}>
          <label style={styles.label}>Age</label>
          <input
            style={styles.input}
            type="number"
            placeholder="e.g. 28"
            min={1}
            max={120}
            value={data.age || ''}
            onChange={e => setData(d => ({ ...d, age: e.target.value }))}
          />
        </div>
        <div style={styles.fieldGroup}>
          <label style={styles.label}>Phone number</label>
          <input
            style={styles.input}
            type="tel"
            placeholder="e.g. 9876543210"
            value={data.phone || ''}
            onChange={e => setData(d => ({ ...d, phone: e.target.value }))}
          />
        </div>
      </div>

      <div style={styles.fieldGroup}>
        <label style={styles.label}>Symptoms or reason for visit</label>
        <textarea
          style={{ ...styles.input, height: 96, resize: 'vertical' }}
          placeholder="e.g. pimples on face, chest pain, knee pain after workout..."
          value={data.symptoms || ''}
          onChange={e => {
            const val = e.target.value;
            setData(d => ({ ...d, symptoms: val }));
          }}
        />
      </div>

      <button
        onClick={analyse}
        disabled={loading}
        style={{
          ...styles.secondaryBtn,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
          marginBottom: 20,
          width: '100%',
        }}
      >
        {loading ? (
          <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />
        ) : (
          <Sparkles size={16} color="#4F46E5" />
        )}
        Analyse symptoms with AI Triage
      </button>

      {/* Animated Triage Badge */}
      <AnimatePresence>
        {triage && deptTheme && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -6 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0 }}
            style={{
              background: deptTheme.soft,
              border: `1.5px solid ${deptTheme.border}`,
              borderRadius: 'var(--r-lg)',
              padding: '16px 20px',
              marginBottom: 24,
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{
                  width: 36, height: 36, borderRadius: '50%',
                  background: deptTheme.gradient,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: '#fff', fontWeight: 800, fontSize: 14,
                }}>
                  {triage.dept?.[0] || 'D'}
                </div>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--muted)', textTransform: 'uppercase' }}>
                    Recommended Department
                  </div>
                  <div style={{ fontWeight: 800, fontSize: 17, color: deptTheme.text }}>
                    {triage.dept || triage.department}
                  </div>
                </div>
              </div>

              {/* Urgency Pill */}
              <span style={{
                background: triage.urgency === 'urgent' ? '#FFE4E6' : '#DCFCE7',
                color: triage.urgency === 'urgent' ? '#E11D48' : '#15803D',
                border: `1px solid ${triage.urgency === 'urgent' ? '#FECDD3' : '#BBF7D0'}`,
                borderRadius: 'var(--r-pill)',
                padding: '4px 12px',
                fontSize: 12,
                fontWeight: 700,
                textTransform: 'capitalize',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 5,
              }}>
                {triage.urgency === 'urgent' && <AlertCircle size={13} />}
                {triage.urgency}
              </span>
            </div>

            {/* Matched keywords highlight */}
            {triage.matched && triage.matched.length > 0 && (
              <div style={{ marginTop: 10, paddingTop: 10, borderTop: `1px solid ${deptTheme.border}`, fontSize: 13 }}>
                <span style={{ color: 'var(--muted)', fontWeight: 500 }}>Matched: </span>
                <span style={{ fontWeight: 700, color: deptTheme.text }}>
                  {triage.matched.join(', ')}
                </span>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <button
        onClick={onNext}
        disabled={!canContinue}
        style={canContinue ? styles.primaryBtn : styles.disabledBtn}
      >
        Select doctor <ChevronRight size={17} />
      </button>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

/* ── Step 2: Doctor Selection with Department Colored Avatars ── */
function StepDoctor({ data, setData, onNext, onBack }) {
  const [doctors, setDoctors] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const dept = data.triage?.dept || data.triage?.department;
    const url = dept ? `/api/doctors?dept=${encodeURIComponent(dept)}` : '/api/doctors';
    apiGet(url)
      .then(d => {
        // If department filtered returns none, load all doctors
        if (d && d.length > 0) {
          setDoctors(d);
        } else {
          return apiGet('/api/doctors').then(all => setDoctors(all));
        }
      })
      .catch(e => toast.error('Failed to load doctors: ' + e.message))
      .finally(() => setLoading(false));
  }, [data.triage]);

  const initials = name =>
    name
      .replace(/^Dr\.\s*/i, '')
      .split(' ')
      .filter(Boolean)
      .map(w => w[0])
      .slice(0, 2)
      .join('')
      .toUpperCase();

  const isSelected = doc => data.doctor?.id === doc.id;

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <h2 style={styles.stepTitle}>Choose your doctor</h2>
        <p style={styles.stepSub}>
          {data.triage?.dept
            ? `Specialists matched for ${data.triage.dept}`
            : 'Select an available specialist'}
        </p>
      </div>

      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {[1, 2, 3].map(i => (
            <div key={i} className="skeleton" style={{ height: 76, borderRadius: 'var(--r-lg)' }} />
          ))}
        </div>
      ) : doctors.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 40, color: 'var(--muted)' }}>No doctors found.</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 24 }}>
          {doctors.map(doc => {
            const theme = getDeptTheme(doc.dept);
            const sel = isSelected(doc);

            return (
              <motion.div
                key={doc.id}
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
                onClick={() => {
                  setData(d => ({ ...d, doctor: doc }));
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 16,
                  padding: '16px 20px',
                  background: sel ? theme.soft : '#FFFFFF',
                  border: `2px solid ${sel ? theme.primary : 'var(--border)'}`,
                  borderRadius: 'var(--r-lg)',
                  cursor: 'pointer',
                  boxShadow: sel ? `0 4px 16px ${theme.border}` : 'var(--shadow-sm)',
                  transition: 'all .15s ease',
                  position: 'relative',
                }}
              >
                {/* Department Colored Avatar */}
                <div style={{
                  width: 48,
                  height: 48,
                  borderRadius: 14,
                  background: theme.gradient,
                  color: '#FFFFFF',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontFamily: 'var(--font-heading)',
                  fontWeight: 800,
                  fontSize: 16,
                  boxShadow: `0 4px 10px ${theme.border}`,
                  flexShrink: 0,
                }}>
                  {initials(doc.name)}
                </div>

                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: 16, color: 'var(--ink)' }}>
                    {doc.name}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 2 }}>
                    <span style={{
                      fontSize: 12,
                      fontWeight: 600,
                      color: theme.text,
                      background: theme.soft,
                      padding: '2px 8px',
                      borderRadius: 'var(--r-pill)',
                      border: `1px solid ${theme.border}`,
                    }}>
                      {doc.dept}
                    </span>
                    <span style={{ fontSize: 12, color: 'var(--muted)' }}>Next slot: Today</span>
                  </div>
                </div>

                {/* Selected Checkmark */}
                <div style={{
                  width: 24,
                  height: 24,
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: `2px solid ${sel ? theme.primary : '#CBD5E1'}`,
                  background: sel ? theme.primary : 'transparent',
                  transition: 'all .15s ease',
                }}>
                  {sel && <CheckCircle2 size={18} color="#FFFFFF" />}
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      <div style={{ display: 'flex', gap: 12 }}>
        <button onClick={onBack} style={styles.ghostBtn}>
          <ChevronLeft size={16} /> Back
        </button>
        <button
          onClick={onNext}
          disabled={!data.doctor}
          style={data.doctor ? styles.primaryBtn : styles.disabledBtn}
        >
          Select slot <ChevronRight size={17} />
        </button>
      </div>
    </div>
  );
}

/* ── Step 3: Slot Grid with Amber High-Demand Chips ── */
function StepSlot({ data, setData, onNext, onBack }) {
  const [slots, setSlots] = useState([]);
  const [loading, setLoading] = useState(true);

  const dateVal = data.date || today();

  useEffect(() => {
    if (!data.doctor) return;
    setLoading(true);
    apiGet(`/api/slots?doctor_id=${data.doctor.id}&date=${dateVal}`)
      .then(s => setSlots(s))
      .catch(e => toast.error('Failed to load slots: ' + e.message))
      .finally(() => setLoading(false));
  }, [data.doctor, dateVal]);

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <h2 style={styles.stepTitle}>Pick a consultation slot</h2>
        <p style={styles.stepSub}>High-demand slots have smart ML overbooking enabled.</p>
      </div>

      <div style={styles.fieldGroup}>
        <label style={styles.label}>Appointment Date</label>
        <input
          type="date"
          style={styles.input}
          value={dateVal}
          min={today()}
          onChange={e => setData(d => ({ ...d, date: e.target.value, slot: null }))}
        />
      </div>

      {loading ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(84px, 1fr))', gap: 10 }}>
          {Array(12).fill(0).map((_, i) => (
            <div key={i} className="skeleton" style={{ height: 46, borderRadius: 'var(--r-md)' }} />
          ))}
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(90px, 1fr))', gap: 10, marginBottom: 24 }}>
          {slots.map(s => {
            const sel = data.slot === s.slot;
            const unavail = !s.available;
            const isHighDemand = s.high_demand && !unavail;

            return (
              <button
                key={s.slot}
                disabled={unavail}
                onClick={() => !unavail && setData(d => ({ ...d, slot: s.slot }))}
                title={unavail ? 'Slot full' : isHighDemand ? 'Smart Overbooked (Capacity 2)' : 'Available'}
                style={{
                  padding: '12px 6px',
                  borderRadius: 'var(--r-md)',
                  border: sel
                    ? '2px solid var(--primary)'
                    : isHighDemand
                    ? '1.5px solid #F59E0B'
                    : '1.5px solid var(--border)',
                  background: unavail
                    ? '#F1F5F9'
                    : sel
                    ? 'var(--grad-primary)'
                    : isHighDemand
                    ? '#FEF3C7'
                    : '#FFFFFF',
                  color: unavail
                    ? '#94A3B8'
                    : sel
                    ? '#FFFFFF'
                    : isHighDemand
                    ? '#B45309'
                    : 'var(--ink)',
                  fontWeight: sel ? 800 : isHighDemand ? 700 : 600,
                  fontSize: 13,
                  cursor: unavail ? 'not-allowed' : 'pointer',
                  position: 'relative',
                  transition: 'all .12s ease',
                  boxShadow: sel ? 'var(--primary-glow)' : 'none',
                }}
              >
                {s.slot}
                {isHighDemand && (
                  <span style={{
                    position: 'absolute',
                    top: -7,
                    right: -4,
                    background: '#F59E0B',
                    color: '#FFFFFF',
                    fontSize: 8,
                    fontWeight: 800,
                    borderRadius: 4,
                    padding: '1px 5px',
                    letterSpacing: '.04em',
                  }}>
                    HOT
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}

      <div style={{ display: 'flex', gap: 12 }}>
        <button onClick={onBack} style={styles.ghostBtn}>
          <ChevronLeft size={16} /> Back
        </button>
        <button
          onClick={onNext}
          disabled={!data.slot}
          style={data.slot ? styles.primaryBtn : styles.disabledBtn}
        >
          Review booking <ChevronRight size={17} />
        </button>
      </div>
    </div>
  );
}

/* ── Step 4: Confirm Booking & Token Ticket ── */
function StepConfirm({ data, onBack, onBooked }) {
  const [loading, setLoading] = useState(false);
  const [booked, setBooked] = useState(null);

  const submit = async () => {
    setLoading(true);
    try {
      const res = await apiPost('/api/appointments', {
        patient_name: data.name,
        age: Number(data.age) || 30,
        phone: data.phone,
        doctor_id: data.doctor.id,
        date: data.date || today(),
        slot: data.slot,
        symptoms: data.symptoms || '',
        urgency: data.urgency || 'normal',
      });
      setBooked(res);
      toast.success('Appointment booked successfully!');
    } catch (e) {
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  };

  const deptTheme = data.doctor ? getDeptTheme(data.doctor.dept) : getDeptTheme('General Medicine');

  if (booked) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        style={{ textAlign: 'center' }}
      >
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 220, delay: 0.1 }}
          style={{
            width: 76,
            height: 76,
            borderRadius: '50%',
            background: '#DCFCE7',
            border: '2px solid #BBF7D0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 16px',
          }}
        >
          <CheckCircle2 size={40} color="#16A34A" />
        </motion.div>

        <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: 28, fontWeight: 800, marginBottom: 6 }}>
          Appointment confirmed!
        </h2>
        <p style={{ color: 'var(--muted)', fontSize: 14, marginBottom: 24 }}>
          Save your token ticket to track your live queue status.
        </p>

        {/* Notched Token Card */}
        <div style={{
          background: '#FFFFFF',
          border: '1.5px solid var(--border)',
          borderRadius: 20,
          padding: '24px 28px',
          boxShadow: 'var(--shadow-lg)',
          maxWidth: 340,
          margin: '0 auto 28px',
          textAlign: 'left',
          position: 'relative',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--primary)', letterSpacing: '.06em', textTransform: 'uppercase' }}>
              QueueCare Token
            </span>
            <span style={{
              background: data.urgency === 'urgent' ? '#FFE4E6' : '#DCFCE7',
              color: data.urgency === 'urgent' ? '#E11D48' : '#15803D',
              borderRadius: 'var(--r-pill)',
              padding: '2px 8px',
              fontSize: 11,
              fontWeight: 700,
            }}>
              {data.urgency || 'Normal'}
            </span>
          </div>

          <div style={{ fontFamily: 'var(--font-heading)', fontSize: 42, fontWeight: 800, color: 'var(--ink)', lineHeight: 1.1, margin: '12px 0 8px', letterSpacing: '-0.02em' }}>
            {booked.id}
          </div>

          <div style={{ height: 1, borderTop: '2px dashed #E2E8F0', margin: '16px 0' }} />

          <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--ink)' }}>
            {booked.doctor_name || data.doctor?.name}
          </div>
          <div style={{ fontSize: 13, color: deptTheme.text, fontWeight: 600 }}>
            {data.doctor?.dept}
          </div>
          <div style={{ fontSize: 13, color: 'var(--muted)', marginTop: 4 }}>
            {booked.date || data.date} · {booked.slot || data.slot}
          </div>
        </div>

        <button onClick={() => {
          localStorage.setItem('queuecare_last_id', booked.id);
          if (data.phone) localStorage.setItem('queuecare_last_phone', data.phone);
          onBooked(booked.id, data.phone);
        }} style={styles.primaryBtn}>
          Track appointment live <ChevronRight size={17} />
        </button>
      </motion.div>
    );
  }

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <h2 style={styles.stepTitle}>Confirm your appointment</h2>
        <p style={styles.stepSub}>Review your details before booking.</p>
      </div>

      <div style={{
        background: '#FFFFFF',
        border: '1px solid var(--border)',
        borderRadius: 'var(--r-lg)',
        padding: '20px 24px',
        marginBottom: 24,
      }}>
        {[
          ['Patient', data.name],
          ['Age', data.age ? `${data.age} yrs` : 'Not specified'],
          ['Phone', data.phone],
          ['Doctor', data.doctor?.name],
          ['Department', data.doctor?.dept],
          ['Date', data.date || today()],
          ['Slot', data.slot],
          ['Urgency', data.urgency || 'normal'],
        ].map(([k, v]) => (
          <div
            key={k}
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              padding: '10px 0',
              borderBottom: '1px solid #F1F5F9',
            }}
          >
            <span style={{ color: 'var(--muted)', fontSize: 14 }}>{k}</span>
            <span style={{
              fontWeight: 700,
              fontSize: 14,
              color: k === 'Urgency' && data.urgency === 'urgent' ? '#E11D48' : 'var(--ink)',
              textTransform: k === 'Urgency' ? 'capitalize' : 'none',
            }}>
              {v}
            </span>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', gap: 12 }}>
        <button onClick={onBack} style={styles.ghostBtn}>
          <ChevronLeft size={16} /> Back
        </button>
        <button onClick={submit} disabled={loading} style={styles.primaryBtn}>
          {loading ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> : null}
          Confirm & generate token
        </button>
      </div>
    </div>
  );
}

/* ── Wizard Main ── */
const STEPS = ['Symptoms', 'Doctor', 'Slot', 'Confirm'];

export default function BookingWizard({ onBooked }) {
  const [step, setStep] = useState(0);
  const [data, setData] = useState({ urgency: 'normal' });

  const next = () => setStep(s => Math.min(s + 1, STEPS.length - 1));
  const back = () => setStep(s => Math.max(s - 1, 0));

  return (
    <div style={{ maxWidth: 600, margin: '0 auto', padding: '40px 24px' }}>
      {/* Stepper Progress Bar */}
      <div style={{ marginBottom: 32 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
          {STEPS.map((s, i) => (
            <span
              key={s}
              style={{
                fontSize: 12,
                fontWeight: 700,
                color: i <= step ? 'var(--primary)' : 'var(--muted)',
                letterSpacing: '.02em',
              }}
            >
              {i + 1}. {s}
            </span>
          ))}
        </div>
        <div style={{ height: 6, background: '#E2E8F0', borderRadius: 'var(--r-pill)', overflow: 'hidden' }}>
          <motion.div
            animate={{ width: `${((step + 1) / STEPS.length) * 100}%` }}
            transition={{ duration: 0.35, ease: 'easeInOut' }}
            style={{ height: '100%', background: 'var(--grad-primary)', borderRadius: 'var(--r-pill)' }}
          />
        </div>
      </div>

      {/* Step Container Card */}
      <div style={{
        background: '#FFFFFF',
        border: '1px solid var(--border)',
        borderRadius: 'var(--r-xl)',
        padding: '36px 32px',
        boxShadow: 'var(--shadow-md)',
      }}>
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 16 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -16 }}
            transition={{ duration: 0.2 }}
          >
            {step === 0 && <StepSymptoms data={data} setData={setData} onNext={next} />}
            {step === 1 && <StepDoctor data={data} setData={setData} onNext={next} onBack={back} />}
            {step === 2 && <StepSlot data={data} setData={setData} onNext={next} onBack={back} />}
            {step === 3 && <StepConfirm data={data} onBack={back} onBooked={onBooked} />}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}

const styles = {
  stepTitle: {
    fontFamily: 'var(--font-heading)',
    fontSize: 24,
    fontWeight: 800,
    color: 'var(--ink)',
    marginBottom: 4,
  },
  stepSub: {
    color: 'var(--muted)',
    fontSize: 14,
    lineHeight: 1.5,
  },
  fieldGroup: { marginBottom: 16 },
  label: {
    display: 'block',
    fontSize: 13,
    fontWeight: 700,
    color: 'var(--ink)',
    marginBottom: 6,
  },
  input: {
    width: '100%',
    padding: '11px 14px',
    border: '1.5px solid var(--border)',
    borderRadius: 'var(--r-md)',
    fontSize: 14,
    color: 'var(--ink)',
    background: '#FFFFFF',
    outline: 'none',
    transition: 'border-color .15s, box-shadow .15s',
  },
  primaryBtn: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    background: 'var(--grad-primary)',
    color: '#FFFFFF',
    border: 'none',
    borderRadius: 'var(--r-pill)',
    padding: '13px 24px',
    fontWeight: 700,
    fontSize: 14,
    fontFamily: 'var(--font-heading)',
    cursor: 'pointer',
    boxShadow: 'var(--primary-glow)',
    minHeight: 46,
  },
  secondaryBtn: {
    background: '#EEF2FF',
    color: '#4F46E5',
    border: '1px solid #C7D2FE',
    borderRadius: 'var(--r-pill)',
    padding: '11px 20px',
    fontWeight: 700,
    fontSize: 14,
    cursor: 'pointer',
    minHeight: 44,
  },
  ghostBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: 4,
    background: '#FFFFFF',
    color: 'var(--muted)',
    border: '1.5px solid var(--border)',
    borderRadius: 'var(--r-pill)',
    padding: '11px 20px',
    fontWeight: 600,
    fontSize: 14,
    cursor: 'pointer',
    minHeight: 46,
  },
  disabledBtn: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    background: '#E2E8F0',
    color: '#94A3B8',
    border: 'none',
    borderRadius: 'var(--r-pill)',
    padding: '13px 24px',
    fontWeight: 700,
    fontSize: 14,
    cursor: 'not-allowed',
    minHeight: 46,
  },
};
