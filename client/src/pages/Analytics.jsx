import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import Sidebar from '../components/Sidebar';

const roleLabel = {
  'software-engineer': 'Software Eng.',
  'product-manager': 'Product Mgr.',
  'data-scientist': 'Data Sci.',
};

const icons = {
  target: (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
        d="M12 22C6.477 22 2 17.523 2 12S6.477 2 12 2s10 4.477 10 10-4.477 10-10 10zm0-6a4 4 0 100-8 4 4 0 000 8zm0-2a2 2 0 110-4 2 2 0 010 4z"/>
    </svg>
  ),
  star: (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
        d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"/>
    </svg>
  ),
  trophy: (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
        d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z"/>
    </svg>
  ),
  trending: (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
        d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"/>
    </svg>
  ),
  chart: (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
        d="M16 8v8m-4-5v5m-4-2v2m-2 4h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/>
    </svg>
  ),
  empty: (
    <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
        d="M16 8v8m-4-5v5m-4-2v2m-2 4h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/>
    </svg>
  ),
  sessions: (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
        d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>
    </svg>
  ),
};

const Analytics = () => {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await axios.get('/api/sessions/meta/analytics');
        setData(res.data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading) return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      <Sidebar />
      <main className="ml-56 flex-1 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </main>
    </div>
  );

  const statCards = [
    {
      label: 'Total Sessions',
      value: data?.totalSessions || 0,
      icon: icons.sessions,
      iconBg: 'bg-blue-50',
      iconColor: 'text-blue-600',
      badge: 'All time',
      badgeColor: 'bg-blue-50 text-blue-600',
    },
    {
      label: 'Avg Score',
      value: data?.avgScore || 0,
      icon: icons.star,
      iconBg: 'bg-amber-50',
      iconColor: 'text-amber-500',
      badge: 'Out of 100',
      badgeColor: 'bg-green-50 text-green-600',
    },
    {
      label: 'Top Role',
      value: roleLabel[data?.topRole] || 'N/A',
      icon: icons.trophy,
      iconBg: 'bg-purple-50',
      iconColor: 'text-purple-600',
      badge: 'Most practiced',
      badgeColor: 'bg-purple-50 text-purple-600',
    },
    {
      label: 'Improvement',
      value: data?.scoreTrend?.length > 1
        ? `+${Math.max(0,
            (data.scoreTrend[data.scoreTrend.length - 1]?.score || 0)
            - (data.scoreTrend[0]?.score || 0)
          ).toFixed(0)} pts`
        : 'N/A',
      icon: icons.trending,
      iconBg: 'bg-green-50',
      iconColor: 'text-green-600',
      badge: 'Since first session',
      badgeColor: 'bg-amber-50 text-amber-600',
    },
  ];

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      <Sidebar />
      <main className="ml-56 flex-1 p-8 overflow-y-auto h-screen">

        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-2xl font-bold text-slate-800">Analytics</h2>
            <p className="text-slate-400 text-sm mt-1">Your performance trends over time</p>
          </div>
          <button
            onClick={() => navigate('/lobby')}
            className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-5 py-2.5 rounded-xl transition flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"/>
              <path strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
            </svg>
            Start New Session
          </button>
        </div>

        {/* Stat Cards */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          {statCards.map(card => (
            <div key={card.label}
              className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm hover:shadow-md transition">
              <div className="flex items-center justify-between mb-4">
                <div className={`w-11 h-11 ${card.iconBg} ${card.iconColor} rounded-xl flex items-center justify-center`}>
                  {card.icon}
                </div>
                <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${card.badgeColor}`}>
                  {card.badge}
                </span>
              </div>
              <p className="text-2xl font-bold text-slate-800 mb-1">{card.value}</p>
              <p className="text-xs text-slate-400">{card.label}</p>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-3 gap-6 mb-6">

          {/* Score Trend Chart */}
          <div className="col-span-2 bg-white rounded-2xl p-6 border border-slate-100 shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-blue-50 text-blue-600 rounded-lg flex items-center justify-center">
                  {icons.chart}
                </div>
                <h3 className="text-sm font-semibold text-slate-800">Score Trend</h3>
              </div>
              <span className="text-xs text-slate-400 bg-slate-50 px-3 py-1 rounded-full border border-slate-100">
                Last {data?.scoreTrend?.length || 0} sessions
              </span>
            </div>

            {data?.scoreTrend?.length > 0 ? (
              <div className="relative">
                {/* Grid lines */}
                <div className="absolute inset-0 flex flex-col justify-between pointer-events-none">
                  {[100, 75, 50, 25, 0].map(v => (
                    <div key={v} className="flex items-center gap-2">
                      <span className="text-xs text-slate-300 w-7 text-right flex-shrink-0">{v}</span>
                      <div className="flex-1 border-t border-slate-100" />
                    </div>
                  ))}
                </div>

                {/* Bars */}
                <div className="ml-10 flex items-end gap-3 h-48 pt-4">
                  {data.scoreTrend.map((point, i) => (
                    <div key={i} className="flex flex-col items-center gap-1 flex-1 group">
                      <span className="text-xs font-semibold text-slate-500 opacity-0 group-hover:opacity-100 transition">
                        {point.score}
                      </span>
                      <div className="relative w-full">
                        <div
                          className="w-full bg-blue-600 hover:bg-blue-700 rounded-t-lg transition-all cursor-pointer"
                          style={{ height: `${(point.score / 100) * 150}px` }}
                        />
                        {/* Tooltip */}
                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 bg-slate-800 text-white text-xs px-2 py-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition whitespace-nowrap pointer-events-none z-10">
                          {point.date}: <strong>{point.score}/100</strong>
                        </div>
                      </div>
                      <span className="text-xs text-slate-400 mt-1">{point.date}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="h-52 flex flex-col items-center justify-center gap-3">
                <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-300">
                  {icons.empty}
                </div>
                <p className="text-slate-400 text-sm">Complete sessions to see your trend</p>
                <button
                  onClick={() => navigate('/lobby')}
                  className="text-blue-600 text-sm font-medium hover:underline"
                >
                  Start your first session →
                </button>
              </div>
            )}
          </div>

          {/* Role Breakdown */}
          <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm">
            <div className="flex items-center gap-2 mb-5">
              <div className="w-8 h-8 bg-purple-50 text-purple-600 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                    d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z"/>
                  <path strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                    d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z"/>
                </svg>
              </div>
              <h3 className="text-sm font-semibold text-slate-800">Sessions by Role</h3>
            </div>

            {data?.roleBreakdown?.length > 0 ? (
              <div className="flex flex-col gap-5">
                {data.roleBreakdown.map((r, i) => {
                  const total = data.roleBreakdown.reduce((s, x) => s + x.count, 0);
                  const pct = Math.round((r.count / total) * 100);
                  const styles = [
                    { bar: 'bg-blue-600', text: 'text-blue-600', bg: 'bg-blue-50' },
                    { bar: 'bg-purple-500', text: 'text-purple-600', bg: 'bg-purple-50' },
                    { bar: 'bg-green-500', text: 'text-green-600', bg: 'bg-green-50' },
                  ];
                  const s = styles[i % styles.length];
                  return (
                    <div key={r.role}>
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <div className={`w-2 h-2 rounded-full ${s.bar}`} />
                          <span className="text-xs font-medium text-slate-600">
                            {roleLabel[r.role] || r.role}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${s.bg} ${s.text}`}>
                            {pct}%
                          </span>
                          <span className="text-xs text-slate-400">{r.count}</span>
                        </div>
                      </div>
                      <div className="w-full bg-slate-100 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full ${s.bar} transition-all duration-700`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-40 gap-3">
                <div className="w-14 h-14 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-300">
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
                      d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z"/>
                  </svg>
                </div>
                <p className="text-slate-400 text-sm text-center">
                  No data yet. Complete a session first!
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Recent Sessions Table */}
        <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-slate-50 text-slate-500 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                    d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/>
                </svg>
              </div>
              <h3 className="text-sm font-semibold text-slate-800">Recent Sessions</h3>
            </div>
            <button
              onClick={() => navigate('/history')}
              className="text-xs text-blue-600 hover:underline font-medium flex items-center gap-1"
            >
              View All
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7"/>
              </svg>
            </button>
          </div>

          {data?.recentSessions?.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-100">
                    {['Role', 'Mode', 'Score', 'Confidence', 'Pacing', 'Date'].map(h => (
                      <th key={h}
                        className="text-left text-xs font-semibold text-slate-400 uppercase tracking-wide pb-3 pr-6">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {data.recentSessions.map(s => (
                    <tr key={s.id} className="hover:bg-slate-50 transition group">
                      <td className="py-3.5 pr-6">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 bg-blue-50 rounded-lg flex items-center justify-center">
                            <svg className="w-3.5 h-3.5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              {s.target_role === 'software-engineer' ? (
                                <path strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                                  d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"/>
                              ) : s.target_role === 'product-manager' ? (
                                <path strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                                  d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7"/>
                              ) : (
                                <path strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                                  d="M16 8v8m-4-5v5m-4-2v2m-2 4h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/>
                              )}
                            </svg>
                          </div>
                          <span className="text-sm font-medium text-slate-700">
                            {roleLabel[s.target_role] || s.target_role}
                          </span>
                        </div>
                      </td>
                      <td className="py-3.5 pr-6">
                        <span className="text-xs bg-slate-100 text-slate-500 px-2.5 py-1 rounded-full capitalize font-medium">
                          {s.mode || 'questions'}
                        </span>
                      </td>
                      <td className="py-3.5 pr-6">
                        <div className="flex items-center gap-2">
                          <span className={`text-sm font-bold
                            ${s.score >= 80 ? 'text-green-600'
                              : s.score >= 60 ? 'text-amber-600'
                              : 'text-red-500'}`}>
                            {s.score ? Math.round(s.score) : '--'}
                          </span>
                          {s.score && (
                            <div className="w-12 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full ${s.score >= 80 ? 'bg-green-500' : s.score >= 60 ? 'bg-amber-400' : 'bg-red-400'}`}
                                style={{ width: `${s.score}%` }}
                              />
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="py-3.5 pr-6">
                        <span className="text-sm text-slate-600">{s.confidence || '--'}</span>
                      </td>
                      <td className="py-3.5 pr-6">
                        <span className="text-sm text-slate-600">{s.pacing || '--'}</span>
                      </td>
                      <td className="py-3.5 pr-6">
                        <span className="text-xs text-slate-400 bg-slate-50 px-2 py-1 rounded-lg">
                          {new Date(s.created_at).toLocaleDateString('en-US', {
                            month: 'short', day: 'numeric', year: 'numeric',
                          })}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center mx-auto mb-4 text-slate-300">
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
                    d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/>
                </svg>
              </div>
              <p className="text-slate-400 text-sm mb-4">No sessions recorded yet.</p>
              <button
                onClick={() => navigate('/lobby')}
                className="text-blue-600 text-sm font-semibold hover:underline flex items-center gap-1 mx-auto"
              >
                Start your first session
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7"/>
                </svg>
              </button>
            </div>
          )}
        </div>

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

export default Analytics;