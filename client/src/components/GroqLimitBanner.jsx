import React, { useState, useEffect } from 'react';
import { useGroqStatus } from '../context/GroqStatusContext';

const GroqLimitBanner = () => {
  const { groqStatus, showWarning, showBlocked, dismissWarning } = useGroqStatus();
  const [dismissed, setDismissed] = useState(false);
  const [countdown, setCountdown] = useState(0);

  useEffect(() => {
    if (groqStatus?.secondsUntilReset) {
      setCountdown(groqStatus.secondsUntilReset);
    }
  }, [groqStatus?.secondsUntilReset]);

  // Live countdown timer
  useEffect(() => {
    if (!showBlocked && !showWarning) return;
    if (countdown <= 0) return;
    const timer = setInterval(() => {
      setCountdown(prev => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [showBlocked, showWarning, countdown]);

  // Reset dismissed when warning goes away
  useEffect(() => {
    if (!showWarning) setDismissed(false);
  }, [showWarning]);

  if (!groqStatus) return null;
  if (!showWarning && !showBlocked) return null;
  if (showWarning && dismissed) return null;

  const {
    usagePct, tokensUsed, tokenLimit,
    requestsUsed, requestLimit,
  } = groqStatus;

  // ── Full block modal ──
  if (showBlocked) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
        <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8 text-center animate-fadeIn">

          {/* Pulsing icon */}
          <div className="relative w-20 h-20 mx-auto mb-5">
            <div className="absolute inset-0 bg-red-100 rounded-full animate-ping opacity-40" />
            <div className="relative w-20 h-20 bg-red-100 rounded-full flex items-center justify-center">
              <svg className="w-9 h-9 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                  d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"/>
              </svg>
            </div>
          </div>

          <h2 className="text-2xl font-bold text-slate-800 mb-2">
            API Limit Reached
          </h2>
          <p className="text-slate-500 text-sm mb-6 leading-relaxed">
            You've hit the Groq free tier rate limit for this minute.
            All AI features are temporarily paused to protect your account.
          </p>

          {/* Usage bars */}
          <div className="bg-red-50 border border-red-100 rounded-xl p-5 mb-6 text-left">
            <p className="text-xs font-bold text-red-500 uppercase tracking-wider mb-4">
              Current Usage
            </p>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <div className="flex items-center gap-1.5">
                    <svg className="w-3.5 h-3.5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                        d="M9 3H5a2 2 0 00-2 2v4m6-6h10a2 2 0 012 2v4M9 3v18m0 0h10a2 2 0 002-2V9M9 21H5a2 2 0 01-2-2V9m0 0h18"/>
                    </svg>
                    <span className="text-xs font-medium text-slate-600">Tokens</span>
                  </div>
                  <span className="text-xs font-bold text-red-600">
                    {tokensUsed?.toLocaleString()} / {tokenLimit?.toLocaleString()}
                  </span>
                </div>
                <div className="w-full bg-red-100 rounded-full h-2.5">
                  <div
                    className="bg-red-500 h-2.5 rounded-full transition-all duration-500"
                    style={{ width: `${Math.min(100, groqStatus.tokenPct)}%` }}
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <div className="flex items-center gap-1.5">
                    <svg className="w-3.5 h-3.5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                        d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>
                    </svg>
                    <span className="text-xs font-medium text-slate-600">Requests</span>
                  </div>
                  <span className="text-xs font-bold text-red-600">
                    {requestsUsed} / {requestLimit}
                  </span>
                </div>
                <div className="w-full bg-red-100 rounded-full h-2.5">
                  <div
                    className="bg-red-500 h-2.5 rounded-full transition-all duration-500"
                    style={{ width: `${Math.min(100, groqStatus.reqPct)}%` }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Countdown */}
          <div className="flex items-center justify-center gap-3 mb-6 bg-slate-50 border border-slate-100 rounded-xl py-4">
            <div className="w-10 h-10 bg-white border-2 border-slate-200 rounded-full flex items-center justify-center">
              <svg className={`w-5 h-5 text-blue-500 ${countdown > 0 ? 'animate-spin' : ''}`}
                fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
              </svg>
            </div>
            <div className="text-left">
              <p className="text-xs text-slate-400 font-medium">Auto-resets in</p>
              <p className="text-2xl font-bold text-slate-800 leading-none">
                {countdown}
                <span className="text-sm font-normal text-slate-400 ml-1">seconds</span>
              </p>
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-col gap-2.5">
            <a
              href="https://console.groq.com"
              target="_blank"
              rel="noreferrer"
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-xl text-sm transition flex items-center justify-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                  d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"/>
              </svg>
              Upgrade Groq Plan
            </a>
            <p className="text-xs text-slate-400">
              Free tier resets every minute. Upgrade for higher limits.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // ── Warning banner (near limit) ──
  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 w-full max-w-lg px-4">
      <div className="bg-amber-50 border border-amber-300 rounded-2xl shadow-xl px-5 py-4">
        <div className="flex items-start gap-3">

          {/* Icon */}
          <div className="w-9 h-9 bg-amber-100 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5">
            <svg className="w-5 h-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
            </svg>
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-1">
              <p className="text-sm font-bold text-amber-800">
                ⚠️ Groq API at {usagePct}% — Limit Approaching
              </p>
              <button
                onClick={() => { setDismissed(true); dismissWarning(); }}
                className="text-amber-400 hover:text-amber-700 transition ml-3 flex-shrink-0"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/>
                </svg>
              </button>
            </div>

            <p className="text-xs text-amber-700 mb-3 leading-relaxed">
              You're using <strong>{usagePct}%</strong> of your Groq free tier limit.
              AI features may stop soon. Resets in <strong>{countdown}s</strong>.
            </p>

            {/* Dual progress bars */}
            <div className="space-y-2 mb-3">
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-amber-600 font-medium">Tokens</span>
                  <span className="text-amber-700 font-semibold">
                    {tokensUsed?.toLocaleString()} / {tokenLimit?.toLocaleString()}
                  </span>
                </div>
                <div className="w-full bg-amber-200 rounded-full h-1.5">
                  <div
                    className="bg-amber-500 h-1.5 rounded-full transition-all"
                    style={{ width: `${Math.min(100, groqStatus.tokenPct)}%` }}
                  />
                </div>
              </div>
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-amber-600 font-medium">Requests</span>
                  <span className="text-amber-700 font-semibold">
                    {requestsUsed} / {requestLimit}
                  </span>
                </div>
                <div className="w-full bg-amber-200 rounded-full h-1.5">
                  <div
                    className="bg-amber-500 h-1.5 rounded-full transition-all"
                    style={{ width: `${Math.min(100, groqStatus.reqPct)}%` }}
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <p className="text-xs text-amber-600">
                Limit resets in <strong>{countdown}s</strong>
              </p>
              <a
                href="https://console.groq.com"
                target="_blank"
                rel="noreferrer"
                className="text-xs font-bold text-amber-700 hover:text-amber-900 underline flex items-center gap-1"
              >
                Upgrade Plan
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                    d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"/>
                </svg>
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GroqLimitBanner;