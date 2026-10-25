/**
 * TrackTab.jsx — Patient appointment tracking page
 *
 * Shows:
 *   - Queue position and patients ahead
 *   - Estimated wait time in minutes
 *   - Live updates via WebSocket
 */

import React, { useState, useEffect, useCallback } from 'react';
import { get } from '../api';
import useWebSocket from '../hooks/useWebSocket';
import TokenCard from './TokenCard';

export default function TrackTab({ appointmentId, doctorId }) {
  const [searchId, setSearchId] = useState(appointmentId || '');
  const [appointment, setAppointment] = useState(null);
  const [queue, setQueue] = useState([]);
  const [error, setError] = useState('');
  const [activeDoctorId, setActiveDoctorId] = useState(doctorId || null);

  // ── Fetch appointment and queue data ──
  const fetchData = useCallback(async (id) => {
    if (!id) return;
    setError('');
    try {
      const appt = await get(`/api/appointments/${id}`);
      setAppointment(appt);
      setActiveDoctorId(appt.doctor_id);

      // Fetch the queue for this doctor (today)
      const q = await get(`/api/queue/${appt.doctor_id}`);
      setQueue(q);
    } catch (err) {
      setError(err.message);
      setAppointment(null);
      setQueue([]);
    }
  }, []);

  // ── Auto-load when appointmentId prop changes (after booking) ──
  useEffect(() => {
    if (appointmentId) {
      setSearchId(String(appointmentId));
      fetchData(appointmentId);
    }
  }, [appointmentId, fetchData]);

  // ── Live WebSocket updates ──
  useWebSocket(activeDoctorId, () => {
    if (searchId) fetchData(searchId);
  });

  // ── Manual search ──
  function handleSearch(e) {
    e.preventDefault();
    fetchData(searchId);
  }

  // ── Find this patient's position in the queue ──
  const activeQueue = queue.filter(q => ['arrived', 'booked', 'in_consult'].includes(q.status));
  const myIndex = activeQueue.findIndex(q => q.id === appointment?.id);
  const patientsAhead = myIndex > 0 ? myIndex : 0;
  const myQueueEntry = activeQueue.find(q => q.id === appointment?.id);

  return (
    <div className="track-tab">
      {/* ── Search bar ── */}
      <form onSubmit={handleSearch} className="search-bar">
        <input
          type="number"
          value={searchId}
          onChange={e => setSearchId(e.target.value)}
          placeholder="Enter your Token ID (e.g. 1)"
          min="1"
        />
        <button type="submit" className="btn btn-primary">Track</button>
      </form>

      {error && <div className="error-msg">⚠ {error}</div>}

      {appointment && (
        <>
          {/* ── Token card ── */}
          <TokenCard appointment={appointment} />

          {/* ── Live status card ── */}
          <div className="status-card">
            <h3>Live Status</h3>

            <div className="status-grid">
              <div className="status-item">
                <span className="status-label">Status</span>
                <span className={`status-value status-${appointment.status}`}>
                  {appointment.status.replace('_', ' ').toUpperCase()}
                </span>
              </div>

              {appointment.status === 'booked' || appointment.status === 'arrived' ? (
                <>
                  <div className="status-item">
                    <span className="status-label">Position</span>
                    <span className="status-value big">
                      #{myIndex + 1}
                    </span>
                  </div>
                  <div className="status-item">
                    <span className="status-label">Patients Ahead</span>
                    <span className="status-value big">
                      {patientsAhead}
                    </span>
                  </div>
                  <div className="status-item">
                    <span className="status-label">Est. Wait</span>
                    <span className="status-value big waiting">
                      {myQueueEntry ? `~${Math.round(myQueueEntry.wait_min)} min` : '—'}
                    </span>
                  </div>
                </>
              ) : appointment.status === 'in_consult' ? (
                <div className="status-item wide">
                  <span className="status-label">🩺 You are currently being seen</span>
                </div>
              ) : appointment.status === 'completed' ? (
                <div className="status-item wide">
                  <span className="status-label">✅ Consultation completed. Feel better!</span>
                </div>
              ) : null}
            </div>
          </div>

          {/* ── Queue overview ── */}
          {activeQueue.length > 0 && (
            <div className="queue-overview">
              <h3>Queue Overview</h3>
              <div className="queue-list">
                {activeQueue.map((q, i) => (
                  <div
                    key={q.id}
                    className={`queue-item
                      ${q.id === appointment.id ? 'queue-me' : ''}
                      ${q.status === 'in_consult' ? 'queue-active' : ''}`}
                  >
                    <span className="queue-pos">#{i + 1}</span>
                    <span className="queue-name">
                      {q.id === appointment.id ? '👉 You' : `Patient #${q.id}`}
                    </span>
                    <span className={`urgency-badge ${q.urgency}`}>
                      {q.urgency === 'urgent' ? '⚡' : '●'}
                    </span>
                    <span className="queue-status">{q.status.replace('_', ' ')}</span>
                    <span className="queue-wait">
                      {q.status === 'in_consult' ? 'Now' : `~${Math.round(q.wait_min)} min`}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
