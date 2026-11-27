import React, { useEffect, useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Building2,
  KeyRound,
  MessageSquareCode,
  Phone,
  RefreshCw,
  ShieldCheck,
} from 'lucide-react';
import { MEDICORE_BRAND } from '../../assets/brand';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../hooks/useToast';
import { ApiClientError } from '../../services/api';
import { AuthMfaChallengeResponse, AuthUserProfile, OtpRequestResponse } from '../../types/auth';
import { Button } from '../../components/ui/Button';
import { Checkbox, TextInput } from '../../components/ui/FormControls';
import { ErrorState, OfficialLogoLoader } from '../../components/ui/FeedbackAndData';

const PHONE_REGEX = /^\+?[0-9\s()-]{8,20}$/;

const GoogleLogoIcon: React.FC<{ className?: string }> = ({ className = 'w-4 h-4' }) => (
  <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
    <path
      fill="#4285F4"
      d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17Z"
    />
    <path
      fill="#34A853"
      d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.11-6.72-4.96H1.29v3.14C3.26 21.3 7.31 24 12 24Z"
    />
    <path
      fill="#FBBC05"
      d="M5.28 14.24c-.24-.72-.38-1.49-.38-2.24s.14-1.52.38-2.24V6.62H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.38l3.99-3.14Z"
    />
    <path
      fill="#EA4335"
      d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.62l3.99 3.14c.95-2.85 3.6-4.96 6.72-4.96Z"
    />
  </svg>
);

export interface LoginPageProps {
  initialMode?: 'SIGN_IN' | 'SIGN_UP';
}

export const LoginPage: React.FC<LoginPageProps> = ({ initialMode = 'SIGN_IN' }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const {
    isAuthenticated,
    loading,
    authenticateWithGoogle,
    requestLoginOtp,
    verifyLoginOtp,
    verifyMfaLogin,
    logout,
    getDefaultDashboardPath,
  } = useAuth();
  const { showToast } = useToast();

  const [authTab, setAuthTab] = useState<'SIGN_IN' | 'SIGN_UP'>(initialMode);
  const [authMethod, setAuthMethod] = useState<'GOOGLE' | 'OTP'>('GOOGLE');

  const [selectedRole, setSelectedRole] = useState<string>('ANY');
  const [signupRole, setSignupRole] = useState<string>('DOCTOR');
  const [department, setDepartment] = useState<string>('');
  const [termsAccepted, setTermsAccepted] = useState<boolean>(true);

  const [phone, setPhone] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [otpStep, setOtpStep] = useState<'PHONE' | 'OTP'>('PHONE');
  const [otpMeta, setOtpMeta] = useState<OtpRequestResponse | null>(null);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  const [fieldErrors, setFieldErrors] = useState<{
    phone?: string;
    otpCode?: string;
    terms?: string;
  }>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [waitingPeriodText, setWaitingPeriodText] = useState<string | null>(null);

  const [mfaChallenge, setMfaChallenge] = useState<{
    mfaChallengeToken: string;
    previewUser: AuthMfaChallengeResponse['user'];
  } | null>(null);
  const [totpCode, setTotpCode] = useState('');
  const [totpError, setTotpError] = useState<string | undefined>(undefined);

  useEffect(() => {
    setAuthTab(initialMode);
  }, [initialMode]);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = window.setInterval(() => {
      setResendCooldown((prev) => (prev <= 1 ? 0 : prev - 1));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [resendCooldown]);

  if (loading) {
    return <OfficialLogoLoader message="Checking active MediCore session..." />;
  }

  if (isAuthenticated) {
    const stateFrom = (location.state as { from?: string } | null)?.from;
    const safeDestination =
      stateFrom &&
      stateFrom.startsWith('/') &&
      !stateFrom.startsWith('//') &&
      stateFrom !== '/login' &&
      stateFrom !== '/register' &&
      stateFrom !== '/unauthorized'
        ? stateFrom
        : getDefaultDashboardPath();
    return <Navigate to={safeDestination} replace />;
  }

  const completeRedirect = async (
    authenticatedProfile: AuthUserProfile,
    methodLabel: string,
    isNewAccount = false
  ) => {
    const allRoles = [
      ...(authenticatedProfile.globalRoles || []),
      ...(authenticatedProfile.activeRoles || []),
    ];
    const hasStaffOrAdminRole = allRoles.some((r) => r !== 'PATIENT');
    if (!hasStaffOrAdminRole) {
      await logout();
      setOtpStep('PHONE');
      setOtpCode('');
      setOtpMeta(null);
      setMfaChallenge(null);
      setServerError('This web console is restricted to clinicians and hospital administrators.');
      return;
    }

    const targetDashboard = getDefaultDashboardPath(authenticatedProfile);
    const stateFrom = (location.state as { from?: string } | null)?.from;
    const destination =
      stateFrom &&
      stateFrom.startsWith('/') &&
      !stateFrom.startsWith('//') &&
      stateFrom !== '/login' &&
      stateFrom !== '/register' &&
      stateFrom !== '/unauthorized'
        ? stateFrom
        : targetDashboard;

    showToast({
      title: isNewAccount
        ? `Account created, ${authenticatedProfile.fullName}`
        : `Welcome, ${authenticatedProfile.fullName}`,
      description: `Verified via ${methodLabel}. Redirecting to ${destination}`,
      variant: 'success',
    });

    navigate(destination, { replace: true });
  };

  const handleApiError = (err: unknown, fallbackMessage: string) => {
    if (err instanceof ApiClientError) {
      if (err.code === 'ACCOUNT_INACTIVE') {
        setServerError(
          'This account has been deactivated by a Hospital or Platform Administrator.'
        );
      } else if (err.code === 'GOOGLE_ACCOUNT_NOT_FOUND') {
        setServerError(err.message);
      } else if (
        err.code === 'ACCOUNT_LOGIN_LOCKED' ||
        err.code === 'IP_LOGIN_RATE_LIMIT_EXCEEDED'
      ) {
        const detailsObj =
          err.details && typeof err.details === 'object'
            ? (err.details as { waitingPeriodText?: string; waitingPeriodMinutes?: number })
            : null;
        const periodLabel =
          detailsObj?.waitingPeriodText ||
          (detailsObj?.waitingPeriodMinutes
            ? `${detailsObj.waitingPeriodMinutes} minutes`
            : '15 minutes');
        setWaitingPeriodText(periodLabel);
        setServerError(
          'Too many unsuccessful verification attempts. Please try again after the displayed waiting period.'
        );
      } else if (err.code === 'OTP_RESEND_COOLDOWN') {
        const detailsObj =
          err.details && typeof err.details === 'object'
            ? (err.details as { retryAfterSeconds?: number })
            : null;
        if (detailsObj?.retryAfterSeconds) {
          setResendCooldown(detailsObj.retryAfterSeconds);
        }
        setServerError(err.message);
      } else if (err.code === 'INVALID_OTP' || err.status === 401) {
        setServerError(
          'Authentication verification failed or expired. Please check and try again.'
        );
      } else {
        setServerError(err.message);
      }
      return;
    }

    const firebaseError = err as { code?: string; message?: string };
    if (firebaseError?.code === 'auth/popup-closed-by-user') {
      setServerError('Google sign-in popup was closed before completing authentication.');
    } else if (firebaseError?.code === 'auth/popup-blocked') {
      setServerError(
        'Popups are blocked by your browser. Please allow popups for this site to sign in with Google.'
      );
    } else if (firebaseError?.code === 'auth/unauthorized-domain') {
      setServerError(
        'This preview domain is not yet authorized in Firebase Authentication settings. Add the host in Firebase Console -> Authentication -> Settings -> Authorized domains.'
      );
    } else {
      setServerError(err instanceof Error ? err.message : fallbackMessage);
    }
  };

  const handleGoogleAuth = async (mode: 'SIGN_IN' | 'SIGN_UP') => {
    if (submitting) return;
    setServerError(null);
    setWaitingPeriodText(null);
    setFieldErrors({});

    if (mode === 'SIGN_UP' && !termsAccepted) {
      setFieldErrors({ terms: 'Please accept the Terms of Service and Privacy Policy to continue.' });
      return;
    }

    setSubmitting(true);
    try {
      const outcome = await authenticateWithGoogle({
        mode,
        role: mode === 'SIGN_UP' ? signupRole : selectedRole !== 'ANY' ? selectedRole : undefined,
        department: mode === 'SIGN_UP' ? department : undefined,
        termsAccepted: mode === 'SIGN_UP' ? termsAccepted : undefined,
      });

      if (outcome.mfaRequired) {
        setMfaChallenge({
          mfaChallengeToken: outcome.mfaChallengeToken,
          previewUser: outcome.previewUser,
        });
        setTotpCode('');
        setTotpError(undefined);
        return;
      }

      await completeRedirect(outcome.user, 'Google Account', Boolean(outcome.isNewAccount));
    } catch (err) {
      handleApiError(err, 'Unable to complete Google authentication. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRequestOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (submitting) return;

    setServerError(null);
    setWaitingPeriodText(null);
    const trimmedPhone = phone.trim();
    if (!trimmedPhone) {
      setFieldErrors({ phone: 'Registered mobile number is required.' });
      return;
    }
    if (!PHONE_REGEX.test(trimmedPhone)) {
      setFieldErrors({
        phone: 'Enter a valid mobile number with country code or 10 digits (e.g. +91 98765 43210).',
      });
      return;
    }
    setFieldErrors({});

    setSubmitting(true);
    try {
      const response = await requestLoginOtp({
        phone: trimmedPhone,
        role: selectedRole !== 'ANY' ? selectedRole : undefined,
      });
      setOtpMeta(response);
      setOtpStep('OTP');
      setOtpCode('');
      setResendCooldown(response.cooldownSeconds || 30);
      showToast({
        title: 'Verification OTP Sent',
        description: `A 6-digit code was sent to ${response.maskedPhone}.`,
        variant: 'info',
      });
    } catch (err) {
      handleApiError(err, 'Unable to request verification OTP. Please check server connectivity.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;

    setServerError(null);
    setWaitingPeriodText(null);
    const digitsOnly = otpCode.replace(/\D/g, '');
    if (digitsOnly.length !== 6) {
      setFieldErrors({ otpCode: 'Enter the 6-digit verification OTP sent to your mobile number.' });
      return;
    }
    setFieldErrors({});

    setSubmitting(true);
    try {
      const outcome = await verifyLoginOtp({
        phone: phone.trim(),
        otpCode: digitsOnly,
        rememberMe,
        role: selectedRole !== 'ANY' ? selectedRole : undefined,
      });

      if (outcome.mfaRequired) {
        setMfaChallenge({
          mfaChallengeToken: outcome.mfaChallengeToken,
          previewUser: outcome.previewUser,
        });
        setTotpCode('');
        setTotpError(undefined);
        return;
      }

      await completeRedirect(outcome.user, 'SMS OTP');
    } catch (err) {
      handleApiError(err, 'Unable to verify OTP right now. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleMfaSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting || !mfaChallenge) return;

    const cleanCode = totpCode.trim();
    if (cleanCode.length < 6) {
      setTotpError('Enter your 6-digit authenticator code or backup code (MC-XXXX-XXXX).');
      return;
    }

    setServerError(null);
    setTotpError(undefined);
    setSubmitting(true);
    try {
      const authenticatedProfile = await verifyMfaLogin({
        mfaChallengeToken: mfaChallenge.mfaChallengeToken,
        totpCode: cleanCode,
      });
      await completeRedirect(authenticatedProfile, 'Two-Factor Authentication');
    } catch (err) {
      handleApiError(err, 'Invalid or expired authenticator code. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-between bg-[#F4F7FB] dark:bg-[#0A1929] text-[#172B43] dark:text-slate-100 p-4 sm:p-6">
      {/* Top Bar */}
      <div className="max-w-6xl w-full mx-auto flex items-center justify-between gap-8">
        <div className="flex items-center gap-2.5 shrink-0">
          <img
            src={MEDICORE_BRAND.logoPath}
            alt={MEDICORE_BRAND.fullTitle}
            className="h-9 w-auto object-contain rounded-lg bg-white p-0.5 border border-slate-200 dark:border-slate-700"
          />
          <div>
            <span className="text-sm font-bold text-[#102F4D] dark:text-white font-display block leading-tight whitespace-nowrap">
              {MEDICORE_BRAND.name}
            </span>
            <span className="text-[11px] text-[#718096] dark:text-slate-400 block leading-tight whitespace-nowrap">
              {MEDICORE_BRAND.subtitle}
            </span>
          </div>
        </div>
      </div>

      {/* Centered Auth Card */}
      <div className="my-auto py-8 w-full max-w-md mx-auto space-y-4">
        <div className="bg-white dark:bg-[#10253E] border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl p-6 sm:p-8 space-y-5">
          <div className="flex flex-col items-center text-center space-y-2.5">
            <div className="p-3 rounded-2xl bg-white border border-slate-100 dark:border-slate-800 shadow-xs">
              <img
                src={MEDICORE_BRAND.logoPath}
                alt={MEDICORE_BRAND.fullTitle}
                className="h-20 sm:h-24 w-auto object-contain mx-auto"
              />
            </div>
            <div>
              <h1 className="text-xl font-bold text-[#102F4D] dark:text-white font-display tracking-tight">
                {mfaChallenge
                  ? 'Two-Factor Verification'
                  : authTab === 'SIGN_UP'
                    ? 'Create Staff Account'
                    : authMethod === 'OTP' && otpStep === 'OTP'
                      ? 'Enter Verification Code'
                      : 'Sign In to MediCore'}
              </h1>
              <p className="text-xs text-[#718096] dark:text-slate-400 mt-1">
                {mfaChallenge
                  ? 'Confirm sign-in using your authenticator app or recovery code'
                  : authTab === 'SIGN_UP'
                    ? 'Sign up instantly with your Google account for hospital access'
                    : authMethod === 'OTP' && otpStep === 'OTP'
                      ? `Enter the 6-digit SMS code sent to ${otpMeta?.maskedPhone || phone}`
                      : 'Google Sign-In & secure clinical access for Hospital Staff & Admins'}
              </p>
            </div>
          </div>

          {/* Sign In | Sign Up Segmented Switcher */}
          {!mfaChallenge && (
            <div
              role="tablist"
              aria-label="Authentication mode"
              className="grid grid-cols-2 gap-1 p-1 bg-slate-100 dark:bg-[#0A1929] rounded-xl border border-slate-200/80 dark:border-slate-800"
            >
              <button
                type="button"
                role="tab"
                aria-selected={authTab === 'SIGN_IN'}
                onClick={() => {
                  setAuthTab('SIGN_IN');
                  setServerError(null);
                  setFieldErrors({});
                }}
                className={`py-2 px-3 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap cursor-pointer ${
                  authTab === 'SIGN_IN'
                    ? 'bg-white dark:bg-[#10253E] text-[#102F4D] dark:text-white shadow-xs'
                    : 'text-[#718096] dark:text-slate-400 hover:text-[#172B43] dark:hover:text-slate-200'
                }`}
              >
                Sign In
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={authTab === 'SIGN_UP'}
                onClick={() => {
                  setAuthTab('SIGN_UP');
                  setAuthMethod('GOOGLE');
                  setServerError(null);
                  setFieldErrors({});
                }}
                className={`py-2 px-3 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap cursor-pointer ${
                  authTab === 'SIGN_UP'
                    ? 'bg-white dark:bg-[#10253E] text-[#102F4D] dark:text-white shadow-xs'
                    : 'text-[#718096] dark:text-slate-400 hover:text-[#172B43] dark:hover:text-slate-200'
                }`}
              >
                Sign Up
              </button>
            </div>
          )}

          {serverError && (
            <div className="space-y-2">
              <ErrorState title="Authentication Notice" message={serverError} />
              {waitingPeriodText && (
                <div className="flex items-center justify-between px-3.5 py-2.5 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 text-xs font-medium text-amber-800 dark:text-amber-300">
                  <span>Temporary security lockout waiting period:</span>
                  <span className="font-mono font-bold tabular-nums">{waitingPeriodText}</span>
                </div>
              )}
            </div>
          )}

          {mfaChallenge ? (
            <form onSubmit={handleMfaSubmit} noValidate className="space-y-4">
              <div className="rounded-xl border border-[#0866B2]/25 bg-[#0866B2]/5 p-3.5 space-y-1 text-xs">
                <p className="font-bold text-[#102F4D] dark:text-white flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-[#0866B2]" />
                  Authenticator Check Required
                </p>
                <p className="text-[#718096] dark:text-slate-300">
                  Signing in as{' '}
                  <span className="font-semibold text-[#172B43] dark:text-white">
                    {mfaChallenge.previewUser.fullName}
                  </span>{' '}
                  (
                  <span className="font-mono tabular-nums">
                    {mfaChallenge.previewUser.email || mfaChallenge.previewUser.phone || phone}
                  </span>
                  )
                </p>
              </div>

              <TextInput
                label="Authenticator Code or Backup Recovery Code"
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={16}
                placeholder="6-digit TOTP or MC-XXXX-XXXX"
                value={totpCode}
                onChange={(e) => {
                  setTotpCode(e.target.value);
                  if (totpError) setTotpError(undefined);
                }}
                error={totpError}
                leftIcon={<KeyRound className="w-4 h-4" />}
                className="font-mono tracking-widest tabular-nums"
                autoFocus
                required
              />

              <Button type="submit" variant="primary" size="lg" fullWidth loading={submitting}>
                {submitting ? 'Verifying Code...' : 'Verify & Sign In'}
              </Button>

              <button
                type="button"
                onClick={() => {
                  setMfaChallenge(null);
                  setTotpCode('');
                  setTotpError(undefined);
                  setServerError(null);
                }}
                className="w-full inline-flex items-center justify-center gap-1.5 text-xs font-semibold text-[#718096] hover:text-[#172B43] dark:hover:text-slate-200 py-1 cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                Back to Sign-In
              </button>
            </form>
          ) : authTab === 'SIGN_UP' ? (
            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-[#172B43] dark:text-slate-200">
                  Staff Role
                </label>
                <select
                  value={signupRole}
                  onChange={(e) => setSignupRole(e.target.value)}
                  aria-label="Staff Role"
                  className="w-full px-3 py-2 text-sm bg-white dark:bg-[#0A1929] border border-slate-200 dark:border-slate-700 rounded-lg text-[#172B43] dark:text-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0866B2]"
                >
                  <option value="DOCTOR">Doctor / Clinician</option>
                  <option value="NURSE">Nurse</option>
                  <option value="RECEPTIONIST">Receptionist</option>
                  <option value="PHARMACIST">Pharmacist</option>
                  <option value="LAB_TECHNICIAN">Laboratory Technician</option>
                  <option value="ACCOUNTANT">Hospital Accountant</option>
                </select>
              </div>

              <TextInput
                label="Department (Optional)"
                type="text"
                placeholder="e.g. Cardiology, Emergency, Pediatrics"
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                leftIcon={<Building2 className="w-4 h-4" />}
              />

              <div className="space-y-1">
                <Checkbox
                  label="I accept MediCore clinical data governance & HIPAA/DPDP terms"
                  checked={termsAccepted}
                  onChange={(e) => {
                    setTermsAccepted(e.target.checked);
                    if (fieldErrors.terms) {
                      setFieldErrors((prev) => ({ ...prev, terms: undefined }));
                    }
                  }}
                />
                {fieldErrors.terms && (
                  <p className="text-[11px] font-medium text-[#DC4C4C]">{fieldErrors.terms}</p>
                )}
              </div>

              <button
                type="button"
                disabled={submitting}
                onClick={() => void handleGoogleAuth('SIGN_UP')}
                className="w-full flex items-center justify-center gap-2.5 px-4 py-2.5 rounded-xl bg-white dark:bg-[#0A1929] border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-900 text-[#172B43] dark:text-white text-sm font-semibold shadow-xs transition-colors disabled:opacity-60 cursor-pointer whitespace-nowrap"
              >
                <GoogleLogoIcon className="w-4 h-4 shrink-0" />
                <span>{submitting ? 'Creating Account...' : 'Sign Up with Google'}</span>
              </button>
            </div>
          ) : authMethod === 'GOOGLE' ? (
            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-[#172B43] dark:text-slate-200">
                  Portal Role
                </label>
                <select
                  value={selectedRole}
                  onChange={(e) => setSelectedRole(e.target.value)}
                  aria-label="Portal Role"
                  className="w-full px-3 py-2 text-sm bg-white dark:bg-[#0A1929] border border-slate-200 dark:border-slate-700 rounded-lg text-[#172B43] dark:text-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0866B2]"
                >
                  <option value="ANY">Auto-Detect Registered Role</option>
                  <option value="DOCTOR">Doctor / Clinician</option>
                  <option value="NURSE">Nurse</option>
                  <option value="RECEPTIONIST">Receptionist</option>
                  <option value="PHARMACIST">Pharmacist</option>
                  <option value="LAB_TECHNICIAN">Laboratory Technician</option>
                  <option value="HOSPITAL_ADMIN">Hospital Administrator</option>
                  <option value="SUPER_ADMIN">Super Administrator</option>
                </select>
              </div>

              <button
                type="button"
                disabled={submitting}
                onClick={() => void handleGoogleAuth('SIGN_IN')}
                className="w-full flex items-center justify-center gap-2.5 px-4 py-2.5 rounded-xl bg-[#0866B2] hover:bg-[#075696] text-white text-sm font-semibold shadow-sm transition-colors disabled:opacity-60 cursor-pointer whitespace-nowrap"
              >
                <span className="p-1 rounded-full bg-white shrink-0">
                  <GoogleLogoIcon className="w-3.5 h-3.5" />
                </span>
                <span>{submitting ? 'Signing In...' : 'Sign In with Google'}</span>
              </button>

              <div className="relative py-1 flex items-center">
                <div className="flex-grow border-t border-slate-200 dark:border-slate-800" />
                <span className="mx-3 text-[11px] font-medium text-[#718096] dark:text-slate-400">
                  or
                </span>
                <div className="flex-grow border-t border-slate-200 dark:border-slate-800" />
              </div>

              <button
                type="button"
                onClick={() => {
                  setAuthMethod('OTP');
                  setOtpStep('PHONE');
                  setServerError(null);
                  setFieldErrors({});
                }}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-900 text-xs font-semibold text-[#172B43] dark:text-slate-200 transition-colors cursor-pointer whitespace-nowrap"
              >
                <Phone className="w-3.5 h-3.5 text-[#0866B2]" />
                <span>Sign in with Mobile OTP</span>
              </button>
            </div>
          ) : otpStep === 'PHONE' ? (
            <form onSubmit={handleRequestOtp} noValidate className="space-y-4">
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-[#172B43] dark:text-slate-200">
                  Portal Role
                </label>
                <select
                  value={selectedRole}
                  onChange={(e) => setSelectedRole(e.target.value)}
                  aria-label="Portal Role"
                  className="w-full px-3 py-2 text-sm bg-white dark:bg-[#0A1929] border border-slate-200 dark:border-slate-700 rounded-lg text-[#172B43] dark:text-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0866B2]"
                >
                  <option value="ANY">Auto-Detect Registered Role</option>
                  <option value="DOCTOR">Doctor / Clinician</option>
                  <option value="NURSE">Nurse</option>
                  <option value="RECEPTIONIST">Receptionist</option>
                  <option value="PHARMACIST">Pharmacist</option>
                  <option value="LAB_TECHNICIAN">Laboratory Technician</option>
                  <option value="HOSPITAL_ADMIN">Hospital Administrator</option>
                  <option value="SUPER_ADMIN">Super Administrator</option>
                </select>
              </div>

              <TextInput
                label="Registered Mobile Number"
                type="tel"
                name="phone"
                inputMode="tel"
                autoComplete="tel"
                placeholder="+91 98765 43210"
                value={phone}
                onChange={(e) => {
                  setPhone(e.target.value);
                  if (fieldErrors.phone) {
                    setFieldErrors((prev) => ({ ...prev, phone: undefined }));
                  }
                }}
                error={fieldErrors.phone}
                leftIcon={<Phone className="w-4 h-4" />}
                className="tabular-nums"
                required
              />

              <div className="flex items-center justify-between gap-2 pt-0.5">
                <Checkbox
                  label="Keep session active on this device"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                />
              </div>

              <Button type="submit" variant="primary" size="lg" fullWidth loading={submitting}>
                {submitting ? 'Sending OTP...' : 'Send 6-Digit OTP'}
              </Button>

              <button
                type="button"
                onClick={() => {
                  setAuthMethod('GOOGLE');
                  setServerError(null);
                  setFieldErrors({});
                }}
                className="w-full inline-flex items-center justify-center gap-1.5 text-xs font-semibold text-[#718096] hover:text-[#172B43] dark:hover:text-slate-200 py-1 cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                Back to Google Sign-In
              </button>
            </form>
          ) : (
            <form onSubmit={handleVerifyOtp} noValidate className="space-y-4">
              {otpMeta?.devOtpPreview && (
                <div className="rounded-xl border border-[#11A6A0]/30 bg-[#11A6A0]/8 px-3.5 py-2.5 text-xs flex items-center justify-between gap-3">
                  <div className="space-y-0.5">
                    <p className="font-semibold text-[#102F4D] dark:text-white">
                      Local Sandbox OTP
                    </p>
                    <p className="text-[11px] text-[#718096] dark:text-slate-300">
                      Development mode preview for {otpMeta.maskedPhone}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setOtpCode(otpMeta.devOtpPreview || '')}
                    className="font-mono text-base font-bold tracking-[0.2em] tabular-nums text-[#0866B2] dark:text-sky-300 px-2.5 py-1 rounded-md bg-white dark:bg-[#0A1929] border border-slate-200 dark:border-slate-700 hover:border-[#0866B2] cursor-pointer"
                    title="Click to autofill OTP"
                  >
                    {otpMeta.devOtpPreview}
                  </button>
                </div>
              )}

              <TextInput
                label="6-Digit SMS OTP"
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                placeholder="Enter 6-digit code"
                value={otpCode}
                onChange={(e) => {
                  const clean = e.target.value.replace(/\D/g, '').slice(0, 6);
                  setOtpCode(clean);
                  if (fieldErrors.otpCode) {
                    setFieldErrors((prev) => ({ ...prev, otpCode: undefined }));
                  }
                }}
                error={fieldErrors.otpCode}
                leftIcon={<MessageSquareCode className="w-4 h-4" />}
                className="font-mono text-base tracking-[0.3em] tabular-nums"
                autoFocus
                required
              />

              <div className="flex items-center justify-between text-xs pt-0.5">
                <button
                  type="button"
                  onClick={() => {
                    setOtpStep('PHONE');
                    setOtpCode('');
                    setOtpMeta(null);
                    setServerError(null);
                    setFieldErrors({});
                  }}
                  className="inline-flex items-center gap-1 font-semibold text-[#718096] hover:text-[#172B43] dark:hover:text-slate-200 cursor-pointer"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  Change number
                </button>

                <button
                  type="button"
                  disabled={resendCooldown > 0 || submitting}
                  onClick={() => void handleRequestOtp()}
                  className="inline-flex items-center gap-1.5 font-semibold text-[#0866B2] dark:text-sky-400 disabled:text-slate-400 disabled:cursor-not-allowed hover:underline cursor-pointer tabular-nums"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend OTP'}
                </button>
              </div>

              <Button type="submit" variant="primary" size="lg" fullWidth loading={submitting}>
                {submitting ? 'Verifying OTP...' : 'Verify OTP & Sign In'}
              </Button>
            </form>
          )}
        </div>
      </div>

      {/* Footer */}
      <footer className="text-center text-xs text-[#718096] dark:text-slate-400">
        {MEDICORE_BRAND.fullTitle} · HIPAA &amp; DPDP Act Compliant Healthcare Platform
      </footer>
    </div>
  );
};
