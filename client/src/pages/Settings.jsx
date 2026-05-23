import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import Sidebar from '../components/Sidebar';
import { useAuth } from '../context/AuthContext';

const tabs = [
  {
    id: 'profile',
    label: 'Profile',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
          d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>
      </svg>
    ),
  },
  {
    id: 'security',
    label: 'Security',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
          d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/>
      </svg>
    ),
  },
  {
    id: 'preferences',
    label: 'Preferences',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
          d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4"/>
      </svg>
    ),
  },
  {
    id: 'danger',
    label: 'Danger Zone',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
          d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
      </svg>
    ),
  },
];

const Alert = ({ type, message, onClose }) => {
  if (!message) return null;
  const styles = {
    success: 'bg-green-50 border-green-200 text-green-700',
    error: 'bg-red-50 border-red-200 text-red-600',
  };
  return (
    <div className={`flex items-center justify-between gap-3 border rounded-xl px-4 py-3 text-sm mb-5 ${styles[type]}`}>
      <div className="flex items-center gap-2">
        {type === 'success' ? (
          <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/>
          </svg>
        ) : (
          <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
              d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
          </svg>
        )}
        {message}
      </div>
      <button onClick={onClose} className="opacity-60 hover:opacity-100 transition">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/>
        </svg>
      </button>
    </div>
  );
};

const Settings = () => {
  const { user, logout, updateUser } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('profile');
  const [profileData, setProfileData] = useState(null);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const fileInputRef = useRef(null);

  // Profile form
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [avatarPreview, setAvatarPreview] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileAlert, setProfileAlert] = useState({ type: '', message: '' });

  // Password form
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPasswords, setShowPasswords] = useState({
    current: false, new: false, confirm: false,
  });
  const [savingPassword, setSavingPassword] = useState(false);
  const [passwordAlert, setPasswordAlert] = useState({ type: '', message: '' });

  // Preferences
  const [prefs, setPrefs] = useState({
    autoMic: true,
    soundEffects: true,
    coachVoice: true,
    emailReports: false,
    darkMode: false,
    language: 'en-US',
  });

  // Danger zone
  const [deletePassword, setDeletePassword] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deletingAccount, setDeletingAccount] = useState(false);
  const [deleteAlert, setDeleteAlert] = useState({ type: '', message: '' });

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await axios.get('/api/user/profile');
        setProfileData(res.data);
        setName(res.data.name || '');
        setEmail(res.data.email || '');
        setAvatarUrl(res.data.avatar_url || '');
        setAvatarPreview(res.data.avatar_url || '');
      } catch (err) {
        console.error(err);
      } finally {
        setLoadingProfile(false);
      }
    };
    fetchProfile();
  }, []);

  const getInitials = (n) =>
    n ? n.split(' ').map(p => p[0]).join('').toUpperCase().slice(0, 2) : '?';

  const handleAvatarUrlChange = (val) => {
    setAvatarUrl(val);
    setAvatarPreview(val);
  };

  const handleSaveProfile = async () => {
    setProfileAlert({ type: '', message: '' });
    setSavingProfile(true);
    try {
      await axios.put('/api/user/profile', { name, email, avatar_url: avatarUrl });
      updateUser({ name, email, avatar_url: avatarUrl });
      setProfileAlert({ type: 'success', message: 'Profile updated successfully!' });
    } catch (err) {
      setProfileAlert({
        type: 'error',
        message: err.response?.data?.message || 'Failed to update profile.',
      });
    } finally {
      setSavingProfile(false);
    }
  };

  const handleChangePassword = async () => {
    setPasswordAlert({ type: '', message: '' });
    if (!currentPassword || !newPassword || !confirmPassword) {
      setPasswordAlert({ type: 'error', message: 'All password fields are required.' });
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordAlert({ type: 'error', message: 'New passwords do not match.' });
      return;
    }
    if (newPassword.length < 6) {
      setPasswordAlert({ type: 'error', message: 'Password must be at least 6 characters.' });
      return;
    }
    setSavingPassword(true);
    try {
      await axios.put('/api/user/password', { currentPassword, newPassword });
      setPasswordAlert({ type: 'success', message: 'Password changed successfully!' });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      setPasswordAlert({
        type: 'error',
        message: err.response?.data?.message || 'Failed to change password.',
      });
    } finally {
      setSavingPassword(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!deletePassword) {
      setDeleteAlert({ type: 'error', message: 'Please enter your password to confirm.' });
      return;
    }
    setDeletingAccount(true);
    try {
      await axios.delete('/api/user/account', { data: { password: deletePassword } });
      logout();
      navigate('/login');
    } catch (err) {
      setDeleteAlert({
        type: 'error',
        message: err.response?.data?.message || 'Failed to delete account.',
      });
      setDeletingAccount(false);
    }
  };

  const PasswordInput = ({ label, value, onChange, show, onToggle, placeholder }) => (
    <div>
      <label className="block text-sm font-medium text-slate-700 mb-1.5">{label}</label>
      <div className="relative">
        <input
          type={show ? 'text' : 'password'}
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder || '••••••••'}
          className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-800 pr-10
            focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
        />
        <button
          type="button"
          onClick={onToggle}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition"
        >
          {show ? (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"/>
            </svg>
          ) : (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
              <path strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/>
            </svg>
          )}
        </button>
      </div>
    </div>
  );

  const RAGStatsCard = () => {
  const [stats, setStats] = useState(null);
  const [clearing, setClearing] = useState(false);

  useEffect(() => {
    axios.get('/api/rag/stats')
      .then(r => setStats(r.data))
      .catch(() => {});
  }, []);

  const handleClear = async () => {
    if (!window.confirm('Clear all RAG learning data? This cannot be undone.')) return;
    setClearing(true);
    try {
      const res = await axios.delete('/api/rag/clear');
      alert(res.data.message);
      setStats(prev => ({ ...prev, totalStored: 0, weakCount: 0, strongCount: 0 }));
    } catch {
      alert('Failed to clear data');
    } finally {
      setClearing(false);
    }
  };

  return (
    <div className="bg-purple-50 border border-purple-100 rounded-xl p-4 mt-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
              d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"/>
          </svg>
          <p className="text-sm font-semibold text-purple-700">AI Learning Knowledge Base</p>
        </div>
        <button
          onClick={handleClear}
          disabled={clearing || !stats?.totalStored}
          className="text-xs text-red-500 hover:text-red-700 border border-red-200 px-2 py-1 rounded-lg transition disabled:opacity-40"
        >
          {clearing ? 'Clearing...' : 'Clear Data'}
        </button>
      </div>
      {stats ? (
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'Total answers stored', value: stats.totalStored || 0, color: 'text-purple-700' },
            { label: 'Weak areas identified', value: stats.weakCount || 0, color: 'text-red-500' },
            { label: 'Strong answers', value: stats.strongCount || 0, color: 'text-green-600' },
          ].map(s => (
            <div key={s.label} className="bg-white rounded-xl p-3 text-center border border-purple-100">
              <p className={`text-xl font-bold ${s.color}`}>{s.value}</p>
              <p className="text-xs text-slate-400 mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-xs text-purple-500">Loading knowledge base stats...</p>
      )}
      <p className="text-xs text-purple-500 mt-3">
        Coach Roberts uses this data to generate questions targeting your weak areas.
        The more sessions you complete, the smarter the coaching gets.
      </p>
    </div>
  );
};

  if (loadingProfile) return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      <Sidebar />
      <main className="ml-56 flex-1 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </main>
    </div>
  );

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      <Sidebar />
      <main className="ml-56 flex-1 p-8 overflow-y-auto h-screen">  

        {/* Header */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-slate-800">Settings</h2>
          <p className="text-slate-400 text-sm mt-1">Manage your account and preferences</p>
        </div>

        <div className="grid grid-cols-4 gap-6">

          {/* Left — Profile Card + Tabs */}
          <div className="col-span-1 flex flex-col gap-4">

            {/* Profile Summary Card */}
            <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm text-center">
              {/* Avatar */}
              <div className="relative w-20 h-20 mx-auto mb-3">
                {avatarPreview ? (
                  <img
                    src={avatarPreview}
                    alt="Avatar"
                    className="w-20 h-20 rounded-full object-cover border-4 border-white shadow-md"
                    onError={() => setAvatarPreview('')}
                  />
                ) : (
                  <div className="w-20 h-20 rounded-full bg-blue-600 flex items-center justify-center border-4 border-white shadow-md">
                    <span className="text-white text-xl font-bold">{getInitials(name)}</span>
                  </div>
                )}
                <button
                  onClick={() => setActiveTab('profile')}
                  className="absolute bottom-0 right-0 w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center border-2 border-white hover:bg-blue-700 transition"
                >
                  <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
                      d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"/>
                  </svg>
                </button>
              </div>

              <h3 className="text-sm font-bold text-slate-800">{name}</h3>
              <p className="text-xs text-slate-400 mt-0.5 mb-4">{email}</p>

              {/* Stats */}
              <div className="grid grid-cols-2 gap-2 pt-3 border-t border-slate-100">
                <div className="text-center">
                  <p className="text-lg font-bold text-blue-600">
                    {profileData?.stats?.totalSessions || 0}
                  </p>
                  <p className="text-xs text-slate-400">Sessions</p>
                </div>
                <div className="text-center">
                  <p className="text-lg font-bold text-blue-600">
                    {profileData?.stats?.avgScore
                      ? Math.round(profileData.stats.avgScore)
                      : '--'}
                  </p>
                  <p className="text-xs text-slate-400">Avg Score</p>
                </div>
              </div>

              {profileData?.stats?.lastSession && (
                <p className="text-xs text-slate-400 mt-3 pt-3 border-t border-slate-100">
                  Last session:{' '}
                  {new Date(profileData.stats.lastSession).toLocaleDateString('en-US', {
                    month: 'short', day: 'numeric',
                  })}
                </p>
              )}
            </div>

            {/* Tab Navigation */}
            <div className="bg-white rounded-2xl p-2 border border-slate-100 shadow-sm">
              {tabs.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition text-left
                    ${activeTab === tab.id
                      ? tab.id === 'danger'
                        ? 'bg-red-50 text-red-500'
                        : 'bg-blue-50 text-blue-600'
                      : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700'}`}
                >
                  <span className={activeTab === tab.id
                    ? tab.id === 'danger' ? 'text-red-400' : 'text-blue-500'
                    : 'text-slate-400'}>
                    {tab.icon}
                  </span>
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Right — Tab Content */}
          <div className="col-span-3">

            {/* ── Profile Tab ── */}
            {activeTab === 'profile' && (
              <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm">
                <div className="flex items-center gap-3 mb-6 pb-5 border-b border-slate-100">
                  <div className="w-9 h-9 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                        d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-base font-semibold text-slate-800">Profile Information</h3>
                    <p className="text-xs text-slate-400">Update your name, email, and avatar</p>
                  </div>
                </div>

                <Alert type={profileAlert.type} message={profileAlert.message}
                  onClose={() => setProfileAlert({ type: '', message: '' })} />

                <div className="space-y-5">
                  {/* Avatar Preview + URL */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-3">Avatar</label>
                    <div className="flex items-center gap-4">
                      <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-slate-200 flex-shrink-0">
                        {avatarPreview ? (
                          <img src={avatarPreview} alt="Preview"
                            className="w-full h-full object-cover"
                            onError={() => setAvatarPreview('')} />
                        ) : (
                          <div className="w-full h-full bg-blue-600 flex items-center justify-center">
                            <span className="text-white text-lg font-bold">{getInitials(name)}</span>
                          </div>
                        )}
                      </div>
                      <div className="flex-1">
                        <input
                          type="text"
                          value={avatarUrl}
                          onChange={e => handleAvatarUrlChange(e.target.value)}
                          placeholder="https://example.com/your-photo.jpg"
                          className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-800
                            focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                        />
                        <p className="text-xs text-slate-400 mt-1.5">
                          Paste a direct image URL (JPG, PNG, WebP)
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Name */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">Full Name</label>
                    <input
                      type="text"
                      value={name}
                      onChange={e => setName(e.target.value)}
                      placeholder="Your full name"
                      className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-800
                        focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                    />
                  </div>

                  {/* Email */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">Email Address</label>
                    <input
                      type="email"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      placeholder="your@email.com"
                      className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-800
                        focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                    />
                  </div>

                  {/* Member Since */}
                  <div className="bg-slate-50 rounded-xl px-4 py-3 border border-slate-100">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                          Member Since
                        </p>
                        <p className="text-sm font-medium text-slate-700 mt-0.5">
                          {profileData?.created_at
                            ? new Date(profileData.created_at).toLocaleDateString('en-US', {
                                month: 'long', day: 'numeric', year: 'numeric',
                              })
                            : '—'}
                        </p>
                      </div>
                      <div className="w-9 h-9 bg-white border border-slate-200 rounded-xl flex items-center justify-center">
                        <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                            d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>
                        </svg>
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end pt-2">
                    <button
                      onClick={handleSaveProfile}
                      disabled={savingProfile}
                      className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-6 py-2.5 rounded-xl text-sm transition flex items-center gap-2 disabled:opacity-60"
                    >
                      {savingProfile ? (
                        <>
                          <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          Saving...
                        </>
                      ) : (
                        <>
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/>
                          </svg>
                          Save Changes
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* ── Security Tab ── */}
            {activeTab === 'security' && (
              <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm">
                <div className="flex items-center gap-3 mb-6 pb-5 border-b border-slate-100">
                  <div className="w-9 h-9 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                        d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/>
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-base font-semibold text-slate-800">Change Password</h3>
                    <p className="text-xs text-slate-400">Keep your account secure</p>
                  </div>
                </div>

                <Alert type={passwordAlert.type} message={passwordAlert.message}
                  onClose={() => setPasswordAlert({ type: '', message: '' })} />

                <div className="space-y-5 max-w-md">
                  <PasswordInput
                    label="Current Password"
                    value={currentPassword}
                    onChange={setCurrentPassword}
                    show={showPasswords.current}
                    onToggle={() => setShowPasswords(p => ({ ...p, current: !p.current }))}
                    placeholder="Enter current password"
                  />
                  <PasswordInput
                    label="New Password"
                    value={newPassword}
                    onChange={setNewPassword}
                    show={showPasswords.new}
                    onToggle={() => setShowPasswords(p => ({ ...p, new: !p.new }))}
                    placeholder="Min. 6 characters"
                  />
                  <PasswordInput
                    label="Confirm New Password"
                    value={confirmPassword}
                    onChange={setConfirmPassword}
                    show={showPasswords.confirm}
                    onToggle={() => setShowPasswords(p => ({ ...p, confirm: !p.confirm }))}
                    placeholder="Repeat new password"
                  />

                  {/* Password strength */}
                  {newPassword && (
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <p className="text-xs text-slate-500">Password strength</p>
                        <p className={`text-xs font-semibold
                          ${newPassword.length < 6 ? 'text-red-500'
                            : newPassword.length < 10 ? 'text-amber-500'
                            : 'text-green-600'}`}>
                          {newPassword.length < 6 ? 'Weak'
                            : newPassword.length < 10 ? 'Good'
                            : 'Strong'}
                        </p>
                      </div>
                      <div className="flex gap-1">
                        {[1, 2, 3].map(i => (
                          <div key={i} className={`flex-1 h-1.5 rounded-full transition-colors
                            ${i === 1 && newPassword.length >= 1 ? 'bg-red-400'
                              : i === 2 && newPassword.length >= 6 ? 'bg-amber-400'
                              : i === 3 && newPassword.length >= 10 ? 'bg-green-500'
                              : 'bg-slate-100'}`} />
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="flex justify-end pt-2">
                    <button
                      onClick={handleChangePassword}
                      disabled={savingPassword}
                      className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-6 py-2.5 rounded-xl text-sm transition flex items-center gap-2 disabled:opacity-60"
                    >
                      {savingPassword ? (
                        <>
                          <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          Updating...
                        </>
                      ) : 'Update Password'}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* ── Preferences Tab ── */}
            {activeTab === 'preferences' && (
              <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm">
                <div className="flex items-center gap-3 mb-6 pb-5 border-b border-slate-100">
                  <div className="w-9 h-9 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                        d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4"/>
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-base font-semibold text-slate-800">Preferences</h3>
                    <p className="text-xs text-slate-400">Customize your interview experience</p>
                  </div>
                </div>

                <div className="space-y-2">
                  {[
                    {
                      key: 'autoMic',
                      label: 'Auto-activate Microphone',
                      desc: 'Automatically enable mic after 5s thinking window',
                      icon: (
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                            d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 016 0v6a3 3 0 01-3 3z"/>
                        </svg>
                      ),
                    },
                    {
                      key: 'coachVoice',
                      label: 'Coach Voice (Text-to-Speech)',
                      desc: 'Coach Roberts speaks questions aloud during sessions',
                      icon: (
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                            d="M15.536 8.464a5 5 0 010 7.072M12 6v12m0 0l-3-3m3 3l3-3M6.343 9.657a8 8 0 000 4.686M4.929 7.929a10 10 0 000 8.142"/>
                        </svg>
                      ),
                    },
                    {
                      key: 'soundEffects',
                      label: 'Sound Effects',
                      desc: 'Play subtle sounds for session events',
                      icon: (
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                            d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3"/>
                        </svg>
                      ),
                    },
                    {
                      key: 'emailReports',
                      label: 'Email Session Reports',
                      desc: 'Receive a summary after each interview session',
                      icon: (
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                            d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/>
                        </svg>
                      ),
                    },
                  ].map(pref => (
                    <div key={pref.key}
                      className="flex items-center justify-between p-4 rounded-xl hover:bg-slate-50 transition">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 bg-slate-100 text-slate-500 rounded-xl flex items-center justify-center flex-shrink-0">
                          {pref.icon}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-slate-700">{pref.label}</p>
                          <p className="text-xs text-slate-400 mt-0.5">{pref.desc}</p>
                        </div>
                      </div>
                      <button
                        onClick={() => setPrefs(p => ({ ...p, [pref.key]: !p[pref.key] }))}
                        className={`relative w-11 h-6 rounded-full transition-colors flex-shrink-0
                          ${prefs[pref.key] ? 'bg-blue-600' : 'bg-slate-200'}`}
                      >
                        <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform
                          ${prefs[pref.key] ? 'translate-x-5' : ''}`} />
                      </button>
                    </div>
                  ))}

                  {/* Language selector */}
                  <div className="flex items-center justify-between p-4 rounded-xl hover:bg-slate-50 transition">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 bg-slate-100 text-slate-500 rounded-xl flex items-center justify-center flex-shrink-0">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                            d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129"/>
                        </svg>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-slate-700">Speech Language</p>
                        <p className="text-xs text-slate-400 mt-0.5">Language for voice recognition</p>
                      </div>
                    </div>
                    <select
                      value={prefs.language}
                      onChange={e => setPrefs(p => ({ ...p, language: e.target.value }))}
                      className="border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                    >
                      <option value="en-US">English (US)</option>
                      <option value="en-GB">English (UK)</option>
                      <option value="en-IN">English (India)</option>
                      <option value="en-AU">English (Australia)</option>
                    </select>
                  </div>
                </div>

                <div className="flex justify-end mt-4 pt-4 border-t border-slate-100">
                  {/* RAG Knowledge Base Stats */}
<RAGStatsCard />
                  <button
                    onClick={() => setProfileAlert({ type: 'success', message: 'Preferences saved!' })}
                    className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-6 py-2.5 rounded-xl text-sm transition"
                  >
                    Save Preferences
                  </button>
                </div>
              </div>
            )}

            {/* ── Danger Zone Tab ── */}
            {activeTab === 'danger' && (
              <div className="bg-white rounded-2xl p-6 border border-red-100 shadow-sm">
                <div className="flex items-center gap-3 mb-6 pb-5 border-b border-red-100">
                  <div className="w-9 h-9 bg-red-50 text-red-500 rounded-xl flex items-center justify-center">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                        d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-base font-semibold text-red-600">Danger Zone</h3>
                    <p className="text-xs text-slate-400">Irreversible actions — proceed with caution</p>
                  </div>
                </div>

                <Alert type={deleteAlert.type} message={deleteAlert.message}
                  onClose={() => setDeleteAlert({ type: '', message: '' })} />

                <div className="bg-red-50 border border-red-100 rounded-2xl p-5">
                  <h4 className="text-sm font-semibold text-red-600 mb-1">Delete Account</h4>
                  <p className="text-xs text-slate-500 mb-4 leading-relaxed">
                    Permanently delete your account and all associated data including sessions,
                    reports, and analytics. <strong>This action cannot be undone.</strong>
                  </p>

                  {!showDeleteConfirm ? (
                    <button
                      onClick={() => setShowDeleteConfirm(true)}
                      className="bg-red-500 hover:bg-red-600 text-white font-semibold px-5 py-2.5 rounded-xl text-sm transition flex items-center gap-2"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                          d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                      </svg>
                      Delete My Account
                    </button>
                  ) : (
                    <div className="space-y-3">
                      <p className="text-xs font-semibold text-red-600">
                        Enter your password to confirm deletion:
                      </p>
                      <input
                        type="password"
                        value={deletePassword}
                        onChange={e => setDeletePassword(e.target.value)}
                        placeholder="Your current password"
                        className="w-full border border-red-200 rounded-xl px-4 py-3 text-sm
                          focus:outline-none focus:ring-2 focus:ring-red-400 bg-white max-w-sm"
                      />
                      <div className="flex gap-3">
                        <button
                          onClick={handleDeleteAccount}
                          disabled={deletingAccount || !deletePassword}
                          className="bg-red-500 hover:bg-red-600 text-white font-semibold px-5 py-2.5 rounded-xl text-sm transition flex items-center gap-2 disabled:opacity-60"
                        >
                          {deletingAccount ? (
                            <>
                              <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                              Deleting...
                            </>
                          ) : 'Confirm Delete'}
                        </button>
                        <button
                          onClick={() => { setShowDeleteConfirm(false); setDeletePassword(''); }}
                          className="border border-slate-200 text-slate-600 font-medium px-5 py-2.5 rounded-xl text-sm hover:bg-slate-50 transition"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        <footer className="mt-8 flex items-center justify-between text-xs text-slate-400 pb-4">
          <span>HireReady AI</span>
          <span>© 2024 HireReady AI. All rights reserved.</span>
          <div className="flex gap-4">
            <button className="hover:text-slate-600 transition">Privacy Policy</button>
            <button className="hover:text-slate-600 transition">Terms of Service</button>
          </div>
        </footer>
      </main>
    </div>
  );
};

export default Settings;