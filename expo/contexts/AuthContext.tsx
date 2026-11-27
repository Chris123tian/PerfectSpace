import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useQueryClient } from '@tanstack/react-query';
import createContextHook from '@nkzw/create-context-hook';
import { User, UserRole } from '@/types/property';
import { trpc } from '@/lib/trpc';
import { isUnauthorizedError, onUnauthorized, setSessionToken } from '@/lib/session';

const SESSION_KEY = 'ps_session_v2';
const LEGACY_USER_KEY = 'ps_current_user';

type StoredSession = { user: User; token: string };
type AuthResult = { user: User; token: string };

export const [AuthProvider, useAuth] = createContextHook(() => {
  const queryClient = useQueryClient();
  const utils = trpc.useUtils();
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const userRef = useRef<User | null>(null);
  userRef.current = user;

  const persist = useCallback((next: User, token?: string) => {
    setUser(next);
    void AsyncStorage.getItem(SESSION_KEY).then((raw) => {
      const prevToken = raw ? (JSON.parse(raw) as StoredSession).token : null;
      const t = token ?? prevToken;
      if (t) void AsyncStorage.setItem(SESSION_KEY, JSON.stringify({ user: next, token: t }));
    });
  }, []);

  const clearSession = useCallback(async () => {
    setSessionToken(null);
    await AsyncStorage.removeItem(SESSION_KEY);
    setUser(null);
    queryClient.clear();
  }, [queryClient]);

  const startSession = useCallback((result: AuthResult) => {
    setSessionToken(result.token);
    setUser(result.user);
    void AsyncStorage.setItem(SESSION_KEY, JSON.stringify(result));
    void queryClient.invalidateQueries();
  }, [queryClient]);

  // Restore the saved session, then confirm it with the server.
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      await AsyncStorage.removeItem(LEGACY_USER_KEY); // pre-session builds: force one re-login
      const raw = await AsyncStorage.getItem(SESSION_KEY);
      if (raw) {
        try {
          const saved = JSON.parse(raw) as StoredSession;
          setSessionToken(saved.token);
          setUser(saved.user);
          console.log('[Auth] Restored session:', saved.user.name);
          utils.client.auth.me.query().then(
            (fresh) => {
              if (!cancelled) persist(fresh as User);
            },
            (err: unknown) => {
              if (isUnauthorizedError(err)) {
                console.log('[Auth] Stored session expired');
                void clearSession();
              }
            },
          );
        } catch {
          await AsyncStorage.removeItem(SESSION_KEY);
        }
      }
      if (!cancelled) setIsLoading(false);
    })();
    return () => { cancelled = true; };
  }, [utils, persist, clearSession]);

  // Any request rejected for a dead session signs the user out locally.
  useEffect(() => onUnauthorized(() => {
    console.log('[Auth] Session rejected by server — signing out');
    void clearSession();
  }), [clearSession]);

  const loginMutation = trpc.auth.login.useMutation();
  const signupMutation = trpc.auth.signup.useMutation();
  const googleAuthMutation = trpc.auth.googleAuth.useMutation();
  const updateProfileMutation = trpc.auth.updateProfile.useMutation();
  const updateUserAdminMutation = trpc.auth.updateUserAdmin.useMutation({
    onSuccess: () => { void queryClient.invalidateQueries(); },
  });
  const deleteUserMutation = trpc.auth.deleteUser.useMutation({
    onSuccess: () => { void queryClient.invalidateQueries(); },
  });
  const deleteAccountMutation = trpc.auth.deleteAccount.useMutation();
  const changePasswordMutation = trpc.auth.changePassword.useMutation();
  const submitVerificationMutation = trpc.auth.submitVerification.useMutation();
  const updateSettingsMutation = trpc.auth.updateSettings.useMutation({
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: [['auth', 'getSettings']] });
    },
  });

  const login = useCallback(async ({ email, password, portal }: { email: string; password: string; portal?: 'app' | 'admin' }) => {
    const result = await loginMutation.mutateAsync({ email: email.trim(), password, portal: portal ?? 'app' });
    console.log('[Auth] Login success:', result.user.name, result.user.role);
    startSession(result as AuthResult);
    return result.user as User;
  }, [loginMutation, startSession]);

  const signup = useCallback(async (params: { name: string; email: string; password: string; phone: string; role: UserRole; dob?: string; country?: string; region?: string }) => {
    const result = await signupMutation.mutateAsync(params);
    startSession(result as AuthResult);
    return result.user as User;
  }, [signupMutation, startSession]);

  const googleAuth = useCallback(async (params: { accessToken: string; role?: 'renter' | 'landlord' }) => {
    const result = await googleAuthMutation.mutateAsync(params);
    startSession(result as AuthResult);
    return result.user as User;
  }, [googleAuthMutation, startSession]);

  const logout = useCallback(async () => {
    console.log('[Auth] Logging out');
    try {
      await utils.client.auth.logout.mutate();
    } catch (e) {
      console.log('[Auth] Server logout failed (continuing):', e);
    }
    await clearSession();
  }, [utils, clearSession]);

  const refreshUser = useCallback(async () => {
    try {
      const fresh = (await utils.client.auth.me.query()) as User;
      persist(fresh);
      return fresh;
    } catch {
      return userRef.current;
    }
  }, [utils, persist]);

  const updateProfile = useCallback(async (updates: Partial<User>) => {
    if (!userRef.current) throw new Error('Not authenticated');
    const allowed = ['name', 'avatar', 'phone', 'bio', 'dob', 'country', 'region', 'whatsapp'] as const;
    const clean: Partial<Record<(typeof allowed)[number], string>> = {};
    for (const key of allowed) {
      const v = updates[key];
      if (typeof v === 'string') clean[key] = v;
    }
    const fresh = (await updateProfileMutation.mutateAsync({ updates: clean })) as User;
    persist(fresh);
    void queryClient.invalidateQueries();
    return fresh;
  }, [updateProfileMutation, persist, queryClient]);

  const getAllUsers = useCallback(async (): Promise<User[]> => {
    return (await utils.client.auth.getAllUsers.query()) as User[];
  }, [utils]);

  const updateUserAdmin = useCallback(async (userId: string, updates: { isActive?: boolean; verified?: boolean; role?: 'renter' | 'landlord' | 'admin' }) => {
    return updateUserAdminMutation.mutateAsync({ userId, updates }) as Promise<User>;
  }, [updateUserAdminMutation]);

  const deleteUser = useCallback(async (userId: string) => {
    return deleteUserMutation.mutateAsync({ userId });
  }, [deleteUserMutation]);

  const deleteAccount = useCallback(async () => {
    if (!userRef.current) throw new Error('Not authenticated');
    await deleteAccountMutation.mutateAsync();
    await clearSession();
  }, [deleteAccountMutation, clearSession]);

  const updateSettings = useCallback(async (settings: { pushEnabled?: boolean; emailEnabled?: boolean; darkMode?: boolean }) => {
    if (!userRef.current) throw new Error('Not authenticated');
    return updateSettingsMutation.mutateAsync({ settings });
  }, [updateSettingsMutation]);

  const changePassword = useCallback(async ({ currentPassword, newPassword }: { currentPassword?: string; newPassword: string }) => {
    if (!userRef.current) throw new Error('Not authenticated');
    const result = await changePasswordMutation.mutateAsync({ currentPassword, newPassword });
    persist(result.user as User);
    return result;
  }, [changePasswordMutation, persist]);

  const submitVerification = useCallback(async (doc: { documentType: string; documentName: string; documentNumber?: string; documentImage: string }) => {
    if (!userRef.current) throw new Error('Not authenticated');
    const fresh = (await submitVerificationMutation.mutateAsync(doc)) as User;
    persist(fresh);
    void queryClient.invalidateQueries();
    return fresh;
  }, [submitVerificationMutation, persist, queryClient]);

  const isStaff = user?.role === 'admin' || user?.role === 'superadmin';

  return useMemo(() => ({
    user,
    isLoading,
    isAuthenticated: !!user,
    isStaff,
    isSuperAdmin: user?.role === 'superadmin',
    login,
    loginPending: loginMutation.isPending,
    loginError: loginMutation.error?.message ?? null,
    resetLoginError: loginMutation.reset,
    signup,
    signupPending: signupMutation.isPending,
    signupError: signupMutation.error?.message ?? null,
    resetSignupError: signupMutation.reset,
    googleAuth,
    googleAuthPending: googleAuthMutation.isPending,
    googleAuthError: googleAuthMutation.error?.message ?? null,
    logout,
    refreshUser,
    updateProfile,
    updateProfilePending: updateProfileMutation.isPending,
    getAllUsers,
    updateUserAdmin,
    deleteUser,
    deleteAccount,
    deleteAccountPending: deleteAccountMutation.isPending,
    updateSettings,
    changePassword,
    changePasswordPending: changePasswordMutation.isPending,
    submitVerification,
    submitVerificationPending: submitVerificationMutation.isPending,
  }), [
    user, isLoading, isStaff,
    login, loginMutation.isPending, loginMutation.error, loginMutation.reset,
    signup, signupMutation.isPending, signupMutation.error, signupMutation.reset,
    googleAuth, googleAuthMutation.isPending, googleAuthMutation.error,
    logout, refreshUser, updateProfile, updateProfileMutation.isPending,
    getAllUsers, updateUserAdmin, deleteUser, deleteAccount, deleteAccountMutation.isPending, updateSettings,
    changePassword, changePasswordMutation.isPending,
    submitVerification, submitVerificationMutation.isPending,
  ]);
});
