import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { showAlert } from '@/lib/alert';
import { View, Text, StyleSheet, ScrollView, Pressable, FlatList, ActivityIndicator, useWindowDimensions, TextInput, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import SafeImage from '@/components/SafeImage';
import { router } from 'expo-router';
import { goBack } from '@/lib/nav';
import {
  ArrowLeft, Users, Building2, Calendar, Shield, ShieldOff,
  Trash2, Star, Eye, ChevronRight, TrendingUp, UserCheck, UserX, BadgeCheck,
  MessageCircle, Bell, X, Activity, ScrollText, LogOut, Search, Crown,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import Colors from '@/constants/colors';
import { useAuth } from '@/contexts/AuthContext';
import { useData } from '@/contexts/DataContext';
import { trpc } from '@/lib/trpc';
import { useQueryClient } from '@tanstack/react-query';
import { User, Property, AppNotification } from '@/types/property';

type AdminTab =
  | 'overview' | 'pending' | 'verifications' | 'support' | 'users' | 'properties' | 'notifications'
  | 'activity' | 'audit';

const TAB_LABELS: Record<AdminTab, string> = {
  overview: 'Overview',
  pending: 'Pending',
  verifications: 'Verification',
  support: 'Support',
  users: 'Users',
  properties: 'Properties',
  notifications: 'Notifications',
  activity: 'Activity',
  audit: 'Audit',
};

function fmtDateTime(iso?: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function shortDevice(ua?: string | null): string {
  if (!ua) return 'Unknown device';
  if (/iphone|ipad|ios/i.test(ua)) return 'iOS';
  if (/android/i.test(ua)) return 'Android';
  if (/mac os/i.test(ua)) return 'Mac browser';
  if (/windows/i.test(ua)) return 'Windows browser';
  if (/linux/i.test(ua)) return 'Linux browser';
  return ua.slice(0, 40);
}

function roleColor(role: User['role']): string {
  if (role === 'superadmin') return Colors.accent;
  if (role === 'admin') return Colors.error;
  if (role === 'landlord') return Colors.primary;
  return Colors.categoryApartment;
}

function roleName(role: User['role']): string {
  return role === 'superadmin' ? 'Super Admin' : role.charAt(0).toUpperCase() + role.slice(1);
}

export default function AdminScreen() {
  const { user, isLoading: authLoading, getAllUsers, updateUserAdmin, deleteUser, isStaff, isSuperAdmin, logout } = useAuth();
  const {
    properties, pendingProperties, allBookings, updateProperty, deleteProperty, approveProperty, rejectProperty,
    supportConversations, notifications, deleteNotification, clearNotifications, markNotificationRead, refetchAll,
  } = useData();
  const [activeTab, setActiveTab] = useState<AdminTab>('overview');
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [verifFilter, setVerifFilter] = useState<'pending' | 'all'>('pending');
  const [auditSearch, setAuditSearch] = useState<string>('');
  const [auditFailuresOnly, setAuditFailuresOnly] = useState<boolean>(false);
  const [expandedUserId, setExpandedUserId] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState<boolean>(false);

  const activityQuery = trpc.superadmin.users.useQuery(undefined, {
    enabled: isSuperAdmin && activeTab === 'activity',
    refetchInterval: activeTab === 'activity' ? 15000 : false,
  });
  const sessionsQuery = trpc.superadmin.sessions.useQuery(
    { userId: expandedUserId ?? undefined, limit: 50 },
    { enabled: isSuperAdmin && !!expandedUserId }
  );
  const auditQuery = trpc.superadmin.audit.useQuery(
    { limit: 200, offset: 0, search: auditSearch.trim() || undefined, failuresOnly: auditFailuresOnly || undefined },
    { enabled: isSuperAdmin && activeTab === 'audit' }
  );
  const revokeSessionMutation = trpc.superadmin.revokeSession.useMutation({
    onSuccess: () => { void sessionsQuery.refetch(); void activityQuery.refetch(); },
  });

  const tabs = useMemo<AdminTab[]>(
    () => [
      'overview', 'pending', 'verifications', 'support', 'users', 'properties', 'notifications',
      ...(isSuperAdmin ? (['activity', 'audit'] as AdminTab[]) : []),
    ],
    [isSuperAdmin]
  );

  const supportUnread = useMemo(
    () => supportConversations.filter(c => (user ? (c.unreadCount[user.id] ?? 0) : 0) > 0 || Object.entries(c.unreadCount).some(([id, n]) => id !== c.participantIds[0] && n > 0)).length,
    [supportConversations, user]
  );
  const queryClient = useQueryClient();
  const { width: winWidth } = useWindowDimensions();
  const isWide = winWidth >= 768;
  const contentMax = isWide ? 760 : undefined;

  const reviewVerificationMutation = trpc.auth.reviewVerification.useMutation({
    onSuccess: () => {
      void queryClient.invalidateQueries();
      void loadUsers();
    },
  });

  const pendingVerifications = useMemo(
    () => allUsers.filter(u => u.verification?.status === 'pending'),
    [allUsers]
  );

  const verificationList = useMemo(() => {
    if (verifFilter === 'pending') return pendingVerifications;
    return allUsers
      .filter(u => !!u.verification)
      .sort((a, b) => (b.verification?.submittedAt ?? '').localeCompare(a.verification?.submittedAt ?? ''));
  }, [verifFilter, pendingVerifications, allUsers]);

  const handleReviewVerification = useCallback((targetUser: User, approve: boolean) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const action = approve ? 'Approve' : 'Reject';
    showAlert(
      `${action} Verification`,
      `${approve ? 'Approve' : 'Reject'} ${targetUser.name}'s ${targetUser.verification?.documentType ?? 'document'}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: action,
          style: approve ? 'default' : 'destructive',
          onPress: async () => {
            try {
              await reviewVerificationMutation.mutateAsync({ userId: targetUser.id, approve });
              void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            } catch (e) {
              console.log('[Admin] Verification review error:', e);
              showAlert('Error', e instanceof Error ? e.message : 'Could not update verification.');
            }
          },
        },
      ]
    );
  }, [reviewVerificationMutation]);

  const loadUsers = useCallback(async () => {
    try {
      const users = await getAllUsers();
      setAllUsers(users);
    } catch (e) {
      console.log('[Admin] Load users error:', e);
    }
  }, [getAllUsers]);

  useEffect(() => {
    void loadUsers();
  }, [loadUsers]);

  const stats = useMemo(() => ({
    totalUsers: allUsers.length,
    totalProperties: properties.length,
    activeProperties: properties.filter(p => p.status === 'active').length,
    totalBookings: allBookings.length,
    pendingBookings: allBookings.filter(b => b.status === 'pending').length,
    pendingProps: pendingProperties.length,
    landlords: allUsers.filter(u => u.role === 'landlord').length,
    renters: allUsers.filter(u => u.role === 'renter').length,
    featuredProperties: properties.filter(p => p.featured).length,
  }), [allUsers, properties, allBookings, pendingProperties.length]);

  const handleToggleUserActive = useCallback(async (targetUser: User) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const action = targetUser.isActive ? 'deactivate' : 'activate';
    showAlert(
      `${action.charAt(0).toUpperCase() + action.slice(1)} User`,
      `Are you sure you want to ${action} ${targetUser.name}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: action.charAt(0).toUpperCase() + action.slice(1),
          style: targetUser.isActive ? 'destructive' : 'default',
          onPress: async () => {
            try {
              await updateUserAdmin(targetUser.id, { isActive: !targetUser.isActive });
              await loadUsers();
              void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            } catch (e) {
              console.log('[Admin] Toggle user error:', e);
            }
          },
        },
      ]
    );
  }, [updateUserAdmin, loadUsers]);

  const handleDeleteUser = useCallback((targetUser: User) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    showAlert(
      'Delete user',
      `Permanently delete ${targetUser.name} (${targetUser.email}) with all their listings, bookings and messages? This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete', style: 'destructive',
          onPress: async () => {
            try {
              await deleteUser(targetUser.id);
              await loadUsers();
              void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            } catch (e) {
              showAlert('Error', e instanceof Error ? e.message : 'Could not delete user.');
            }
          },
        },
      ]
    );
  }, [deleteUser, loadUsers]);

  const handleRevokeSession = useCallback((sessionId: string) => {
    showAlert('Sign out this session?', 'The device will be signed out immediately.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign out', style: 'destructive',
        onPress: async () => {
          try {
            await revokeSessionMutation.mutateAsync({ sessionId });
          } catch (e) {
            showAlert('Error', e instanceof Error ? e.message : 'Could not revoke session.');
          }
        },
      },
    ]);
  }, [revokeSessionMutation]);

  const handleDeleteNotif = useCallback(async (id: string) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      await deleteNotification(id);
    } catch (e) {
      showAlert('Error', e instanceof Error ? e.message : 'Could not delete notification.');
    }
  }, [deleteNotification]);

  const handleClearNotifs = useCallback(() => {
    showAlert('Clear all notifications?', 'This permanently deletes every notification in your admin inbox.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Clear all', style: 'destructive',
        onPress: async () => {
          try {
            await clearNotifications();
          } catch (e) {
            showAlert('Error', e instanceof Error ? e.message : 'Could not clear notifications.');
          }
        },
      },
    ]);
  }, [clearNotifications]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await Promise.all([
        refetchAll(),
        loadUsers(),
        isSuperAdmin && activeTab === 'activity' ? activityQuery.refetch() : Promise.resolve(),
        isSuperAdmin && activeTab === 'audit' ? auditQuery.refetch() : Promise.resolve(),
      ]);
    } finally {
      setRefreshing(false);
    }
  }, [refetchAll, loadUsers, isSuperAdmin, activeTab, activityQuery, auditQuery]);

  const handleLogout = useCallback(() => {
    showAlert('Log out', 'Sign out of the admin console?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Log out', style: 'destructive', onPress: () => { void logout(); router.replace('/portal'); } },
    ]);
  }, [logout]);

  const handleToggleVerified = useCallback(async (targetUser: User) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      await updateUserAdmin(targetUser.id, { verified: !targetUser.verified });
      await loadUsers();
    } catch (e) {
      console.log('[Admin] Verify error:', e);
    }
  }, [updateUserAdmin, loadUsers]);

  const handleApproveProperty = useCallback(async (property: Property) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    showAlert('Approve Property', `Approve "${property.title}" to go live?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Approve',
        onPress: async () => {
          try {
            await approveProperty(property.id);
            void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          } catch (e) {
            console.log('[Admin] Approve error:', e);
          }
        },
      },
    ]);
  }, [approveProperty]);

  const handleRejectProperty = useCallback(async (property: Property) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    showAlert('Reject Property', `Reject "${property.title}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Reject', style: 'destructive',
        onPress: async () => {
          try {
            await rejectProperty(property.id);
            void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          } catch (e) {
            console.log('[Admin] Reject error:', e);
          }
        },
      },
    ]);
  }, [rejectProperty]);

  const handleToggleFeatured = useCallback(async (property: Property) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      await updateProperty({ id: property.id, updates: { featured: !property.featured } });
    } catch (e) {
      console.log('[Admin] Feature error:', e);
    }
  }, [updateProperty]);

  const handleDeleteProperty = useCallback(async (property: Property) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    showAlert('Delete Property', `Delete "${property.title}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive',
        onPress: async () => {
          try {
            await deleteProperty(property.id);
            void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          } catch (e) {
            console.log('[Admin] Delete error:', e);
          }
        },
      },
    ]);
  }, [deleteProperty]);

  if (authLoading) {
    return (
      <View style={[styles.container, styles.deniedState]}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  if (!isStaff) {
    return (
      <View style={styles.container}>
        <SafeAreaView edges={['top']} style={styles.safeArea}>
          <View style={styles.header}>
            <Pressable onPress={() => goBack()} style={styles.backBtn}><ArrowLeft size={22} color={Colors.text} /></Pressable>
            <Text style={styles.headerTitle}>Access Denied</Text>
            <View style={{ width: 40 }} />
          </View>
        </SafeAreaView>
        <View style={styles.deniedState}>
          <Shield size={56} color={Colors.error} />
          <Text style={styles.deniedTitle}>Admin Access Required</Text>
        </View>
      </View>
    );
  }

  const renderOverview = () => (
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={[styles.tabContent, isWide && { maxWidth: contentMax, alignSelf: 'center', width: '100%' }]}>
      <Text style={styles.sectionTitle}>Platform Stats</Text>
      <View style={styles.statsGrid}>
        <View style={[styles.statCard, { backgroundColor: Colors.primary + '10' }]}>
          <Users size={24} color={Colors.primary} />
          <Text style={styles.statNumber}>{stats.totalUsers}</Text>
          <Text style={styles.statLabel}>Total Users</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: Colors.accent + '10' }]}>
          <Building2 size={24} color={Colors.accent} />
          <Text style={styles.statNumber}>{stats.totalProperties}</Text>
          <Text style={styles.statLabel}>Properties</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: Colors.success + '10' }]}>
          <Calendar size={24} color={Colors.success} />
          <Text style={styles.statNumber}>{stats.totalBookings}</Text>
          <Text style={styles.statLabel}>Bookings</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: Colors.categoryOffice + '10' }]}>
          <TrendingUp size={24} color={Colors.categoryOffice} />
          <Text style={styles.statNumber}>{stats.pendingBookings}</Text>
          <Text style={styles.statLabel}>Pending Bookings</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: Colors.warning + '10' }]}>
          <Shield size={24} color={Colors.warning} />
          <Text style={styles.statNumber}>{stats.pendingProps}</Text>
          <Text style={styles.statLabel}>Pending Approval</Text>
        </View>
      </View>

      <Text style={styles.sectionTitle}>User Breakdown</Text>
      <View style={styles.breakdownCard}>
        <View style={styles.breakdownRow}>
          <View style={styles.breakdownLeft}>
            <View style={[styles.breakdownDot, { backgroundColor: Colors.primary }]} />
            <Text style={styles.breakdownLabel}>Landlords</Text>
          </View>
          <Text style={styles.breakdownValue}>{stats.landlords}</Text>
        </View>
        <View style={styles.breakdownRow}>
          <View style={styles.breakdownLeft}>
            <View style={[styles.breakdownDot, { backgroundColor: Colors.categoryApartment }]} />
            <Text style={styles.breakdownLabel}>Renters</Text>
          </View>
          <Text style={styles.breakdownValue}>{stats.renters}</Text>
        </View>
        <View style={styles.breakdownRow}>
          <View style={styles.breakdownLeft}>
            <View style={[styles.breakdownDot, { backgroundColor: Colors.accent }]} />
            <Text style={styles.breakdownLabel}>Featured Properties</Text>
          </View>
          <Text style={styles.breakdownValue}>{stats.featuredProperties}</Text>
        </View>
        <View style={styles.breakdownRow}>
          <View style={styles.breakdownLeft}>
            <View style={[styles.breakdownDot, { backgroundColor: Colors.success }]} />
            <Text style={styles.breakdownLabel}>Active Properties</Text>
          </View>
          <Text style={styles.breakdownValue}>{stats.activeProperties}</Text>
        </View>
      </View>

      <Text style={styles.sectionTitle}>Quick Actions</Text>
      <Pressable style={styles.quickAction} onPress={() => setActiveTab('users')}>
        <Users size={20} color={Colors.primary} />
        <Text style={styles.quickActionText}>Manage Users</Text>
        <ChevronRight size={18} color={Colors.textLight} />
      </Pressable>
      {stats.pendingProps > 0 && (
        <Pressable style={[styles.quickAction, { borderLeftWidth: 3, borderLeftColor: Colors.warning }]} onPress={() => setActiveTab('pending')}>
          <Shield size={20} color={Colors.warning} />
          <Text style={styles.quickActionText}>Review Pending Properties ({stats.pendingProps})</Text>
          <ChevronRight size={18} color={Colors.textLight} />
        </Pressable>
      )}
      <Pressable style={styles.quickAction} onPress={() => setActiveTab('properties')}>
        <Building2 size={20} color={Colors.accent} />
        <Text style={styles.quickActionText}>Manage Properties</Text>
        <ChevronRight size={18} color={Colors.textLight} />
      </Pressable>
      {pendingVerifications.length > 0 && (
        <Pressable style={[styles.quickAction, { borderLeftWidth: 3, borderLeftColor: Colors.primary }]} onPress={() => setActiveTab('verifications')}>
          <BadgeCheck size={20} color={Colors.primary} />
          <Text style={styles.quickActionText}>Review Verifications ({pendingVerifications.length})</Text>
          <ChevronRight size={18} color={Colors.textLight} />
        </Pressable>
      )}
      <Pressable style={styles.quickAction} onPress={() => setActiveTab('support')}>
        <MessageCircle size={20} color={Colors.categoryOffice} />
        <Text style={styles.quickActionText}>Support Inbox ({supportConversations.length})</Text>
        <ChevronRight size={18} color={Colors.textLight} />
      </Pressable>
      <Pressable style={styles.quickAction} onPress={() => router.push('/bookings')}>
        <Calendar size={20} color={Colors.success} />
        <Text style={styles.quickActionText}>View All Bookings</Text>
        <ChevronRight size={18} color={Colors.textLight} />
      </Pressable>
    </ScrollView>
  );

  const listStyle = [styles.tabContent, isWide && { maxWidth: contentMax, alignSelf: 'center' as const, width: '100%' as const }];
  const refresh = <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={Colors.primary} />;

  const renderVerifications = () => (
    <FlatList
      data={verificationList}
      keyExtractor={(item) => item.id}
      contentContainerStyle={listStyle}
      refreshControl={refresh}
      ListHeaderComponent={
        <View style={styles.segment}>
          {(['pending', 'all'] as const).map(f => (
            <Pressable key={f} style={[styles.segmentBtn, verifFilter === f && styles.segmentBtnActive]} onPress={() => setVerifFilter(f)} testID={`verif-filter-${f}`}>
              <Text style={[styles.segmentText, verifFilter === f && styles.segmentTextActive]}>
                {f === 'pending' ? `Pending (${pendingVerifications.length})` : 'All submissions'}
              </Text>
            </Pressable>
          ))}
        </View>
      }
      ListEmptyComponent={
        <View style={styles.emptyPending}>
          <BadgeCheck size={48} color={Colors.success} />
          <Text style={styles.emptyPendingTitle}>{verifFilter === 'pending' ? 'No pending verifications' : 'No submissions yet'}</Text>
          <Text style={styles.emptyPendingSubtitle}>Landlord identity checks will appear here</Text>
        </View>
      }
      renderItem={({ item: u }) => (
        <View style={styles.verifCard} testID={`verif-card-${u.id}`}>
          <View style={styles.verifHeader}>
            <SafeImage uri={u.avatar} style={styles.userAvatar} />
            <View style={styles.userInfo}>
              <Text style={styles.userName}>{u.name}</Text>
              <Text style={styles.userEmail}>{u.email}</Text>
            </View>
            <View style={{ alignItems: 'flex-end', gap: 4 }}>
              <View style={styles.verifDocBadge}>
                <Text style={styles.verifDocText}>{u.verification?.documentType ?? 'Document'}</Text>
              </View>
              <Text style={[styles.verifStatus, { color: u.verification?.status === 'approved' ? Colors.success : u.verification?.status === 'rejected' ? Colors.error : Colors.warning }]}>
                {(u.verification?.status ?? 'pending').toUpperCase()}
              </Text>
            </View>
          </View>
          <View style={styles.verifBody}>
            <View style={styles.verifDetailRow}>
              <Text style={styles.verifDetailLabel}>Name on document</Text>
              <Text style={styles.verifDetailValue}>{u.verification?.documentName ?? '-'}</Text>
            </View>
            {!!u.verification?.documentNumber && (
              <View style={styles.verifDetailRow}>
                <Text style={styles.verifDetailLabel}>Document number</Text>
                <Text style={styles.verifDetailValue}>{u.verification.documentNumber}</Text>
              </View>
            )}
            {u.verification?.documentName?.toLowerCase() !== u.name.toLowerCase() && (
              <Text style={styles.verifMismatch}>Name does not match the account — review carefully.</Text>
            )}
            <View style={styles.verifDetailRow}>
              <Text style={styles.verifDetailLabel}>Submitted</Text>
              <Text style={styles.verifDetailValue}>{fmtDateTime(u.verification?.submittedAt)}</Text>
            </View>
            {u.verification?.documentImage ? (
              <SafeImage uri={u.verification.documentImage} style={styles.verifImage} contentFit="contain" testID={`verif-doc-${u.id}`} />
            ) : (
              <Text style={styles.verifMismatch}>No document image attached.</Text>
            )}
          </View>
          <View style={styles.pendingActions}>
            <Pressable style={styles.rejectBtn} onPress={() => handleReviewVerification(u, false)} testID={`verif-reject-${u.id}`}>
              <ShieldOff size={16} color={Colors.error} />
              <Text style={styles.rejectBtnText}>Reject</Text>
            </Pressable>
            <Pressable style={styles.approveBtn} onPress={() => handleReviewVerification(u, true)} testID={`verif-approve-${u.id}`}>
              <BadgeCheck size={16} color={Colors.white} />
              <Text style={styles.approveBtnText}>Approve</Text>
            </Pressable>
          </View>
        </View>
      )}
    />
  );

  const renderSupport = () => (
    <FlatList
      data={supportConversations}
      keyExtractor={(item) => item.id}
      contentContainerStyle={listStyle}
      refreshControl={refresh}
      ListEmptyComponent={
        <View style={styles.emptyPending}>
          <MessageCircle size={48} color={Colors.textLight} />
          <Text style={styles.emptyPendingTitle}>No support chats</Text>
          <Text style={styles.emptyPendingSubtitle}>Messages members send to Support land here</Text>
        </View>
      }
      renderItem={({ item: c }) => {
        const unread = Object.entries(c.unreadCount).filter(([id]) => id !== c.participantIds[0]).reduce((s, [, n]) => s + n, 0);
        return (
          <Pressable style={styles.userCard} onPress={() => router.push(`/chat/${c.id}`)} testID={`support-${c.id}`}>
            <SafeImage uri={c.participantAvatars[0]} style={styles.userAvatar} />
            <View style={styles.userInfo}>
              <Text style={styles.userName}>{c.participantNames[0] ?? 'Member'}</Text>
              <Text style={styles.userEmail} numberOfLines={2}>{c.lastMessage}</Text>
              <Text style={styles.pendingDate}>{fmtDateTime(c.lastMessageTime)}</Text>
            </View>
            {unread > 0 ? (
              <View style={styles.tabBadge}><Text style={styles.tabBadgeText}>{unread}</Text></View>
            ) : <ChevronRight size={18} color={Colors.textLight} />}
          </Pressable>
        );
      }}
    />
  );

  const renderNotifications = () => (
    <FlatList
      data={notifications}
      keyExtractor={(item) => item.id}
      contentContainerStyle={listStyle}
      refreshControl={refresh}
      ListHeaderComponent={notifications.length > 0 ? (
        <Pressable style={styles.clearAllBtn} onPress={handleClearNotifs} testID="admin-clear-notifications">
          <Trash2 size={16} color={Colors.error} />
          <Text style={styles.clearAllText}>Clear all ({notifications.length})</Text>
        </Pressable>
      ) : null}
      ListEmptyComponent={
        <View style={styles.emptyPending}>
          <Bell size={48} color={Colors.textLight} />
          <Text style={styles.emptyPendingTitle}>Inbox empty</Text>
        </View>
      }
      renderItem={({ item: n }: { item: AppNotification }) => (
        <Pressable
          style={[styles.userCard, !n.read && { borderLeftWidth: 3, borderLeftColor: Colors.primary }]}
          onPress={() => {
            if (!n.read) void markNotificationRead(n.id);
            if (n.type === 'verification') setActiveTab('verifications');
            else if (n.data?.conversationId) router.push(`/chat/${n.data.conversationId}`);
            else if (n.data?.propertyId) router.push(`/property/${n.data.propertyId}`);
          }}
          testID={`admin-notif-${n.id}`}
        >
          <View style={styles.userInfo}>
            <Text style={styles.userName}>{n.title}</Text>
            <Text style={styles.userEmail} numberOfLines={3}>{n.message}</Text>
            <Text style={styles.pendingDate}>{fmtDateTime(n.createdAt)}</Text>
          </View>
          <Pressable style={styles.userActionBtn} onPress={() => void handleDeleteNotif(n.id)} hitSlop={8} testID={`admin-delete-notif-${n.id}`}>
            <X size={16} color={Colors.textSecondary} />
          </Pressable>
        </Pressable>
      )}
    />
  );

  const renderActivity = () => {
    const rows = activityQuery.data ?? [];
    return (
      <FlatList
        data={rows}
        keyExtractor={(item) => item.id}
        contentContainerStyle={listStyle}
        refreshControl={refresh}
        ListHeaderComponent={
          <Text style={styles.sectionHint}>Every account with its sign-in history. Tap a user to see sessions and sign devices out.</Text>
        }
        ListEmptyComponent={activityQuery.isLoading ? <ActivityIndicator style={{ marginTop: 40 }} color={Colors.primary} /> : null}
        renderItem={({ item: u }) => {
          const expanded = expandedUserId === u.id;
          return (
            <View style={styles.activityCard}>
              <Pressable style={styles.activityTop} onPress={() => setExpandedUserId(expanded ? null : u.id)} testID={`activity-${u.id}`}>
                <SafeImage uri={u.avatar} style={styles.userAvatar} />
                <View style={styles.userInfo}>
                  <View style={styles.userNameRow}>
                    <Text style={styles.userName}>{u.name}</Text>
                    {u.stats.activeSessions > 0 && <View style={styles.onlineDot} />}
                  </View>
                  <Text style={styles.userEmail}>{u.email}{u.phone ? ` · ${u.phone}` : ''}</Text>
                  <View style={styles.userMeta}>
                    <View style={[styles.rolePill, { backgroundColor: roleColor(u.role) + '15' }]}>
                      <Text style={[styles.roleText, { color: roleColor(u.role) }]}>{roleName(u.role)}</Text>
                    </View>
                    <Text style={styles.activeText}>{u.country ?? ''}{u.region ? `, ${u.region}` : ''}</Text>
                  </View>
                </View>
                <ChevronRight size={18} color={Colors.textLight} style={{ transform: [{ rotate: expanded ? '90deg' : '0deg' }] }} />
              </Pressable>
              <View style={styles.activityGrid}>
                <View style={styles.activityCell}><Text style={styles.activityLabel}>Last login</Text><Text style={styles.activityValue}>{fmtDateTime(u.stats.lastLoginAt)}</Text></View>
                <View style={styles.activityCell}><Text style={styles.activityLabel}>Last logout</Text><Text style={styles.activityValue}>{fmtDateTime(u.stats.lastLogoutAt)}</Text></View>
                <View style={styles.activityCell}><Text style={styles.activityLabel}>Last seen</Text><Text style={styles.activityValue}>{fmtDateTime(u.stats.lastSeenAt)}</Text></View>
                <View style={styles.activityCell}><Text style={styles.activityLabel}>Sessions</Text><Text style={styles.activityValue}>{u.stats.activeSessions} active / {u.stats.sessionsCount}</Text></View>
                <View style={styles.activityCell}><Text style={styles.activityLabel}>Joined</Text><Text style={styles.activityValue}>{u.createdAt ? fmtDateTime(u.createdAt) : u.memberSince}</Text></View>
                <View style={styles.activityCell}><Text style={styles.activityLabel}>Last device</Text><Text style={styles.activityValue}>{shortDevice(u.stats.lastDevice)}{u.stats.lastIp ? ` · ${u.stats.lastIp}` : ''}</Text></View>
              </View>
              {expanded && (
                <View style={styles.sessionList}>
                  {sessionsQuery.isLoading && <ActivityIndicator color={Colors.primary} />}
                  {(sessionsQuery.data ?? []).map(s => {
                    const live = !s.loggedOutAt && Date.parse(s.expiresAt) > Date.now();
                    return (
                      <View key={s.id} style={styles.sessionRow}>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.sessionTitle}>
                            {s.portal === 'admin' ? 'Staff portal' : 'App'} · {shortDevice(s.userAgent)}{s.ip ? ` · ${s.ip}` : ''}
                          </Text>
                          <Text style={styles.sessionMeta}>
                            In {fmtDateTime(s.createdAt)} · {live ? `active, seen ${fmtDateTime(s.lastSeenAt)}` : `out ${fmtDateTime(s.loggedOutAt ?? s.expiresAt)} (${s.endReason ?? 'expired'})`}
                          </Text>
                        </View>
                        {live && s.userId !== user?.id && (
                          <Pressable style={styles.revokeBtn} onPress={() => handleRevokeSession(s.id)} testID={`revoke-${s.id}`}>
                            <LogOut size={14} color={Colors.error} />
                          </Pressable>
                        )}
                      </View>
                    );
                  })}
                  {!sessionsQuery.isLoading && (sessionsQuery.data ?? []).length === 0 && (
                    <Text style={styles.sessionMeta}>No sessions recorded.</Text>
                  )}
                </View>
              )}
            </View>
          );
        }}
      />
    );
  };

  const renderAudit = () => (
    <FlatList
      data={auditQuery.data?.entries ?? []}
      keyExtractor={(item) => item.id}
      contentContainerStyle={listStyle}
      refreshControl={refresh}
      keyboardShouldPersistTaps="handled"
      ListHeaderComponent={
        <View style={{ gap: 10, marginBottom: 12 }}>
          <View style={styles.searchBox}>
            <Search size={16} color={Colors.textLight} />
            <TextInput
              style={styles.searchInput}
              value={auditSearch}
              onChangeText={setAuditSearch}
              placeholder="Search action, email, id, IP…"
              placeholderTextColor={Colors.textLight}
              autoCapitalize="none"
              autoCorrect={false}
              testID="audit-search"
            />
          </View>
          <View style={styles.segment}>
            {([false, true] as const).map(f => (
              <Pressable key={String(f)} style={[styles.segmentBtn, auditFailuresOnly === f && styles.segmentBtnActive]} onPress={() => setAuditFailuresOnly(f)}>
                <Text style={[styles.segmentText, auditFailuresOnly === f && styles.segmentTextActive]}>{f ? 'Failures only' : 'All events'}</Text>
              </Pressable>
            ))}
          </View>
          <Text style={styles.sectionHint}>{auditQuery.data ? `${auditQuery.data.total} events` : 'Loading…'}</Text>
        </View>
      }
      renderItem={({ item: e }) => (
        <View style={[styles.auditRow, !e.success && { borderLeftColor: Colors.error }]} testID={`audit-${e.id}`}>
          <View style={styles.auditTop}>
            <Text style={[styles.auditAction, !e.success && { color: Colors.error }]}>{e.action}</Text>
            <Text style={styles.auditTime}>{fmtDateTime(e.at)}</Text>
          </View>
          <Text style={styles.auditMeta}>
            {e.actorEmail ?? e.actorId ?? 'anonymous'}{e.actorRole ? ` (${e.actorRole})` : ''}
            {e.targetType ? ` → ${e.targetType} ${e.targetId ?? ''}` : ''}
          </Text>
          {!!e.detail && <Text style={styles.auditDetail}>{e.detail}</Text>}
          {!!e.ip && <Text style={styles.auditTime}>IP {e.ip}</Text>}
        </View>
      )}
    />
  );

  const renderUsers = () => (
    <FlatList
      data={allUsers}
      keyExtractor={(item) => item.id}
      contentContainerStyle={listStyle}
      refreshControl={refresh}
      renderItem={({ item: u }) => {
        const isTargetStaff = u.role === 'admin' || u.role === 'superadmin';
        const canManage = u.id !== user?.id && u.role !== 'superadmin' && (!isTargetStaff || isSuperAdmin);
        return (
        <View style={styles.userCard} testID={`user-${u.id}`}>
          <SafeImage uri={u.avatar} style={styles.userAvatar} />
          <View style={styles.userInfo}>
            <View style={styles.userNameRow}>
              <Text style={styles.userName}>{u.name}</Text>
              {u.verified && <Shield size={14} color={Colors.success} />}
            </View>
            <Text style={styles.userEmail}>{u.email}</Text>
            <View style={styles.userMeta}>
              <View style={[styles.rolePill, { backgroundColor: roleColor(u.role) + '15' }]}>
                <Text style={[styles.roleText, { color: roleColor(u.role) }]}>{roleName(u.role)}</Text>
              </View>
              <Text style={[styles.activeText, { color: u.isActive ? Colors.success : Colors.error }]}>
                {u.isActive ? 'Active' : 'Inactive'}
              </Text>
            </View>
          </View>
          {canManage && (
            <View style={styles.userActions}>
              <Pressable style={styles.userActionBtn} onPress={() => handleToggleVerified(u)} testID={`verify-user-${u.id}`}>
                <Shield size={16} color={u.verified ? Colors.success : Colors.textLight} />
              </Pressable>
              <Pressable style={[styles.userActionBtn, !u.isActive && { backgroundColor: Colors.success + '12' }]} onPress={() => handleToggleUserActive(u)} testID={`toggle-user-${u.id}`}>
                {u.isActive ? <UserX size={16} color={Colors.error} /> : <UserCheck size={16} color={Colors.success} />}
              </Pressable>
              <Pressable style={[styles.userActionBtn, { backgroundColor: Colors.error + '10' }]} onPress={() => handleDeleteUser(u)} testID={`delete-user-${u.id}`}>
                <Trash2 size={16} color={Colors.error} />
              </Pressable>
            </View>
          )}
          {u.role === 'superadmin' && <Crown size={18} color={Colors.accent} />}
        </View>
        );
      }}
    />
  );

  const renderPending = () => (
    <FlatList
      data={pendingProperties}
      keyExtractor={(item) => item.id}
      contentContainerStyle={listStyle}
      refreshControl={refresh}
      ListEmptyComponent={
        <View style={styles.emptyPending}>
          <Shield size={48} color={Colors.success} />
          <Text style={styles.emptyPendingTitle}>All caught up!</Text>
          <Text style={styles.emptyPendingSubtitle}>No properties waiting for approval</Text>
        </View>
      }
      renderItem={({ item: p }) => (
        <View style={styles.pendingCard}>
          <Pressable style={styles.propTop} onPress={() => router.push(`/property/${p.id}`)}>
            <SafeImage uri={p.images[0]} style={styles.pendingImage} />
            <View style={styles.propInfo}>
              <Text style={styles.propTitle} numberOfLines={1}>{p.title}</Text>
              <Text style={styles.propOwner}>by {p.ownerName}</Text>
              <Text style={styles.propPrice}>{p.currency}{p.price.toLocaleString()}{p.period ?? ''}</Text>
              <Text style={styles.pendingDate}>Submitted {p.createdAt}</Text>
            </View>
          </Pressable>
          <View style={styles.pendingImages}>
            {p.images.slice(0, 3).map((img, idx) => (
              <SafeImage key={idx} uri={img} style={styles.pendingThumb} contentFit="cover" />
            ))}
          </View>
          <View style={styles.pendingActions}>
            <Pressable style={styles.rejectBtn} onPress={() => handleRejectProperty(p)} testID={`reject-${p.id}`}>
              <ShieldOff size={16} color={Colors.error} />
              <Text style={styles.rejectBtnText}>Reject</Text>
            </Pressable>
            <Pressable style={styles.approveBtn} onPress={() => handleApproveProperty(p)} testID={`approve-${p.id}`}>
              <Shield size={16} color={Colors.white} />
              <Text style={styles.approveBtnText}>Approve</Text>
            </Pressable>
          </View>
        </View>
      )}
    />
  );

  const renderProperties = () => (
    <FlatList
      data={properties}
      keyExtractor={(item) => item.id}
      contentContainerStyle={listStyle}
      refreshControl={refresh}
      renderItem={({ item: p }) => (
        <View style={styles.propCard}>
          <Pressable style={styles.propTop} onPress={() => router.push(`/property/${p.id}`)}>
            <SafeImage uri={p.images[0]} style={styles.propImage} />
            <View style={styles.propInfo}>
              <Text style={styles.propTitle} numberOfLines={1}>{p.title}</Text>
              <Text style={styles.propOwner}>by {p.ownerName}</Text>
              <Text style={styles.propPrice}>{p.currency}{p.price.toLocaleString()}{p.period ?? ''}</Text>
              <View style={[styles.statusPill, { backgroundColor: p.status === 'active' ? Colors.success + '15' : Colors.warning + '15' }]}>
                <Text style={[styles.statusText, { color: p.status === 'active' ? Colors.success : Colors.warning }]}>
                  {p.status.charAt(0).toUpperCase() + p.status.slice(1)}
                </Text>
              </View>
            </View>
          </Pressable>
          <View style={styles.propActions}>
            <Pressable style={styles.propActionBtn} onPress={() => router.push(`/property/${p.id}`)}>
              <Eye size={16} color={Colors.primary} />
            </Pressable>
            <Pressable style={styles.propActionBtn} onPress={() => handleToggleFeatured(p)}>
              <Star size={16} color={p.featured ? Colors.accent : Colors.textLight} fill={p.featured ? Colors.accent : 'transparent'} />
            </Pressable>
            <Pressable style={[styles.propActionBtn, { backgroundColor: Colors.error + '10' }]} onPress={() => handleDeleteProperty(p)}>
              <Trash2 size={16} color={Colors.error} />
            </Pressable>
          </View>
        </View>
      )}
    />
  );

  return (
    <View style={styles.container}>
      <SafeAreaView edges={['top']} style={styles.safeArea}>
        <View style={styles.header}>
          <Pressable onPress={() => goBack()} style={styles.backBtn} testID="back">
            <ArrowLeft size={22} color={Colors.text} />
          </Pressable>
          <View style={{ alignItems: 'center' }}>
            <Text style={styles.headerTitle}>{isSuperAdmin ? 'Super Admin' : 'Admin Dashboard'}</Text>
            <Text style={styles.headerSub}>{user?.email}</Text>
          </View>
          <Pressable onPress={handleLogout} style={styles.backBtn} testID="admin-logout">
            <LogOut size={20} color={Colors.error} />
          </Pressable>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabBar} style={styles.tabBarWrap}>
          {tabs.map(tab => (
            <Pressable key={tab} style={[styles.tab, activeTab === tab && styles.tabActive]} onPress={() => { setActiveTab(tab); if (tab === 'users' || tab === 'verifications' || tab === 'overview') void loadUsers(); }} testID={`admin-tab-${tab}`}>
              <View style={styles.tabInner}>
                {tab === 'activity' && <Activity size={13} color={activeTab === tab ? Colors.white : Colors.textSecondary} />}
                {tab === 'audit' && <ScrollText size={13} color={activeTab === tab ? Colors.white : Colors.textSecondary} />}
                <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]} numberOfLines={1}>
                  {TAB_LABELS[tab]}
                </Text>
                {tab === 'pending' && pendingProperties.length > 0 && (
                  <View style={styles.tabBadge}>
                    <Text style={styles.tabBadgeText}>{pendingProperties.length}</Text>
                  </View>
                )}
                {tab === 'verifications' && pendingVerifications.length > 0 && (
                  <View style={styles.tabBadge}>
                    <Text style={styles.tabBadgeText}>{pendingVerifications.length}</Text>
                  </View>
                )}
                {tab === 'support' && supportUnread > 0 && (
                  <View style={styles.tabBadge}>
                    <Text style={styles.tabBadgeText}>{supportUnread}</Text>
                  </View>
                )}
                {tab === 'notifications' && notifications.some(n => !n.read) && (
                  <View style={styles.tabBadge}>
                    <Text style={styles.tabBadgeText}>{notifications.filter(n => !n.read).length}</Text>
                  </View>
                )}
              </View>
            </Pressable>
          ))}
        </ScrollView>
      </SafeAreaView>

      {activeTab === 'overview' && renderOverview()}
      {activeTab === 'pending' && renderPending()}
      {activeTab === 'verifications' && renderVerifications()}
      {activeTab === 'users' && renderUsers()}
      {activeTab === 'properties' && renderProperties()}
      {activeTab === 'support' && renderSupport()}
      {activeTab === 'notifications' && renderNotifications()}
      {activeTab === 'activity' && isSuperAdmin && renderActivity()}
      {activeTab === 'audit' && isSuperAdmin && renderAudit()}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  safeArea: { backgroundColor: Colors.white },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 12, backgroundColor: Colors.white },
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: Colors.background, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 20, fontWeight: '700' as const, color: Colors.text },
  headerSub: { fontSize: 11, color: Colors.textLight, marginTop: 1 },
  tabBarWrap: { flexGrow: 0, backgroundColor: Colors.white, borderBottomWidth: 1, borderBottomColor: Colors.borderLight },
  tabBar: { flexDirection: 'row', paddingHorizontal: 20, paddingBottom: 12, gap: 8 },
  tab: { paddingVertical: 8, paddingHorizontal: 14, borderRadius: 12, backgroundColor: Colors.background, alignItems: 'center' },
  segment: { flexDirection: 'row', backgroundColor: Colors.white, borderRadius: 12, padding: 4, gap: 4, marginBottom: 12 },
  segmentBtn: { flex: 1, paddingVertical: 8, borderRadius: 9, alignItems: 'center' },
  segmentBtnActive: { backgroundColor: Colors.primary },
  segmentText: { fontSize: 13, fontWeight: '600' as const, color: Colors.textSecondary },
  segmentTextActive: { color: Colors.white },
  sectionHint: { fontSize: 12, color: Colors.textSecondary, marginBottom: 10 },
  verifStatus: { fontSize: 10, fontWeight: '800' as const, letterSpacing: 0.5 },
  clearAllBtn: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-end', gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, backgroundColor: Colors.error + '10', marginBottom: 10 },
  clearAllText: { fontSize: 13, fontWeight: '600' as const, color: Colors.error },
  activityCard: { backgroundColor: Colors.white, borderRadius: 14, marginBottom: 10, overflow: 'hidden' },
  activityTop: { flexDirection: 'row', alignItems: 'center', padding: 14, gap: 12 },
  onlineDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.success },
  activityGrid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 14, paddingBottom: 12, rowGap: 8 },
  activityCell: { width: '50%', paddingRight: 8 },
  activityLabel: { fontSize: 10, fontWeight: '700' as const, color: Colors.textLight, textTransform: 'uppercase' as const, letterSpacing: 0.4 },
  activityValue: { fontSize: 12, fontWeight: '600' as const, color: Colors.text, marginTop: 1 },
  sessionList: { borderTopWidth: 1, borderTopColor: Colors.borderLight, padding: 12, gap: 10, backgroundColor: Colors.background },
  sessionRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  sessionTitle: { fontSize: 12, fontWeight: '700' as const, color: Colors.text },
  sessionMeta: { fontSize: 11, color: Colors.textSecondary, marginTop: 1 },
  revokeBtn: { width: 30, height: 30, borderRadius: 8, backgroundColor: Colors.error + '12', alignItems: 'center', justifyContent: 'center' },
  searchBox: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: Colors.white, borderRadius: 12, paddingHorizontal: 12, borderWidth: 1, borderColor: Colors.border },
  searchInput: { flex: 1, paddingVertical: 10, fontSize: 14, color: Colors.text },
  auditRow: { backgroundColor: Colors.white, borderRadius: 10, padding: 12, marginBottom: 6, borderLeftWidth: 3, borderLeftColor: Colors.success },
  auditTop: { flexDirection: 'row', justifyContent: 'space-between', gap: 8 },
  auditAction: { fontSize: 13, fontWeight: '700' as const, color: Colors.text, fontFamily: undefined },
  auditTime: { fontSize: 11, color: Colors.textLight },
  auditMeta: { fontSize: 12, color: Colors.textSecondary, marginTop: 3 },
  auditDetail: { fontSize: 12, color: Colors.text, marginTop: 3 },
  tabActive: { backgroundColor: Colors.primary },
  tabText: { fontSize: 13, fontWeight: '600' as const, color: Colors.textSecondary },
  tabTextActive: { color: Colors.white },
  tabContent: { padding: 20, paddingBottom: 40 },
  deniedState: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16 },
  deniedTitle: { fontSize: 18, fontWeight: '600' as const, color: Colors.text },
  sectionTitle: { fontSize: 16, fontWeight: '700' as const, color: Colors.text, marginBottom: 12, marginTop: 8 },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 16 },
  statCard: { width: '47%', padding: 16, borderRadius: 16, alignItems: 'center', gap: 8 },
  statNumber: { fontSize: 28, fontWeight: '800' as const, color: Colors.text },
  statLabel: { fontSize: 12, fontWeight: '500' as const, color: Colors.textSecondary },
  breakdownCard: { backgroundColor: Colors.white, borderRadius: 16, padding: 16, marginBottom: 16, gap: 12 },
  breakdownRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  breakdownLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  breakdownDot: { width: 10, height: 10, borderRadius: 5 },
  breakdownLabel: { fontSize: 14, color: Colors.text, fontWeight: '500' as const },
  breakdownValue: { fontSize: 16, fontWeight: '700' as const, color: Colors.text },
  quickAction: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.white, padding: 16, borderRadius: 14, marginBottom: 8, gap: 12 },
  quickActionText: { flex: 1, fontSize: 15, fontWeight: '600' as const, color: Colors.text },
  userCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.white, borderRadius: 14, padding: 14, marginBottom: 8, gap: 12 },
  userAvatar: { width: 48, height: 48, borderRadius: 24 },
  userInfo: { flex: 1 },
  userNameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  userName: { fontSize: 15, fontWeight: '700' as const, color: Colors.text },
  userEmail: { fontSize: 12, color: Colors.textSecondary, marginTop: 2 },
  userMeta: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 },
  rolePill: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 },
  roleText: { fontSize: 11, fontWeight: '600' as const },
  activeText: { fontSize: 11, fontWeight: '600' as const },
  userActions: { flexDirection: 'row', gap: 6 },
  userActionBtn: { width: 36, height: 36, borderRadius: 10, backgroundColor: Colors.background, alignItems: 'center', justifyContent: 'center' },
  propCard: { backgroundColor: Colors.white, borderRadius: 14, overflow: 'hidden', marginBottom: 10 },
  propTop: { flexDirection: 'row', padding: 12, gap: 12 },
  propImage: { width: 70, height: 70, borderRadius: 10 },
  propInfo: { flex: 1 },
  propTitle: { fontSize: 15, fontWeight: '700' as const, color: Colors.text },
  propOwner: { fontSize: 12, color: Colors.textSecondary, marginTop: 2 },
  propPrice: { fontSize: 16, fontWeight: '800' as const, color: Colors.primary, marginTop: 4 },
  statusPill: { alignSelf: 'flex-start' as const, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8, marginTop: 4 },
  statusText: { fontSize: 11, fontWeight: '600' as const },
  propActions: { flexDirection: 'row', borderTopWidth: 1, borderTopColor: Colors.borderLight, padding: 8, gap: 8 },
  propActionBtn: { flex: 1, paddingVertical: 8, borderRadius: 8, backgroundColor: Colors.background, alignItems: 'center' },
  tabInner: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  tabBadge: { backgroundColor: Colors.error, borderRadius: 8, minWidth: 16, height: 16, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 },
  tabBadgeText: { color: Colors.white, fontSize: 9, fontWeight: '700' as const },
  emptyPending: { alignItems: 'center', paddingVertical: 80, gap: 12 },
  emptyPendingTitle: { fontSize: 18, fontWeight: '700' as const, color: Colors.text },
  emptyPendingSubtitle: { fontSize: 14, color: Colors.textSecondary },
  pendingCard: { backgroundColor: Colors.white, borderRadius: 14, overflow: 'hidden', marginBottom: 12, borderLeftWidth: 3, borderLeftColor: Colors.warning },
  pendingImage: { width: 70, height: 70, borderRadius: 10 },
  pendingDate: { fontSize: 11, color: Colors.textLight, marginTop: 2 },
  pendingImages: { flexDirection: 'row', paddingHorizontal: 12, paddingBottom: 10, gap: 6 },
  pendingThumb: { width: 80, height: 56, borderRadius: 8 },
  pendingActions: { flexDirection: 'row', borderTopWidth: 1, borderTopColor: Colors.borderLight, padding: 10, gap: 10 },
  rejectBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10, borderRadius: 10, backgroundColor: Colors.error + '10' },
  rejectBtnText: { fontSize: 14, fontWeight: '600' as const, color: Colors.error },
  approveBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10, borderRadius: 10, backgroundColor: Colors.success },
  approveBtnText: { fontSize: 14, fontWeight: '600' as const, color: Colors.white },
  verifCard: { backgroundColor: Colors.white, borderRadius: 14, overflow: 'hidden', marginBottom: 12, borderLeftWidth: 3, borderLeftColor: Colors.primary },
  verifHeader: { flexDirection: 'row', alignItems: 'center', padding: 12, gap: 12 },
  verifDocBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10, backgroundColor: Colors.primaryLight },
  verifDocText: { fontSize: 11, fontWeight: '700' as const, color: Colors.primary },
  verifBody: { padding: 12, paddingTop: 0, gap: 8 },
  verifDetailRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 12 },
  verifDetailLabel: { fontSize: 13, color: Colors.textSecondary },
  verifDetailValue: { fontSize: 13, fontWeight: '600' as const, color: Colors.text, flexShrink: 1, textAlign: 'right' as const },
  verifMismatch: { fontSize: 12, fontWeight: '600' as const, color: Colors.warning },
  verifImage: { width: '100%', height: 220, borderRadius: 10, backgroundColor: Colors.background },
});
