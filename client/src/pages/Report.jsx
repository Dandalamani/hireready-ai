import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import axios from 'axios';
import Sidebar from '../components/Sidebar';

// Module-level set — persists across re-renders and StrictMode double calls
const processedSessions = new Set();

const Report = () => {
  const { state } = useLocation();
  const navigate = useNavigate();
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const hasRun = useRef(false);

  useEffect(() => {
    if (!state?.exchanges?.length) {
      navigate('/dashboard');
      return;
    }

      // Use sessionStorage as cross-render lock
  const lockKey = `report_lock_${state?.session_key || 'nokey'}`;
  if (sessionStorage.getItem(lockKey)) {
    console.log('⚠️ Report already processing, skipping');
    setLoading(false);
    return;
  }
  sessionStorage.setItem(lockKey, '1');

  // Clean lock after 10 seconds
  setTimeout(() => sessionStorage.removeItem(lockKey), 10000);

    // Double guard — ref + module Set
    if (hasRun.current) return;
    const sessionKey = state?.session_key || `no_key_${Date.now()}`;
    if (processedSessions.has(sessionKey)) {
      console.log('⚠️ Session already processed:', sessionKey);
      return;
    }

    hasRun.current = true;
    processedSessions.add(sessionKey);

    const fetchAndSave = async () => {
      try {
        // Generate report
        const res = await axios.post('/api/groq/report', {
          role: state.role,
          exchanges: state.exchanges,
        });
        const reportData = res.data;
        setReport(reportData);

        console.log('📊 Report score:', reportData.overallScore);

        // Save session
        if (state.session_key) {
          try {
            const updateRes = await axios.patch('/api/sessions/update-score', {
              session_key: state.session_key,
              score: reportData.overallScore,
              confidence: reportData.confidence || null,
              pacing: reportData.pacingWPM
                ? `${reportData.pacingWPM} WPM`
                : null,
            });

            console.log('✅ Score update rows:', updateRes.data.affectedRows);

            if (updateRes.data.affectedRows === 0) {
              // Session not found — save fresh
              await axios.post('/api/sessions', {
                target_role: state.role,
                mode: state.mode || 'questions',
                difficulty: state.difficulty || 'intermediate',
                score: reportData.overallScore,
                confidence: reportData.confidence || null,
                pacing: reportData.pacingWPM
                  ? `${reportData.pacingWPM} WPM`
                  : 'Normal',
                filler_words: 'Low',
                duration_minutes: Math.max(
                  1,
                  Math.ceil((state.exchanges?.length || 1) * 1.5)
                ),
                session_key: state.session_key,
                exchanges: state.exchanges.map(ex => ({
                  question: ex.question || '',
                  answer: ex.answer || '',
                  category: 'general',
                  feedback: ex.feedback || null,
                })),
              });
              console.log('✅ Fresh session saved');
            }
          } catch (updateErr) {
            console.error('Update error:', updateErr.message);
          }
        } else {
          // No session key
          const uniqueKey = `report_${Date.now()}_${Math.random().toString(36).substr(2,6)}`;
          await axios.post('/api/sessions', {
            target_role: state.role,
            mode: state.mode || 'questions',
            difficulty: state.difficulty || 'intermediate',
            score: reportData.overallScore,
            confidence: reportData.confidence || null,
            pacing: reportData.pacingWPM
              ? `${reportData.pacingWPM} WPM`
              : 'Normal',
            filler_words: 'Low',
            duration_minutes: Math.max(
              1,
              Math.ceil((state.exchanges?.length || 1) * 1.5)
            ),
            session_key: uniqueKey,
            exchanges: state.exchanges.map(ex => ({
              question: ex.question || '',
              answer: ex.answer || '',
              category: 'general',
              feedback: ex.feedback || null,
            })),
          });
          console.log('✅ Session saved (no key)');
        }

        // Store in RAG
        try {
          await axios.post('/api/rag/store-session', {
            sessionId: state.session_key || `session_${Date.now()}`,
            exchanges: state.exchanges,
            role: state.role,
          });
          console.log('✅ RAG stored');
        } catch (ragErr) {
          console.log('⚠️ RAG skipped:', ragErr.message);
        }

      } catch (err) {
        console.error('❌ Report error:', err.response?.data || err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchAndSave();
  }, []); // eslint-disable-line

  if (loading) return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar />
      <main className="ml-56 flex-1 flex items-center justify-center flex-col gap-4">
        <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
        <p className="text-slate-600 font-semibold text-lg">Generating your report...</p>
        <p className="text-slate-400 text-sm">Coach Roberts is analyzing your session</p>
      </main>
    </div>
  );

  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar />
      <main className="ml-56 flex-1 p-8">

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-slate-800">
              {state.role === 'software-engineer' ? 'Software Engineer'
                : state.role === 'product-manager' ? 'Product Manager'
                : 'Data Scientist'} Interview Report
            </h2>
            <p className="text-slate-400 text-sm mt-1">
              Interview Session with Coach Roberts •{' '}
              {new Date().toLocaleDateString('en-US', {
                month: 'short', day: 'numeric', year: 'numeric',
              })}
            </p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => navigate('/lobby')}
              className="flex items-center gap-2 border border-slate-200 text-slate-600 px-4 py-2 rounded-xl text-sm hover:bg-slate-50 transition"
            >
              Practice Again
            </button>
            <button className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-xl text-sm hover:bg-blue-700 transition">
              Export PDF
            </button>
          </div>
        </div>

        {/* Top Row */}
        <div className="grid grid-cols-3 gap-6 mb-6">

          {/* Overall Score */}
          <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm">
            <h3 className="text-sm font-semibold text-slate-500 mb-4 text-center">
              Overall Performance
            </h3>
            <div className="relative w-32 h-32 mx-auto mb-4">
              <svg className="w-32 h-32 -rotate-90" viewBox="0 0 120 120">
                <circle cx="60" cy="60" r="50" fill="none" stroke="#EFF6FF" strokeWidth="12"/>
                <circle cx="60" cy="60" r="50" fill="none" stroke="#2563EB" strokeWidth="12"
                  strokeDasharray={`${((report?.overallScore || 0) / 100) * 314} 314`}
                  strokeLinecap="round" className="transition-all duration-1000"/>
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-4xl font-bold text-slate-800">
                  {report?.overallScore || '—'}
                </span>
                <span className="text-xs text-slate-400 mt-0.5">
                  {report?.overallScore >= 85 ? 'Expert Level'
                    : report?.overallScore >= 70 ? 'Advanced'
                    : report?.overallScore >= 55 ? 'Intermediate'
                    : 'Beginner'}
                </span>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2 border-t border-slate-100 pt-4">
              {[
                { label: 'Clarity', val: report?.clarity },
                { label: 'Structure', val: report?.structure },
                { label: 'Tone', val: report?.tone },
              ].map(m => (
                <div key={m.label} className="text-center">
                  <p className="text-base font-bold text-slate-800">
                    {m.val ? `${m.val}%` : '—'}
                  </p>
                  <p className="text-xs text-slate-400">{m.label}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Sentiment */}
          <div className="col-span-2 bg-white rounded-2xl p-6 border border-slate-100 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-slate-500">
                Sentiment & Engagement
              </h3>
              <span className={`text-xs font-semibold px-3 py-1 rounded-full border
                ${(report?.overallScore || 0) >= 70
                  ? 'bg-green-50 text-green-600 border-green-100'
                  : (report?.overallScore || 0) >= 50
                  ? 'bg-amber-50 text-amber-600 border-amber-100'
                  : 'bg-red-50 text-red-500 border-red-100'}`}>
                {(report?.overallScore || 0) >= 70 ? 'Highly Encouraging'
                  : (report?.overallScore || 0) >= 50 ? 'Keep Practicing'
                  : 'Needs Improvement'}
              </span>
            </div>
            <div className="flex items-end gap-2 h-24 mb-5">
              {(state?.exchanges || []).map((_, i) => {
                const heights = [40, 55, 65, 72, 80, 85, 88, 90, 87, 92];
                const h = heights[i % heights.length];
                return (
                  <div key={i} className="flex-1 rounded-t-lg"
                    style={{
                      height: `${h}%`,
                      background: `rgba(37,99,235,${0.4 + i * 0.06})`,
                    }} />
                );
              })}
            </div>
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: 'Confidence', val: report?.confidence || '—', icon: '🎯' },
                { label: 'Empathy', val: report?.empathy || '—', icon: '💡' },
                { label: 'Pacing', val: `${report?.pacingWPM || '—'} WPM`, icon: '⏱' },
              ].map(m => (
                <div key={m.label}
                  className="bg-slate-50 rounded-xl p-3 text-center border border-slate-100">
                  <p className="text-sm mb-0.5">{m.icon}</p>
                  <p className="text-xs text-slate-400">{m.label}</p>
                  <p className="text-sm font-semibold text-slate-700 mt-0.5">{m.val}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Q&A Breakdown */}
        <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm mb-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-slate-800">Q&A Breakdown</h3>
            <span className="text-xs text-slate-400">
              {state.exchanges.length} questions answered
            </span>
          </div>
          <div className="flex flex-col gap-3">
            {state.exchanges.map((ex, i) => (
              <div key={i} className="bg-slate-50 rounded-xl p-4 border border-slate-100">
                <div className="flex items-start justify-between gap-4 mb-2">
                  <div className="flex gap-2 items-start flex-1">
                    <span className="text-xs font-bold text-blue-600 bg-blue-50 border border-blue-100 px-2 py-0.5 rounded-full flex-shrink-0">
                      Q{i + 1}
                    </span>
                    <p className="text-sm text-slate-600 font-medium">{ex.question}</p>
                  </div>
                  {ex.feedback && (
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full flex-shrink-0
                      ${ex.feedback.score >= 8
                        ? 'bg-green-50 text-green-600 border border-green-100'
                        : ex.feedback.score >= 6
                        ? 'bg-amber-50 text-amber-600 border border-amber-100'
                        : 'bg-red-50 text-red-500 border border-red-100'}`}>
                      {ex.feedback.score}/10
                    </span>
                  )}
                </div>
                <p className="text-sm text-slate-500 ml-8 mb-2 italic">
                  "{ex.answer || 'No response'}"
                </p>
                {ex.feedback?.tip && (
                  <p className="text-xs text-blue-600 ml-8 flex items-center gap-1">
                    <span>💡</span> {ex.feedback.tip}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Bottom Row */}
        <div className="grid grid-cols-2 gap-6">

          {/* Phrasing Suggestions */}
          <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm">
            <h3 className="text-sm font-semibold text-slate-800 mb-4">
              Better Phrasing Suggestions
            </h3>
            {report?.phrasingSuggestions?.length ? (
              <div className="flex flex-col gap-4">
                {report.phrasingSuggestions.slice(0, 2).map((p, i) => (
                  <div key={i}
                    className="bg-slate-50 rounded-xl p-4 border border-slate-100">
                    <p className="text-xs text-slate-400 uppercase font-semibold tracking-wide mb-2">
                      What you said
                    </p>
                    <div className="flex gap-2 mb-3">
                      <span className="w-5 h-5 bg-red-100 text-red-500 rounded-full flex items-center justify-center text-xs flex-shrink-0 mt-0.5">
                        ✕
                      </span>
                      <p className="text-xs text-slate-500 italic">"{p.said}"</p>
                    </div>
                    <div className="flex gap-2">
                      <span className="text-blue-500 text-sm flex-shrink-0 mt-0.5">→</span>
                      <p className="text-xs text-blue-700 font-medium italic leading-relaxed">
                        "{p.better}"
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-slate-400 text-center py-4">
                {(report?.overallScore || 0) <= 20
                  ? 'Answer the questions to get phrasing suggestions.'
                  : 'Great job! No major phrasing issues detected.'}
              </p>
            )}
          </div>

          {/* Executive Summary */}
          <div className="bg-blue-600 rounded-2xl p-6 text-white">
            <h3 className="text-sm font-semibold mb-5 flex items-center gap-2">
              <span className="w-6 h-6 border-2 border-white rounded-full flex items-center justify-center text-xs">
                +
              </span>
              Executive Summary
            </h3>
            <div className="flex flex-col gap-5">
              {[
                { num: '01', title: 'Value Proposition', text: report?.valueProp },
                { num: '02', title: 'Executive Presence', text: report?.executivePresence },
                { num: '03', title: 'Next Steps', text: report?.nextSteps },
              ].map(item => (
                <div key={item.num} className="flex gap-3">
                  <span className="text-blue-300 text-sm font-bold w-7 flex-shrink-0 pt-0.5">
                    {item.num}
                  </span>
                  <div>
                    <p className="text-sm font-semibold mb-1">{item.title}</p>
                    <p className="text-xs text-blue-200 leading-relaxed">
                      {item.text || '...'}
                    </p>
                  </div>
                </div>
              ))}
            </div>
            <button
              onClick={() => navigate('/lobby')}
              className="w-full mt-6 bg-white text-blue-600 font-semibold py-2.5 rounded-xl text-sm hover:bg-blue-50 transition"
            >
              Start Targeted Practice
            </button>
          </div>
        </div>

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

export default Report;