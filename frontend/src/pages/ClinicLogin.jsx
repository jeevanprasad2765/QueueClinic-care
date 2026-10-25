// src/pages/ClinicLogin.jsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Lock, User, Eye, EyeOff, Loader2, ShieldCheck, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { apiPost, setAuthToken } from '../api.js';

export default function ClinicLogin() {
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!username.trim() || !password) {
      setErrorMsg('Please enter both username and password.');
      return;
    }

    setLoading(true);
    setErrorMsg('');

    try {
      const res = await apiPost('/api/auth/login', {
        username: username.trim(),
        password,
      });

      setAuthToken(res.access_token, {
        name: res.name,
        role: res.role,
        username: res.username,
      });

      toast.success(`Welcome back, ${res.name}!`);
      navigate('/clinic');
    } catch (err) {
      setErrorMsg(err.message || 'Invalid username or password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: 'calc(100vh - 68px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '40px 24px',
    }}>
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        style={{
          width: '100%',
          maxWidth: 420,
          background: '#FFFFFF',
          border: '1px solid var(--border)',
          borderRadius: 24,
          padding: '40px 32px',
          boxShadow: 'var(--shadow-lg)',
        }}
      >
        {/* Header Icon */}
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{
            width: 56,
            height: 56,
            borderRadius: 16,
            background: 'var(--grad-primary)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#FFFFFF',
            margin: '0 auto 16px',
            boxShadow: 'var(--primary-glow)',
          }}>
            <Lock size={26} />
          </div>

          <h1 style={{
            fontFamily: 'var(--font-heading)',
            fontSize: 24,
            fontWeight: 800,
            color: 'var(--ink)',
            marginBottom: 6,
          }}>
            Clinic staff sign in
          </h1>
          <p style={{ color: 'var(--muted)', fontSize: 14 }}>
            Authorized personnel only. Access patient queues and consultations.
          </p>
        </div>

        {/* Inline Error Alert */}
        {errorMsg && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            style={{
              background: '#FFE4E6',
              border: '1px solid #FECDD3',
              borderRadius: 'var(--r-md)',
              padding: '12px 14px',
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              color: '#E11D48',
              fontSize: 13,
              fontWeight: 600,
              marginBottom: 20,
            }}
          >
            <AlertCircle size={18} style={{ flexShrink: 0 }} />
            <span>{errorMsg}</span>
          </motion.div>
        )}

        <form onSubmit={handleSubmit}>
          {/* Username */}
          <div style={{ marginBottom: 18 }}>
            <label style={{
              display: 'block',
              fontSize: 13,
              fontWeight: 700,
              color: 'var(--ink)',
              marginBottom: 6,
            }}>
              Staff Username
            </label>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              border: '1.5px solid var(--border)',
              borderRadius: 'var(--r-md)',
              padding: '10px 14px',
              background: '#FFFFFF',
            }}>
              <User size={18} color="var(--muted)" />
              <input
                type="text"
                autoComplete="username"
                placeholder="e.g. admin or reception"
                value={username}
                onChange={e => setUsername(e.target.value)}
                style={{
                  border: 'none',
                  outline: 'none',
                  width: '100%',
                  fontSize: 14,
                  color: 'var(--ink)',
                }}
              />
            </div>
          </div>

          {/* Password */}
          <div style={{ marginBottom: 24 }}>
            <label style={{
              display: 'block',
              fontSize: 13,
              fontWeight: 700,
              color: 'var(--ink)',
              marginBottom: 6,
            }}>
              Password
            </label>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              border: '1.5px solid var(--border)',
              borderRadius: 'var(--r-md)',
              padding: '10px 14px',
              background: '#FFFFFF',
            }}>
              <Lock size={18} color="var(--muted)" />
              <input
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                placeholder="Enter staff password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                style={{
                  border: 'none',
                  outline: 'none',
                  width: '100%',
                  fontSize: 14,
                  color: 'var(--ink)',
                }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(p => !p)}
                style={{
                  background: 'none',
                  border: 'none',
                  padding: 0,
                  cursor: 'pointer',
                  color: 'var(--muted)',
                  display: 'flex',
                  alignItems: 'center',
                }}
                tabIndex={-1}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              background: 'var(--grad-primary)',
              color: '#FFFFFF',
              border: 'none',
              borderRadius: 'var(--r-pill)',
              padding: '13px 24px',
              fontFamily: 'var(--font-heading)',
              fontWeight: 800,
              fontSize: 15,
              cursor: loading ? 'not-allowed' : 'pointer',
              boxShadow: 'var(--primary-glow)',
              transition: 'transform .15s, box-shadow .15s',
            }}
          >
            {loading ? (
              <>
                <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} />
                Signing in...
              </>
            ) : (
              'Sign in to clinic portal'
            )}
          </button>
        </form>

        {/* Security assurance */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 6,
          marginTop: 24,
          paddingTop: 16,
          borderTop: '1px solid var(--border)',
          color: 'var(--muted)',
          fontSize: 12,
          fontWeight: 500,
        }}>
          <ShieldCheck size={15} color="#16A34A" />
          <span>Protected by bcrypt & 8-hour encrypted JWT</span>
        </div>
      </motion.div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
