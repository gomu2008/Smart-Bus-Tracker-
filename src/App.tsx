import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { LiveProvider } from './context/LiveContext';
import { ThemeProvider } from './context/ThemeContext';
import { ToastProvider } from './context/ToastContext';
import { Navbar } from './components/Navbar';
import { Sidebar } from './components/Sidebar';
import { LandingPage } from './pages/LandingPage';
import { AuthPage } from './pages/AuthPage';
import { StudentDashboard } from './pages/StudentDashboard';
import { StaffDashboard } from './pages/StaffDashboard';
import { DriverDashboard } from './pages/DriverDashboard';
import { AdminDashboard } from './pages/AdminDashboard';
import { Bus, Loader2 } from 'lucide-react';
import { UserRole } from './types';

const AppContent: React.FC = () => {
  const { user, isLoading } = useAuth();
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
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center gap-3">
        <div className="w-12 h-12 rounded-2xl bg-amber-500 text-slate-950 flex items-center justify-center shadow-xl shadow-amber-500/20 animate-bounce">
          <Bus className="w-7 h-7 stroke-[2.2]" />
        </div>
        <div className="flex items-center gap-2 text-xs font-bold text-slate-600 dark:text-slate-400">
          <Loader2 className="w-4 h-4 animate-spin text-amber-500" />
          <span>Initializing Smart Bus Tracker...</span>
        </div>
      </div>
    );
  }

  // Not signed in
  if (!user) {
    if (showAuthModal || authViewRole) {
      return (
        <AuthPage
          initialRole={authViewRole || 'student'}
          onSuccess={() => setShowAuthModal(false)}
          onBackToHome={() => {
            setShowAuthModal(false);
            setAuthViewRole(null);
          }}
        />
      );
    }

    return (
      <div>
        <Navbar
          onTabChange={() => {}}
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
      </div>
    );
  }

  // Signed in: Render Role Dashboard with Sidebar
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col">
      <Navbar
        onToggleSidebar={() => setIsSidebarOpen(prev => !prev)}
        activeTab={activeTab}
        onTabChange={tab => setActiveTab(tab)}
      />

      <div className="flex-1 flex max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <Sidebar
          activeTab={activeTab}
          onTabChange={tab => setActiveTab(tab)}
          isOpen={isSidebarOpen}
          onClose={() => setIsSidebarOpen(false)}
        />

        {/* Main Content Area (offset by 64px on lg for sidebar) */}
        <main className="flex-1 lg:pl-64 w-full min-w-0">
          {user.role === 'admin' && (
            <AdminDashboard
              activeTab={activeTab}
              onTabChange={tab => setActiveTab(tab)}
            />
          )}

          {user.role === 'driver' && (
            <DriverDashboard
              activeTab={activeTab}
              onTabChange={tab => setActiveTab(tab)}
            />
          )}

          {user.role === 'staff' && (
            <StaffDashboard
              activeTab={activeTab}
              onTabChange={tab => setActiveTab(tab)}
            />
          )}

          {user.role === 'student' && (
            <StudentDashboard
              activeTab={activeTab}
              onTabChange={tab => setActiveTab(tab)}
            />
          )}
        </main>
      </div>
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
