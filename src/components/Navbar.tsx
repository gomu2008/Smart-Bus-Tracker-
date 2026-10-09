import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useLive } from '../context/LiveContext';
import { useTheme } from '../context/ThemeContext';
import { Logo } from './Logo';
import { ThemeSelector } from './ThemeSelector';
import {
  Bell,
  LogOut,
  Radio,
  User as UserIcon,
  Menu,
  AlertTriangle,
  Info,
  Clock,
  ShieldCheck,
} from 'lucide-react';

interface NavbarProps {
  onToggleSidebar?: () => void;
  activeTab?: string;
  onTabChange?: (tab: string) => void;
  onOpenAuth?: (role?: 'student' | 'driver' | 'admin' | 'staff') => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onToggleSidebar, activeTab, onTabChange, onOpenAuth }) => {
  const { user, logout } = useAuth();
  const { isConnected, collegeName, notifications, unreadNotifsCount, markNotificationRead, markAllNotificationsRead } = useLive();
  const { accentPreset, template, templatePreset } = useTheme();

  const [showNotifs, setShowNotifs] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);

  // Close dropdowns on outside click
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setShowNotifs(false);
      }
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setShowProfileMenu(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  const getRoleBadge = (role?: string) => {
    switch (role) {
      case 'admin':
        return 'bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border-purple-300 dark:border-purple-800';
      case 'driver':
        return 'bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border-blue-300 dark:border-blue-800';
      case 'staff':
        return 'bg-teal-100 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300 border-teal-300 dark:border-teal-800';
      default:
        return 'bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border-amber-300 dark:border-amber-800';
    }
  };

  // Nav links for Executive Portal template
  const executiveLinks =
    user?.role === 'admin'
      ? [
          { id: 'overview', label: 'Command' },
          { id: 'fleet', label: 'Fleet' },
          { id: 'gps_tracker', label: 'Real GPS' },
          { id: 'routes', label: 'Routes' },
          { id: 'users', label: 'Users' },
          { id: 'map_tactical', label: 'Radar Map' },
          { id: 'reports', label: 'CSV Reports' },
        ]
      : user?.role === 'driver'
      ? [
          { id: 'dispatch', label: 'Trip Control' },
          { id: 'route_stops', label: 'Stops & Timings' },
          { id: 'announcements', label: 'Bulletins' },
          { id: 'profile', label: 'Vehicle Profile' },
        ]
      : user?.role === 'staff'
      ? [
          { id: 'tracker', label: 'Live Tracker' },
          { id: 'timetable', label: 'Timetable' },
          { id: 'seating', label: 'Faculty Seating' },
          { id: 'announcements', label: 'Bulletins' },
          { id: 'profile', label: 'Profile' },
        ]
      : [
          { id: 'tracker', label: 'Live Tracker' },
          { id: 'timetable', label: 'Timetable' },
          { id: 'favorites', label: 'Saved Stops' },
          { id: 'announcements', label: 'Announcements' },
          { id: 'profile', label: 'Profile' },
        ];

  return (
    <header className="sticky top-0 z-30 bg-white/85 dark:bg-slate-900/85 backdrop-blur-md border-b border-slate-200 dark:border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        
        {/* Zone 1: Brand Wordmark & Hamburger */}
        <div className="flex items-center gap-3 shrink-0">
          {user && template !== 'executive-portal' && (
            <button
              onClick={onToggleSidebar}
              className="lg:hidden p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 focus:outline-none"
              aria-label="Toggle Navigation"
            >
              <Menu className="w-5 h-5" />
            </button>
          )}

          <div
            onClick={() => onTabChange && onTabChange(user?.role === 'admin' ? 'overview' : 'tracker')}
            className="cursor-pointer group flex items-center"
            title={`${collegeName || 'Campus Transport System'} - Click to go to main view`}
          >
            <Logo size="md" variant="full" />
          </div>
        </div>

        {/* Zone 2: Navigation Links (When in Executive Portal template, or clean breadcrumbs) */}
        {user && template === 'executive-portal' && (
          <nav className="hidden md:flex items-center gap-1 overflow-x-auto py-1 px-2 rounded-2xl bg-slate-100/70 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60">
            {executiveLinks.map(link => {
              const isActive = activeTab === link.id;
              return (
                <button
                  key={link.id}
                  onClick={() => onTabChange && onTabChange(link.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                    isActive
                      ? 'text-white shadow-xs font-bold'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white/60 dark:hover:bg-slate-700/50'
                  }`}
                  style={
                    isActive
                      ? {
                          backgroundColor: accentPreset.colorHex,
                        }
                      : {}
                  }
                >
                  {link.label}
                </button>
              );
            })}
          </nav>
        )}

        {/* Zone 3: Actions (Telemetry indicator, Theme Studio, Notifications, Profile / Login) */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          
          {/* Real-time SSE indicator */}
          <div
            className={`hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold border ${
              isConnected
                ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800'
                : 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400 border-rose-200 dark:border-rose-800'
            }`}
            title={isConnected ? 'Live Telemetry Active' : 'Connecting to Transport Server...'}
          >
            <Radio className={`w-3 h-3 ${isConnected ? 'animate-pulse text-emerald-500' : 'text-rose-500'}`} />
            <span>{isConnected ? 'Live' : 'Syncing'}</span>
          </div>

          {/* Theme, Logo & Template Studio Trigger */}
          <ThemeSelector />



          {!user && onOpenAuth && (
            <div className="flex items-center gap-1.5 sm:gap-2">
              <button
                onClick={() => onOpenAuth('student')}
                className="px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                Student
              </button>
              <button
                onClick={() => onOpenAuth('admin')}
                className="px-2.5 sm:px-3 py-1.5 rounded-xl text-white text-xs font-bold shadow-sm hover:opacity-95 transition-all flex items-center gap-1"
                style={{ backgroundColor: accentPreset.colorHex }}
                title="Institutional Administrator Access"
              >
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Admin</span>
              </button>
            </div>
          )}

          {user && (
            <>
              {/* Notification Bell Dropdown */}
              <div className="relative" ref={notifRef}>
                <button
                  onClick={() => setShowNotifs(prev => !prev)}
                  className="relative p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                  aria-label="Notifications"
                >
                  <Bell className="w-4 h-4" />
                  {unreadNotifsCount > 0 && (
                    <span
                      className="absolute top-1.5 right-1.5 flex h-4 w-4 items-center justify-center rounded-full text-[10px] font-bold text-white ring-2 ring-white dark:ring-slate-900"
                      style={{ backgroundColor: accentPreset.colorHex }}
                    >
                      {unreadNotifsCount > 9 ? '9+' : unreadNotifsCount}
                    </span>
                  )}
                </button>

                {showNotifs && (
                  <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-2xl bg-white dark:bg-slate-900 shadow-xl border border-slate-200 dark:border-slate-800 p-4 z-50 animate-in fade-in zoom-in-95">
                    <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                      <div className="flex items-center gap-2">
                        <h4 className="font-bold text-sm text-slate-900 dark:text-white">Notifications</h4>
                        {unreadNotifsCount > 0 && (
                          <span
                            className="text-[10px] px-2 py-0.5 rounded-full font-bold border"
                            style={{
                              backgroundColor: `${accentPreset.colorHex}15`,
                              color: accentPreset.colorHex,
                              borderColor: `${accentPreset.colorHex}30`,
                            }}
                          >
                            {unreadNotifsCount} new
                          </span>
                        )}
                      </div>
                      {unreadNotifsCount > 0 && (
                        <button
                          onClick={markAllNotificationsRead}
                          className="text-xs hover:underline font-semibold"
                          style={{ color: accentPreset.colorHex }}
                        >
                          Mark all read
                        </button>
                      )}
                    </div>

                    <div className="max-h-80 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/60 mt-2">
                      {notifications.length === 0 ? (
                        <div className="py-8 text-center text-slate-400 text-xs">
                          No notifications yet. You'll receive real-time bus alerts here!
                        </div>
                      ) : (
                        notifications.map((n, idx) => (
                          <div
                            key={`${n.id}-${idx}`}
                            onClick={() => markNotificationRead(n.id)}
                            className={`py-3 px-2 rounded-xl transition-colors cursor-pointer flex items-start gap-3 ${
                              !n.read ? 'bg-slate-50 dark:bg-slate-800/50' : 'hover:bg-slate-50 dark:hover:bg-slate-800/40'
                            }`}
                          >
                            <div className="mt-0.5 shrink-0">
                              {n.type === 'emergency' ? (
                                <AlertTriangle className="w-4 h-4 text-rose-500" />
                              ) : n.type === 'trip_delay' ? (
                                <Clock className="w-4 h-4 text-amber-500" />
                              ) : (
                                <Info className="w-4 h-4 text-blue-500" />
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className={`text-xs ${!n.read ? 'font-bold text-slate-900 dark:text-white' : 'font-medium text-slate-700 dark:text-slate-300'}`}>
                                {n.title}
                              </p>
                              <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 mt-0.5">
                                {n.message}
                              </p>
                              <span className="text-[10px] text-slate-400 mt-1 block">
                                {new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>
                            {!n.read && (
                              <span
                                className="w-2 h-2 rounded-full shrink-0 mt-1.5"
                                style={{ backgroundColor: accentPreset.colorHex }}
                              />
                            )}
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* User Profile & Role Menu */}
              <div className="relative" ref={profileRef}>
                <button
                  onClick={() => setShowProfileMenu(prev => !prev)}
                  className="flex items-center gap-2 p-1.5 sm:px-3 sm:py-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors border border-transparent hover:border-slate-200 dark:hover:border-slate-700"
                >
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs text-white uppercase shadow-xs"
                    style={{ backgroundColor: accentPreset.colorHex }}
                  >
                    {user.name.charAt(0)}
                  </div>
                  <div className="text-left hidden sm:block">
                    <p className="text-xs font-bold text-slate-900 dark:text-white leading-tight truncate max-w-[120px]">
                      {user.name}
                    </p>
                    <span className={`text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.2 rounded border ${getRoleBadge(user.role)}`}>
                      {user.role}
                    </span>
                  </div>
                </button>

                {showProfileMenu && (
                  <div className="absolute right-0 mt-2 w-56 rounded-2xl bg-white dark:bg-slate-900 shadow-xl border border-slate-200 dark:border-slate-800 p-2 z-50 animate-in fade-in zoom-in-95">
                    <div className="px-3 py-2 border-b border-slate-100 dark:border-slate-800 mb-1">
                      <p className="text-xs font-bold text-slate-900 dark:text-white truncate">{user.name}</p>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">{user.email}</p>
                      <p
                        className="text-[10px] font-semibold mt-0.5"
                        style={{ color: accentPreset.colorHex }}
                      >
                        ID: {user.collegeId} · {templatePreset.name}
                      </p>
                    </div>

                    <button
                      onClick={() => {
                        setShowProfileMenu(false);
                        if (onTabChange) onTabChange('profile');
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-slate-700 dark:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                    >
                      <UserIcon className="w-4 h-4 text-slate-400" />
                      <span>Account Settings</span>
                    </button>

                    <button
                      onClick={() => {
                        setShowProfileMenu(false);
                        logout();
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-rose-600 dark:text-rose-400 rounded-xl hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors mt-1"
                    >
                      <LogOut className="w-4 h-4" />
                      <span>Sign Out</span>
                    </button>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
};
