/**
 * TokenCard.jsx — The standout ticket-style appointment token
 *
 * Features a notched edge design (via CSS radial gradients) and displays
 * the appointment ID prominently as a token number.
 */

import React from 'react';

export default function TokenCard({ appointment }) {
  if (!appointment) return null;

  const isUrgent = appointment.urgency === 'urgent';

  return (
    <div className={`token-card ${isUrgent ? 'token-urgent' : ''}`}>
      {/* Decorative header stripe */}
      <div className="token-header">
        <span className="token-logo">🏥 QueueCare</span>
        <span className={`token-urgency ${isUrgent ? 'urgent' : 'normal'}`}>
          {isUrgent ? '⚡ URGENT' : '● NORMAL'}
        </span>
      </div>

      {/* Large token number */}
      <div className="token-number">
        <span className="token-label">TOKEN</span>
        <span className="token-id">#{String(appointment.id).padStart(3, '0')}</span>
      </div>

      {/* Perforated divider */}
      <div className="token-perforation" />

      {/* Appointment details */}
      <div className="token-details">
        <div className="token-row">
          <span className="token-key">Patient</span>
          <span className="token-value">{appointment.patient_name}</span>
        </div>
        <div className="token-row">
          <span className="token-key">Doctor</span>
          <span className="token-value">{appointment.doctor_name || `Doctor #${appointment.doctor_id}`}</span>
        </div>
        <div className="token-row">
          <span className="token-key">Department</span>
          <span className="token-value">{appointment.dept || '—'}</span>
        </div>
        <div className="token-row">
          <span className="token-key">Date</span>
          <span className="token-value">{appointment.date}</span>
        </div>
        <div className="token-row">
          <span className="token-key">Time Slot</span>
          <span className="token-value">{appointment.slot}</span>
        </div>
        <div className="token-row">
          <span className="token-key">Est. Duration</span>
          <span className="token-value">{appointment.pred_min} min</span>
        </div>
      </div>

      {/* Footer */}
      <div className="token-footer">
        Please arrive 10 minutes before your slot
      </div>
    </div>
  );
}
