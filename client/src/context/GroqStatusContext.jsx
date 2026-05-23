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
    const token = localStorage.getItem('token');
    if (!token) return;

    const poll = async () => {
      try {
        const res = await axios.get('/api/groq/status');
        updateStatus(res.data);
      } catch {}
    };

    poll();
    const interval = setInterval(poll, 15000);
    return () => clearInterval(interval);
  }, [updateStatus]);

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