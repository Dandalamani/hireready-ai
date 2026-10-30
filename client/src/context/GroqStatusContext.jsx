import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import axios from 'axios';

const GroqStatusContext = createContext();

export const GroqStatusProvider = ({ children }) => {
  const [groqStatus, setGroqStatus] = useState(null);
  const [showWarning, setShowWarning] = useState(false);
  const [showBlocked, setShowBlocked] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  const updateStatus = useCallback((data) => {
    if (!data) return;
    setGroqStatus(data);
    setShowWarning(data.usagePct >= 90 && !dismissed);
    setShowBlocked(data.limitReached);
  }, [dismissed]);

  const dismissWarning = useCallback(() => {
    setDismissed(true);
    setShowWarning(false);
  }, []);

  useEffect(() => {
    const fetchStatus = async () => {
      const token = localStorage.getItem('token');
      if (!token) return;
      try {
        const res = await axios.get('/api/groq/status');
        updateStatus(res.data);
      } catch {
        // Silent fail
      }
    };

    fetchStatus();
    const interval = setInterval(fetchStatus, 15000);
    return () => clearInterval(interval);
  }, [dismissed, updateStatus]);

  return (
    <GroqStatusContext.Provider value={{
      groqStatus,
      showWarning,
      showBlocked,
      dismissWarning,
      updateStatus,
    }}>
      {children}
    </GroqStatusContext.Provider>
  );
};

export const useGroqStatus = () => useContext(GroqStatusContext);