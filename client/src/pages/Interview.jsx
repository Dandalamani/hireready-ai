import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useGroqStatus } from '../context/GroqStatusContext';

const roleLabels = {
  'software-engineer': 'Software Engineer',
  'product-manager': 'Product Manager',
  'data-scientist': 'Data Scientist',
};

const speak = (text, onEnd) => {
  window.speechSynthesis.cancel();
  const utter = new SpeechSynthesisUtterance(text);
  utter.rate = 0.92;
  utter.pitch = 1.05;
  utter.volume = 1;
  const voices = window.speechSynthesis.getVoices();
  const preferred = voices.find(v =>
    v.name.includes('Google UK English Female') ||
    v.name.includes('Samantha') ||
    v.name.includes('Karen') ||
    v.name.includes('Microsoft Zira') ||
    v.name.includes('Female')
  );
  if (preferred) utter.voice = preferred;
  utter.onend = () => { if (onEnd) onEnd(); };
  utter.onerror = () => { if (onEnd) onEnd(); };
  window.speechSynthesis.speak(utter);
};

const Interview = () => {
  const { state } = useLocation();
  const navigate = useNavigate();
  const { updateStatus, showBlocked } = useGroqStatus();

  const role = state?.role || 'software-engineer';
  const mode = state?.mode || 'questions';
  const totalQuestionsTarget = parseInt(state?.questions) || 5;
  const durationMinutes = parseInt(state?.duration) || 15;

  const [phase, setPhase] = useState('loading');
  const [currentQuestion, setCurrentQuestion] = useState('');
  const [transcript, setTranscript] = useState('');
  const [exchanges, setExchanges] = useState([]);
  const [questionNumber, setQuestionNumber] = useState(1);
  const [feedback, setFeedback] = useState(null);
  const [timeRemaining, setTimeRemaining] = useState(durationMinutes * 60);
  const [countdown, setCountdown] = useState(5);
  const [isListening, setIsListening] = useState(false);
  const [alwaysListening, setAlwaysListening] = useState(true);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [error, setError] = useState('');

  const recognitionRef = useRef(null);
  const timerRef = useRef(null);
  const countdownRef = useRef(null);
  const transcriptRef = useRef('');
  const chatEndRef = useRef(null);
  const remainingQuestionsRef = useRef([]);
  const sessionSavedRef = useRef(false);
  const exchangesRef = useRef([]);
  const currentQuestionRef = useRef('');
  const sessionKeyRef = useRef(
    `${state?.projectBased ? 'project' : 'session'}_${
      state?.repoName ? state.repoName.replace(/[^a-zA-Z0-9]/g, '') + '_' : ''
    }${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  );

  // Keep exchangesRef in sync
  useEffect(() => {
    exchangesRef.current = exchanges;
  }, [exchanges]);

  // Keep currentQuestionRef in sync
  useEffect(() => {
    currentQuestionRef.current = currentQuestion;
  }, [currentQuestion]);

  const formatTime = secs => {
    const m = Math.floor(secs / 60).toString().padStart(2, '0');
    const s = (secs % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [exchanges, transcript]);

  // ── Save session to DB ──
  const saveSessionToDb = useCallback(async (exchangesToSave, score, confidence, pacing) => {
    if (!exchangesToSave || exchangesToSave.length === 0) {
      console.log('⚠️ No exchanges to save');
      return null;
    }
    if (sessionSavedRef.current) {
      console.log('⚠️ Already saved, skipping');
      return null;
    }
    sessionSavedRef.current = true;

    const payload = {
      target_role: role,
      mode: mode,
      difficulty: state?.difficulty || 'intermediate',
      score: score || null,
      confidence: confidence || null,
      pacing: pacing || null,
      filler_words: 'Low',
      duration_minutes: Math.max(1, Math.ceil(exchangesToSave.length * 1.5)),
      session_key: sessionKeyRef.current,
      exchanges: exchangesToSave.map(ex => ({
        question: ex.question || '',
        answer: ex.answer || '',
        category: 'general',
        feedback: ex.feedback || null,
      })),
    };

    console.log('💾 Saving session:', {
      role: payload.target_role,
      exchanges: payload.exchanges.length,
      score: payload.score,
      key: payload.session_key,
    });

    try {
      const res = await axios.post('/api/sessions', payload);
      console.log('✅ Session saved! ID:', res.data.id);
      return res.data;
    } catch (err) {
      console.error('❌ Save failed:', err.response?.data || err.message);
      sessionSavedRef.current = false;
      return null;
    }
  }, [role, mode, state]);

  // ── Update score after report ──
  

  const speakQuestion = useCallback((question) => {
    setIsSpeaking(true);
    setPhase('speaking');
    speak(question, () => {
      setIsSpeaking(false);
      setPhase('thinking');
      setCountdown(5);
    });
  }, []);

  const setupRecognition = useCallback(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setError('Use Chrome or Edge for voice support.');
      return null;
    }
    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';
    recognition.onresult = e => {
      let interim = '';
      let final = '';
      for (let i = e.resultIndex; i < e.results.length; i++) {
        if (e.results[i].isFinal) final += e.results[i][0].transcript;
        else interim += e.results[i][0].transcript;
      }
      if (final) transcriptRef.current += ' ' + final;
      setTranscript((transcriptRef.current + ' ' + interim).trim());
    };
    recognition.onerror = e => {
      if (e.error !== 'no-speech') console.error('Speech error:', e.error);
    };
    recognition.onend = () => setIsListening(false);
    return recognition;
  }, []);

  const startListening = useCallback(() => {
    try {
      recognitionRef.current?.abort();
      recognitionRef.current = setupRecognition();
      recognitionRef.current?.start();
      setIsListening(true);
    } catch (e) {
      console.error('Start listening error:', e);
    }
  }, [setupRecognition]);

  const stopListening = useCallback(() => {
    try { recognitionRef.current?.stop(); } catch {}
    setIsListening(false);
  }, []);

  // ── Analyze and next ──
  const analyzeAndNext = useCallback(async (answerText) => {
    const answer = answerText?.trim() || '[No response]';
    setPhase('analyzing');
    stopListening();
    window.speechSynthesis.cancel();

    if (showBlocked) {
      setError('Groq API limit reached. Please wait.');
      setPhase('listening');
      return;
    }

    try {
      const analyzeRes = await axios.post('/api/groq/analyze', {
        role,
        question: currentQuestionRef.current,
        answer,
      });
      const fb = analyzeRes.data;
      if (fb.groqStatus) updateStatus(fb.groqStatus);
      setFeedback(fb);

      const newExchange = {
        question: currentQuestionRef.current,
        answer,
        feedback: fb,
      };
      const updatedExchanges = [...exchangesRef.current, newExchange];
      setExchanges(updatedExchanges);

      const isLast = mode === 'questions' && questionNumber >= totalQuestionsTarget;

      if (isLast) {
        setPhase('done');
        console.log('🏁 Last question done. Saving session...');

        // Save session first, then navigate
        await saveSessionToDb(updatedExchanges, null, null, null);

        speak('Great session! Generating your performance report now.', () => {
          navigate('/report', {
            state: {
              role,
              exchanges: updatedExchanges,
              mode,
              difficulty: state?.difficulty || 'intermediate',
              session_key: sessionKeyRef.current,
            },
          });
        });
        return;
      }

      // Next question
      setTimeout(async () => {
        if (showBlocked) {
          setError('Groq API limit reached. Session paused.');
          setPhase('listening');
          return;
        }
        setPhase('loading');
        setTranscript('');
        transcriptRef.current = '';
        setFeedback(null);
        const nextNum = questionNumber + 1;
        setQuestionNumber(nextNum);

        let nextQuestion = '';
        if (remainingQuestionsRef.current?.length > 0) {
          nextQuestion = remainingQuestionsRef.current.shift();
        } else {
          const nextRes = await axios.post('/api/groq/next', {
            role,
            previousQuestion: currentQuestionRef.current,
            userAnswer: answer,
            questionNumber: nextNum,
            totalQuestions: totalQuestionsTarget,
          });
          nextQuestion = nextRes.data.question;
          if (nextRes.data.groqStatus) updateStatus(nextRes.data.groqStatus);
        }

        setCurrentQuestion(nextQuestion);
        speakQuestion(nextQuestion);
      }, 2000);

    } catch (err) {
      console.error('Analyze error:', err);
      if (err.response?.status === 429) {
        if (err.response?.data?.groqStatus) updateStatus(err.response.data.groqStatus);
        setError('Groq API limit reached. Please wait.');
      }
      setPhase('listening');
    }
  }, [
    mode, navigate, questionNumber, role,
    saveSessionToDb, speakQuestion, state,
    stopListening, totalQuestionsTarget, updateStatus, showBlocked,
  ]);

  // Countdown
  useEffect(() => {
    if (phase !== 'thinking') return;
    countdownRef.current = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(countdownRef.current);
          if (alwaysListening && !showBlocked) setPhase('listening');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(countdownRef.current);
  }, [phase, alwaysListening, showBlocked]);

  // Start mic
  useEffect(() => {
    if (phase === 'listening' && !showBlocked) startListening();
    else stopListening();
  }, [phase, showBlocked]); // eslint-disable-line

  // Timer
  useEffect(() => {
    if (mode !== 'time') return;
    timerRef.current = setInterval(() => {
      setTimeRemaining(prev => {
        if (prev <= 1) {
          clearInterval(timerRef.current);
          analyzeAndNext(transcriptRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, [mode, analyzeAndNext]);

  // Init
  useEffect(() => {
    recognitionRef.current = setupRecognition();
    const loadVoices = () => window.speechSynthesis.getVoices();
    loadVoices();
    window.speechSynthesis.onvoiceschanged = loadVoices;

    const init = async () => {
      try {
        if (state?.customQuestions?.length > 0) {
          const firstQ = state.customQuestions[0];
          remainingQuestionsRef.current = state.customQuestions.slice(1);
          setCurrentQuestion(firstQ);
          speakQuestion(firstQ);
        } else {
          const res = await axios.post('/api/groq/start', { role, mode });
          const q = res.data.question;
          if (res.data.groqStatus) updateStatus(res.data.groqStatus);
          setCurrentQuestion(q);
          speakQuestion(q);
        }
      } catch (err) {
        if (err.response?.status === 429) {
          if (err.response?.data?.groqStatus) updateStatus(err.response.data.groqStatus);
          setError('Groq API limit reached. Please wait.');
          setPhase('thinking');
          setCurrentQuestion('API limit reached. Please wait a moment.');
        } else {
          const fallback = 'Tell me about yourself and your experience relevant to this role.';
          setCurrentQuestion(fallback);
          speakQuestion(fallback);
          setError('Using fallback question — check your Groq API key.');
        }
      }
    };
    init();

    return () => {
      clearInterval(timerRef.current);
      clearInterval(countdownRef.current);
      try { recognitionRef.current?.stop(); } catch {}
      window.speechSynthesis.cancel();
    };
  }, []); // eslint-disable-line

  const handleMicButton = () => {
    if (showBlocked) return;
    if (phase === 'listening' || isListening) {
      analyzeAndNext(transcriptRef.current);
    } else if (phase === 'thinking') {
      clearInterval(countdownRef.current);
      setPhase('listening');
    }
  };

  const handleEndSession = async () => {
    window.speechSynthesis.cancel();
    stopListening();
    clearInterval(timerRef.current);
    clearInterval(countdownRef.current);

    const currentExchanges = exchangesRef.current;
    if (currentExchanges.length > 0) {
      console.log('🔚 Ending session with', currentExchanges.length, 'exchanges');
      await saveSessionToDb(currentExchanges, null, null, null);
      navigate('/report', {
        state: {
          role,
          exchanges: currentExchanges,
          mode,
          difficulty: state?.difficulty || 'intermediate',
          session_key: sessionKeyRef.current,
        },
      });
    } else {
      navigate('/dashboard');
    }
  };

  const phaseInfo = {
    loading:   { label: 'Preparing next question...', color: 'text-slate-400' },
    speaking:  { label: 'Coach Roberts is speaking...', color: 'text-blue-500' },
    thinking:  { label: `Think about your answer — mic activates in ${countdown}s`, color: 'text-amber-500' },
    listening: { label: 'Listening... tap mic to submit', color: 'text-green-500' },
    analyzing: { label: 'Analyzing your response...', color: 'text-purple-500' },
    done:      { label: 'Session complete! Generating report...', color: 'text-blue-600' },
  };
  const currentPhaseInfo = phaseInfo[phase] || phaseInfo.loading;

  return (
    <div className="flex flex-col h-screen bg-slate-50 overflow-hidden">

      {/* Navbar */}
      <nav className="bg-white border-b border-slate-100 px-8 py-3 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-8">
          <h1 className="text-lg font-bold text-blue-600">HireReady AI</h1>
          <div className="flex items-center gap-6 text-sm">
            {['Lobby','Dashboard','History'].map(item => (
              <button key={item}
                onClick={() => navigate('/' + item.toLowerCase())}
                className={item === 'Lobby'
                  ? 'text-blue-600 font-semibold border-b-2 border-blue-600 pb-0.5'
                  : 'text-slate-500 hover:text-slate-700 transition'}>
                {item}
              </button>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-10">
          <div className="text-center">
            <p className="text-xs text-slate-400 uppercase tracking-wide font-medium">Interview Progress</p>
            <p className="text-sm font-bold text-slate-800">
              Question {questionNumber} of {mode === 'questions' ? totalQuestionsTarget : '∞'}
            </p>
          </div>
          {mode === 'time' && (
            <div className="text-center">
              <p className="text-xs text-slate-400 uppercase tracking-wide font-medium">Time Remaining</p>
              <p className={`text-sm font-bold ${timeRemaining < 60 ? 'text-red-500' : 'text-slate-800'}`}>
                {formatTime(timeRemaining)}
              </p>
            </div>
          )}
        </div>
        <div className="flex items-center gap-3">
          <button onClick={handleEndSession}
            className="text-xs border border-slate-200 text-slate-500 px-3 py-1.5 rounded-lg hover:bg-red-50 hover:text-red-500 hover:border-red-200 transition">
            End Session
          </button>
          <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
            <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z"/>
            </svg>
          </div>
        </div>
      </nav>

      {/* Error banner */}
      {error && (
        <div className="bg-yellow-50 border-b border-yellow-200 px-8 py-2 text-sm text-yellow-700 flex-shrink-0 flex items-center justify-between">
          <span>⚠️ {error}</span>
          <button onClick={() => setError('')} className="text-yellow-500 hover:text-yellow-700">✕</button>
        </div>
      )}

      {/* Groq blocked banner */}
      {showBlocked && (
        <div className="bg-red-50 border-b border-red-200 px-8 py-2 text-sm text-red-600 flex-shrink-0 flex items-center gap-2">
          <span>⛔ <strong>API Limit Reached</strong> — AI features paused. Waiting for reset...</span>
        </div>
      )}

      {/* Body */}
      <div className="flex flex-1 overflow-hidden min-h-0">

        {/* Left Panel */}
        <div className="flex-1 flex flex-col items-center justify-start gap-5 p-8 overflow-y-auto min-h-0 pt-10">

          {/* Avatar */}
          <div className="relative">
            {isSpeaking && (
              <div className="absolute inset-0 rounded-full border-4 border-blue-400 animate-ping opacity-40" />
            )}
            {phase === 'listening' && !showBlocked && (
              <div className="absolute inset-0 rounded-full border-4 border-green-400 animate-pulse opacity-60" />
            )}
            {showBlocked && (
              <div className="absolute inset-0 rounded-full border-4 border-red-400 opacity-60" />
            )}
            <div className="w-44 h-44 rounded-full bg-gradient-to-br from-slate-200 to-slate-300
              flex items-center justify-center overflow-hidden border-4 border-white shadow-xl relative z-10">
              <svg className="w-24 h-24 text-slate-400" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z"/>
              </svg>
            </div>
            {isSpeaking && (
              <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1 flex items-end gap-0.5 z-20">
                {[1,2,3,4,5,4,3,2,1].map((h, i) => (
                  <div key={i} className="w-1 bg-blue-500 rounded-full"
                    style={{ height: `${h*5}px`, animation: `wavebar 0.6s ease-in-out ${i*0.07}s infinite alternate` }}/>
                ))}
              </div>
            )}
          </div>

          {/* Name + status */}
          <div className="text-center">
            <h3 className="text-xl font-bold text-slate-800">Coach Roberts</h3>
            <p className={`text-sm mt-1 font-medium ${showBlocked ? 'text-red-500' : currentPhaseInfo.color}`}>
              {showBlocked ? 'AI paused — API limit reached' : currentPhaseInfo.label}
            </p>
          </div>

          {/* Question */}
          {currentQuestion && (
            <div className={`rounded-2xl p-5 shadow-sm border max-w-lg w-full text-center
              ${showBlocked ? 'bg-red-50 border-red-100' : 'bg-white border-slate-100'}`}>
              <p className="text-sm text-slate-700 leading-relaxed">{currentQuestion}</p>
            </div>
          )}

          {/* Mic */}
          <div className="flex flex-col items-center gap-3 mt-2">
            <button
              onClick={handleMicButton}
              disabled={phase === 'analyzing' || phase === 'loading' || phase === 'done' || phase === 'speaking' || showBlocked}
              className={`w-16 h-16 rounded-full flex items-center justify-center transition-all shadow-lg
                ${showBlocked ? 'bg-red-200 cursor-not-allowed'
                  : phase === 'listening' ? 'bg-blue-600 hover:bg-blue-700 scale-110'
                  : phase === 'thinking' ? 'bg-amber-500 hover:bg-amber-600'
                  : 'bg-slate-200 hover:bg-slate-300'
                } disabled:opacity-40 disabled:cursor-not-allowed`}
            >
              {showBlocked ? (
                <svg className="w-7 h-7 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                    d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636"/>
                </svg>
              ) : (
                <svg className={`w-7 h-7 ${phase === 'listening' || phase === 'thinking' ? 'text-white' : 'text-slate-600'}`}
                  fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                    d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 016 0v6a3 3 0 01-3 3z"/>
                </svg>
              )}
            </button>

            <p className="text-xs font-bold uppercase tracking-widest text-blue-600">
              {showBlocked ? 'API LIMIT REACHED'
                : phase === 'listening' ? 'TAP TO SUBMIT'
                : phase === 'thinking' ? 'TAP TO ANSWER NOW'
                : phase === 'speaking' ? 'COACH IS SPEAKING'
                : 'PUSH TO TALK'}
            </p>

            <div className="flex items-center gap-2 mt-1">
              <span className="text-xs text-slate-500">Always Listening</span>
              <button
                onClick={() => setAlwaysListening(!alwaysListening)}
                disabled={showBlocked}
                className={`relative w-10 h-5 rounded-full transition-colors
                  ${alwaysListening && !showBlocked ? 'bg-blue-600' : 'bg-slate-200'}`}
              >
                <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform
                  ${alwaysListening && !showBlocked ? 'translate-x-5' : ''}`} />
              </button>
            </div>
            <p className="text-xs text-slate-400 text-center">
              {showBlocked ? 'Resume after API limit resets'
                : 'Mic auto-activates after 5s of AI silence when enabled.'}
            </p>
          </div>
        </div>

        {/* Right Panel */}
        <div className="w-96 bg-white border-l border-slate-100 flex flex-col flex-shrink-0 min-h-0">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between flex-shrink-0">
            <h3 className="text-sm font-semibold text-slate-800">Live Transcription</h3>
            <div className="flex items-center gap-1.5">
              <div className={`w-2 h-2 rounded-full transition-colors
                ${showBlocked ? 'bg-red-400' : isListening ? 'bg-green-500 animate-pulse' : 'bg-slate-300'}`}/>
              <span className="text-xs text-slate-500">
                {showBlocked ? 'Paused' : isListening ? 'Active' : 'Inactive'}
              </span>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-5 flex flex-col gap-5 min-h-0">
            {exchanges.map((ex, i) => (
              <div key={i} className="flex flex-col gap-2">
                <div className="max-w-[85%]">
                  <div className="bg-slate-100 rounded-2xl rounded-tl-none px-4 py-3">
                    <p className="text-sm text-slate-700 leading-relaxed">{ex.question}</p>
                  </div>
                  <p className="text-xs text-slate-400 mt-1 ml-2">Coach Roberts</p>
                </div>
                <div className="max-w-[85%] self-end">
                  <div className="bg-blue-600 rounded-2xl rounded-tr-none px-4 py-3">
                    <p className="text-sm text-white leading-relaxed">{ex.answer}</p>
                  </div>
                  <p className="text-xs text-slate-400 mt-1 text-right mr-2">You</p>
                </div>
                {ex.feedback && (
                  <div className="flex flex-wrap gap-1 justify-end">
                    {ex.feedback.tags?.map(tag => (
                      <span key={tag} className="text-xs bg-green-50 text-green-600 border border-green-200 px-2 py-0.5 rounded-full">
                        {tag}
                      </span>
                    ))}
                    <span className="text-xs bg-blue-50 text-blue-600 border border-blue-100 px-2 py-0.5 rounded-full">
                      Score {ex.feedback.score}/10
                    </span>
                  </div>
                )}
              </div>
            ))}

            {currentQuestion && phase !== 'loading' && (
              <div className="max-w-[85%]">
                <div className={`rounded-2xl rounded-tl-none px-4 py-3
                  ${isSpeaking ? 'bg-blue-50 border border-blue-100' : 'bg-slate-100'}`}>
                  <p className="text-sm text-slate-700 leading-relaxed">{currentQuestion}</p>
                </div>
                <p className="text-xs text-slate-400 mt-1 ml-2">Coach Roberts</p>
              </div>
            )}

            {phase === 'listening' && !showBlocked && (
              <div className="max-w-[85%] self-end">
                <div className="bg-blue-50 border border-blue-200 rounded-2xl rounded-tr-none px-4 py-3">
                  <p className="text-sm text-slate-600 italic leading-relaxed">
                    {transcript || (
                      <span className="flex gap-1 items-center">
                        <span className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}/>
                        <span className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}/>
                        <span className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}/>
                      </span>
                    )}
                  </p>
                </div>
                <p className="text-xs text-slate-400 mt-1 text-right mr-2">You • live</p>
              </div>
            )}

            {showBlocked && (
              <div className="bg-red-50 border border-red-100 rounded-xl px-4 py-3 text-center">
                <p className="text-xs font-semibold text-red-500 mb-1">⛔ AI Paused</p>
                <p className="text-xs text-red-400">Groq API limit reached. Waiting for reset...</p>
              </div>
            )}

            {feedback && phase === 'analyzing' && (
              <div className="bg-purple-50 border border-purple-100 rounded-xl px-4 py-3">
                <p className="text-xs font-semibold text-purple-600 mb-1">Coach Feedback</p>
                <p className="text-xs text-purple-700">{feedback.tip}</p>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          <div className="px-5 py-3 border-t border-slate-100 flex-shrink-0">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span>{roleLabels[role]}</span>
              <span className={showBlocked ? 'text-red-400 font-medium' : ''}>
                {showBlocked ? '⛔ Limit Reached'
                  : `Q${questionNumber}/${mode === 'questions' ? totalQuestionsTarget : '∞'}`}
              </span>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes wavebar {
          from { transform: scaleY(0.4); opacity: 0.7; }
          to   { transform: scaleY(1.6); opacity: 1; }
        }
      `}</style>
    </div>
  );
};

export default Interview;