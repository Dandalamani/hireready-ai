import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import Sidebar from '../components/Sidebar';

const difficultyOptions = [
  {
    id: 'Basic',
    label: 'Basic',
    sub: 'Core syntax',
    color: 'text-green-600',
    bg: 'bg-green-50',
    border: 'border-green-200',
  },
  {
    id: 'Intermediate',
    label: 'Intermediate',
    sub: 'Architecture',
    color: 'text-blue-600',
    bg: 'bg-blue-50',
    border: 'border-blue-200',
  },
  {
    id: 'Advanced',
    label: 'Advanced',
    sub: 'Optimization',
    color: 'text-purple-600',
    bg: 'bg-purple-50',
    border: 'border-purple-200',
  },
];

const categoryColors = {
  Architecture:       { bg: 'bg-blue-50',   text: 'text-blue-600',   border: 'border-blue-100' },
  'Code Quality':     { bg: 'bg-green-50',  text: 'text-green-600',  border: 'border-green-100' },
  'Problem Solving':  { bg: 'bg-amber-50',  text: 'text-amber-600',  border: 'border-amber-100' },
  'Technology Choice':{ bg: 'bg-purple-50', text: 'text-purple-600', border: 'border-purple-100' },
  Performance:        { bg: 'bg-red-50',    text: 'text-red-500',    border: 'border-red-100' },
};

const langColors = {
  TypeScript:  'bg-blue-100 text-blue-700',
  JavaScript:  'bg-yellow-100 text-yellow-700',
  Python:      'bg-green-100 text-green-700',
  Go:          'bg-cyan-100 text-cyan-700',
  Rust:        'bg-orange-100 text-orange-700',
  Java:        'bg-red-100 text-red-700',
  default:     'bg-slate-100 text-slate-600',
};

const getLangColor = lang => langColors[lang] || langColors.default;

const popularRepos = [
  'Personal Portfolio',
  'E-commerce API',
  'Neural Network Lab',
];

const ProjectInterview = () => {
  const navigate = useNavigate();
  const [url, setUrl] = useState('');
  const [difficulty, setDifficulty] = useState('Intermediate');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [repoData, setRepoData] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [selectedQuestion, setSelectedQuestion] = useState(null);
  const [starting, setStarting] = useState(false);

  const handleAnalyze = async () => {
    if (!url.trim()) {
      setError('Please enter a GitHub repository URL.');
      return;
    }
    setError('');
    setLoading(true);
    setRepoData(null);
    setQuestions([]);
    setSelectedQuestion(null);

    try {
      const res = await axios.post('/api/github/analyze', { url, difficulty });
      setRepoData(res.data.repo);
      setQuestions(res.data.questions);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to analyze repository. Make sure it is public.');
    } finally {
      setLoading(false);
    }
  };

const handleStartInterview = () => {
  if (!repoData || questions.length === 0) return;
  setStarting(true);
  setTimeout(() => {
    navigate('/interview', {
      state: {
        role: 'software-engineer',
        mode: 'questions',
        questions: `${questions.length} questions`,
        difficulty: difficulty.toLowerCase(),
        projectBased: true,
        repoName: repoData.name,
        repoDescription: repoData.description,
        repoLanguage: repoData.language,
        customQuestions: questions.map(q => q.question),
      },
    });
  }, 600);
};

  const timeSince = dateStr => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const days = Math.floor(diff / 86400000);
    if (days === 0) return 'Today';
    if (days === 1) return '1 day ago';
    if (days < 7) return `${days} days ago`;
    if (days < 30) return `${Math.floor(days / 7)} week${Math.floor(days / 7) > 1 ? 's' : ''} ago`;
    return `${Math.floor(days / 30)} month${Math.floor(days / 30) > 1 ? 's' : ''} ago`;
  };

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      <Sidebar />
      <main className="ml-56 flex-1 p-8 overflow-y-auto h-screen">

        {/* Header */}
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-slate-800">Project-based Interviews</h2>
          <p className="text-slate-400 mt-2 text-sm max-w-2xl">
            Connect your GitHub to practice technical interviews based on your actual code.
            Our AI analyzes your commits, architectural decisions, and logic to ask personalized questions.
          </p>
        </div>

        <div className="grid grid-cols-3 gap-6">

          {/* Left — Main Content */}
          <div className="col-span-2 flex flex-col gap-6">

            {/* URL Input */}
            <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm">
              <label className="block text-sm font-semibold text-slate-700 mb-3">
                GitHub Repository or Profile URL
              </label>
              <div className="flex gap-3">
                <div className="flex-1 flex items-center gap-3 border border-slate-200 rounded-xl px-4 py-3 focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-transparent transition bg-white">
                  <svg className="w-4 h-4 text-slate-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                      d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"/>
                  </svg>
                  <input
                    type="text"
                    value={url}
                    onChange={e => { setUrl(e.target.value); setError(''); }}
                    onKeyDown={e => e.key === 'Enter' && handleAnalyze()}
                    placeholder="https://github.com/username/repository"
                    className="flex-1 text-sm text-slate-800 focus:outline-none placeholder-slate-300"
                  />
                  {url && (
                    <button onClick={() => { setUrl(''); setRepoData(null); setQuestions([]); setError(''); }}
                      className="text-slate-300 hover:text-slate-500 transition">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/>
                      </svg>
                    </button>
                  )}
                </div>
                <button
                  onClick={handleAnalyze}
                  disabled={loading || !url.trim()}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-5 py-3 rounded-xl text-sm transition flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
                >
                  {loading ? (
                    <>
                      <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Analyzing...
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                          d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/>
                      </svg>
                      Analyze Repository
                    </>
                  )}
                </button>
              </div>

              {/* Popular suggestions */}
              <div className="flex items-center gap-2 mt-3">
                <span className="text-xs text-slate-400">Popular:</span>
                {popularRepos.map(r => (
                  <button key={r}
                    onClick={() => setUrl(`https://github.com/username/${r.toLowerCase().replace(/ /g, '-')}`)}
                    className="text-xs text-slate-500 bg-slate-50 border border-slate-200 px-3 py-1 rounded-full hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200 transition">
                    {r}
                  </button>
                ))}
              </div>

              {/* Error */}
              {error && (
                <div className="mt-3 flex items-center gap-2 text-red-500 bg-red-50 border border-red-100 rounded-xl px-4 py-3">
                  <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                      d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                  </svg>
                  <p className="text-sm">{error}</p>
                </div>
              )}
            </div>

            {/* Repo Card — shown after analysis */}
            {repoData && (
              <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-slate-800 rounded-xl flex items-center justify-center">
                      <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 0C5.374 0 0 5.373 0 12c0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0112 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z"/>
                      </svg>
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-base font-bold text-slate-800">{repoData.name}</h3>
                        <span className="text-xs bg-green-50 text-green-600 border border-green-100 px-2 py-0.5 rounded-full font-medium">
                          PUBLIC
                        </span>
                      </div>
                      {repoData.description && (
                        <p className="text-sm text-slate-500 mt-0.5 max-w-md">{repoData.description}</p>
                      )}
                    </div>
                  </div>

                  {/* Stars & Forks */}
                  <div className="flex items-center gap-4 text-xs text-slate-400">
                    <div className="flex items-center gap-1">
                      <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 .587l3.668 7.568 8.332 1.151-6.064 5.828 1.48 8.279L12 18.896l-7.416 4.517 1.48-8.279L0 9.306l8.332-1.151z"/>
                      </svg>
                      {repoData.stars}
                    </div>
                    <div className="flex items-center gap-1">
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                          d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"/>
                      </svg>
                      {repoData.forks}
                    </div>
                  </div>
                </div>

                {/* Language + Topics */}
                <div className="flex flex-wrap gap-2 mb-5">
                  {repoData.languages.slice(0, 5).map(lang => (
                    <span key={lang}
                      className={`text-xs font-medium px-3 py-1 rounded-full flex items-center gap-1.5 ${getLangColor(lang)}`}>
                      <span className="w-2 h-2 rounded-full bg-current opacity-70" />
                      {lang}
                    </span>
                  ))}
                  {repoData.topics.slice(0, 4).map(t => (
                    <span key={t}
                      className="text-xs text-blue-600 bg-blue-50 border border-blue-100 px-3 py-1 rounded-full">
                      #{t}
                    </span>
                  ))}
                </div>

                {/* Recent Commits */}
                {repoData.recentCommits?.length > 0 && (
                  <div className="mb-5">
                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">
                      Recent Commits
                    </p>
                    <div className="flex flex-col gap-2">
                      {repoData.recentCommits.slice(0, 3).map((c, i) => (
                        <div key={i} className="flex items-center gap-3 text-sm">
                          <div className="w-1.5 h-1.5 rounded-full bg-blue-400 flex-shrink-0" />
                          <span className="text-slate-600 truncate flex-1">{c.message}</span>
                          <span className="text-xs text-slate-400 flex-shrink-0">
                            {timeSince(c.date)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* AI Generated Questions */}
                {questions.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">
                      AI Generated Questions ({questions.length})
                    </p>
                    <div className="flex flex-col gap-2">
                      {questions.map((q, i) => {
                        const cat = categoryColors[q.category] || categoryColors.Architecture;
                        const isSelected = selectedQuestion === i;
                        return (
                          <button
                            key={i}
                            onClick={() => setSelectedQuestion(isSelected ? null : i)}
                            className={`text-left p-4 rounded-xl border transition
                              ${isSelected
                                ? 'border-blue-300 bg-blue-50'
                                : 'border-slate-100 bg-slate-50 hover:border-blue-200 hover:bg-blue-50'}`}
                          >
                            <div className="flex items-start gap-3">
                              <span className="text-xs font-bold text-slate-400 mt-0.5 w-5 flex-shrink-0">
                                Q{i + 1}
                              </span>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm text-slate-700 leading-relaxed">{q.question}</p>
                                <div className="flex items-center gap-2 mt-2">
                                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${cat.bg} ${cat.text} ${cat.border}`}>
                                    {q.category}
                                  </span>
                                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full
                                    ${q.difficulty === 'Advanced' ? 'bg-purple-50 text-purple-600 border border-purple-100'
                                      : q.difficulty === 'Basic' ? 'bg-green-50 text-green-600 border border-green-100'
                                      : 'bg-blue-50 text-blue-600 border border-blue-100'}`}>
                                    {q.difficulty}
                                  </span>
                                </div>
                              </div>
                              <svg className={`w-4 h-4 flex-shrink-0 transition-transform mt-0.5
                                ${isSelected ? 'rotate-180 text-blue-500' : 'text-slate-300'}`}
                                fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7"/>
                              </svg>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Loading skeleton */}
            {loading && (
              <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm animate-pulse">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 bg-slate-200 rounded-xl" />
                  <div>
                    <div className="h-4 bg-slate-200 rounded w-40 mb-2" />
                    <div className="h-3 bg-slate-100 rounded w-64" />
                  </div>
                </div>
                <div className="flex gap-2 mb-5">
                  {[80, 100, 70, 90].map(w => (
                    <div key={w} className="h-6 bg-slate-100 rounded-full" style={{ width: `${w}px` }} />
                  ))}
                </div>
                <div className="space-y-3">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="h-16 bg-slate-50 rounded-xl border border-slate-100" />
                  ))}
                </div>
              </div>
            )}

            {/* Feature highlights — shown before analysis */}
            {!repoData && !loading && (
              <div className="grid grid-cols-3 gap-4">
                {[
                  {
                    icon: (
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                          d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"/>
                      </svg>
                    ),
                    title: 'Code Context',
                    desc: 'AI reads your actual code logic, looking for complexity and architectural patterns.',
                    color: 'text-blue-600 bg-blue-50',
                  },
                  {
                    icon: (
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                          d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
                      </svg>
                    ),
                    title: 'Commit History',
                    desc: 'Questions focus on your progression, refactoring choices, and problem-solving journey.',
                    color: 'text-purple-600 bg-purple-50',
                  },
                  {
                    icon: (
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                          d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"/>
                      </svg>
                    ),
                    title: 'Reasoning Skills',
                    desc: 'We simulate senior-level stakeholder questions to test your technical communication.',
                    color: 'text-amber-600 bg-amber-50',
                  },
                ].map(f => (
                  <div key={f.title} className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm text-center">
                    <div className={`w-12 h-12 ${f.color} rounded-xl flex items-center justify-center mx-auto mb-3`}>
                      {f.icon}
                    </div>
                    <h4 className="text-sm font-semibold text-slate-700 mb-2">{f.title}</h4>
                    <p className="text-xs text-slate-400 leading-relaxed">{f.desc}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Right Column */}
          <div className="flex flex-col gap-4">

            {/* Difficulty Level */}
            <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm">
              <h3 className="text-sm font-semibold text-slate-800 mb-4">Difficulty Level</h3>
              <div className="flex flex-col gap-2">
                {difficultyOptions.map(d => (
                  <button
                    key={d.id}
                    onClick={() => setDifficulty(d.id)}
                    className={`flex items-center gap-3 p-3 rounded-xl border-2 transition text-left
                      ${difficulty === d.id
                        ? `${d.border} ${d.bg}`
                        : 'border-slate-100 hover:border-slate-200'}`}
                  >
                    <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0
                      ${difficulty === d.id ? d.border.replace('border-', 'border-') : 'border-slate-300'}`}>
                      {difficulty === d.id && (
                        <div className={`w-2 h-2 rounded-full ${d.bg.replace('bg-', 'bg-').replace('-50', '-500')}`} />
                      )}
                    </div>
                    <div>
                      <p className={`text-sm font-semibold ${difficulty === d.id ? d.color : 'text-slate-600'}`}>
                        {d.label}
                      </p>
                      <p className="text-xs text-slate-400">{d.sub}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* How it works */}
            <div className="bg-slate-800 rounded-2xl p-5 text-white">
              <div className="flex items-center gap-2 mb-3">
                <svg className="w-4 h-4 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                    d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                </svg>
                <h3 className="text-sm font-semibold">How it works</h3>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed mb-3">
                Our AI parses your specific commit history and file structure. Instead of generic questions, expect deep-dives like:
              </p>
              <p className="text-xs text-blue-300 italic leading-relaxed border-l-2 border-blue-500 pl-3">
                "Why did you choose this design pattern in your last refactor?"
              </p>
            </div>

            {/* Voice Mode Ready */}
            {repoData && (
              <div className="bg-blue-600 rounded-2xl p-5 text-white">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-xs font-bold uppercase tracking-widest">Voice Mode Ready</span>
                  <div className="w-2 h-2 bg-blue-300 rounded-full animate-pulse" />
                </div>
                <div className="flex items-end justify-center gap-1 h-10 mb-4">
                  {[3,5,8,6,9,7,10,6,8,5,3].map((h, i) => (
                    <div
                      key={i}
                      className="w-1.5 bg-white rounded-full opacity-70"
                      style={{
                        height: `${h * 4}px`,
                        animation: `wavebar 0.8s ease-in-out ${i * 0.08}s infinite alternate`,
                      }}
                    />
                  ))}
                </div>
                <p className="text-xs text-blue-200 text-center italic mb-4">
                  "I've analyzed your {repoData.language} implementation. Ready to discuss architecture?"
                </p>
                <button
                  onClick={handleStartInterview}
                  disabled={starting || questions.length === 0}
                  className="w-full bg-white text-blue-600 font-bold py-3 rounded-xl text-sm hover:bg-blue-50 transition disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {starting ? (
                    <>
                      <span className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                      Starting...
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                          d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"/>
                        <path strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                          d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                      </svg>
                      Interview on this project
                    </>
                  )}
                </button>
              </div>
            )}

            {/* Pro tip */}
            <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4">
              <div className="flex gap-2">
                <svg className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                    d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"/>
                </svg>
                <div>
                  <p className="text-xs font-semibold text-blue-700 mb-1">Pro Tip</p>
                  <p className="text-xs text-blue-600 leading-relaxed">
                    Project-based practice is the most effective way to prep. Use a repo you built recently for the most realistic experience.
                  </p>
                </div>
              </div>
            </div>
          </div>
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

      <style>{`
        @keyframes wavebar {
          from { transform: scaleY(0.4); opacity: 0.6; }
          to { transform: scaleY(1.4); opacity: 1; }
        }
      `}</style>
    </div>
  );
};

export default ProjectInterview;