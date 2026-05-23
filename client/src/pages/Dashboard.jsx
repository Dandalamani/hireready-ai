import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import Sidebar from '../components/Sidebar';
import { useAuth } from '../context/AuthContext';

const EmptyState = ({ icon, title, desc, action, actionLabel }) => (
  <div className="flex flex-col items-center justify-center py-10 text-center">
    <div className="w-14 h-14 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-3 text-slate-300">
      {icon}
    </div>
    <p className="text-slate-500 font-medium text-sm mb-1">{title}</p>
    <p className="text-slate-400 text-xs mb-4">{desc}</p>
    {action && (
      <button onClick={action}
        className="text-blue-600 text-sm font-semibold hover:underline">
        {actionLabel}
      </button>
    )}
  </div>
);

const Dashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await axios.get('/api/sessions/meta/dashboard');
        setStats(res.data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  const hasData = stats?.hasData;

  // Score to color
  const scoreColor = (score) => {
    if (!score) return 'text-slate-400';
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-blue-600';
    return 'text-amber-600';
  };

  // Confidence label
const confidenceLabel = (score) => {
  if (!score) return null;
  const n = parseFloat(score);
  if (n >= 9) return 'Very High';
  if (n >= 7) return 'High';
  if (n >= 5) return 'Medium';
  return 'Low';
};

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      <Sidebar />
      <main className="ml-56 flex-1 p-8 overflow-y-auto h-screen">

        {/* Welcome Banner */}
        <div className="bg-blue-600 rounded-2xl p-8 flex items-center justify-between mb-8">
          <div>
            <h2 className="text-3xl font-bold text-white mb-2">
              Welcome back, {user?.name?.split(' ')[0] || 'there'}
            </h2>
            {hasData ? (
              <p className="text-blue-100 text-sm max-w-md">
                You've completed <strong>{stats.totalSessions}</strong> session{stats.totalSessions !== 1 ? 's' : ''}.
                {stats.avgScore && ` Your average score is `}
                {stats.avgScore && <strong>{stats.avgScore}/100</strong>}
                {stats.avgScore && '. Keep pushing!'}
              </p>
            ) : (
              <p className="text-blue-100 text-sm max-w-md">
                Ready to start your interview preparation journey?
                Let's tackle your first practice session!
              </p>
            )}
          </div>
          <Link
            to="/lobby"
            className="flex items-center gap-3 bg-white text-blue-600 font-semibold px-6 py-3 rounded-full text-sm hover:bg-blue-50 transition whitespace-nowrap flex-shrink-0"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"/>
              <path strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
            </svg>
            {hasData ? 'Resume Practice' : 'Start Practice'}
          </Link>
        </div>

        <div className="grid grid-cols-3 gap-6 mb-6">

          {/* Skill Performance */}
          <div className="col-span-2 bg-white rounded-2xl p-6 border border-slate-100 shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-base font-semibold text-slate-800">
                Skill Performance Analysis
              </h3>
              {hasData && stats.avgScore && (
                <span className={`text-xs font-semibold px-3 py-1 rounded-full
                  ${parseFloat(stats.avgScore) >= 85 ? 'bg-green-50 text-green-600'
                    : parseFloat(stats.avgScore) >= 70 ? 'bg-blue-50 text-blue-600'
                    : 'bg-amber-50 text-amber-600'}`}>
                  {parseFloat(stats.avgScore) >= 85 ? 'Overall Elite'
                    : parseFloat(stats.avgScore) >= 70 ? 'Overall Advanced'
                    : 'Overall Intermediate'}
                </span>
              )}
            </div>

            {loading ? (
              <div className="animate-pulse space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="h-28 bg-slate-100 rounded-xl" />
                  <div className="h-28 bg-slate-100 rounded-xl" />
                </div>
                <div className="h-16 bg-slate-50 rounded-xl" />
              </div>
            ) : !hasData ? (
              <EmptyState
                icon={
                  <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
                      d="M16 8v8m-4-5v5m-4-2v2m-2 4h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/>
                  </svg>
                }
                title="No performance data yet"
                desc="Complete your first session to see your skill analysis"
                action={() => navigate('/lobby')}
                actionLabel="Start your first session →"
              />
            ) : (
              <>
                <div className="grid grid-cols-2 gap-6 mb-6">

                  {/* Technical Score */}
                  <div className="bg-slate-50 rounded-xl p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs text-slate-500">Technical Proficiency</span>
                      <span className={`text-lg font-bold ${scoreColor(stats.techScore)}`}>
                        {stats.techScore ? `${stats.techScore}%` : 'N/A'}
                      </span>
                    </div>
                    <div className="w-full bg-slate-200 rounded-full h-2 mb-3">
                      <div className="bg-blue-600 h-2 rounded-full transition-all duration-700"
                        style={{ width: `${stats.techScore || 0}%` }} />
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {stats.techScore ? (
                        ['SYSTEM DESIGN', 'ALGORITHMS',
                          stats.techScore >= 80 ? 'STRENGTH' : 'IMPROVING'
                        ].map(tag => (
                          <span key={tag}
                            className="text-xs bg-white border border-slate-200 text-slate-500 px-2 py-0.5 rounded-md">
                            {tag}
                          </span>
                        ))
                      ) : (
                        <span className="text-xs text-slate-400">
                          Complete a Software Engineer session
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Behavioral Score */}
                  <div className="bg-slate-50 rounded-xl p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs text-slate-500">Behavioral Maturity</span>
                      <span className={`text-lg font-bold ${scoreColor(stats.behScore)}`}>
                        {stats.behScore ? `${stats.behScore}%` : 'N/A'}
                      </span>
                    </div>
                    <div className="w-full bg-slate-200 rounded-full h-2 mb-3">
                      <div className="bg-blue-600 h-2 rounded-full transition-all duration-700"
                        style={{ width: `${stats.behScore || 0}%` }} />
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {stats.behScore ? (
                        ['STAR METHOD', 'LEADERSHIP',
                          stats.behScore >= 80 ? 'EXPERT' : 'DEVELOPING'
                        ].map(tag => (
                          <span key={tag}
                            className="text-xs bg-white border border-slate-200 text-slate-500 px-2 py-0.5 rounded-md">
                            {tag}
                          </span>
                        ))
                      ) : (
                        <span className="text-xs text-slate-400">
                          Complete a PM or Data Scientist session
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Stats Row */}
                <div className="border-t border-slate-100 pt-4 grid grid-cols-3 text-center">
                  <div>
  <p className="text-xs text-slate-400 uppercase tracking-wide mb-1">
    Confidence
  </p>
  <p className="text-xl font-bold text-slate-800">
    {stats.avgConfidenceScore
      ? `${parseFloat(stats.avgConfidenceScore) > 10
          ? confidenceLabel(parseFloat(stats.avgConfidenceScore) / 10)
          : stats.avgConfidenceScore}/10`
      : '—'}
  </p>
  {stats.avgConfidenceScore && (
    <p className="text-xs text-slate-400 mt-0.5">
      {confidenceLabel(stats.avgConfidenceScore)}
    </p>
  )}
</div>
                  <div className="border-x border-slate-100">
                    <p className="text-xs text-slate-400 uppercase tracking-wide mb-1">
                      Pacing
                    </p>
                    <p className="text-xl font-bold text-slate-800">
                      {stats.pacingMode || '—'}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-400 uppercase tracking-wide mb-1">
                      Filler Words
                    </p>
                    <p className="text-xl font-bold text-slate-800">
                      {stats.fillerWordsMode || '—'}
                    </p>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Upcoming Interviews */}
          <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm">
            <h3 className="text-base font-semibold text-slate-800 mb-4">
              Quick Stats
            </h3>

            {loading ? (
              <div className="animate-pulse space-y-3">
                {[1,2,3].map(i => <div key={i} className="h-16 bg-slate-100 rounded-xl" />)}
              </div>
            ) : !hasData ? (
              <EmptyState
                icon={
                  <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
                      d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/>
                  </svg>
                }
                title="No sessions yet"
                desc="Your stats will appear here after your first session"
              />
            ) : (
              <div className="flex flex-col gap-3">
                {[
                  {
                    label: 'Total Sessions',
                    value: stats.totalSessions,
                    icon: (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                          d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>
                      </svg>
                    ),
                    color: 'bg-blue-50 text-blue-600',
                  },
                  {
                    label: 'Average Score',
                    value: stats.avgScore ? `${stats.avgScore}/100` : '—',
                    icon: (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                          d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"/>
                      </svg>
                    ),
                    color: 'bg-amber-50 text-amber-500',
                  },
                  {
                    label: 'Best Score',
                    value: stats.bestScore ? `${stats.bestScore}/100` : '—',
                    icon: (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                          d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z"/>
                      </svg>
                    ),
                    color: 'bg-green-50 text-green-600',
                  },
                  {
                    label: 'Behavioral Mastery',
                    value: stats.behavioralMastery ? `${stats.behavioralMastery}%` : '—',
                    icon: (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                          d="M13 10V3L4 14h7v7l9-11h-7z"/>
                      </svg>
                    ),
                    color: 'bg-purple-50 text-purple-600',
                  },
                ].map(stat => (
                  <div key={stat.label}
                    className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100">
                    <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${stat.color}`}>
                      {stat.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-slate-400">{stat.label}</p>
                      <p className="text-sm font-bold text-slate-800">{stat.value}</p>
                    </div>
                  </div>
                ))}

                <button
                  onClick={() => navigate('/lobby')}
                  className="w-full mt-1 text-sm text-blue-600 font-medium hover:underline text-center py-1"
                >
                  Start New Session →
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Practice History */}
        <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-base font-semibold text-slate-800">Practice History</h3>
            <div className="flex items-center gap-2">
              <span className="text-xs border border-slate-200 text-slate-500 px-3 py-1.5 rounded-lg">
                Last 7 Days
              </span>
              <button
                onClick={() => navigate('/history')}
                className="text-xs bg-blue-600 text-white px-3 py-1.5 rounded-lg hover:bg-blue-700 transition"
              >
                Detailed View
              </button>
            </div>
          </div>

          {loading ? (
            <div className="flex justify-center py-8">
              <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : !hasData || stats.recentSessions.length === 0 ? (
            <EmptyState
              icon={
                <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
                    d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
                </svg>
              }
              title="No sessions in the last 7 days"
              desc="Your recent practice sessions will appear here"
              action={() => navigate('/lobby')}
              actionLabel="Start practicing now →"
            />
          ) : (
            <div className="flex flex-col gap-6">
              {stats.recentSessions.map((item, i) => (
                <div key={item.id} className="flex gap-4">
                  {/* Timeline dot */}
                  <div className="flex flex-col items-center">
                    <div className="w-9 h-9 rounded-full bg-blue-600 flex items-center justify-center flex-shrink-0">
                      <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/>
                      </svg>
                    </div>
                    {i < stats.recentSessions.length - 1 && (
                      <div className="w-px flex-1 bg-slate-100 mt-2" style={{ minHeight: 32 }} />
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex-1 pb-2">
                    <div className="flex items-center justify-between mb-1">
                      <h4 className="text-sm font-semibold text-slate-800">{item.title}</h4>
                      <span className="text-xs text-slate-400">{item.time}</span>
                    </div>
                    <p className="text-sm text-slate-500 mb-2">{item.description}</p>
                    <div className="flex items-center gap-2">
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded
                        ${item.tag === 'TECHNICAL'
                          ? 'bg-blue-50 text-blue-600'
                          : 'bg-purple-50 text-purple-600'}`}>
                        {item.tag}
                      </span>
                      <span className={`text-xs font-semibold
                        ${parseFloat(item.score) >= 80 ? 'text-green-600'
                          : parseFloat(item.score) >= 60 ? 'text-amber-600'
                          : 'text-slate-400'}`}>
                        SCORE: {item.score}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <footer className="mt-8 flex items-center justify-between text-xs text-slate-400 pb-4">
          <span>HireReady AI</span>
          <span>© 2024 HireReady AI. All rights reserved.</span>
          <div className="flex gap-4">
            <button className="hover:text-slate-600 transition">Privacy Policy</button>
            <button className="hover:text-slate-600 transition">Terms of Service</button>
            <button className="hover:text-slate-600 transition">Cookie Settings</button>
          </div>
        </footer>
      </main>
    </div>
  );
};

export default Dashboard;