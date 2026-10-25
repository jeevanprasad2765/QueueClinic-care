/**
 * ClinicTab.jsx — Clinic Dashboard for doctors/staff
 *
 * Features:
 *   - Pick a doctor to see their today's queue
 *   - Shows urgency, predicted duration, no-show risk
 *   - Action buttons: Mark Arrived, Start Consult, Complete, No-Show
 *   - Live updates via WebSocket
 */

import React, { useState, useEffect, useCallback } from 'react';
import { get, patch } from '../api';
import useWebSocket from '../hooks/useWebSocket';

export default function ClinicTab() {
  const [doctors, setDoctors] = useState([]);
  const [selectedDoc, setSelectedDoc] = useState(null);
  const [queue, setQueue] = useState([]);
  const [error, setError] = useState('');

  // ── Fetch all doctors on mount ──
  useEffect(() => {
    get('/api/doctors').then(setDoctors).catch(e => setError(e.message));
  }, []);

  // ── Fetch queue for selected doctor ──
  const fetchQueue = useCallback(async () => {
    if (!selectedDoc) return;
    try {
      const q = await get(`/api/queue/${selectedDoc.id}`);
      setQueue(q);
    } catch (err) {
      setError(err.message);
    }
  }, [selectedDoc]);

  // Re-fetch when doctor changes
  useEffect(() => { fetchQueue(); }, [fetchQueue]);

  // ── Live WebSocket updates ──
  useWebSocket(selectedDoc?.id, fetchQueue);

  // ── Status action handler ──
  async function updateStatus(apptId, newStatus) {
    setError('');
    try {
      await patch(`/api/appointments/${apptId}/status`, { status: newStatus });
      // Queue will refresh via WebSocket, but also fetch immediately for snappiness
      fetchQueue();
    } catch (err) {
      setError(err.message);
    }
  }

  // ── Determine which action buttons to show ──
  function getActions(appt) {
    switch (appt.status) {
      case 'booked':
        return (
          <>
            <button className="action-btn arrived" onClick={() => updateStatus(appt.id, 'arrived')}>
              ✓ Arrived
            </button>
            <button className="action-btn no-show" onClick={() => updateStatus(appt.id, 'no_show')}>
              ✗ No-Show
            </button>
          </>
        );
      case 'arrived':
        return (
          <>
            <button className="action-btn consult" onClick={() => updateStatus(appt.id, 'in_consult')}>
              ▶ Start Consult
            </button>
            <button className="action-btn no-show" onClick={() => updateStatus(appt.id, 'no_show')}>
              ✗ No-Show
            </button>
          </>
        );
      case 'in_consult':
        return (
          <button className="action-btn complete" onClick={() => updateStatus(appt.id, 'completed')}>
            ✓ Complete
          </button>
        );
      default:
        return <span className="status-done">{appt.status.replace('_', ' ')}</span>;
    }
  }

  // ── Risk level helper ──
  function riskLevel(prob) {
    if (prob >= 0.5) return 'high';
    if (prob >= 0.25) return 'medium';
    return 'low';
  }

  return (
    <div className="clinic-tab">
      <h2>Clinic Dashboard</h2>

      {/* ── Doctor selector ── */}
      <div className="doctor-selector">
        {doctors.map(doc => (
          <button
            key={doc.id}
            className={`doc-pill ${selectedDoc?.id === doc.id ? 'active' : ''}`}
            onClick={() => setSelectedDoc(doc)}
          >
            {doc.name}
            <span className="pill-dept">{doc.dept}</span>
          </button>
        ))}
      </div>

      {error && <div className="error-msg">⚠ {error}</div>}

      {/* ── Queue table ── */}
      {selectedDoc && (
        <>
          <h3>{selectedDoc.name}'s Queue — Today</h3>
          {queue.length === 0 ? (
            <p className="empty-msg">No appointments for today.</p>
          ) : (
            <div className="queue-table-wrap">
              <table className="queue-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Patient</th>
                    <th>Slot</th>
                    <th>Urgency</th>
                    <th>Est. Duration</th>
                    <th>No-Show Risk</th>
                    <th>Wait</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {queue.map((appt, i) => (
                    <tr key={appt.id} className={`row-${appt.status}`}>
                      <td>{i + 1}</td>
                      <td>
                        <strong>{appt.patient_name}</strong>
                        <br />
                        <small>Age {appt.age} · {appt.phone}</small>
                      </td>
                      <td>{appt.slot}</td>
                      <td>
                        <span className={`urgency-badge ${appt.urgency}`}>
                          {appt.urgency === 'urgent' ? '⚡ Urgent' : 'Normal'}
                        </span>
                      </td>
                      <td>{appt.pred_min} min</td>
                      <td>
                        <span className={`risk-badge risk-${riskLevel(appt.no_show_prob)}`}>
                          {(appt.no_show_prob * 100).toFixed(0)}%
                        </span>
                      </td>
                      <td>
                        {['arrived', 'booked'].includes(appt.status)
                          ? `~${Math.round(appt.wait_min)} min`
                          : '—'}
                      </td>
                      <td className="action-cell">
                        {getActions(appt)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}
