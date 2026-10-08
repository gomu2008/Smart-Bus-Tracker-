import React, { useState } from 'react';
import {
  Lock,
  Eye,
  EyeOff,
  KeyRound,
  ShieldCheck,
  AlertCircle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  RefreshCw,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface PasswordSettingSectionProps {
  className?: string;
  defaultOpen?: boolean;
}

export const PasswordSettingSection: React.FC<PasswordSettingSectionProps> = ({
  className = '',
  defaultOpen = false,
}) => {
  const { user, token } = useAuth();

  // Hide or Open Password Setting accordion state
  const [isOpen, setIsOpen] = useState<boolean>(defaultOpen);

  // Form states
  const [currentPass, setCurrentPass] = useState('');
  const [newPass, setNewPass] = useState('');
  const [confirmPass, setConfirmPass] = useState('');

  // Password visibility states (Hide or Open password text)
  const [showCurrentPass, setShowCurrentPass] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);
  const [showConfirmPass, setShowConfirmPass] = useState(false);

  // Submission & feedback states
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Password strength check
  const getPasswordStrength = (pass: string) => {
    if (!pass) return { score: 0, label: '', color: '' };
    let score = 0;
    if (pass.length >= 6) score++;
    if (pass.length >= 8) score++;
    if (/[A-Z]/.test(pass) && /[a-z]/.test(pass)) score++;
    if (/\d/.test(pass) || /[^A-Za-z0-9]/.test(pass)) score++;

    if (score <= 1) return { score: 1, label: 'Weak (min 6 chars)', color: 'bg-rose-500 text-rose-500' };
    if (score === 2) return { score: 2, label: 'Fair', color: 'bg-amber-500 text-amber-500' };
    if (score === 3) return { score: 3, label: 'Good', color: 'bg-blue-500 text-blue-500' };
    return { score: 4, label: 'Strong & Secure', color: 'bg-emerald-500 text-emerald-500' };
  };

  const strength = getPasswordStrength(newPass);

  // Suggested demo passwords if user is on a demo account
  const getDemoHint = () => {
    if (!user) return null;
    if (user.role === 'admin') return 'gomu2026 or Admin@123';
    if (user.role === 'student') return 'Student@123';
    if (user.role === 'staff') return 'Staff@123';
    if (user.role === 'driver') return 'Driver@123';
    return null;
  };

  const demoHint = getDemoHint();

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    // Front-end error validation
    if (!currentPass.trim()) {
      setErrorMsg('Please enter your current password to authorize this change.');
      return;
    }
    if (newPass.length < 6) {
      setErrorMsg('New password must be at least 6 characters long.');
      return;
    }
    if (newPass !== confirmPass) {
      setErrorMsg('New password and confirmation password do not match. Please verify both fields.');
      return;
    }
    if (currentPass === newPass) {
      setErrorMsg('Your new password must be different from your current password.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          currentPassword: currentPass,
          newPassword: newPass,
        }),
      });

      const data = await res.json();
      setLoading(false);

      if (res.ok) {
        setSuccessMsg(data.message || 'Password updated and saved successfully!');
        setErrorMsg(null);
        setCurrentPass('');
        setNewPass('');
        setConfirmPass('');
      } else {
        setErrorMsg(data.error || 'Failed to update password. Please check your current password.');
      }
    } catch {
      setLoading(false);
      setErrorMsg('Network error connecting to authentication service. Please check your connection.');
    }
  };

  return (
    <div
      className={`rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden transition-all ${className}`}
    >
      {/* Header bar with Open / Hide Password Setting toggle */}
      <div className="p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-50/50 dark:bg-slate-900/50 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-start sm:items-center gap-3.5">
          <div className="w-10 h-10 rounded-2xl bg-amber-500/10 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
            <Lock className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Password & Security Settings
              </h2>
              <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                <ShieldCheck className="w-3 h-3" />
                <span>Protected</span>
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {isOpen
                ? 'Password setting is OPEN. You can view, hide, or update your password below.'
                : 'Password setting is HIDDEN. Click "Open Password Setting" to change your password.'}
            </p>
          </div>
        </div>

        {/* The Open / Hide Password Setting Button */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              setIsOpen(!isOpen);
              setErrorMsg(null);
              setSuccessMsg(null);
            }}
            className={`w-full sm:w-auto px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 border shadow-sm ${
              isOpen
                ? 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-300 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700'
                : 'bg-amber-500 text-slate-950 border-amber-600 hover:bg-amber-400'
            }`}
          >
            {isOpen ? (
              <>
                <ChevronUp className="w-4 h-4" />
                <span>Hide Password Setting</span>
              </>
            ) : (
              <>
                <KeyRound className="w-4 h-4" />
                <span>Open Password Setting</span>
                <ChevronDown className="w-4 h-4 ml-0.5" />
              </>
            )}
          </button>
        </div>
      </div>

      {/* COLLAPSED SUMMARY VIEW (When setting is hidden) */}
      {!isOpen && (
        <div className="p-5 sm:p-6 text-xs text-slate-600 dark:text-slate-400 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <span className="font-mono text-slate-400 dark:text-slate-500 tracking-widest text-sm">
              ••••••••••••
            </span>
            <span className="text-[11px] text-slate-500">
              Encrypted credentials with secure bcrypt hashing
            </span>
          </div>
          <button
            type="button"
            onClick={() => setIsOpen(true)}
            className="text-amber-600 dark:text-amber-400 hover:underline font-bold text-xs inline-flex items-center gap-1"
          >
            <span>Click to open & change password</span>
            <span>→</span>
          </button>
        </div>
      )}

      {/* EXPANDED SETTINGS FORM (When setting is open) */}
      {isOpen && (
        <div className="p-5 sm:p-6 space-y-5 animate-in fade-in duration-200">
          {/* Quick Notice & Demo hint */}
          <div className="p-3.5 rounded-2xl bg-amber-500/5 dark:bg-amber-500/10 border border-amber-500/20 text-xs text-slate-700 dark:text-slate-300 flex items-start gap-2.5">
            <KeyRound className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="font-semibold text-slate-900 dark:text-white">
                Choose a strong password with at least 6 characters.
              </p>
              {demoHint && (
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Default initial password for this account:{' '}
                  <code className="px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-800 text-amber-700 dark:text-amber-300 font-mono font-bold">
                    {demoHint}
                  </code>
                </p>
              )}
            </div>
          </div>

          {/* Error Banner */}
          {errorMsg && (
            <div className="p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-rose-800 dark:text-rose-200 text-xs flex items-start gap-2.5 animate-in fade-in">
              <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
              <div className="flex-1">
                <span className="font-bold block">Password Error:</span>
                <span>{errorMsg}</span>
              </div>
            </div>
          )}

          {/* Success Banner */}
          {successMsg && (
            <div className="p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/60 text-emerald-800 dark:text-emerald-200 text-xs flex items-start gap-2.5 animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
              <div className="flex-1">
                <span className="font-bold block">Success:</span>
                <span>{successMsg}</span>
              </div>
            </div>
          )}

          <form onSubmit={handlePasswordSubmit} className="space-y-4 max-w-xl">
            {/* Field 1: Current Password */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                  Current Password <span className="text-rose-500">*</span>
                </label>
                <button
                  type="button"
                  onClick={() => setShowCurrentPass(!showCurrentPass)}
                  className="text-[11px] font-bold text-amber-600 dark:text-amber-400 hover:text-amber-700 flex items-center gap-1"
                >
                  {showCurrentPass ? (
                    <>
                      <EyeOff className="w-3.5 h-3.5" />
                      <span>Hide password</span>
                    </>
                  ) : (
                    <>
                      <Eye className="w-3.5 h-3.5" />
                      <span>Open (Show) password</span>
                    </>
                  )}
                </button>
              </div>
              <div className="relative">
                <input
                  type={showCurrentPass ? 'text' : 'password'}
                  required
                  value={currentPass}
                  onChange={e => setCurrentPass(e.target.value)}
                  placeholder="Enter your current password"
                  className="w-full px-3.5 py-2.5 pr-10 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-amber-500 font-mono"
                />
                <button
                  type="button"
                  onClick={() => setShowCurrentPass(!showCurrentPass)}
                  title={showCurrentPass ? 'Hide password' : 'Open / View password'}
                  className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                >
                  {showCurrentPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Field 2: New Password */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                  New Password <span className="text-rose-500">*</span>
                </label>
                <button
                  type="button"
                  onClick={() => setShowNewPass(!showNewPass)}
                  className="text-[11px] font-bold text-amber-600 dark:text-amber-400 hover:text-amber-700 flex items-center gap-1"
                >
                  {showNewPass ? (
                    <>
                      <EyeOff className="w-3.5 h-3.5" />
                      <span>Hide password</span>
                    </>
                  ) : (
                    <>
                      <Eye className="w-3.5 h-3.5" />
                      <span>Open (Show) password</span>
                    </>
                  )}
                </button>
              </div>
              <div className="relative">
                <input
                  type={showNewPass ? 'text' : 'password'}
                  required
                  value={newPass}
                  onChange={e => setNewPass(e.target.value)}
                  placeholder="Enter at least 6 characters"
                  className="w-full px-3.5 py-2.5 pr-10 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-amber-500 font-mono"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPass(!showNewPass)}
                  title={showNewPass ? 'Hide password' : 'Open / View password'}
                  className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                >
                  {showNewPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              {/* Password Strength Indicator */}
              {newPass.length > 0 && (
                <div className="mt-2 space-y-1">
                  <div className="flex items-center justify-between text-[10px]">
                    <span className="text-slate-500">Security Strength:</span>
                    <span className={`font-bold ${strength.color}`}>{strength.label}</span>
                  </div>
                  <div className="h-1.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden flex gap-0.5">
                    <div
                      className={`h-full transition-all rounded-full ${
                        strength.score >= 1 ? strength.color.split(' ')[0] : 'bg-transparent'
                      }`}
                      style={{ width: '25%' }}
                    />
                    <div
                      className={`h-full transition-all rounded-full ${
                        strength.score >= 2 ? strength.color.split(' ')[0] : 'bg-transparent'
                      }`}
                      style={{ width: '25%' }}
                    />
                    <div
                      className={`h-full transition-all rounded-full ${
                        strength.score >= 3 ? strength.color.split(' ')[0] : 'bg-transparent'
                      }`}
                      style={{ width: '25%' }}
                    />
                    <div
                      className={`h-full transition-all rounded-full ${
                        strength.score >= 4 ? strength.color.split(' ')[0] : 'bg-transparent'
                      }`}
                      style={{ width: '25%' }}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Field 3: Confirm New Password */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                  Confirm New Password <span className="text-rose-500">*</span>
                </label>
                <button
                  type="button"
                  onClick={() => setShowConfirmPass(!showConfirmPass)}
                  className="text-[11px] font-bold text-amber-600 dark:text-amber-400 hover:text-amber-700 flex items-center gap-1"
                >
                  {showConfirmPass ? (
                    <>
                      <EyeOff className="w-3.5 h-3.5" />
                      <span>Hide password</span>
                    </>
                  ) : (
                    <>
                      <Eye className="w-3.5 h-3.5" />
                      <span>Open (Show) password</span>
                    </>
                  )}
                </button>
              </div>
              <div className="relative">
                <input
                  type={showConfirmPass ? 'text' : 'password'}
                  required
                  value={confirmPass}
                  onChange={e => setConfirmPass(e.target.value)}
                  placeholder="Re-type your new password"
                  className="w-full px-3.5 py-2.5 pr-10 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-amber-500 font-mono"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPass(!showConfirmPass)}
                  title={showConfirmPass ? 'Hide password' : 'Open / View password'}
                  className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                >
                  {showConfirmPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              {confirmPass && (
                <div className="mt-1.5 text-[11px]">
                  {newPass === confirmPass ? (
                    <span className="text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Passwords match perfectly</span>
                    </span>
                  ) : (
                    <span className="text-rose-500 font-semibold flex items-center gap-1">
                      <AlertCircle className="w-3.5 h-3.5" />
                      <span>Passwords do not match yet</span>
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* Action buttons */}
            <div className="pt-2 flex flex-wrap items-center gap-3">
              <button
                type="submit"
                disabled={loading}
                className="py-2.5 px-6 rounded-xl bg-amber-500 text-slate-950 font-bold text-xs hover:bg-amber-400 transition-all shadow-md flex items-center gap-2 disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Saving New Password...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Save New Password</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => {
                  setCurrentPass('');
                  setNewPass('');
                  setConfirmPass('');
                  setErrorMsg(null);
                  setSuccessMsg(null);
                }}
                className="py-2.5 px-4 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs hover:bg-slate-200 dark:hover:bg-slate-700 transition-all border border-slate-200 dark:border-slate-700"
              >
                Clear
              </button>

              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="py-2.5 px-4 rounded-xl text-slate-500 dark:text-slate-400 font-semibold text-xs hover:text-slate-800 dark:hover:text-slate-200"
              >
                Hide Setting
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export default PasswordSettingSection;
