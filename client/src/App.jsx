import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { GroqStatusProvider } from './context/GroqStatusContext';
import GroqLimitBanner from './components/GroqLimitBanner';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Lobby from './pages/Lobby';
import Interview from './pages/Interview';
import Report from './pages/Report';
import History from './pages/History';
import Analytics from './pages/Analytics';
import Settings from './pages/Settings';
import ProjectInterview from './pages/ProjectInterview';

const PrivateRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return (
    <div className="flex items-center justify-center min-h-screen bg-slate-50">
      <div className="flex flex-col items-center gap-3">
        <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
        <p className="text-slate-500 text-sm">Loading HireReady AI...</p>
      </div>
    </div>
  );
  return user ? children : <Navigate to="/login" replace />;
};

const PublicRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return null;
  return !user ? children : <Navigate to="/dashboard" replace />;
};

const AppRoutes = () => (
  <Routes>
    <Route path="/" element={<Navigate to="/dashboard" replace />} />
    <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
    <Route path="/register" element={<PublicRoute><Register /></PublicRoute>} />
    <Route path="/dashboard" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
    <Route path="/lobby" element={<PrivateRoute><Lobby /></PrivateRoute>} />
    <Route path="/interview" element={<PrivateRoute><Interview /></PrivateRoute>} />
    <Route path="/report" element={<PrivateRoute><Report /></PrivateRoute>} />
    <Route path="/history" element={<PrivateRoute><History /></PrivateRoute>} />
    <Route path="/analytics" element={<PrivateRoute><Analytics /></PrivateRoute>} />
    <Route path="/settings" element={<PrivateRoute><Settings /></PrivateRoute>} />
    <Route path="/project-interview" element={<PrivateRoute><ProjectInterview /></PrivateRoute>} />
    <Route path="*" element={<Navigate to="/dashboard" replace />} />
  </Routes>
);

const App = () => (
  <AuthProvider>
    <GroqStatusProvider>
      <BrowserRouter>
        <GroqLimitBanner />
        <AppRoutes />
      </BrowserRouter>
    </GroqStatusProvider>
  </AuthProvider>
);

export default App;