// src/App.jsx
import React, { useState } from 'react';
import { Routes, Route, useLocation, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import Navbar from './components/Navbar.jsx';
import Landing from './pages/Landing.jsx';
import BookingWizard from './pages/BookingWizard.jsx';
import TrackPage from './pages/TrackPage.jsx';
import ClinicDashboard from './pages/ClinicDashboard.jsx';
import ClinicLogin from './pages/ClinicLogin.jsx';
import MobileTabBar from './components/MobileTabBar.jsx';

const pageVariants = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.25, ease: 'easeOut' } },
  exit:    { opacity: 0, y: -8, transition: { duration: 0.15 } },
};

export default function App() {
  const location = useLocation();
  const navigate = useNavigate();
  const [lastApptId, setLastApptId] = useState(null);

  // Demo mode: auto-advance queue every 10s when ?demo=1
  const isDemoMode = new URLSearchParams(location.search).get('demo') === '1';

  // Persist last appointment id and phone across page nav
  const handleBooked = (id, phone) => {
    setLastApptId(id);
    if (phone) {
      navigate(`/track/${id}?phone=${encodeURIComponent(phone)}`);
    } else {
      navigate(`/track/${id}`);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <Navbar />

      <main style={{ flex: 1 }}>
        <AnimatePresence mode="wait">
          <Routes location={location} key={location.pathname}>
            <Route path="/" element={
              <motion.div {...pageVariants}>
                <Landing onBook={() => navigate('/book')} onClinic={() => navigate('/clinic')} />
              </motion.div>
            } />
            <Route path="/book" element={
              <motion.div {...pageVariants}>
                <BookingWizard onBooked={handleBooked} />
              </motion.div>
            } />
            <Route path="/track" element={
              <motion.div {...pageVariants}>
                <TrackPage isDemoMode={isDemoMode} />
              </motion.div>
            } />
            <Route path="/track/:id" element={
              <motion.div {...pageVariants}>
                <TrackPage isDemoMode={isDemoMode} />
              </motion.div>
            } />
            <Route path="/clinic" element={
              <motion.div {...pageVariants}>
                <ClinicDashboard isDemoMode={isDemoMode} />
              </motion.div>
            } />
            <Route path="/clinic/login" element={
              <motion.div {...pageVariants}>
                <ClinicLogin />
              </motion.div>
            } />
          </Routes>
        </AnimatePresence>
      </main>

      {/* Mobile bottom tab bar */}
      <MobileTabBar lastApptId={lastApptId} />
    </div>
  );
}
