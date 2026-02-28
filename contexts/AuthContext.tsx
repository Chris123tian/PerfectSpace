import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import createContextHook from '@nkzw/create-context-hook';
import { User, UserRole } from '@/types/property';
import { seedUsers } from '@/mocks/properties';

const USERS_KEY = 'ph_users';
const CURRENT_USER_KEY = 'ph_current_user';

async function getUsers(): Promise<User[]> {
  const stored = await AsyncStorage.getItem(USERS_KEY);
  if (!stored) {
    await AsyncStorage.setItem(USERS_KEY, JSON.stringify(seedUsers));
    return seedUsers;
  }
  return JSON.parse(stored);
}

async function saveUsers(users: User[]): Promise<void> {
  await AsyncStorage.setItem(USERS_KEY, JSON.stringify(users));
}

export const [AuthProvider, useAuth] = createContextHook(() => {
  const queryClient = useQueryClient();
  const [user, setUser] = useState<User | null>(null);

  const currentUserQuery = useQuery({
    queryKey: ['currentUser'],
    queryFn: async () => {
      const stored = await AsyncStorage.getItem(CURRENT_USER_KEY);
      if (!stored) return null;
      const parsed = JSON.parse(stored) as User;
      const users = await getUsers();
      const fresh = users.find(u => u.id === parsed.id);
      return fresh ?? null;
    },
  });

  useEffect(() => {
    if (currentUserQuery.data !== undefined) {
      setUser(currentUserQuery.data);
    }
  }, [currentUserQuery.data]);

  const loginMutation = useMutation({
    mutationFn: async ({ email, password }: { email: string; password: string }) => {
      console.log('[Auth] Login attempt:', email);
      const users = await getUsers();
      const found = users.find(u => u.email.toLowerCase() === email.toLowerCase() && u.password === password);
      if (!found) throw new Error('Invalid email or password');
      if (!found.isActive) throw new Error('Your account has been deactivated. Contact support.');
      await AsyncStorage.setItem(CURRENT_USER_KEY, JSON.stringify(found));
      return found;
    },
    onSuccess: (data) => {
      console.log('[Auth] Login success:', data.name, data.role);
      setUser(data);
      queryClient.invalidateQueries({ queryKey: ['currentUser'] });
    },
  });

  const signupMutation = useMutation({
    mutationFn: async (params: { name: string; email: string; password: string; phone: string; role: UserRole }) => {
      console.log('[Auth] Signup attempt:', params.email, params.role);
      const users = await getUsers();
      const exists = users.find(u => u.email.toLowerCase() === params.email.toLowerCase());
      if (exists) throw new Error('An account with this email already exists');

      const newUser: User = {
        id: 'u_' + Date.now().toString(36),
        name: params.name,
        email: params.email,
        password: params.password,
        avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=200&h=200&fit=crop&crop=face',
        phone: params.phone,
        role: params.role === 'admin' ? 'renter' : params.role,
        bio: params.role === 'landlord' ? 'Property owner on PropertyHub.' : 'Looking for the perfect space.',
        propertiesCount: 0,
        reviewsCount: 0,
        rating: 0,
        memberSince: new Date().toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
        verified: false,
        isActive: true,
      };

      const updated = [...users, newUser];
      await saveUsers(updated);
      await AsyncStorage.setItem(CURRENT_USER_KEY, JSON.stringify(newUser));
      return newUser;
    },
    onSuccess: (data) => {
      console.log('[Auth] Signup success:', data.name);
      setUser(data);
      queryClient.invalidateQueries({ queryKey: ['currentUser'] });
    },
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      console.log('[Auth] Logging out');
      await AsyncStorage.removeItem(CURRENT_USER_KEY);
    },
    onSuccess: () => {
      setUser(null);
      queryClient.invalidateQueries({ queryKey: ['currentUser'] });
    },
  });

  const updateProfileMutation = useMutation({
    mutationFn: async (updates: Partial<User>) => {
      if (!user) throw new Error('Not authenticated');
      console.log('[Auth] Updating profile:', updates);
      const users = await getUsers();
      const idx = users.findIndex(u => u.id === user.id);
      if (idx === -1) throw new Error('User not found');
      const updated = { ...users[idx], ...updates, id: user.id, email: user.email };
      users[idx] = updated;
      await saveUsers(users);
      await AsyncStorage.setItem(CURRENT_USER_KEY, JSON.stringify(updated));
      return updated;
    },
    onSuccess: (data) => {
      setUser(data);
      queryClient.invalidateQueries({ queryKey: ['currentUser'] });
    },
  });

  const getAllUsers = useCallback(async (): Promise<User[]> => {
    return getUsers();
  }, []);

  const updateUserAdmin = useCallback(async (userId: string, updates: Partial<User>) => {
    console.log('[Auth] Admin updating user:', userId, updates);
    const users = await getUsers();
    const idx = users.findIndex(u => u.id === userId);
    if (idx === -1) throw new Error('User not found');
    users[idx] = { ...users[idx], ...updates, id: userId };
    await saveUsers(users);
    if (user && user.id === userId) {
      setUser(users[idx]);
      await AsyncStorage.setItem(CURRENT_USER_KEY, JSON.stringify(users[idx]));
    }
    return users[idx];
  }, [user]);

  return {
    user,
    isLoading: currentUserQuery.isLoading,
    isAuthenticated: !!user,
    login: loginMutation.mutateAsync,
    loginPending: loginMutation.isPending,
    loginError: loginMutation.error?.message ?? null,
    resetLoginError: loginMutation.reset,
    signup: signupMutation.mutateAsync,
    signupPending: signupMutation.isPending,
    signupError: signupMutation.error?.message ?? null,
    resetSignupError: signupMutation.reset,
    logout: logoutMutation.mutate,
    updateProfile: updateProfileMutation.mutateAsync,
    updateProfilePending: updateProfileMutation.isPending,
    getAllUsers,
    updateUserAdmin,
  };
});
