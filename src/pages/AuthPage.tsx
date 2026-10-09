import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { useLive } from '../context/LiveContext';
import { useTheme } from '../context/ThemeContext';
import { Logo } from '../components/Logo';
import { UserRole } from '../types';
import {
  Lock,
  Mail,
  User,
  BadgeAlert,
  ArrowRight,
  Shield,
  KeyRound,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Phone,
  Compass,
  GraduationCap,
  Briefcase,
  ShieldCheck,
  Building2,
  Eye,
  EyeOff,
} from 'lucide-react';

interface AuthPageProps {
  initialRole?: UserRole;
  onSuccess?: () => void;
  onBackToHome?: () => void;
}

export const AuthPage: React.FC<AuthPageProps> = ({ initialRole = 'student', onSuccess, onBackToHome }) => {
  const { login, register } = useAuth();
  const { showToast } = useToast();
  const { collegeName } = useLive();
  const { accentPreset } = useTheme();

  // Active portal tab: 'student' | 'admin' | 'staff' | 'driver'
  const [selectedPortal, setSelectedPortal] = useState<'student' | 'admin' | 'staff' | 'driver'>(
    initialRole === 'admin' ? 'admin' : initialRole === 'staff' ? 'staff' : initialRole === 'driver' ? 'driver' : 'student'
  );

  const [mode, setMode] = useState<'login' | 'signup' | 'forgot'>('login');
  const [loading, setLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Form Fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [collegeId, setCollegeId] = useState('');
  const [department, setDepartment] = useState('');
  const [phone, setPhone] = useState('');

  // Forgot password state
  const [forgotEmail, setForgotEmail] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [simulatedCode, setSimulatedCode] = useState<string | null>(null);
  const [forgotStep, setForgotStep] = useState<1 | 2>(1);

  // Password visibility (Open / Hide password text)
  const [showPassword, setShowPassword] = useState(false);
  const [showResetPassword, setShowResetPassword] = useState(false);

  // When switching portal tabs
  const handleSwitchPortal = (portal: 'student' | 'admin' | 'staff' | 'driver') => {
    setSelectedPortal(portal);
    setErrorMessage(null);
    setMode('login');

    if (portal === 'admin') {
      setEmail('');
      setPassword('');
    } else if (portal === 'student') {
      setEmail('student.aarav@college.edu');
      setPassword('Student@123');
    } else if (portal === 'staff') {
      setEmail('staff.ramanathan@college.edu');
      setPassword('Staff@123');
    } else if (portal === 'driver') {
      setEmail('driver.rajesh@college.edu');
      setPassword('Driver@123');
    }
  };

  // Initialize portal fields on mount
  useEffect(() => {
    handleSwitchPortal(selectedPortal);
  }, []);

  // 1-Click Demo Accounts
  const handleQuickLogin = async (demoEmail: string, demoPass: string) => {
    setEmail(demoEmail);
    setPassword(demoPass);
    setLoading(true);
    setErrorMessage(null);

    const res = await login(demoEmail, demoPass);
    setLoading(false);
    if (res.success) {
      showToast(`Welcome back, ${res.user?.name}!`, 'success');
      if (onSuccess) onSuccess();
    } else {
      setErrorMessage(res.error || 'Failed to sign in.');
    }
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setErrorMessage('Please enter both email and password.');
      return;
    }

    setLoading(true);
    setErrorMessage(null);
    const res = await login(email, password);
    setLoading(false);

    if (res.success) {
      showToast(`Signed in successfully as ${res.user?.name}`, 'success');
      if (onSuccess) onSuccess();
    } else {
      setErrorMessage(res.error || 'Sign in failed. Please verify your credentials.');
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email || !password || !collegeId) {
      setErrorMessage('Please fill in all required fields.');
      return;
    }

    if (password.length < 6) {
      setErrorMessage('Password must be at least 6 characters.');
      return;
    }

    setLoading(true);
    setErrorMessage(null);

    const res = await register({
      name,
      email,
      password,
      role: selectedPortal === 'staff' ? 'staff' : selectedPortal === 'driver' ? 'driver' : 'student',
      collegeId,
      department: selectedPortal === 'staff' ? department || 'Engineering Department' : undefined,
      phone,
    });
    setLoading(false);

    if (res.success) {
      showToast(res.message || 'Registration completed!', 'success');
      if (onSuccess) onSuccess();
    } else {
      setErrorMessage(res.error || 'Registration failed.');
    }
  };

  const handleForgotRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotEmail) {
      setErrorMessage('Please enter your registered email address.');
      return;
    }

    setLoading(true);
    setErrorMessage(null);
    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: forgotEmail }),
      });
      const data = await res.json();
      setLoading(false);

      if (data.simulatedCode) {
        setSimulatedCode(data.simulatedCode);
        setResetToken(data.simulatedCode);
        setForgotStep(2);
        showToast('Verification code generated!', 'info');
      }
    } catch {
      setLoading(false);
      setErrorMessage('Failed to send verification code.');
    }
  };

  const handleResetSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetToken || !newPassword) {
      setErrorMessage('Please enter the 6-digit code and a new password.');
      return;
    }

    if (newPassword.length < 6) {
      setErrorMessage('Password must be at least 6 characters.');
      return;
    }

    setLoading(true);
    setErrorMessage(null);
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: forgotEmail,
          token: resetToken,
          newPassword,
        }),
      });
      const data = await res.json();
      setLoading(false);

      if (res.ok) {
        showToast('Password reset successfully. You can now log in.', 'success');
        setMode('login');
        setEmail(forgotEmail);
        setPassword(newPassword);
      } else {
        setErrorMessage(data.error || 'Failed to reset password.');
      }
    } catch {
      setLoading(false);
      setErrorMessage('Network error resetting password.');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col justify-center py-10 px-4 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-xl">
        
        {/* Back Link & Brand */}
        <div className="flex items-center justify-between mb-3">
          {onBackToHome && (
            <button
              onClick={onBackToHome}
              className="text-xs font-semibold text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors"
            >
              ← Back to portal
            </button>
          )}
        </div>

        <div className="flex flex-col items-center text-center">
          <div className="mb-2">
            <Logo size="lg" variant="full" />
          </div>
          <p className="mt-1 text-xs font-bold" style={{ color: accentPreset.colorHex }}>
            {collegeName || 'Tirunelveli Engineering College (TEC)'}
          </p>
          <p className="text-[11px] text-slate-500 dark:text-slate-400">
            Tamil Nadu Campus Transit & Real-Time Tracking Network
          </p>
        </div>

        {/* ROLE-SPECIFIC SEPARATE LOGIN GATEWAY SELECTOR */}
        <div className="mt-6 p-1.5 rounded-2xl bg-slate-200/80 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 grid grid-cols-2 sm:grid-cols-4 gap-1 shadow-inner">
          {/* Student Portal */}
          <button
            type="button"
            onClick={() => handleSwitchPortal('student')}
            className={`py-2 px-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
              selectedPortal === 'student'
                ? 'bg-white dark:bg-slate-900 text-slate-950 dark:text-white shadow-md border border-slate-200 dark:border-slate-700'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-950 dark:hover:text-white'
            }`}
          >
            <GraduationCap className="w-3.5 h-3.5 text-amber-500" />
            <span>Students</span>
          </button>

          {/* Admin Portal */}
          <button
            type="button"
            onClick={() => handleSwitchPortal('admin')}
            className={`py-2 px-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
              selectedPortal === 'admin'
                ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/30'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-950 dark:hover:text-white'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Admin</span>
          </button>

          {/* Staff Portal */}
          <button
            type="button"
            onClick={() => handleSwitchPortal('staff')}
            className={`py-2 px-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
              selectedPortal === 'staff'
                ? 'bg-white dark:bg-slate-900 text-teal-700 dark:text-teal-300 shadow-md border border-slate-200 dark:border-slate-700'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-950 dark:hover:text-white'
            }`}
          >
            <Briefcase className="w-3.5 h-3.5 text-teal-500" />
            <span>Staff</span>
          </button>

          {/* Driver Portal */}
          <button
            type="button"
            onClick={() => handleSwitchPortal('driver')}
            className={`py-2 px-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
              selectedPortal === 'driver'
                ? 'bg-white dark:bg-slate-900 text-blue-700 dark:text-blue-300 shadow-md border border-slate-200 dark:border-slate-700'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-950 dark:hover:text-white'
            }`}
          >
            <Compass className="w-3.5 h-3.5 text-blue-500" />
            <span>Drivers</span>
          </button>
        </div>
      </div>

      <div className="mt-4 sm:mx-auto sm:w-full sm:max-w-xl">
        <div className="bg-white dark:bg-slate-900 py-7 px-5 sm:px-8 shadow-xl border border-slate-200 dark:border-slate-800 rounded-3xl">
          
          {/* Header of Active Gateway */}
          <div className="mb-5 pb-3 border-b border-slate-100 dark:border-slate-800">
            {selectedPortal === 'admin' ? (
              <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-900 dark:text-amber-200 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-black text-xs uppercase tracking-wider flex items-center gap-1.5 text-amber-700 dark:text-amber-400">
                    <ShieldCheck className="w-4 h-4" />
                    <span>Transport Administrator Gateway</span>
                  </span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-500 text-slate-950">
                    Admin Only
                  </span>
                </div>
                <p className="text-xs leading-relaxed text-slate-700 dark:text-slate-300">
                  <b>Changes handle only admin:</b> Route management, Tirunelveli bus stop placement, fleet vehicle inspections, and driver approvals can strictly be performed only by authorized Administrators.
                </p>
                <p className="text-[11px] text-amber-700 dark:text-amber-400 pt-1 font-semibold flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-amber-500" />
                  <span>Secure administrative authentication required for master access.</span>
                </p>
              </div>
            ) : selectedPortal === 'student' ? (
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <GraduationCap className="w-4 h-4 text-amber-500" />
                  <span>Student Transit Login</span>
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Track campus shuttles, view live ETAs, and save favorite stops in Tirunelveli
                </p>
              </div>
            ) : selectedPortal === 'staff' ? (
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Briefcase className="w-4 h-4 text-teal-500" />
                  <span>Faculty & Staff Commuter Portal</span>
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Faculty priority seating reservation, department routes, and schedule bulletins
                </p>
              </div>
            ) : (
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Compass className="w-4 h-4 text-blue-500" />
                  <span>Driver GPS Telemetry Console</span>
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Start trips, broadcast live GPS location, and submit pre-trip brake & tyre inspections
                </p>
              </div>
            )}
          </div>

          {/* Mode Switcher Tabs (Sign In vs Create Account) */}
          {selectedPortal !== 'admin' && mode !== 'forgot' && (
            <div className="flex rounded-xl bg-slate-100 dark:bg-slate-800 p-1 mb-5">
              <button
                type="button"
                onClick={() => {
                  setMode('login');
                  setErrorMessage(null);
                }}
                className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
                  mode === 'login'
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => {
                  setMode('signup');
                  setErrorMessage(null);
                }}
                className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
                  mode === 'signup'
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                Create {selectedPortal === 'staff' ? 'Staff' : selectedPortal === 'driver' ? 'Driver' : 'Student'} Account
              </button>
            </div>
          )}

          {/* Error Banner */}
          {errorMessage && (
            <div className="mb-4 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900 text-rose-800 dark:text-rose-200 text-xs flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* LOGIN FORM */}
          {mode === 'login' && (
            <form onSubmit={handleLoginSubmit} className="space-y-4" autoComplete="off">
              {selectedPortal === 'admin' && (email || password) && (
                <div className="flex items-center justify-end">
                  <button
                    type="button"
                    onClick={() => {
                      setEmail('');
                      setPassword('');
                      setErrorMessage(null);
                    }}
                    className="text-xs font-bold text-rose-500 hover:text-rose-600 dark:hover:text-rose-400 hover:underline flex items-center gap-1"
                  >
                    <span>✕ Clear Gmail & Password</span>
                  </button>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  {selectedPortal === 'admin' ? 'Admin Gmail / Email Address' : 'Email Address'}
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder={selectedPortal === 'admin' ? '' : 'student.aarav@college.edu'}
                    autoComplete="off"
                    className="w-full pl-9 pr-3 py-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                    Password
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setMode('forgot');
                      setForgotEmail(email);
                      setErrorMessage(null);
                    }}
                    className="text-[11px] font-semibold text-amber-600 dark:text-amber-400 hover:underline"
                  >
                    Forgot password?
                  </button>
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder={selectedPortal === 'admin' ? '' : '••••••••'}
                    autoComplete="new-password"
                    className="w-full pl-9 pr-10 py-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500 font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    title={showPassword ? 'Hide password' : 'Open / View password'}
                    className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className={`w-full py-2.5 px-4 rounded-xl font-bold text-xs shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-50 ${
                  selectedPortal === 'admin'
                    ? 'bg-amber-500 text-slate-950 hover:bg-amber-400 shadow-amber-500/25'
                    : selectedPortal === 'staff'
                    ? 'bg-teal-600 text-white hover:bg-teal-500 shadow-teal-600/25'
                    : 'bg-amber-500 text-slate-950 hover:bg-amber-400 shadow-amber-500/25'
                }`}
              >
                {loading
                  ? 'Authenticating...'
                  : selectedPortal === 'admin'
                  ? 'Sign In as Administrator'
                  : 'Sign In to Dashboard'}
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          )}

          {/* SIGNUP FORM */}
          {mode === 'signup' && (
            <form onSubmit={handleRegisterSubmit} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Full Name
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={e => setName(e.target.value)}
                    placeholder="e.g. John Doe"
                    className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-500 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="user@college.edu"
                    className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-500 outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    {selectedPortal === 'staff' ? 'Staff Employee ID' : selectedPortal === 'driver' ? 'Driver Badge ID' : 'Student Roll / College ID'}
                  </label>
                  <input
                    type="text"
                    required
                    value={collegeId}
                    onChange={e => setCollegeId(e.target.value)}
                    placeholder={selectedPortal === 'staff' ? 'STF-2024-105' : selectedPortal === 'driver' ? 'DRV-3001' : 'STU-2024-501'}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={e => setPhone(e.target.value)}
                    placeholder="+91 94431 00000"
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-500 outline-none"
                  />
                </div>
              </div>

              {selectedPortal === 'staff' && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Academic / Administrative Department
                  </label>
                  <div className="relative">
                    <Building2 className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                    <input
                      type="text"
                      required
                      value={department}
                      onChange={e => setDepartment(e.target.value)}
                      placeholder="e.g. Computer Science & Engineering"
                      className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-500 outline-none"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Create Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-9 pr-10 py-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-500 outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    title={showPassword ? 'Hide password' : 'Open / View password'}
                    className="absolute right-3 top-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 px-4 rounded-xl bg-amber-500 text-slate-950 font-bold text-xs shadow-md shadow-amber-500/25 hover:bg-amber-400 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {loading ? 'Registering...' : 'Complete Registration'}
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          )}

          {/* FORGOT PASSWORD FORM */}
          {mode === 'forgot' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
                <h3 className="font-bold text-sm text-slate-900 dark:text-white">Reset Password</h3>
                <button
                  onClick={() => {
                    setMode('login');
                    setSimulatedCode(null);
                    setForgotStep(1);
                  }}
                  className="text-xs text-slate-500 hover:text-slate-900 dark:hover:text-white font-semibold"
                >
                  Back to Sign In
                </button>
              </div>

              {forgotStep === 1 ? (
                <form onSubmit={handleForgotRequest} className="space-y-3.5">
                  <p className="text-xs text-slate-600 dark:text-slate-400">
                    Enter your college registered email to generate a password reset verification code.
                  </p>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Registered Email
                    </label>
                    <input
                      type="email"
                      required
                      value={forgotEmail}
                      onChange={e => setForgotEmail(e.target.value)}
                      placeholder="e.g. student.aarav@college.edu"
                      className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-500 outline-none"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-2.5 rounded-xl bg-amber-500 text-slate-950 font-bold text-xs shadow-md hover:bg-amber-400"
                  >
                    {loading ? 'Generating Code...' : 'Send Verification Code'}
                  </button>
                </form>
              ) : (
                <form onSubmit={handleResetSubmit} className="space-y-3.5">
                  {simulatedCode && (
                    <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-xs">
                      <span className="font-bold text-amber-800 dark:text-amber-300 block">
                        🔑 Simulated Verification Code:
                      </span>
                      <span className="font-mono text-base font-black tracking-widest text-amber-600 dark:text-amber-400">
                        {simulatedCode}
                      </span>
                    </div>
                  )}

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      6-Digit Code
                    </label>
                    <input
                      type="text"
                      required
                      value={resetToken}
                      onChange={e => setResetToken(e.target.value)}
                      placeholder="748291"
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono font-bold text-slate-900 dark:text-white outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      New Password
                    </label>
                    <div className="relative">
                      <input
                        type={showResetPassword ? 'text' : 'password'}
                        required
                        value={newPassword}
                        onChange={e => setNewPassword(e.target.value)}
                        placeholder="At least 6 characters"
                        className="w-full px-3 py-2 pr-10 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => setShowResetPassword(!showResetPassword)}
                        title={showResetPassword ? 'Hide password' : 'Open / View password'}
                        className="absolute right-3 top-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                      >
                        {showResetPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md"
                  >
                    {loading ? 'Updating Password...' : 'Save New Password & Sign In'}
                  </button>
                </form>
              )}
            </div>
          )}

          {/* 1-CLICK DEMO ACCOUNTS BOX */}
          <div className="mt-8 pt-5 border-t border-slate-200 dark:border-slate-800">
            <div className="flex items-center gap-1.5 mb-2">
              <KeyRound className="w-3.5 h-3.5 text-amber-500" />
              <span className="text-xs font-bold text-slate-900 dark:text-white">
                1-Click Quick Demo Credentials
              </span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mb-3">
              Click any portal badge to autofill verified login credentials and enter immediately:
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-left">

              {/* Student */}
              <button
                type="button"
                onClick={() => {
                  setSelectedPortal('student');
                  handleQuickLogin('student.aarav@college.edu', 'Student@123');
                }}
                className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors group"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1">
                    <GraduationCap className="w-3.5 h-3.5 text-amber-500" />
                    <span>🎓 Student (Aarav)</span>
                  </span>
                  <span className="text-[9px] text-amber-500 font-mono">1-click</span>
                </div>
                <div className="text-[11px] text-slate-600 dark:text-slate-300 font-mono mt-1 truncate">
                  student.aarav@college.edu
                </div>
                <div className="text-[10px] text-slate-500">
                  Password: Student@123
                </div>
              </button>

              {/* Staff / Faculty */}
              <button
                type="button"
                onClick={() => {
                  setSelectedPortal('staff');
                  handleQuickLogin('staff.ramanathan@college.edu', 'Staff@123');
                }}
                className="p-2.5 rounded-xl border border-teal-200 dark:border-teal-900/60 bg-teal-50/60 dark:bg-teal-950/30 hover:bg-teal-100 dark:hover:bg-teal-950/60 transition-colors group"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-teal-800 dark:text-teal-200 flex items-center gap-1">
                    <Briefcase className="w-3.5 h-3.5 text-teal-600" />
                    <span>👨‍🏫 Staff (Ramanathan)</span>
                  </span>
                  <span className="text-[9px] text-teal-600 font-mono">1-click</span>
                </div>
                <div className="text-[11px] text-slate-600 dark:text-slate-300 font-mono mt-1 truncate">
                  staff.ramanathan@college.edu
                </div>
                <div className="text-[10px] text-slate-500">
                  Password: Staff@123
                </div>
              </button>

              {/* Driver */}
              <button
                type="button"
                onClick={() => {
                  setSelectedPortal('driver');
                  handleQuickLogin('driver.rajesh@college.edu', 'Driver@123');
                }}
                className="p-2.5 rounded-xl border border-blue-200 dark:border-blue-900/60 bg-blue-50/60 dark:bg-blue-950/30 hover:bg-blue-100 dark:hover:bg-blue-950/60 transition-colors group"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-blue-800 dark:text-blue-200 flex items-center gap-1">
                    <Compass className="w-3.5 h-3.5 text-blue-500" />
                    <span>🚌 Driver (Rajesh)</span>
                  </span>
                  <span className="text-[9px] text-blue-500 font-mono">1-click</span>
                </div>
                <div className="text-[11px] text-slate-600 dark:text-slate-300 font-mono mt-1 truncate">
                  driver.rajesh@college.edu
                </div>
                <div className="text-[10px] text-slate-500">
                  Password: Driver@123
                </div>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
