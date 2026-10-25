/**
 * useWebSocket.js — Custom hook for live queue updates
 *
 * Connects via WebSocket for instant updates.
 * Falls back to 15-second polling if WebSocket fails.
 */

import { useEffect, useRef } from 'react';
import { wsUrl } from '../api';

export default function useWebSocket(doctorId, onRefresh) {
  const wsRef = useRef(null);
  const pollRef = useRef(null);

  useEffect(() => {
    if (!doctorId) return;

    let alive = true; // track if this effect is still active

    // ── Try WebSocket connection ──
    function connectWS() {
      try {
        const ws = new WebSocket(wsUrl(doctorId));
        wsRef.current = ws;

        ws.onopen = () => {
          // WebSocket connected — stop any polling fallback
          if (pollRef.current) {
            clearInterval(pollRef.current);
            pollRef.current = null;
          }
        };

        ws.onmessage = (event) => {
          const data = JSON.parse(event.data);
          if (data.type === 'refresh') {
            onRefresh(); // re-fetch queue data
          }
        };

        ws.onclose = () => {
          // Connection lost — start polling fallback
          if (alive) startPolling();
        };

        ws.onerror = () => {
          ws.close();
        };
      } catch {
        // WebSocket not available — use polling
        startPolling();
      }
    }

    // ── Polling fallback: fetch every 15 seconds ──
    function startPolling() {
      if (pollRef.current) return; // already polling
      pollRef.current = setInterval(() => {
        if (alive) onRefresh();
      }, 15000);
    }

    connectWS();

    // Cleanup on unmount or doctorId change
    return () => {
      alive = false;
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
    };
  }, [doctorId]); // re-run when doctorId changes
}
