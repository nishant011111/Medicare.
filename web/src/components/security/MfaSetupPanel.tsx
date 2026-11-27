import React, { useCallback, useEffect, useState } from 'react';
import QRCode from 'qrcode';
import {
  Check,
  Copy,
  Download,
  KeyRound,
  Lock,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
  Smartphone,
} from 'lucide-react';
import { apiRequest, ApiClientError } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../hooks/useToast';
import { MfaSetupResponse, MfaStatusResponse } from '../../types/auth';
import { Button } from '../ui/Button';
import { TextInput } from '../ui/FormControls';
import { Card, ErrorState, StatusBadge } from '../ui/FeedbackAndData';
import { formatDateTime } from '../../utils/format';

export const MfaSetupPanel: React.FC = () => {
  const { user, primaryRole, refreshSession } = useAuth();
  const { showToast } = useToast();

  const [status, setStatus] = useState<MfaStatusResponse | null>(null);
  const [loadingStatus, setLoadingStatus] = useState(true);
  const [setupData, setSetupData] = useState<MfaSetupResponse | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);

  const [totpCode, setTotpCode] = useState('');
  const [disableCode, setDisableCode] = useState('');
  const [showDisablePrompt, setShowDisablePrompt] = useState(false);

  const [busyAction, setBusyAction] = useState<'setup' | 'verify' | 'disable' | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState(false);
  const [copiedCodes, setCopiedCodes] = useState(false);

  const loadMfaStatus = useCallback(async () => {
    setLoadingStatus(true);
    try {
      const res = await apiRequest<{ data: MfaStatusResponse }>('/security/mfa/status');
      setStatus(res.data);
    } catch (err) {
      if (err instanceof ApiClientError) {
        setErrorMsg(err.message);
      }
    } finally {
      setLoadingStatus(false);
    }
  }, []);

  useEffect(() => {
    void loadMfaStatus();
  }, [loadMfaStatus]);

  useEffect(() => {
    let active = true;
    if (!setupData?.otpauthUrl) {
      setQrDataUrl(null);
      return;
    }
    QRCode.toDataURL(setupData.otpauthUrl, {
      width: 200,
      margin: 2,
      color: {
        dark: '#102F4D',
        light: '#FFFFFF',
      },
    })
      .then((url) => {
        if (active) setQrDataUrl(url);
      })
      .catch(() => {
        if (active) setQrDataUrl(null);
      });
    return () => {
      active = false;
    };
  }, [setupData?.otpauthUrl]);

  const isPrivilegedRole =
    status?.isPrivilegedRole ??
    ['SUPER_ADMIN', 'HOSPITAL_ADMIN', 'DOCTOR'].includes(primaryRole || '');

  const handleStartSetup = async () => {
    setErrorMsg(null);
    setBusyAction('setup');
    try {
      const res = await apiRequest<{ data: MfaSetupResponse }>('/security/mfa/setup', {
        method: 'POST',
      });
      setSetupData(res.data);
      setTotpCode('');
      await loadMfaStatus();
    } catch (err) {
      setErrorMsg(
        err instanceof ApiClientError ? err.message : 'Unable to initialize TOTP MFA setup.'
      );
    } finally {
      setBusyAction(null);
    }
  };

  const handleVerifyAndEnable = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!totpCode.trim()) {
      setErrorMsg('Enter the 6-digit code from your authenticator app or a backup code.');
      return;
    }
    setErrorMsg(null);
    setBusyAction('verify');
    try {
      await apiRequest('/security/mfa/verify', {
        method: 'POST',
        body: JSON.stringify({ totpCode: totpCode.trim() }),
      });
      setSetupData(null);
      setQrDataUrl(null);
      setTotpCode('');
      await loadMfaStatus();
      await refreshSession();
      showToast({
        title: 'Two-Factor Authentication Enabled',
        description: 'TOTP verification is now active for your MediCore sign-in sessions.',
        variant: 'success',
      });
    } catch (err) {
      setErrorMsg(
        err instanceof ApiClientError
          ? err.message
          : 'Invalid 6-digit verification code. Check your authenticator clock and try again.'
      );
    } finally {
      setBusyAction(null);
    }
  };

  const handleDisableMfa = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!disableCode.trim()) {
      setErrorMsg('Enter a valid 6-digit TOTP or backup code to disable MFA.');
      return;
    }
    setErrorMsg(null);
    setBusyAction('disable');
    try {
      await apiRequest('/security/mfa/disable', {
        method: 'POST',
        body: JSON.stringify({ totpCode: disableCode.trim() }),
      });
      setDisableCode('');
      setShowDisablePrompt(false);
      await loadMfaStatus();
      await refreshSession();
      showToast({
        title: 'Two-Factor Authentication Disabled',
        description: 'MFA has been removed from your account.',
        variant: 'warning',
      });
    } catch (err) {
      setErrorMsg(
        err instanceof ApiClientError ? err.message : 'Unable to verify code to disable MFA.'
      );
    } finally {
      setBusyAction(null);
    }
  };

  const handleCopySecret = async () => {
    if (!setupData?.secretPreview) return;
    try {
      await navigator.clipboard.writeText(setupData.secretPreview);
      setCopiedKey(true);
      setTimeout(() => setCopiedKey(false), 2000);
    } catch {
      // Clipboard API unavailable
    }
  };

  const handleCopyBackupCodes = async () => {
    if (!setupData?.backupCodes?.length) return;
    try {
      await navigator.clipboard.writeText(setupData.backupCodes.join('\n'));
      setCopiedCodes(true);
      setTimeout(() => setCopiedCodes(false), 2000);
    } catch {
      // Clipboard API unavailable
    }
  };

  const handleDownloadBackupCodes = () => {
    if (!setupData?.backupCodes?.length) return;
    const content = [
      'MediCore Enterprise Healthcare Platform — MFA Backup Recovery Codes',
      `Account: ${user?.email || ''}`,
      `Generated: ${new Date().toISOString()}`,
      '',
      'Store these single-use recovery codes in a secure password manager.',
      'Each code can be used once if you lose access to your TOTP authenticator device:',
      '',
      ...setupData.backupCodes.map((c, i) => `${i + 1}. ${c}`),
    ].join('\n');

    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'medicore-mfa-backup-codes.txt';
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Card
      title="Multi-Factor Authentication (TOTP)"
      subtitle="RFC 6238 authenticator-app verification for Administrative & Doctor accounts"
      headerRight={
        loadingStatus ? (
          <span className="text-xs text-[#718096]">Checking status...</span>
        ) : (
          <StatusBadge
            label={status?.mfaEnabled ? 'MFA Active' : 'MFA Inactive'}
            variant={status?.mfaEnabled ? 'success' : isPrivilegedRole ? 'warning' : 'neutral'}
          />
        )
      }
    >
      <div className="space-y-5">
        {errorMsg && <ErrorState title="MFA Configuration Error" message={errorMsg} />}

        {/* Privileged Role Policy Notice */}
        <div
          className={`flex items-start gap-3 rounded-xl border p-3.5 text-xs ${
            status?.mfaEnabled
              ? 'border-[#16A36A]/30 bg-[#16A36A]/5 text-[#172B43] dark:text-slate-200'
              : isPrivilegedRole
              ? 'border-[#E9A23B]/40 bg-[#E9A23B]/10 text-[#172B43] dark:text-slate-200'
              : 'border-slate-200 dark:border-slate-800 bg-[#F4F7FB]/60 dark:bg-slate-900/50 text-[#718096] dark:text-slate-300'
          }`}
        >
          {status?.mfaEnabled ? (
            <ShieldCheck className="w-4 h-4 text-[#16A36A] shrink-0 mt-0.5" />
          ) : (
            <ShieldAlert
              className={`w-4 h-4 shrink-0 mt-0.5 ${
                isPrivilegedRole ? 'text-[#E9A23B]' : 'text-[#0866B2]'
              }`}
            />
          )}
          <div className="space-y-1">
            <p className="font-semibold text-[#172B43] dark:text-slate-100">
              {status?.mfaEnabled
                ? 'Account protected by TOTP Multi-Factor Authentication'
                : isPrivilegedRole
                ? `Recommended Security Policy for ${primaryRole?.replace('_', ' ')} Accounts`
                : 'Optional TOTP Two-Factor Protection'}
            </p>
            <p className="text-[11px] text-[#718096] dark:text-slate-400 leading-relaxed">
              {status?.mfaEnabled
                ? `Every login requires a 6-digit code from your authenticator app or one of your ${
                    status.backupCodesRemaining
                  } remaining recovery codes.`
                : 'Super Administrators, Hospital Administrators, and Attending Doctors handle sensitive tenant governance and clinical PHI. Pair Google Authenticator, Microsoft Authenticator, or Authy to require a rotating 6-digit TOTP code on sign-in.'}
            </p>
            {status?.enabledAt && (
              <p className="text-[11px] font-mono tabular-nums text-[#718096] dark:text-slate-400">
                Enabled on {formatDateTime(status.enabledAt)}
              </p>
            )}
          </div>
        </div>

        {/* Active Setup Wizard (Steps 1 -> 2 -> 3) */}
        {setupData ? (
          <div className="space-y-5 pt-1">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 items-start">
              {/* Step 1: QR Code & Manual Key */}
              <div className="rounded-xl border border-slate-200 dark:border-slate-800 p-4 space-y-3 bg-white dark:bg-slate-950/40">
                <div className="flex items-center gap-2 text-xs font-bold text-[#102F4D] dark:text-white">
                  <Smartphone className="w-4 h-4 text-[#0866B2]" />
                  <span>01. Scan QR Code in Authenticator App</span>
                </div>
                <p className="text-[11px] text-[#718096] dark:text-slate-400 leading-relaxed">
                  Open Google Authenticator, Microsoft Authenticator, or Authy and scan this QR code.
                </p>
                <div className="flex justify-center py-2">
                  {qrDataUrl ? (
                    <div className="p-2.5 bg-white rounded-xl border border-slate-200 inline-block">
                      <img
                        src={qrDataUrl}
                        alt="MediCore TOTP Authenticator QR Code"
                        className="w-44 h-44 object-contain"
                      />
                    </div>
                  ) : (
                    <div className="w-44 h-44 flex items-center justify-center rounded-xl border border-dashed border-slate-300 text-xs text-[#718096]">
                      Generating QR...
                    </div>
                  )}
                </div>

                <div className="space-y-1.5">
                  <span className="block text-[11px] font-semibold text-[#718096] dark:text-slate-400">
                    Or enter Base32 secret manually:
                  </span>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 px-2.5 py-1.5 rounded-lg bg-[#F4F7FB] dark:bg-slate-900 border border-slate-200 dark:border-slate-800 font-mono text-[11px] tracking-wider text-[#172B43] dark:text-slate-200 break-all">
                      {setupData.secretPreview}
                    </code>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleCopySecret}
                      leftIcon={copiedKey ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    >
                      {copiedKey ? 'Copied' : 'Copy'}
                    </Button>
                  </div>
                </div>
              </div>

              {/* Step 2: Single-Use Backup Codes */}
              <div className="rounded-xl border border-slate-200 dark:border-slate-800 p-4 space-y-3 bg-white dark:bg-slate-950/40">
                <div className="flex items-center gap-2 text-xs font-bold text-[#102F4D] dark:text-white">
                  <KeyRound className="w-4 h-4 text-[#11A6A0]" />
                  <span>02. Save Backup Recovery Codes</span>
                </div>
                <p className="text-[11px] text-[#718096] dark:text-slate-400 leading-relaxed">
                  Each code can be used once if your authenticator device is lost or replaced.
                </p>
                <div className="grid grid-cols-1 gap-1.5">
                  {setupData.backupCodes.map((code) => (
                    <div
                      key={code}
                      className="px-3 py-1.5 rounded-lg bg-[#F4F7FB] dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 font-mono tabular-nums text-xs font-semibold tracking-wider text-[#172B43] dark:text-slate-200 text-center"
                    >
                      {code}
                    </div>
                  ))}
                </div>
                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleCopyBackupCodes}
                    leftIcon={copiedCodes ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  >
                    {copiedCodes ? 'Codes Copied' : 'Copy Codes'}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleDownloadBackupCodes}
                    leftIcon={<Download className="w-3.5 h-3.5" />}
                  >
                    Download .txt
                  </Button>
                </div>
              </div>
            </div>

            {/* Step 3: Verify 6-Digit Code to Activate */}
            <form
              onSubmit={handleVerifyAndEnable}
              className="rounded-xl border border-slate-200 dark:border-slate-800 p-4 space-y-3 bg-[#F4F7FB]/50 dark:bg-slate-900/40"
            >
              <div className="flex items-center gap-2 text-xs font-bold text-[#102F4D] dark:text-white">
                <Lock className="w-4 h-4 text-[#0866B2]" />
                <span>03. Verify Authenticator Code to Activate MFA</span>
              </div>
              <div className="flex flex-col sm:flex-row items-stretch sm:items-end gap-3">
                <div className="flex-1">
                  <TextInput
                    label="6-Digit TOTP Verification Code"
                    type="text"
                    inputMode="numeric"
                    maxLength={12}
                    placeholder="Enter 6-digit code (e.g. 482910)"
                    value={totpCode}
                    onChange={(e) => setTotpCode(e.target.value)}
                    className="font-mono tracking-widest"
                    required
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    type="submit"
                    variant="primary"
                    loading={busyAction === 'verify'}
                  >
                    Verify &amp; Enable MFA
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setSetupData(null);
                      setQrDataUrl(null);
                      setErrorMsg(null);
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            </form>
          </div>
        ) : status?.mfaEnabled ? (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-3">
              <Button
                type="button"
                variant="outline"
                size="sm"
                loading={busyAction === 'setup'}
                leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
                onClick={() => void handleStartSetup()}
              >
                Reconfigure Authenticator Secret
              </Button>
              {!showDisablePrompt && (
                <Button
                  type="button"
                  variant="danger"
                  size="sm"
                  onClick={() => {
                    setShowDisablePrompt(true);
                    setErrorMsg(null);
                  }}
                >
                  Disable MFA
                </Button>
              )}
            </div>

            {showDisablePrompt && (
              <form
                onSubmit={handleDisableMfa}
                className="rounded-xl border border-[#DC4C4C]/30 bg-[#DC4C4C]/5 p-4 space-y-3"
              >
                <p className="text-xs font-semibold text-[#172B43] dark:text-slate-100">
                  Confirm MFA Deactivation
                </p>
                <p className="text-[11px] text-[#718096] dark:text-slate-400">
                  Enter a current 6-digit TOTP code or one of your backup codes to disable Multi-Factor Authentication.
                </p>
                <div className="flex flex-col sm:flex-row items-stretch sm:items-end gap-3">
                  <div className="flex-1">
                    <TextInput
                      label="Verification Code"
                      type="text"
                      placeholder="6-digit TOTP or MC-XXXX-XXXX"
                      value={disableCode}
                      onChange={(e) => setDisableCode(e.target.value)}
                      className="font-mono"
                      required
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <Button type="submit" variant="danger" loading={busyAction === 'disable'}>
                      Confirm Disable
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setShowDisablePrompt(false);
                        setDisableCode('');
                      }}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              </form>
            )}
          </div>
        ) : (
          <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
            <p className="text-xs text-[#718096] dark:text-slate-400">
              Generate a TOTP QR code and backup recovery codes to secure your account.
            </p>
            <Button
              type="button"
              variant="primary"
              loading={busyAction === 'setup'}
              leftIcon={<ShieldCheck className="w-4 h-4" />}
              onClick={() => void handleStartSetup()}
            >
              Set Up TOTP MFA
            </Button>
          </div>
        )}
      </div>
    </Card>
  );
};
