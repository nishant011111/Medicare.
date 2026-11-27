import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { onAuthStateChanged, signInWithPopup, signOut as firebaseSignOut } from 'firebase/auth';
import { auth, googleProvider, syncGoogleUserProfileToFirestore } from '../firebase';
import {
  apiRequest,
  clearInMemoryAuthTokens,
  registerSessionExpiredHandler,
  rotateSessionRefreshToken,
  setInMemoryAuthTokens,
} from '../services/api';
import {
  AuthLoginResponse,
  AuthLoginSuccessResponse,
  AuthMfaChallengeResponse,
  AuthUserProfile,
  getRoleDashboardPath,
  OtpRequestResponse,
  resolvePrimaryRole,
  RoleCodeType,
  UserHospitalMembership,
} from '../types/auth';

export type LoginAttemptOutcome =
  | { mfaRequired: false; user: AuthUserProfile }
  | { mfaRequired: true; mfaChallengeToken: string; previewUser: AuthMfaChallengeResponse['user'] };

export interface AuthContextValue {
  user: AuthUserProfile | null;
  isAuthenticated: boolean;
  loading: boolean;
  error: string | null;
  setError: (msg: string | null) => void;
  primaryRole: RoleCodeType | null;
  effectiveRoles: RoleCodeType[];
  permissions: string[];
  activeHospital: UserHospitalMembership | null;
  requestLoginOtp: (input: { phone: string; role?: string }) => Promise<OtpRequestResponse>;
  verifyLoginOtp: (input: {
    phone: string;
    otpCode: string;
    rememberMe?: boolean;
    role?: string;
    totpCode?: string;
  }) => Promise<LoginAttemptOutcome>;
  verifyMfaLogin: (input: {
    mfaChallengeToken: string;
    totpCode: string;
  }) => Promise<AuthUserProfile>;
  authenticateWithGoogle: (input: {
    mode: 'SIGN_IN' | 'SIGN_UP';
    role?: string;
    department?: string;
    termsAccepted?: boolean;
  }) => Promise<LoginAttemptOutcome & { isNewAccount?: boolean }>;
  applyDirectSession: (payload: {
    user: AuthUserProfile;
    accessToken: string;
    refreshToken: string;
  }) => Promise<AuthUserProfile>;
  logout: () => Promise<void>;
  logoutAllSessions: () => Promise<void>;
  refreshSession: () => Promise<AuthUserProfile | null>;
  switchHospitalContext: (hospitalId: string) => Promise<void>;
  getDefaultDashboardPath: (targetUser?: AuthUserProfile | null) => string;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUserProfile | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const applyAuthenticatedUser = useCallback(
    (profile: AuthUserProfile, accessToken?: string, refreshToken?: string) => {
      const resolvedHospitalId =
        profile.activeHospitalId ||
        profile.memberships?.find((m) => m.status === 'ACTIVE')?.hospitalId ||
        null;

      setInMemoryAuthTokens({
        ...(accessToken !== undefined ? { accessToken } : {}),
        ...(refreshToken !== undefined ? { refreshToken } : {}),
        activeHospitalId: resolvedHospitalId,
      });

      setUser({
        ...profile,
        activeHospitalId: resolvedHospitalId,
      });
    },
    []
  );

  const refreshSession = useCallback(async (): Promise<AuthUserProfile | null> => {
    try {
      const rotated = await rotateSessionRefreshToken();
      if (!rotated) {
        clearInMemoryAuthTokens();
        setUser(null);
        return null;
      }

      const meRes = await apiRequest<{ data: AuthUserProfile }>('/auth/me', {
        skipRefreshRetry: true,
      });
      if (meRes?.data) {
        applyAuthenticatedUser(meRes.data);
        return meRes.data;
      }
      clearInMemoryAuthTokens();
      setUser(null);
      return null;
    } catch {
      clearInMemoryAuthTokens();
      setUser(null);
      return null;
    }
  }, [applyAuthenticatedUser]);

  useEffect(() => {
    registerSessionExpiredHandler(() => {
      clearInMemoryAuthTokens();
      setUser(null);
    });
    return () => {
      registerSessionExpiredHandler(null);
    };
  }, []);

  useEffect(() => {
    let active = true;
    let sessionInitialized = false;
    const unsubscribe = onAuthStateChanged(auth, async () => {
      if (sessionInitialized) return;
      sessionInitialized = true;
      try {
        await refreshSession();
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    });
    return () => {
      active = false;
      unsubscribe();
    };
  }, [refreshSession]);

  const finalizeAuthenticatedLogin = useCallback(
    async (payload: { user: AuthUserProfile; accessToken: string; refreshToken: string }): Promise<AuthUserProfile> => {
      applyAuthenticatedUser(payload.user, payload.accessToken, payload.refreshToken);

      const firstActiveMembership = payload.user.memberships?.find((m) => m.status === 'ACTIVE');
      if (!payload.user.activeHospitalId && firstActiveMembership) {
        try {
          const selectRes = await apiRequest<{
            data: { accessToken?: string; user?: AuthUserProfile };
          }>(`/hospitals/${firstActiveMembership.hospitalId}/select`, {
            method: 'POST',
          });
          if (selectRes?.data?.user) {
            applyAuthenticatedUser(selectRes.data.user, selectRes.data.accessToken);
            return selectRes.data.user;
          }
        } catch {
          // Keep initial user profile if hospital selection fails
        }
      }

      return payload.user;
    },
    [applyAuthenticatedUser]
  );

  const requestLoginOtp = useCallback(
    async (input: { phone: string; role?: string }): Promise<OtpRequestResponse> => {
      setError(null);
      const res = await apiRequest<{ data: OtpRequestResponse }>('/auth/otp/request', {
        method: 'POST',
        skipAuth: true,
        skipRefreshRetry: true,
        body: JSON.stringify({
          phone: input.phone.trim(),
          purpose: 'LOGIN',
          role: input.role,
          deviceInfo: 'MediCore Web Console',
        }),
      });
      return res.data;
    },
    []
  );

  const verifyLoginOtp = useCallback(
    async (input: {
      phone: string;
      otpCode: string;
      rememberMe?: boolean;
      role?: string;
      totpCode?: string;
    }): Promise<LoginAttemptOutcome> => {
      setError(null);
      const res = await apiRequest<{ data: AuthLoginResponse }>('/auth/otp/verify', {
        method: 'POST',
        skipAuth: true,
        skipRefreshRetry: true,
        body: JSON.stringify({
          phone: input.phone.trim(),
          otpCode: input.otpCode.trim(),
          role: input.role,
          totpCode: input.totpCode,
          deviceInfo: 'MediCore Web Console',
        }),
      });

      const payload = res.data;
      if ('mfaRequired' in payload && payload.mfaRequired) {
        return {
          mfaRequired: true,
          mfaChallengeToken: payload.mfaChallengeToken,
          previewUser: payload.user,
        };
      }

      const finalUser = await finalizeAuthenticatedLogin(payload as AuthLoginSuccessResponse);
      return { mfaRequired: false, user: finalUser };
    },
    [finalizeAuthenticatedLogin]
  );

  const verifyMfaLogin = useCallback(
    async (input: { mfaChallengeToken: string; totpCode: string }): Promise<AuthUserProfile> => {
      setError(null);
      const res = await apiRequest<{ data: AuthLoginSuccessResponse }>('/auth/mfa/verify-login', {
        method: 'POST',
        skipAuth: true,
        skipRefreshRetry: true,
        body: JSON.stringify({
          mfaChallengeToken: input.mfaChallengeToken,
          totpCode: input.totpCode.trim(),
          deviceInfo: 'MediCore Web Console',
        }),
      });
      return finalizeAuthenticatedLogin(res.data);
    },
    [finalizeAuthenticatedLogin]
  );

  const authenticateWithGoogle = useCallback(
    async (input: {
      mode: 'SIGN_IN' | 'SIGN_UP';
      role?: string;
      department?: string;
      termsAccepted?: boolean;
    }): Promise<LoginAttemptOutcome & { isNewAccount?: boolean }> => {
      setError(null);
      const credential = await signInWithPopup(auth, googleProvider);
      const firebaseUser = credential.user;
      const idToken = await firebaseUser.getIdToken();

      const res = await apiRequest<{
        data: AuthLoginResponse & { isNewAccount?: boolean };
      }>('/auth/google', {
        method: 'POST',
        skipAuth: true,
        skipRefreshRetry: true,
        body: JSON.stringify({
          idToken,
          mode: input.mode,
          role: input.role,
          department: input.department?.trim() || undefined,
          termsAccepted: input.termsAccepted,
          deviceInfo: 'MediCore Web (Google)',
        }),
      });

      const payload = res.data;
      if ('mfaRequired' in payload && payload.mfaRequired) {
        return {
          mfaRequired: true,
          mfaChallengeToken: payload.mfaChallengeToken,
          previewUser: payload.user,
          isNewAccount: false,
        };
      }

      const finalUser = await finalizeAuthenticatedLogin(payload as AuthLoginSuccessResponse);

      // Sync verified staff profile & isolated PII subcollection into Firestore Enterprise DB
      const resolvedRole = resolvePrimaryRole(finalUser) || 'DOCTOR';
      try {
        await syncGoogleUserProfileToFirestore({
          uid: firebaseUser.uid,
          displayName: firebaseUser.displayName || finalUser.fullName,
          photoUrl: firebaseUser.photoURL,
          email: firebaseUser.email || finalUser.email || '',
          role: resolvedRole,
          activeHospitalId: finalUser.activeHospitalId,
          department: input.department,
        });
      } catch (firestoreErr) {
        console.warn('Firestore profile sync warning:', firestoreErr);
      }

      return {
        mfaRequired: false,
        user: finalUser,
        isNewAccount: Boolean(payload.isNewAccount),
      };
    },
    [finalizeAuthenticatedLogin]
  );

  const logout = useCallback(async () => {
    try {
      await apiRequest('/auth/logout', {
        method: 'POST',
        skipRefreshRetry: true,
        body: JSON.stringify({}),
      });
    } catch {
      // Always clear client session state even if network request fails
    } finally {
      await firebaseSignOut(auth).catch(() => undefined);
      clearInMemoryAuthTokens();
      setUser(null);
      setError(null);
    }
  }, []);

  const logoutAllSessions = useCallback(async () => {
    try {
      await apiRequest('/auth/logout-all', {
        method: 'POST',
        skipRefreshRetry: true,
      });
    } catch {
      // Always clear client session state
    } finally {
      await firebaseSignOut(auth).catch(() => undefined);
      clearInMemoryAuthTokens();
      setUser(null);
      setError(null);
    }
  }, []);

  const switchHospitalContext = useCallback(
    async (hospitalId: string) => {
      setError(null);
      const res = await apiRequest<{
        data: { accessToken?: string; user?: AuthUserProfile };
      }>(`/hospitals/${hospitalId}/select`, {
        method: 'POST',
      });

      if (res?.data?.user) {
        applyAuthenticatedUser(res.data.user, res.data.accessToken);
      } else {
        await refreshSession();
      }
    },
    [applyAuthenticatedUser, refreshSession]
  );

  const effectiveRoles: RoleCodeType[] = user
    ? Array.from(new Set([...(user.globalRoles || []), ...(user.activeRoles || [])]))
    : [];

  const primaryRole = resolvePrimaryRole(user);
  const permissions = user?.permissions || [];

  const activeHospital =
    user?.memberships?.find(
      (m) => m.hospitalId === user.activeHospitalId && m.status === 'ACTIVE'
    ) ||
    user?.memberships?.find((m) => m.status === 'ACTIVE') ||
    null;

  const getDefaultDashboardPath = useCallback(
    (targetUser?: AuthUserProfile | null) => {
      return getRoleDashboardPath(targetUser !== undefined ? targetUser : user);
    },
    [user]
  );

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: Boolean(user),
        loading,
        error,
        setError,
        primaryRole,
        effectiveRoles,
        permissions,
        activeHospital,
        requestLoginOtp,
        verifyLoginOtp,
        verifyMfaLogin,
        authenticateWithGoogle,
        applyDirectSession: finalizeAuthenticatedLogin,
        logout,
        logoutAllSessions,
        refreshSession,
        switchHospitalContext,
        getDefaultDashboardPath,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used inside an AuthProvider');
  }
  return ctx;
}

export function useRole() {
  const { primaryRole, effectiveRoles, activeHospital } = useAuth();
  const hasRole = useCallback(
    (...roles: RoleCodeType[]) => {
      if (effectiveRoles.includes('SUPER_ADMIN') && roles.includes('SUPER_ADMIN')) {
        return true;
      }
      return roles.some((r) => effectiveRoles.includes(r));
    },
    [effectiveRoles]
  );

  return {
    role: primaryRole,
    roles: effectiveRoles,
    activeHospital,
    hasRole,
    isSuperAdmin: effectiveRoles.includes('SUPER_ADMIN'),
  };
}

export function usePermissions() {
  const { permissions, effectiveRoles } = useAuth();
  const hasPermission = useCallback(
    (requiredPermission: string) => {
      if (effectiveRoles.includes('SUPER_ADMIN')) return true;
      return permissions.includes(requiredPermission);
    },
    [permissions, effectiveRoles]
  );

  const hasAnyPermission = useCallback(
    (requiredList: string[]) => {
      if (effectiveRoles.includes('SUPER_ADMIN')) return true;
      return requiredList.some((p) => permissions.includes(p));
    },
    [permissions, effectiveRoles]
  );

  return {
    permissions,
    hasPermission,
    hasAnyPermission,
  };
}
