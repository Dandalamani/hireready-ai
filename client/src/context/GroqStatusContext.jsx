import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import axios from 'axios';

const GroqStatusContext = createContext();

export const GroqStatusProvider = ({ children }) => {
  const [groqStatus, setGroqStatus] = useState(null);
  const [showWarning, setShowWarning] = useState(false);
  const [showBlocked, setShowBlocked] = useState(false);

  const updateStatus = useCallback((status) => {
    if (!status) return;
    setGroqStatus(status);
    if (status.limitReached) {
      setShowBlocked(true);
      setShowWarning(false);
    } else if (status.nearLimit) {
      setShowWarning(true);
      setShowBlocked(false);
    } else {
      setShowWarning(false);
      setShowBlocked(false);
    }
  }, []);

  // Poll status every 15 seconds
  useEffect(() => {
  const fetchStatus = async () => {
    const token = localStorage.getItem('token');
    if (!token) return; // Don't poll if not logged in
    try {
      const res = await axios.get('/api/groq/status');
      const data = res.data;
      updateStatus(data);
      setShowWarning(data.usagePct >= 90 && !dismissed);
      setShowBlocked(data.limitReached);
    } catch {
      // Silent fail
    }
  };

  fetchStatus();
  const interval = setInterval(fetchStatus, 15000);
  return () => clearInterval(interval);
}, [dismissed]);

  return (
    <GroqStatusContext.Provider value={{
      groqStatus,
      showWarning,
      showBlocked,
      updateStatus,
      dismissWarning: () => setShowWarning(false),
    }}>
      {children}
    </GroqStatusContext.Provider>
  );
};

export const useGroqStatus = () => useContext(GroqStatusContext);