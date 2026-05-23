import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const navItems = [
  { label: 'Dashboard', path: '/dashboard', icon: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <rect x="3" y="3" width="7" height="7" rx="1" strokeWidth="2"/>
      <rect x="14" y="3" width="7" height="7" rx="1" strokeWidth="2"/>
      <rect x="3" y="14" width="7" height="7" rx="1" strokeWidth="2"/>
      <rect x="14" y="14" width="7" height="7" rx="1" strokeWidth="2"/>
    </svg>
  )},
  { label: 'Lobby', path: '/lobby', icon: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeWidth="2" strokeLinecap="round" d="M12 5v14M5 12h14"/>
      <rect x="3" y="3" width="18" height="18" rx="2" strokeWidth="2"/>
    </svg>
  )},
  { label: 'History', path: '/history', icon: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
    </svg>
  )},
  { label: 'Analytics', path: '/analytics', icon: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"/>
    </svg>
  )},
  {
  label: 'Projects',
  path: '/project-interview',
  icon: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
        d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"/>
    </svg>
  ),
},
{
  label: 'Settings',
  path: '/settings',
  icon: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
        d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/>
      <path strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
        d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
    </svg>
  ),
},
];

const Sidebar = () => {
  const { logout } = useAuth();
  const location = useLocation();

  return (
    <aside className="w-56 h-screen bg-white border-r border-slate-100 flex flex-col fixed left-0 top-0 z-20 overflow-y-auto">
      
      {/* Logo */}
      <div className="px-6 py-5 border-b border-slate-100">
        <h1 className="text-xl font-bold text-blue-600">HireReady AI</h1>
      </div>

      {/* Coach Info */}
      <div className="flex flex-col items-center px-6 py-6 border-b border-slate-100">
        <div className="w-14 h-14 bg-blue-600 rounded-xl flex items-center justify-center mb-3">
          <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
              d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>
          </svg>
        </div>
        <p className="text-sm font-semibold text-slate-800">Coach Roberts</p>
        <p className="text-xs text-slate-400 mt-0.5">Executive Mentor</p>
      </div>

      {/* Nav Items */}
      <nav className="flex flex-col gap-1 px-3 py-4 flex-1">
        {navItems.map(item => {
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-all
                ${isActive
                  ? 'bg-blue-50 text-blue-600'
                  : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700'
                }`}
            >
              <span className={isActive ? 'text-blue-600' : 'text-slate-400'}>
                {item.icon}
              </span>
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Start Practice Button */}
      <div className="px-4 pb-4">
        <Link
          to="/lobby"
          className="block w-full bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold text-center py-3 rounded-xl transition"
        >
          Start Practice
        </Link>
      </div>

      {/* Bottom Links */}
      <div className="flex flex-col gap-1 px-3 pb-6 border-t border-slate-100 pt-4">
        <button className="flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm text-slate-500 hover:bg-slate-50 hover:text-slate-700 transition w-full text-left">
          <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
              d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
          </svg>
          Help Center
        </button>
        <button
          onClick={logout}
          className="flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm text-slate-500 hover:bg-red-50 hover:text-red-500 transition w-full text-left"
        >
          <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
              d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/>
          </svg>
          Log Out
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;