import React, { useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import SafeImage from '@/components/SafeImage';
import {
  Settings, ChevronRight, Heart, Star, Shield, Bell, HelpCircle, LogOut,
  Home, BadgeCheck, FileText, Phone, Calendar, Plus, ShieldCheck,
} from 'lucide-react-native';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import Colors from '@/constants/colors';
import { useAuth } from '@/contexts/AuthContext';
import { useData } from '@/contexts/DataContext';

interface MenuItem {
  id: string;
  icon: React.ReactNode;
  label: string;
  subtitle?: string;
  action: () => void;
  showArrow?: boolean;
  badge?: number;
}

export default function ProfileScreen() {
  const { user, logout } = useAuth();
  const { myProperties, bookings, savedPropertyIds, unreadNotificationCount } = useData();

  const handleLogout = useCallback(() => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert('Log Out', 'Are you sure you want to log out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Log Out', style: 'destructive', onPress: () => { void logout(); router.replace('/login'); } },
    ]);
  }, [logout]);

  if (!user) return null;

  const pendingBookings = bookings.filter(b => b.status === 'pending').length;

  const commonMenuSections: { title: string; items: MenuItem[] }[] = [];

  if (user.role === 'landlord') {
    commonMenuSections.push({
      title: 'Property Management',
      items: [
        { id: 'my-listings', icon: <Home size={20} color={Colors.primary} />, label: 'My Listings', subtitle: `${myProperties.length} properties`, action: () => router.push('/my-listings'), showArrow: true },
        { id: 'add-property', icon: <Plus size={20} color={Colors.success} />, label: 'Add New Property', action: () => router.push('/add-property'), showArrow: true },
        { id: 'bookings', icon: <Calendar size={20} color={Colors.accent} />, label: 'Viewing Requests', subtitle: pendingBookings > 0 ? `${pendingBookings} pending` : 'No pending', action: () => router.push('/bookings'), showArrow: true, badge: pendingBookings || undefined },
      ],
    });
  }

  if (user.role === 'renter') {
    commonMenuSections.push({
      title: 'My Activity',
      items: [
        { id: 'saved', icon: <Heart size={20} color={Colors.error} />, label: 'Saved Properties', subtitle: `${savedPropertyIds.length} saved`, action: () => router.push('/saved'), showArrow: true },
        { id: 'bookings', icon: <Calendar size={20} color={Colors.accent} />, label: 'My Bookings', subtitle: pendingBookings > 0 ? `${pendingBookings} pending` : 'No pending', action: () => router.push('/bookings'), showArrow: true, badge: pendingBookings || undefined },
      ],
    });
  }

  if (user.role === 'admin') {
    commonMenuSections.push({
      title: 'Administration',
      items: [
        { id: 'admin', icon: <ShieldCheck size={20} color={Colors.primary} />, label: 'Admin Dashboard', subtitle: 'Manage platform', action: () => router.push('/admin'), showArrow: true },
        { id: 'bookings', icon: <Calendar size={20} color={Colors.accent} />, label: 'All Bookings', action: () => router.push('/bookings'), showArrow: true },
      ],
    });
  }

  commonMenuSections.push(
    {
      title: 'Account',
      items: [
        { id: 'notifications', icon: <Bell size={20} color={Colors.categoryOffice} />, label: 'Notifications', subtitle: unreadNotificationCount > 0 ? `${unreadNotificationCount} unread` : undefined, action: () => router.push('/notifications'), showArrow: true, badge: unreadNotificationCount || undefined },
        { id: 'reviews', icon: <Star size={20} color={Colors.accent} />, label: 'My Reviews', subtitle: `${user.reviewsCount} reviews`, action: () => router.push('/my-reviews'), showArrow: true },
        { id: 'verification', icon: <Shield size={20} color={Colors.success} />, label: 'Verification', subtitle: user.verified ? 'Verified' : 'Not verified', action: () => Alert.alert('Verification Status', user.verified ? 'Your identity has been verified. You have a trusted badge on your profile.' : 'To get verified, ensure your profile is complete with a valid phone number and photo. Verification helps build trust with other users.'), showArrow: true },
      ],
    },
    {
      title: 'Resources',
      items: [
        { id: 'tenant-rights', icon: <FileText size={20} color={Colors.categoryApartment} />, label: 'Tenant Rights Guide', action: () => router.push('/tenant-rights'), showArrow: true },
        { id: 'emergency', icon: <Phone size={20} color={Colors.error} />, label: 'Emergency Contacts', action: () => Alert.alert('Emergency Support', 'Emergency contacts:\n\n• Police: 911\n• Fire: 911\n• Maintenance: (555) 999-0000\n• Support: (555) 123-HELP'), showArrow: true },
      ],
    },
    {
      title: 'Support',
      items: [
        { id: 'help', icon: <HelpCircle size={20} color={Colors.textSecondary} />, label: 'Help Center', action: () => Alert.alert('Help', 'Contact us at support@perfectspace.com'), showArrow: true },
        { id: 'settings', icon: <Settings size={20} color={Colors.textSecondary} />, label: 'Settings', action: () => router.push('/settings'), showArrow: true },
      ],
    }
  );

  const roleLabel = user.role === 'admin' ? 'Administrator' : user.role === 'landlord' ? 'Property Owner' : 'Renter';
  const roleBadgeColor = user.role === 'admin' ? Colors.error : user.role === 'landlord' ? Colors.primary : Colors.categoryApartment;

  return (
    <View style={styles.container}>
      <SafeAreaView edges={['top']} style={styles.safeArea}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Profile</Text>
        </View>
      </SafeAreaView>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <View style={styles.profileCard}>
          <SafeImage uri={user.avatar} style={styles.profileAvatar} />
          <View style={styles.profileInfo}>
            <View style={styles.nameRow}>
              <Text style={styles.profileName}>{user.name}</Text>
              {user.verified && <BadgeCheck size={18} color={Colors.primary} fill={Colors.primaryLight} />}
            </View>
            <View style={[styles.roleBadge, { backgroundColor: roleBadgeColor + '15' }]}>
              <Text style={[styles.roleText, { color: roleBadgeColor }]}>{roleLabel}</Text>
            </View>
            <Text style={styles.memberSince}>Member since {user.memberSince}</Text>
          </View>
          <Pressable style={styles.editButton} onPress={() => { void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.push('/edit-profile'); }} testID="edit-profile">
            <Text style={styles.editButtonText}>Edit</Text>
          </Pressable>
        </View>

        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{user.rating || '-'}</Text>
            <Text style={styles.statLabel}>Rating</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{user.reviewsCount}</Text>
            <Text style={styles.statLabel}>Reviews</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{user.role === 'landlord' ? myProperties.length : savedPropertyIds.length}</Text>
            <Text style={styles.statLabel}>{user.role === 'landlord' ? 'Listings' : 'Saved'}</Text>
          </View>
        </View>

        {user.bio ? (
          <View style={styles.bioCard}>
            <Text style={styles.bioText}>{user.bio}</Text>
          </View>
        ) : null}

        {commonMenuSections.map((section) => (
          <View key={section.title} style={styles.menuSection}>
            <Text style={styles.menuSectionTitle}>{section.title}</Text>
            <View style={styles.menuCard}>
              {section.items.map((item, index) => (
                <Pressable
                  key={item.id}
                  style={[styles.menuItem, index < section.items.length - 1 && styles.menuItemBorder]}
                  onPress={item.action}
                  testID={`menu-${item.id}`}
                >
                  <View style={styles.menuItemLeft}>
                    <View style={styles.menuIconContainer}>{item.icon}</View>
                    <View>
                      <Text style={styles.menuItemLabel}>{item.label}</Text>
                      {item.subtitle && <Text style={styles.menuItemSubtitle}>{item.subtitle}</Text>}
                    </View>
                  </View>
                  <View style={styles.menuItemRight}>
                    {item.badge ? (
                      <View style={styles.badge}>
                        <Text style={styles.badgeText}>{item.badge}</Text>
                      </View>
                    ) : null}
                    {item.showArrow && <ChevronRight size={18} color={Colors.textLight} />}
                  </View>
                </Pressable>
              ))}
            </View>
          </View>
        ))}

        <Pressable style={styles.logoutButton} onPress={handleLogout} testID="logout-button">
          <LogOut size={20} color={Colors.error} />
          <Text style={styles.logoutText}>Log Out</Text>
        </Pressable>

        <Text style={styles.versionText}>Perfect Space v1.0.0</Text>
        <View style={styles.bottomSpacer} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  safeArea: { backgroundColor: Colors.white },
  header: { paddingHorizontal: 20, paddingBottom: 16, paddingTop: 8, backgroundColor: Colors.white },
  headerTitle: { fontSize: 28, fontWeight: '800' as const, color: Colors.text },
  scrollContent: { paddingBottom: 30 },
  profileCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.white, marginHorizontal: 20, marginTop: 16, padding: 16, borderRadius: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 2, gap: 14 },
  profileAvatar: { width: 64, height: 64, borderRadius: 32, borderWidth: 3, borderColor: Colors.primaryLight },
  profileInfo: { flex: 1 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  profileName: { fontSize: 18, fontWeight: '700' as const, color: Colors.text },
  roleBadge: { alignSelf: 'flex-start' as const, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8, marginTop: 4 },
  roleText: { fontSize: 12, fontWeight: '600' as const },
  memberSince: { fontSize: 12, color: Colors.textLight, marginTop: 2 },
  editButton: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: Colors.primaryLight },
  editButtonText: { fontSize: 13, fontWeight: '600' as const, color: Colors.primary },
  statsRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.white, marginHorizontal: 20, marginTop: 12, padding: 16, borderRadius: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 6, elevation: 1 },
  statItem: { flex: 1, alignItems: 'center' },
  statValue: { fontSize: 20, fontWeight: '800' as const, color: Colors.text },
  statLabel: { fontSize: 12, color: Colors.textSecondary, marginTop: 2, fontWeight: '500' as const },
  statDivider: { width: 1, height: 30, backgroundColor: Colors.borderLight },
  bioCard: { backgroundColor: Colors.white, marginHorizontal: 20, marginTop: 12, padding: 16, borderRadius: 16 },
  bioText: { fontSize: 14, color: Colors.textSecondary, lineHeight: 21 },
  menuSection: { marginTop: 24 },
  menuSectionTitle: { fontSize: 13, fontWeight: '600' as const, color: Colors.textSecondary, paddingHorizontal: 20, marginBottom: 8, textTransform: 'uppercase' as const, letterSpacing: 0.5 },
  menuCard: { backgroundColor: Colors.white, marginHorizontal: 20, borderRadius: 16, overflow: 'hidden' },
  menuItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 14, paddingHorizontal: 16 },
  menuItemBorder: { borderBottomWidth: 1, borderBottomColor: Colors.borderLight },
  menuItemLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  menuIconContainer: { width: 36, height: 36, borderRadius: 10, backgroundColor: Colors.background, alignItems: 'center', justifyContent: 'center' },
  menuItemLabel: { fontSize: 15, fontWeight: '500' as const, color: Colors.text },
  menuItemSubtitle: { fontSize: 12, color: Colors.textLight, marginTop: 1 },
  menuItemRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  badge: { backgroundColor: Colors.error, borderRadius: 10, minWidth: 20, height: 20, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6 },
  badgeText: { color: Colors.white, fontSize: 11, fontWeight: '700' as const },
  logoutButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginHorizontal: 20, marginTop: 32, paddingVertical: 14, borderRadius: 14, backgroundColor: Colors.white, borderWidth: 1, borderColor: Colors.error + '30' },
  logoutText: { fontSize: 15, fontWeight: '600' as const, color: Colors.error },
  versionText: { textAlign: 'center', fontSize: 12, color: Colors.textLight, marginTop: 16 },
  bottomSpacer: { height: 20 },
});
