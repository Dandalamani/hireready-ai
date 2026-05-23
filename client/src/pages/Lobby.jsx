import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import { useGroqStatus } from '../context/GroqStatusContext';
import axios from "axios";

const roles = [
  {
    id: 'software-engineer',
    label: 'Software Engineer',
    sub: 'Backend, Frontend, Fullstack',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
          d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"/>
      </svg>
    ),
  },
  {
    id: 'product-manager',
    label: 'Product Manager',
    sub: 'Strategy & Execution',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
          d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7"/>
      </svg>
    ),
  },
  {
    id: 'data-scientist',
    label: 'Data Scientist',
    sub: 'ML & Analytics',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
          d="M16 8v8m-4-5v5m-4-2v2m-2 4h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/>
      </svg>
    ),
  },
];

const Lobby = () => {
  const navigate = useNavigate();
  const [selectedRole, setSelectedRole] = useState('software-engineer');
  const [mode, setMode] = useState('time');
  const [duration, setDuration] = useState('15 min');
  const [questions, setQuestions] = useState('10 questions');
  const [noiseSuppress, setNoiseSuppress] = useState(true);
  const [audioLevel, setAudioLevel] = useState([4, 6, 8, 5, 7, 6, 9, 7, 5, 8]);
  const [starting, setStarting] = useState(false);
  const { showBlocked, groqStatus } = useGroqStatus();
  const [ragContext, setRagContext] = useState(null);

  useEffect(() => {
  const fetchRAGContext = async () => {
    try {
      const res = await axios.get(`/api/rag/context?role=${selectedRole}`);
      setRagContext(res.data);
    } catch {}
  };
  fetchRAGContext();
}, [selectedRole]);

  // Animate audio bars
  React.useEffect(() => {
    const interval = setInterval(() => {
      setAudioLevel(prev => prev.map(() => Math.floor(Math.random() * 8) + 3));
    }, 400);
    return () => clearInterval(interval);
  }, []);

  const handleStart = async () => {
    setStarting(true);
    setTimeout(() => {
      navigate('/interview', {
        state: {
          role: selectedRole,
          mode,
          duration,
          questions,
          difficulty: 'intermediate',
        },
      });
    }, 800);
  };

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      <Sidebar />

      <main className="ml-56 flex-1 p-8 overflow-y-auto h-screen">

        {/* Header */}
        <div className="mb-8">
          <p className="text-sm font-semibold text-blue-600 mb-1">Preparation Lobby</p>
          <h2 className="text-3xl font-bold text-slate-800">Fine-tune your performance.</h2>
          <p className="text-slate-400 mt-1 text-sm">Complete your configuration before starting your AI-led session.</p>
        </div>

        <div className="grid grid-cols-3 gap-6">

          {/* Left Column */}
          <div className="col-span-2 flex flex-col gap-6">

            {/* Target Role */}
            <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-base font-semibold text-slate-800">Target Role</h3>
                <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                    d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/>
                </svg>
              </div>
              <div className="grid grid-cols-3 gap-3">
                {roles.map(role => (
                  <button
                    key={role.id}
                    onClick={() => setSelectedRole(role.id)}
                    className={`flex flex-col items-start gap-2 p-4 rounded-xl border-2 text-left transition
                      ${selectedRole === role.id
                        ? 'border-blue-600 bg-blue-50'
                        : 'border-slate-200 bg-white hover:border-slate-300'}`}
                  >
                    <span className={selectedRole === role.id ? 'text-blue-600' : 'text-slate-400'}>
                      {role.icon}
                    </span>
                    <div>
                      <p className={`text-sm font-semibold ${selectedRole === role.id ? 'text-blue-700' : 'text-slate-700'}`}>
                        {role.label}
                      </p>
                      <p className="text-xs text-slate-400 mt-0.5">{role.sub}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Practice Mode */}
            <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm">
              <h3 className="text-base font-semibold text-slate-800 mb-4">Practice Mode</h3>
              <div className="grid grid-cols-2 gap-4">

                {/* Time-based */}
                <button
                  onClick={() => setMode('time')}
                  className={`p-4 rounded-xl border-2 text-left transition
                    ${mode === 'time' ? 'border-blue-600 bg-blue-50' : 'border-slate-200 hover:border-slate-300'}`}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center
                      ${mode === 'time' ? 'border-blue-600' : 'border-slate-300'}`}>
                      {mode === 'time' && <div className="w-2 h-2 rounded-full bg-blue-600" />}
                    </div>
                    <span className={`text-sm font-semibold ${mode === 'time' ? 'text-blue-700' : 'text-slate-700'}`}>
                      Time-based
                    </span>
                    <svg className="w-4 h-4 text-slate-400 ml-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                        d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
                    </svg>
                  </div>
                  <p className="text-xs text-slate-500 mb-3">
                    Practice for a specific duration with continuous AI engagement.
                  </p>
                  <div>
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
                      Session Duration
                    </p>
                    <select
                      value={duration}
                      onChange={e => setDuration(e.target.value)}
                      onClick={e => e.stopPropagation()}
                      className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                    >
                      <option>10 min</option>
                      <option>15 min</option>
                      <option>20 min</option>
                      <option>30 min</option>
                      <option>45 min</option>
                    </select>
                  </div>
                </button>

                {/* Question-based */}
                <button
                  onClick={() => setMode('questions')}
                  className={`p-4 rounded-xl border-2 text-left transition
                    ${mode === 'questions' ? 'border-blue-600 bg-blue-50' : 'border-slate-200 hover:border-slate-300'}`}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center
                      ${mode === 'questions' ? 'border-blue-600' : 'border-slate-300'}`}>
                      {mode === 'questions' && <div className="w-2 h-2 rounded-full bg-blue-600" />}
                    </div>
                    <span className={`text-sm font-semibold ${mode === 'questions' ? 'text-blue-700' : 'text-slate-700'}`}>
                      Question-based
                    </span>
                    <svg className="w-4 h-4 text-slate-400 ml-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                        d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/>
                    </svg>
                  </div>
                  <p className="text-xs text-slate-500 mb-3">
                    Complete a fixed number of targeted interview questions.
                  </p>
                  <div>
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
                      Total Questions
                    </p>
                    <select
                      value={questions}
                      onChange={e => setQuestions(e.target.value)}
                      onClick={e => e.stopPropagation()}
                      className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                    >
                      <option>5 questions</option>
                      <option>10 questions</option>
                      <option>15 questions</option>
                      <option>20 questions</option>
                    </select>
                  </div>
                </button>
              </div>

              {/* Interview Protocol Notice */}
              <div className="mt-4 bg-blue-50 border border-blue-100 rounded-xl p-4">
                <div className="flex gap-3">
                  <svg className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                      d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                  </svg>
                  <div>
                    <p className="text-sm font-semibold text-blue-700 mb-1">Interview Protocol</p>
                    <p className="text-xs text-blue-600 leading-relaxed">
                      To ensure realism, your microphone will <strong>auto-activate</strong> after a 5-second
                      thinking window following each question. If no response is detected within{' '}
                      <strong>5 seconds of activation</strong>, the system will automatically proceed to the next question.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* RAG Weak Areas Banner */}
{ragContext?.hasContext && (
  <div className="bg-purple-50 border border-purple-200 rounded-2xl p-4 flex gap-3">
    <div className="w-9 h-9 bg-purple-100 text-purple-600 rounded-xl flex items-center justify-center flex-shrink-0">
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
          d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"/>
      </svg>
    </div>
    <div>
      <p className="text-sm font-semibold text-purple-700 mb-1">
        🧠 Personalized session ready
      </p>
      <p className="text-xs text-purple-600 leading-relaxed">
        Coach Roberts found <strong>{ragContext.weakAreaCount} weak area{ragContext.weakAreaCount !== 1 ? 's' : ''}</strong> from
        your previous sessions. Today's questions will specifically target these gaps to accelerate your improvement.
      </p>
    </div>
  </div>
)}

            {/* Pro Tip */}
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex gap-3">
              <svg className="w-5 h-5 text-slate-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                  d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"/>
              </svg>
              <p className="text-sm text-slate-600">
                <strong>Pro Tip:</strong> Coach Roberts will prioritize "Soft Skill" feedback today based on your
                previous Analytics dashboard trends. Ensure your camera is well-lit if you choose to enable visual analysis.
              </p>
            </div>
          </div>

          {/* Right Column — Audio Check */}
          <div className="flex flex-col gap-4">
            <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm">
              <div className="flex items-center gap-2 mb-4">
                <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                    d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 016 0v6a3 3 0 01-3 3z"/>
                </svg>
                <h3 className="text-base font-semibold text-slate-800">Audio Check</h3>
              </div>

              {/* Waveform Visualizer */}
              <div className="bg-slate-50 rounded-xl p-4 mb-4 flex items-end justify-center gap-1 h-28">
                {audioLevel.map((h, i) => (
                  <div
                    key={i}
                    className="bg-blue-500 rounded-full w-2 transition-all duration-300"
                    style={{ height: `${h * 8}px`, opacity: 0.6 + (i % 3) * 0.13 }}
                  />
                ))}
              </div>
              <p className="text-xs text-slate-400 text-center mb-4">Speak to test levels...</p>

              {/* Microphone Input */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Microphone Input</label>
                <select className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
                  <option>MacBook Pro Microphone (Built-in)</option>
                  <option>Default Microphone</option>
                  <option>External Microphone</option>
                </select>
              </div>

              {/* Noise Suppression */}
              <div className="flex items-center justify-between mb-6">
                <div>
                  <p className="text-sm font-medium text-slate-700">Background Noise Suppression</p>
                  <p className="text-xs text-slate-400 mt-0.5">Active AI Filtering</p>
                </div>
                <button
                  onClick={() => setNoiseSuppress(!noiseSuppress)}
                  className={`relative w-11 h-6 rounded-full transition-colors
                    ${noiseSuppress ? 'bg-blue-600' : 'bg-slate-200'}`}
                >
                  <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform
                    ${noiseSuppress ? 'translate-x-5' : 'translate-x-0'}`} />
                </button>
              </div>

              {/* Start Button */}
              <button
                onClick={handleStart}
                disabled={starting || showBlocked}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-xl text-sm transition flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {showBlocked ? (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                        d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"/>
                    </svg>
                    API Limit Reached — Wait {groqStatus?.secondsUntilReset}s
                  </>
                ) : starting ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Starting...
                  </>
                ) : (
                  <>
                    Start Practice Session
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                        d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"/>
                      <path strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                        d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                    </svg>
                  </>
                )}
              </button>
            </div>
          </div>
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

export default Lobby;