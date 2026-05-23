import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import Sidebar from '../components/Sidebar';

const roleLabel = {
  'software-engineer': 'Software Engineer',
  'product-manager': 'Product Manager',
  'data-scientist': 'Data Scientist',
};

const History = () => {
  const navigate = useNavigate();
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [deleting, setDeleting] = useState(null);

  useEffect(() => {
    const fetch = async () => {
      try {
        const res = await axios.get('/api/sessions');
        setSessions(res.data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, []);

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this session?')) return;
    setDeleting(id);
    try {
      await axios.delete(`/api/sessions/${id}`);
      setSessions(prev => prev.filter(s => s.id !== id));
    } catch (err) {
      console.error(err);
    } finally {
      setDeleting(null);
    }
  };

  const filtered = filter === 'all'
    ? sessions
    : sessions.filter(s => s.target_role === filter);

  const getScoreColor = score => {
    if (score >= 80) return 'text-green-600 bg-green-50 border-green-100';
    if (score >= 60) return 'text-amber-600 bg-amber-50 border-amber-100';
    return 'text-red-500 bg-red-50 border-red-100';
  };

  const getScoreLabel = score => {
    if (score >= 85) return 'Expert';
    if (score >= 70) return 'Advanced';
    if (score >= 55) return 'Intermediate';
    return 'Beginner';
  };

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      <Sidebar />
      <main className="ml-56 flex-1 p-8 overflow-y-auto h-screen">

        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-2xl font-bold text-slate-800">Practice History</h2>
            <p className="text-slate-400 text-sm mt-1">
              {sessions.length} session{sessions.length !== 1 ? 's' : ''} completed
            </p>
          </div>
          <button
            onClick={() => navigate('/lobby')}
            className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-5 py-2.5 rounded-xl transition flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4"/>
            </svg>
            New Session
          </button>
        </div>

        {/* Filter Tabs */}
        <div className="flex gap-2 mb-6">
          {[
            { val: 'all', label: 'All Sessions' },
            { val: 'software-engineer', label: 'Software Engineer' },
            { val: 'product-manager', label: 'Product Manager' },
            { val: 'data-scientist', label: 'Data Scientist' },
          ].map(f => (
            <button
              key={f.val}
              onClick={() => setFilter(f.val)}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition border
                ${filter === f.val
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-white text-slate-500 border-slate-200 hover:border-blue-300 hover:text-blue-500'}`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Sessions List */}
        {loading ? (
          <div className="flex justify-center py-20">
            <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-16 text-center">
            <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                  d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
              </svg>
            </div>
            <h3 className="text-slate-600 font-semibold mb-2">No sessions yet</h3>
            <p className="text-slate-400 text-sm mb-6">
              Complete your first practice session to see it here.
            </p>
            <button
              onClick={() => navigate('/lobby')}
              className="bg-blue-600 text-white px-6 py-2.5 rounded-xl text-sm font-semibold hover:bg-blue-700 transition"
            >
              Start Practicing
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {filtered.map(session => (
              <div key={session.id}
                className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 hover:border-blue-200 transition group">
                <div className="flex items-center gap-4">

                  {/* Role Icon */}
                  <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center flex-shrink-0">
                    <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      {session.target_role === 'software-engineer' ? (
                        <path strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                          d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"/>
                      ) : session.target_role === 'product-manager' ? (
                        <path strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                          d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7"/>
                      ) : (
                        <path strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                          d="M16 8v8m-4-5v5m-4-2v2m-2 4h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/>
                      )}
                    </svg>
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-sm font-semibold text-slate-800">
  {roleLabel[session.target_role] || session.target_role} Interview
</h3>
                      <span className="text-xs text-slate-400 bg-slate-50 border border-slate-100 px-2 py-0.5 rounded-full">
                        {session.mode || 'questions'}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400">
                      {new Date(session.created_at).toLocaleDateString('en-US', {
                        weekday: 'short', month: 'short', day: 'numeric', year: 'numeric',
                        hour: '2-digit', minute: '2-digit',
                      })}
                    </p>
                    <div className="flex items-center gap-3 mt-2">
                      {session.pacing && (
                        <span className="text-xs text-slate-500 flex items-center gap-1">
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeWidth="2" strokeLinecap="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
                          </svg>
                          {session.pacing}
                        </span>
                      )}
                      {session.confidence && (
                        <span className="text-xs text-slate-500 flex items-center gap-1">
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeWidth="2" strokeLinecap="round" d="M13 10V3L4 14h7v7l9-11h-7z"/>
                          </svg>
                          {session.confidence} confidence
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Score */}
                  {session.score && (
                    <div className="text-center flex-shrink-0">
                      <div className={`text-2xl font-bold px-4 py-2 rounded-xl border ${session.score
      ? getScoreColor(session.score)
      : 'text-slate-400 bg-slate-50 border-slate-100'}`}>
                        {session.score ? Math.round(session.score) : '—'}
                      </div>
                      <p className="text-xs text-slate-400 mt-1">{session.score ? getScoreLabel(session.score) : 'No score'}</p>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition">
                    <button
                      onClick={() => handleDelete(session.id)}
                      disabled={deleting === session.id}
                      className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition"
                    >
                      {deleting === session.id ? (
                        <span className="w-4 h-4 border-2 border-red-400 border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                        </svg>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        <footer className="mt-8 flex items-center justify-between text-xs text-slate-400 pb-4">
          <span>HireReady AI</span>
          <span>© 2024 HireReady AI. All rights reserved.</span>
          <div className="flex gap-4">
            <button className="hover:text-slate-600">Privacy Policy</button>
            <button className="hover:text-slate-600">Terms of Service</button>
          </div>
        </footer>
      </main>
    </div>
  );
};

export default History;