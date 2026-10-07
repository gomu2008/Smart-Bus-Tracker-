import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { LiveProvider, useLive } from './context/LiveContext';
import { ThemeProvider, useTheme } from './context/ThemeContext';
import { ToastProvider } from './context/ToastContext';
import { Navbar } from './components/Navbar';
import { Sidebar } from './components/Sidebar';
import { Logo } from './components/Logo';
import { ThemeStudioModal } from './components/ThemeStudioModal';
import { LeafletMap } from './components/LeafletMap';
import { LandingPage } from './pages/LandingPage';
import { AuthPage } from './pages/AuthPage';
import { StudentDashboard } from './pages/StudentDashboard';
import { StaffDashboard } from './pages/StaffDashboard';
import { DriverDashboard } from './pages/DriverDashboard';
import { AdminDashboard } from './pages/AdminDashboard';
import { Loader2, Compass, Radio, MapPin } from 'lucide-react';
import { UserRole } from './types';

const AppContent: React.FC = () => {
  const { user, isLoading } = useAuth();
  const { template, accentPreset } = useTheme();
  const { buses, routes, stops, busLocations } = useLive();

  const [activeTab, setActiveTab] = useState<string>('overview');
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(false);
  const [authViewRole, setAuthViewRole] = useState<UserRole | null>(null);
  const [showAuthModal, setShowAuthModal] = useState<boolean>(false);


  // Set default tab based on role when user logs in
  useEffect(() => {
    if (user) {
      if (user.role === 'admin') setActiveTab('overview');
      else if (user.role === 'driver') setActiveTab('dispatch');
      else setActiveTab('tracker');
      setShowAuthModal(false);
    }
  }, [user?.role]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center gap-4">
        <Logo size="xl" variant="icon" />
        <div className="flex items-center gap-2 text-xs font-bold text-slate-600 dark:text-slate-400">
          <Loader2 className="w-4 h-4 animate-spin" style={{ color: accentPreset.colorHex }} />
          <span>Initializing Campus Transit OS...</span>
        </div>
      </div>
    );
  }

  // Not signed in
  if (!user) {
    if (showAuthModal || authViewRole) {
      return (
        <>
          <AuthPage
            initialRole={authViewRole || 'student'}
            onSuccess={() => setShowAuthModal(false)}
            onBackToHome={() => {
              setShowAuthModal(false);
              setAuthViewRole(null);
            }}
          />
          <ThemeStudioModal />
        </>
      );
    }

    return (
      <div>
        <Navbar
          onOpenAuth={role => {
            setAuthViewRole(role || 'student');
            setShowAuthModal(true);
          }}
        />
        <LandingPage
          onOpenAuth={role => {
            setAuthViewRole(role || 'student');
            setShowAuthModal(true);
          }}
        />
        <ThemeStudioModal />
      </div>
    );
  }

  // Render Dashboard Component according to role
  const renderDashboard = () => {
    if (user.role === 'admin') {
      return <AdminDashboard activeTab={activeTab} onTabChange={tab => setActiveTab(tab)} />;
    }
    if (user.role === 'driver') {
      return <DriverDashboard activeTab={activeTab} onTabChange={tab => setActiveTab(tab)} />;
    }
    if (user.role === 'staff') {
      return <StaffDashboard activeTab={activeTab} onTabChange={tab => setActiveTab(tab)} />;
    }
    return <StudentDashboard activeTab={activeTab} onTabChange={tab => setActiveTab(tab)} />;
  };

  // Signed in: Render according to active Template Architecture
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col">
      <Navbar
        onToggleSidebar={() => setIsSidebarOpen(prev => !prev)}
        activeTab={activeTab}
        onTabChange={tab => setActiveTab(tab)}
      />

      {/* TEMPLATE A: Command Center HUD (Default fixed navigation rail) */}
      {template === 'command-center' && (
        <div className="flex-1 flex max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <Sidebar
            activeTab={activeTab}
            onTabChange={tab => setActiveTab(tab)}
            isOpen={isSidebarOpen}
            onClose={() => setIsSidebarOpen(false)}
          />

          <main className="flex-1 lg:pl-64 w-full min-w-0">
            {renderDashboard()}
          </main>
        </div>
      )}

      {/* TEMPLATE B: Modern Executive Portal (Airy Bento grid, horizontal navigation) */}
      {template === 'executive-portal' && (
        <div className="flex-1 flex flex-col max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
          {/* Collapsible Mobile Drawer if needed */}
          <Sidebar
            activeTab={activeTab}
            onTabChange={tab => setActiveTab(tab)}
            isOpen={isSidebarOpen}
            onClose={() => setIsSidebarOpen(false)}
          />

          <main className="flex-1 w-full min-w-0">
            {renderDashboard()}
          </main>
        </div>
      )}

      {/* TEMPLATE C: Tactical Dual-Split Console (Live Radar Leaflet map permanently pinned alongside dashboard) */}
      {template === 'tactical-split' && (
        <div className="flex-1 flex max-w-[1700px] w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 gap-6">
          <Sidebar
            activeTab={activeTab}
            onTabChange={tab => setActiveTab(tab)}
            isOpen={isSidebarOpen}
            onClose={() => setIsSidebarOpen(false)}
          />

          {/* Left / Pinned Tactical Radar Viewport (Desktop) */}
          <div className="hidden xl:flex xl:w-[480px] 2xl:w-[540px] flex-col shrink-0 lg:pl-64">
            <div className="sticky top-20 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 shadow-sm space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <Compass className="w-4 h-4" style={{ color: accentPreset.colorHex }} />
                  <h3 className="font-bold text-xs uppercase tracking-wider text-slate-900 dark:text-white">
                    Tactical Radar Deck
                  </h3>
                </div>
                <div className="flex items-center gap-1.5 text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                  <Radio className="w-3 h-3 animate-pulse" />
                  <span>{buses.length} Fleet Transponders</span>
                </div>
              </div>

              {/* Tactical Leaflet Map */}
              <div className="h-[460px] rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 shadow-inner">
                <LeafletMap
                  buses={buses}
                  routes={routes}
                  stops={stops}
                  locations={busLocations}
                  className="h-full w-full"
                />
              </div>

              {/* Radar Telemetry Quick Summary */}
              <div className="grid grid-cols-3 gap-2 pt-1 text-center">
                <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
                  <span className="text-[10px] text-slate-400 block font-medium">Buses</span>
                  <span className="text-xs font-bold font-mono">{buses.length}</span>
                </div>
                <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
                  <span className="text-[10px] text-slate-400 block font-medium">Routes</span>
                  <span className="text-xs font-bold font-mono">{routes.length}</span>
                </div>
                <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
                  <span className="text-[10px] text-slate-400 block font-medium">Stops</span>
                  <span className="text-xs font-bold font-mono">{stops.length}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Right Main Content Deck */}
          <main className="flex-1 w-full min-w-0 lg:pl-64 xl:pl-0">
            {renderDashboard()}
          </main>
        </div>
      )}

      {/* Global Interactive Theme, Logo & Template Studio Modal */}
      <ThemeStudioModal />
    </div>
  );
};

export default function App() {
  return (
    <ThemeProvider>
      <ToastProvider>
        <AuthProvider>
          <LiveProvider>
            <AppContent />
          </LiveProvider>
        </AuthProvider>
      </ToastProvider>
    </ThemeProvider>
  );
}
