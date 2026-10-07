import React from 'react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { Logo } from './Logo';
import {
  MapPin,
  Clock,
  Bookmark,
  Megaphone,
  MessageSquareWarning,
  User,
  Bus,
  ShieldCheck,
  Users,
  Compass,
  FileSpreadsheet,
  Gauge,
  X,
  Sparkles,
  Sliders,
} from 'lucide-react';

interface SidebarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  isOpen: boolean;
  onClose: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ activeTab, onTabChange, isOpen, onClose }) => {
  const { user } = useAuth();
  const { accentPreset, openStudio, templatePreset } = useTheme();

  if (!user) return null;

  const studentLinks = [
    { id: 'tracker', label: 'Live Bus Tracker', icon: MapPin },
    { id: 'timetable', label: 'Route Timetable', icon: Clock },
    { id: 'favorites', label: 'Saved Stops', icon: Bookmark },
    { id: 'announcements', label: 'Announcements', icon: Megaphone },
    { id: 'feedback', label: 'Report Issue / Feedback', icon: MessageSquareWarning },
    { id: 'profile', label: 'Profile & Settings', icon: User },
  ];

  const staffLinks = [
    { id: 'tracker', label: 'Staff Shuttle Tracker', icon: MapPin },
    { id: 'timetable', label: 'Transit Timetable', icon: Clock },
    { id: 'seating', label: 'Faculty Reserved Seating', icon: ShieldCheck },
    { id: 'favorites', label: 'Saved Stops', icon: Bookmark },
    { id: 'announcements', label: 'Campus Bulletins', icon: Megaphone },
    { id: 'feedback', label: 'Department Feedback', icon: MessageSquareWarning },
    { id: 'profile', label: 'Staff Profile', icon: User },
  ];

  const driverLinks = [
    { id: 'dispatch', label: 'Active Trip Control', icon: Gauge },
    { id: 'route_stops', label: 'Stops & Timings', icon: Clock },
    { id: 'announcements', label: 'Announcements', icon: Megaphone },
    { id: 'profile', label: 'Profile & Vehicle', icon: User },
  ];

  const adminLinks = [
    { id: 'overview', label: 'Command Overview', icon: Gauge },
    { id: 'fleet', label: 'Fleet Management', icon: Bus },
    { id: 'routes', label: 'Routes & Stops Picker', icon: MapPin },
    { id: 'users', label: 'Users & Driver Approvals', icon: Users },
    { id: 'map_tactical', label: 'Live Fleet Radar', icon: Compass },
    { id: 'announcements', label: 'Broadcast Announcements', icon: Megaphone },
    { id: 'feedback', label: 'Student Feedback & Issues', icon: MessageSquareWarning },
    { id: 'reports', label: 'Data Reports & CSV', icon: FileSpreadsheet },
    { id: 'profile', label: 'Admin Settings', icon: Sliders },
  ];

  const links =
    user.role === 'admin'
      ? adminLinks
      : user.role === 'driver'
      ? driverLinks
      : user.role === 'staff'
      ? staffLinks
      : studentLinks;

  const handleLinkClick = (id: string) => {
    onTabChange(id);
    onClose();
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          onClick={onClose}
          className="fixed inset-0 z-40 bg-slate-950/50 backdrop-blur-sm lg:hidden transition-opacity"
        />
      )}

      {/* Sidebar Panel */}
      <aside
        className={`fixed top-16 bottom-0 left-0 z-40 w-64 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex flex-col justify-between transition-transform duration-300 ease-in-out lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="p-4 flex-1 overflow-y-auto">
          {/* Mobile Header with Logo */}
          <div className="flex items-center justify-between pb-3 mb-2 border-b border-slate-100 dark:border-slate-800 lg:hidden">
            <Logo size="sm" variant="full" />
            <button
              onClick={onClose}
              className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Navigation Links */}
          <nav className="space-y-1">
            {links.map(link => {
              const Icon = link.icon;
              const isActive = activeTab === link.id;

              return (
                <button
                  key={link.id}
                  onClick={() => handleLinkClick(link.id)}
                  className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                    isActive
                      ? 'text-white shadow-sm'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/60'
                  }`}
                  style={
                    isActive
                      ? {
                          backgroundColor: accentPreset.colorHex,
                        }
                      : {}
                  }
                >
                  <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                  <span className="truncate">{link.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Bottom Options: Theme Studio & User Mini Card */}
        <div className="p-3 m-3 space-y-2 border-t border-slate-100 dark:border-slate-800">
          {/* Quick Studio Trigger button */}
          <button
            onClick={openStudio}
            className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold bg-slate-50 dark:bg-slate-800/80 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200/80 dark:border-slate-700/80 transition-all group"
          >
            <div className="flex items-center gap-2">
              <Sparkles className="w-3.5 h-3.5" style={{ color: accentPreset.colorHex }} />
              <span>Theme & Template</span>
            </div>
            <span
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: accentPreset.colorHex }}
            />
          </button>

          {/* User Mini Card */}
          <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[11px] font-bold text-slate-800 dark:text-slate-200 truncate">
                {user.name}
              </span>
              <span
                className="text-[9px] font-bold uppercase px-1.5 py-0.2 rounded border"
                style={{
                  backgroundColor: `${accentPreset.colorHex}15`,
                  color: accentPreset.colorHex,
                  borderColor: `${accentPreset.colorHex}30`,
                }}
              >
                {user.role}
              </span>
            </div>
            <div className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
              ID: {user.collegeId} · {templatePreset.name.split(' ')[0]}
            </div>
          </div>
        </div>
      </aside>
    </>
  );
};
