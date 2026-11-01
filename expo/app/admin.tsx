import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { showAlert } from '@/lib/alert';
import { View, Text, StyleSheet, ScrollView, Pressable, Alert, FlatList, ActivityIndicator, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import SafeImage from '@/components/SafeImage';
import { router } from 'expo-router';
import {
  ArrowLeft, Users, Building2, Calendar, Shield, ShieldOff,
  Trash2, Star, Eye, ChevronRight, TrendingUp, UserCheck, UserX, BadgeCheck,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import Colors from '@/constants/colors';
import { useAuth } from '@/contexts/AuthContext';
import { useData } from '@/contexts/DataContext';
import { trpc } from '@/lib/trpc';
import { useQueryClient } from '@tanstack/react-query';
import { User, Property } from '@/types/property';

type AdminTab = 'overview' | 'users' | 'properties' | 'pending' | 'verifications';

export default function AdminScreen() {
  const { user, isLoading: authLoading, getAllUsers, updateUserAdmin } = useAuth();
  const { properties, pendingProperties, allBookings, updateProperty, deleteProperty, approveProperty, rejectProperty } = useData();
  const [activeTab, setActiveTab] = useState<AdminTab>('overview');
  const [allUsers, setAllUsers] = useState<User[]>([]);
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

  if (user?.role !== 'admin') {
    return (
      <View style={styles.container}>
        <SafeAreaView edges={['top']} style={styles.safeArea}>
          <View style={styles.header}>
            <Pressable onPress={() => router.back()} style={styles.backBtn}><ArrowLeft size={22} color={Colors.text} /></Pressable>
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
      <Pressable style={styles.quickAction} onPress={() => router.push('/bookings')}>
        <Calendar size={20} color={Colors.success} />
        <Text style={styles.quickActionText}>View All Bookings</Text>
        <ChevronRight size={18} color={Colors.textLight} />
      </Pressable>
    </ScrollView>
  );

  const renderVerifications = () => (
    <FlatList
      data={pendingVerifications}
      keyExtractor={(item) => item.id}
      contentContainerStyle={[styles.tabContent, isWide && { maxWidth: contentMax, alignSelf: 'center', width: '100%' }]}
      ListEmptyComponent={
        <View style={styles.emptyPending}>
          <BadgeCheck size={48} color={Colors.success} />
          <Text style={styles.emptyPendingTitle}>No pending verifications</Text>
          <Text style={styles.emptyPendingSubtitle}>Landlord identity checks will appear here</Text>
        </View>
      }
      renderItem={({ item: u }) => (
        <View style={styles.verifCard}>
          <View style={styles.verifHeader}>
            <SafeImage uri={u.avatar} style={styles.userAvatar} />
            <View style={styles.userInfo}>
              <Text style={styles.userName}>{u.name}</Text>
              <Text style={styles.userEmail}>{u.email}</Text>
            </View>
            <View style={styles.verifDocBadge}>
              <Text style={styles.verifDocText}>{u.verification?.documentType ?? 'Document'}</Text>
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
            {!!u.verification?.documentImage && (
              <SafeImage uri={u.verification.documentImage} style={styles.verifImage} contentFit="cover" />
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

  const renderUsers = () => (
    <FlatList
      data={allUsers}
      keyExtractor={(item) => item.id}
      contentContainerStyle={[styles.tabContent, isWide && { maxWidth: contentMax, alignSelf: 'center', width: '100%' }]}
      renderItem={({ item: u }) => (
        <View style={styles.userCard}>
          <SafeImage uri={u.avatar} style={styles.userAvatar} />
          <View style={styles.userInfo}>
            <View style={styles.userNameRow}>
              <Text style={styles.userName}>{u.name}</Text>
              {u.verified && <Shield size={14} color={Colors.success} />}
            </View>
            <Text style={styles.userEmail}>{u.email}</Text>
            <View style={styles.userMeta}>
              <View style={[styles.rolePill, { backgroundColor: u.role === 'admin' ? Colors.error + '15' : u.role === 'landlord' ? Colors.primary + '15' : Colors.categoryApartment + '15' }]}>
                <Text style={[styles.roleText, { color: u.role === 'admin' ? Colors.error : u.role === 'landlord' ? Colors.primary : Colors.categoryApartment }]}>
                  {u.role.charAt(0).toUpperCase() + u.role.slice(1)}
                </Text>
              </View>
              <Text style={[styles.activeText, { color: u.isActive ? Colors.success : Colors.error }]}>
                {u.isActive ? 'Active' : 'Inactive'}
              </Text>
            </View>
          </View>
          <View style={styles.userActions}>
            <Pressable style={styles.userActionBtn} onPress={() => handleToggleVerified(u)}>
              <Shield size={16} color={u.verified ? Colors.success : Colors.textLight} />
            </Pressable>
            {u.role !== 'admin' && (
              <Pressable style={[styles.userActionBtn, !u.isActive && { backgroundColor: Colors.success + '12' }]} onPress={() => handleToggleUserActive(u)}>
                {u.isActive ? <UserX size={16} color={Colors.error} /> : <UserCheck size={16} color={Colors.success} />}
              </Pressable>
            )}
          </View>
        </View>
      )}
    />
  );

  const renderPending = () => (
    <FlatList
      data={pendingProperties}
      keyExtractor={(item) => item.id}
      contentContainerStyle={[styles.tabContent, isWide && { maxWidth: contentMax, alignSelf: 'center', width: '100%' }]}
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
      contentContainerStyle={[styles.tabContent, isWide && { maxWidth: contentMax, alignSelf: 'center', width: '100%' }]}
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
          <Pressable onPress={() => router.back()} style={styles.backBtn} testID="back">
            <ArrowLeft size={22} color={Colors.text} />
          </Pressable>
          <Text style={styles.headerTitle}>Admin Dashboard</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.tabBar}>
          {(['overview', 'pending', 'verifications', 'users', 'properties'] as AdminTab[]).map(tab => (
            <Pressable key={tab} style={[styles.tab, activeTab === tab && styles.tabActive]} onPress={() => { setActiveTab(tab); if (tab === 'users' || tab === 'verifications') void loadUsers(); }} testID={`admin-tab-${tab}`}>
              <View style={styles.tabInner}>
                <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]} numberOfLines={1}>
                  {tab === 'pending' ? 'Pending' : tab === 'verifications' ? 'Verify' : tab.charAt(0).toUpperCase() + tab.slice(1)}
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
              </View>
            </Pressable>
          ))}
        </View>
      </SafeAreaView>

      {activeTab === 'overview' && renderOverview()}
      {activeTab === 'pending' && renderPending()}
      {activeTab === 'verifications' && renderVerifications()}
      {activeTab === 'users' && renderUsers()}
      {activeTab === 'properties' && renderProperties()}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  safeArea: { backgroundColor: Colors.white },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 12, backgroundColor: Colors.white },
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: Colors.background, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 20, fontWeight: '700' as const, color: Colors.text },
  tabBar: { flexDirection: 'row', paddingHorizontal: 20, paddingBottom: 12, backgroundColor: Colors.white, gap: 8, borderBottomWidth: 1, borderBottomColor: Colors.borderLight },
  tab: { flex: 1, paddingVertical: 8, borderRadius: 12, backgroundColor: Colors.background, alignItems: 'center' },
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
  verifImage: { width: '100%', height: 140, borderRadius: 10 },
});
