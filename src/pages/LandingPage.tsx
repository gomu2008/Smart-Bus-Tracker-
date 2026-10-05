import React from 'react';
import { Bus, MapPin, ShieldCheck, Clock, Navigation, ArrowRight, Radio, Compass, Users } from 'lucide-react';
import { useLive } from '../context/LiveContext';

interface LandingPageProps {
  onOpenAuth: (defaultRole?: 'student' | 'driver' | 'admin' | 'staff') => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onOpenAuth }) => {
  const { collegeName } = useLive();
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col">
      {/* Top Banner / Hero */}
      <section className="relative overflow-hidden pt-12 pb-20 lg:pt-20 lg:pb-28 border-b border-slate-200 dark:border-slate-800">
        <div className="absolute inset-0 bg-[radial-gradient(#f59e0b_1px,transparent_1px)] [background-size:24px_24px] opacity-20 pointer-events-none" />
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="text-center max-w-3xl mx-auto">
            {/* Live Ticker */}
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-700 dark:text-amber-400 text-xs font-semibold mb-6">
              <span className="flex h-2 w-2 rounded-full bg-amber-500 animate-ping" />
              <span>Official Transit Network · {collegeName || 'Campus Transport System'}</span>
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight text-slate-900 dark:text-white leading-[1.15]">
              Real-Time Campus <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-500 via-amber-600 to-yellow-500">
                Smart Bus Tracker
              </span>
            </h1>

            <p className="mt-5 text-base sm:text-lg text-slate-600 dark:text-slate-300 max-w-2xl mx-auto font-normal">
              Say goodbye to guesswork at the bus stop. Track active college shuttles in real time, view live arrival ETAs, receive route delay alerts, and manage campus fleet operations effortlessly.
            </p>

            {/* SEPARATE LOGIN GATEWAYS FOR STUDENTS & ADMIN */}
            <div className="mt-8 flex flex-col items-center gap-3">
              <div className="flex flex-wrap items-center justify-center gap-3.5">
                <button
                  onClick={() => onOpenAuth('student')}
                  className="px-6 py-3.5 rounded-xl bg-amber-500 text-slate-950 font-bold text-sm shadow-lg shadow-amber-500/25 hover:bg-amber-400 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center gap-2"
                >
                  <Users className="w-4 h-4 text-slate-950" />
                  <span>Student Transit Login</span>
                  <ArrowRight className="w-4 h-4" />
                </button>

                <button
                  onClick={() => onOpenAuth('admin')}
                  className="px-6 py-3.5 rounded-xl bg-slate-900 dark:bg-slate-800 text-white font-bold text-sm border-2 border-amber-500/80 shadow-lg shadow-amber-500/10 hover:bg-slate-800 dark:hover:bg-slate-700 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center gap-2"
                >
                  <ShieldCheck className="w-4 h-4 text-amber-400" />
                  <span>Admin Portal (Changes & Control)</span>
                </button>
              </div>

              {/* Quick portal hint banner */}
              <div className="flex flex-wrap items-center justify-center gap-2 text-xs text-slate-600 dark:text-slate-400 bg-white/70 dark:bg-slate-900/70 backdrop-blur-sm px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-800">
                <span className="font-semibold text-amber-700 dark:text-amber-400">⚡ Transit Control Notice:</span>
                <span>Fleet, route, and stop changes are handled strictly by authorized Administrators.</span>
                <span className="text-slate-300 dark:text-slate-700">|</span>
                <button
                  onClick={() => onOpenAuth('staff')}
                  className="text-xs font-semibold text-teal-600 dark:text-teal-400 hover:underline"
                >
                  Staff Login
                </button>
                <span>·</span>
                <button
                  onClick={() => onOpenAuth('driver')}
                  className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline"
                >
                  Driver Console
                </button>
              </div>
            </div>
          </div>

          {/* Interactive Feature Cards */}
          <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
              <div className="w-12 h-12 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center mb-4">
                <Navigation className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-base text-slate-900 dark:text-white mb-2">Live Map & Stop ETAs</h3>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                Smooth OpenStreetMap tracking shows exactly where your shuttle is with accurate arrival countdowns, distance, and current speed.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
              <div className="w-12 h-12 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center mb-4">
                <Clock className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-base text-slate-900 dark:text-white mb-2">Real-Time Delay Alerts</h3>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                Instant Server-Sent Event broadcasts warn you immediately if a shuttle is delayed by traffic, monsoon weather, or route detours.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
              <div className="w-12 h-12 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center mb-4">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-base text-slate-900 dark:text-white mb-2">Driver Dispatch & Control</h3>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                Drivers broadcast live GPS, mark reached stops, adjust passenger occupancies, and send emergency breakdown alerts to transport HQ.
              </p>
            </div>
          </div>

          {/* Quick Route Directory Preview */}
          <div className="mt-12 p-6 rounded-2xl bg-slate-900 text-white shadow-xl border border-slate-800">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
              <div>
                <h3 className="text-lg font-bold">Active Campus Bus Corridors</h3>
                <p className="text-xs text-slate-400">Regular college schedule running Monday to Saturday</p>
              </div>
              <button
                onClick={() => onOpenAuth('student')}
                className="text-xs font-bold text-amber-400 hover:text-amber-300 flex items-center gap-1 self-start sm:self-auto"
              >
                <span>View Full Timetable</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-4 rounded-xl bg-slate-800/80 border border-slate-700/80">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-amber-400">TN-01 (Junction Express)</span>
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-800">Active</span>
                </div>
                <p className="text-xs text-slate-300 font-medium">Tirunelveli Junction ➔ Vannarpettai ➔ Palayamkottai ➔ TEC Campus</p>
                <div className="mt-3 flex items-center justify-between text-[11px] text-slate-400">
                  <span>4 Scheduled Stops</span>
                  <span>Duration: 30 mins</span>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-slate-800/80 border border-slate-700/80">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-blue-400">TN-02 (New Bus Stand Link)</span>
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-800">Active</span>
                </div>
                <p className="text-xs text-slate-300 font-medium">Veinthankulam MGR Bus Stand ➔ Perumalpuram ➔ High Ground ➔ TEC</p>
                <div className="mt-3 flex items-center justify-between text-[11px] text-slate-400">
                  <span>4 Scheduled Stops</span>
                  <span>Duration: 35 mins</span>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-slate-800/80 border border-slate-700/80">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-emerald-400">TN-03 (Pettai & Town Line)</span>
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-800">Active</span>
                </div>
                <p className="text-xs text-slate-300 font-medium">Pettai Industrial Estate ➔ Nellai Town Arch ➔ Thamirabarani ➔ TEC</p>
                <div className="mt-3 flex items-center justify-between text-[11px] text-slate-400">
                  <span>4 Scheduled Stops</span>
                  <span>Duration: 40 mins</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="mt-auto py-8 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <Bus className="w-4 h-4 text-amber-500" />
            <span className="font-semibold text-slate-700 dark:text-slate-300">Smart Bus Tracker</span>
            <span>· {collegeName || 'Campus Transport Operations'}</span>
          </div>
          <div>
            Leaflet Maps · OpenStreetMap Engine · High-Frequency Telemetry
          </div>
        </div>
      </footer>
    </div>
  );
};
