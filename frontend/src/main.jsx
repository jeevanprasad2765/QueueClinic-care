// src/main.jsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import App from './App.jsx';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
      <Toaster
        position="top-right"
        gutter={10}
        toastOptions={{
          duration: 3500,
          style: {
            fontFamily: 'Inter, sans-serif',
            fontSize: '14px',
            background: '#FFFFFF',
            color: '#0F172A',
            border: '1px solid #E2E8F0',
            boxShadow: '0 10px 30px rgba(15, 23, 42, 0.12)',
            borderRadius: '14px',
            padding: '12px 18px',
            fontWeight: 600,
          },
        }}
      />
    </BrowserRouter>
  </React.StrictMode>
);
