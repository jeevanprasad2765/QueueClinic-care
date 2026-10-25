/**
 * BookTab.jsx — Multi-step appointment booking flow
 *
 * Steps:
 *   1. Enter patient info + symptoms → auto-triage suggests dept & urgency
 *   2. Pick a doctor (filtered by suggested department)
 *   3. Pick a date & time slot (with overbooking indicators)
 *   4. Confirm → show the token card
 */

import React, { useState, useEffect } from 'react';
import { get, post } from '../api';
import TokenCard from './TokenCard';

export default function BookTab({ onBooked }) {
  // ── Step tracking ──
  const [step, setStep] = useState(1);

  // ── Step 1: Patient info ──
  const [name, setName] = useState('');
  const [age, setAge] = useState('');
  const [phone, setPhone] = useState('');
  const [symptoms, setSymptoms] = useState('');
  const [triage, setTriage] = useState(null);   // { department, urgency }

  // ── Step 2: Doctor selection ──
  const [doctors, setDoctors] = useState([]);
  const [selectedDoc, setSelectedDoc] = useState(null);

  // ── Step 3: Slot selection ──
  const [selectedDate, setSelectedDate] = useState(
    new Date().toISOString().slice(0, 10) // default to today
  );
  const [slots, setSlots] = useState([]);
  const [selectedSlot, setSelectedSlot] = useState('');

  // ── Step 4: Confirmation ──
  const [appointment, setAppointment] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // ── Step 1 → 2: Run triage and fetch doctors ──
  async function handleTriage(e) {
    e.preventDefault();
    setError('');
    try {
      const result = await post('/api/triage', {
        symptoms,
        age: parseInt(age),
      });
      setTriage(result);

      // Fetch doctors in the suggested department
      const docs = await get(`/api/doctors?dept=${encodeURIComponent(result.department)}`);
      setDoctors(docs);
      setStep(2);
    } catch (err) {
      setError(err.message);
    }
  }

  // ── Step 2 → 3: Fetch available slots ──
  async function handleDoctorSelect(doc) {
    setSelectedDoc(doc);
    setError('');
    try {
      const s = await get(`/api/slots?doctor_id=${doc.id}&date=${selectedDate}`);
      setSlots(s);
      setStep(3);
    } catch (err) {
      setError(err.message);
    }
  }

  // Re-fetch slots when the date changes
  async function handleDateChange(newDate) {
    setSelectedDate(newDate);
    setSelectedSlot('');
    if (selectedDoc) {
      try {
        const s = await get(`/api/slots?doctor_id=${selectedDoc.id}&date=${newDate}`);
        setSlots(s);
      } catch (err) {
        setError(err.message);
      }
    }
  }

  // ── Step 3 → 4: Book the appointment ──
  async function handleBook() {
    setError('');
    setLoading(true);
    try {
      const appt = await post('/api/appointments', {
        patient_name: name,
        age: parseInt(age),
        phone,
        doctor_id: selectedDoc.id,
        date: selectedDate,
        slot: selectedSlot,
        symptoms,
        urgency: triage.urgency,
      });

      // Fetch full details (includes doctor name and dept)
      const full = await get(`/api/appointments/${appt.id}`);
      setAppointment(full);
      setStep(4);
      // Notify parent so Track tab can auto-open
      onBooked(full.id, selectedDoc.id);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  // ── Reset for a new booking ──
  function resetForm() {
    setStep(1);
    setName(''); setAge(''); setPhone(''); setSymptoms('');
    setTriage(null); setDoctors([]); setSelectedDoc(null);
    setSlots([]); setSelectedSlot(''); setAppointment(null);
    setError('');
  }

  return (
    <div className="book-tab">
      {/* ── Progress indicator ── */}
      <div className="steps-bar">
        {['Patient Info', 'Doctor', 'Time Slot', 'Confirmed'].map((label, i) => (
          <div key={i} className={`step-dot ${step > i ? 'done' : ''} ${step === i + 1 ? 'active' : ''}`}>
            <span className="dot">{step > i + 1 ? '✓' : i + 1}</span>
            <span className="step-label">{label}</span>
          </div>
        ))}
      </div>

      {error && <div className="error-msg">⚠ {error}</div>}

      {/* ── STEP 1: Patient Info & Symptoms ── */}
      {step === 1 && (
        <form onSubmit={handleTriage} className="form-card">
          <h2>Patient Information</h2>
          <div className="form-grid">
            <label>
              Full Name
              <input value={name} onChange={e => setName(e.target.value)}
                     placeholder="Enter patient name" required />
            </label>
            <label>
              Age
              <input type="number" value={age} onChange={e => setAge(e.target.value)}
                     placeholder="Age" min="1" max="120" required />
            </label>
            <label>
              Phone
              <input type="tel" value={phone} onChange={e => setPhone(e.target.value)}
                     placeholder="10-digit phone" required />
            </label>
          </div>
          <label>
            Symptoms
            <textarea value={symptoms} onChange={e => setSymptoms(e.target.value)}
                      placeholder="Describe symptoms (e.g., chest pain, skin rash, sore throat...)"
                      rows={3} required />
          </label>
          <button type="submit" className="btn btn-primary">
            Analyse Symptoms →
          </button>
        </form>
      )}

      {/* ── STEP 2: Doctor Selection ── */}
      {step === 2 && triage && (
        <div className="form-card">
          <h2>Select a Doctor</h2>
          <div className="triage-result">
            <span className={`urgency-badge ${triage.urgency}`}>
              {triage.urgency === 'urgent' ? '⚡ Urgent' : '● Normal'}
            </span>
            <span>Suggested department: <strong>{triage.department}</strong></span>
          </div>
          <div className="doctor-list">
            {doctors.map(doc => (
              <button key={doc.id} className="doctor-card"
                      onClick={() => handleDoctorSelect(doc)}>
                <span className="doc-name">{doc.name}</span>
                <span className="doc-dept">{doc.dept}</span>
              </button>
            ))}
          </div>
          <button className="btn btn-link" onClick={() => setStep(1)}>← Back</button>
        </div>
      )}

      {/* ── STEP 3: Date & Slot Selection ── */}
      {step === 3 && (
        <div className="form-card">
          <h2>Pick a Time Slot</h2>
          <p className="subtitle">
            {selectedDoc.name} — {selectedDoc.dept}
          </p>

          <label>
            Date
            <input type="date" value={selectedDate}
                   min={new Date().toISOString().slice(0, 10)}
                   onChange={e => handleDateChange(e.target.value)} />
          </label>

          <div className="slot-grid">
            {slots.map(s => (
              <button
                key={s.slot}
                disabled={!s.available}
                className={`slot-btn
                  ${s.available ? '' : 'slot-full'}
                  ${s.high_demand ? 'slot-high-demand' : ''}
                  ${selectedSlot === s.slot ? 'slot-selected' : ''}`}
                onClick={() => setSelectedSlot(s.slot)}
              >
                {s.slot}
                {s.high_demand && <span className="hd-badge">High Demand</span>}
              </button>
            ))}
          </div>

          <div className="slot-legend">
            <span><span className="legend-dot available" /> Available</span>
            <span><span className="legend-dot high-demand" /> High Demand (overbooked)</span>
            <span><span className="legend-dot full" /> Full</span>
          </div>

          <div className="form-actions">
            <button className="btn btn-link" onClick={() => setStep(2)}>← Back</button>
            <button className="btn btn-primary" disabled={!selectedSlot || loading}
                    onClick={handleBook}>
              {loading ? 'Booking…' : 'Confirm Booking →'}
            </button>
          </div>
        </div>
      )}

      {/* ── STEP 4: Confirmation & Token Card ── */}
      {step === 4 && appointment && (
        <div className="form-card confirmation">
          <h2>✅ Appointment Booked!</h2>
          <TokenCard appointment={appointment} />
          <button className="btn btn-primary" onClick={resetForm}>
            Book Another Appointment
          </button>
        </div>
      )}
    </div>
  );
}
