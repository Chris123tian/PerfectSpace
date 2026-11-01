import { useState, useEffect, useCallback, useMemo } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useQueryClient } from '@tanstack/react-query';
import createContextHook from '@nkzw/create-context-hook';
import { User, UserRole } from '@/types/property';
import { trpc, getBaseUrl } from '@/lib/trpc';

const CURRENT_USER_KEY = 'ps_current_user';

export const [AuthProvider, useAuth] = createContextHook(() => {
  const queryClient = useQueryClient();
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    void AsyncStorage.getItem(CURRENT_USER_KEY).then((stored) => {
      if (stored) {
        try {
          const parsed = JSON.parse(stored) as User;
          setUser(parsed);
          console.log('[Auth] Restored session:', parsed.name);
        } catch {
          console.log('[Auth] Failed to parse stored user');
        }
      }
      setIsLoading(false);
    });
  }, []);

  const loginMutation = trpc.auth.login.useMutation({
    onSuccess: (data) => {
      console.log('[Auth] Login success:', data.name, data.role);
      setUser(data);
      void AsyncStorage.setItem(CURRENT_USER_KEY, JSON.stringify(data));
      void queryClient.invalidateQueries();
    },
  });

  const signupMutation = trpc.auth.signup.useMutation({
    onSuccess: (data) => {
      console.log('[Auth] Signup success:', data.name);
      setUser(data);
      void AsyncStorage.setItem(CURRENT_USER_KEY, JSON.stringify(data));
      void queryClient.invalidateQueries();
    },
  });

  const googleAuthMutation = trpc.auth.googleAuth.useMutation({
    onSuccess: (data) => {
      console.log('[Auth] Google auth success:', data.name);
      setUser(data);
      void AsyncStorage.setItem(CURRENT_USER_KEY, JSON.stringify(data));
      void queryClient.invalidateQueries();
    },
  });

  const updateProfileMutation = trpc.auth.updateProfile.useMutation({
    onSuccess: (data) => {
      console.log('[Auth] Profile updated:', data.name);
      setUser(data);
      void AsyncStorage.setItem(CURRENT_USER_KEY, JSON.stringify(data));
      void queryClient.invalidateQueries();
    },
  });

  const updateUserAdminMutation = trpc.auth.updateUserAdmin.useMutation({
    onSuccess: (data) => {
      console.log('[Auth] Admin updated user:', data.id);
      if (user && user.id === data.id) {
        setUser(data);
        void AsyncStorage.setItem(CURRENT_USER_KEY, JSON.stringify(data));
      }
      void queryClient.invalidateQueries();
    },
  });

  const deleteAccountMutation = trpc.auth.deleteAccount.useMutation({
    onSuccess: () => {
      console.log('[Auth] Account deleted');
      void AsyncStorage.removeItem(CURRENT_USER_KEY);
      setUser(null);
      queryClient.clear();
    },
  });

  const updateSettingsMutation = trpc.auth.updateSettings.useMutation({
    onSuccess: () => {
      console.log('[Auth] Settings updated');
      void queryClient.invalidateQueries({ queryKey: [['auth', 'getSettings']] });
    },
  });

  const login = useCallback(async ({ email, password }: { email: string; password: string }) => {
    return loginMutation.mutateAsync({ email, password });
  }, [loginMutation]);

  const signup = useCallback(async (params: { name: string; email: string; password: string; phone: string; role: UserRole }) => {
    return signupMutation.mutateAsync(params);
  }, [signupMutation]);

  const googleAuth = useCallback(async (params: { email: string; name: string; avatar?: string; role?: 'renter' | 'landlord' }) => {
    return googleAuthMutation.mutateAsync(params);
  }, [googleAuthMutation]);

  const logout = useCallback(async () => {
    console.log('[Auth] Logging out');
    await AsyncStorage.removeItem(CURRENT_USER_KEY);
    setUser(null);
    queryClient.clear();
  }, [queryClient]);

  const updateProfile = useCallback(async (updates: Partial<User>) => {
    if (!user) throw new Error('Not authenticated');
    return updateProfileMutation.mutateAsync({ userId: user.id, updates: updates as Record<string, unknown> });
  }, [user, updateProfileMutation]);

  const getAllUsers = useCallback(async (): Promise<User[]> => {
    const result = await queryClient.fetchQuery({
      queryKey: [['auth', 'getAllUsers'], { type: 'query' }],
      queryFn: async () => {
        const response = await fetch(
          `${getBaseUrl()}/api/trpc/auth.getAllUsers`,
          { headers: { 'Content-Type': 'application/json' } }
        );
        const json = await response.json();
        return json?.result?.data?.json ?? [];
      },
    });
    return result as User[];
  }, [queryClient]);

  const updateUserAdmin = useCallback(async (userId: string, updates: Partial<User>) => {
    return updateUserAdminMutation.mutateAsync({ userId, updates: updates as Record<string, unknown> });
  }, [updateUserAdminMutation]);

  const deleteAccount = useCallback(async () => {
    if (!user) throw new Error('Not authenticated');
    return deleteAccountMutation.mutateAsync({ userId: user.id });
  }, [user, deleteAccountMutation]);

  const updateSettings = useCallback(async (settings: { pushEnabled?: boolean; emailEnabled?: boolean; darkMode?: boolean }) => {
    if (!user) throw new Error('Not authenticated');
    return updateSettingsMutation.mutateAsync({ userId: user.id, settings });
  }, [user, updateSettingsMutation]);

  return useMemo(() => ({
    user,
    isLoading,
    isAuthenticated: !!user,
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
    updateProfile,
    updateProfilePending: updateProfileMutation.isPending,
    getAllUsers,
    updateUserAdmin,
    deleteAccount,
    deleteAccountPending: deleteAccountMutation.isPending,
    updateSettings,
  }), [
    user, isLoading, login, loginMutation.isPending, loginMutation.error, loginMutation.reset,
    signup, signupMutation.isPending, signupMutation.error, signupMutation.reset,
    googleAuth, googleAuthMutation.isPending, googleAuthMutation.error,
    logout, updateProfile, updateProfileMutation.isPending,
    getAllUsers, updateUserAdmin, deleteAccount, deleteAccountMutation.isPending, updateSettings,
  ]);
});
