import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Alert,
  Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import {
  Settings,
  ChevronRight,
  Heart,
  Star,
  Shield,
  Bell,
  HelpCircle,
  LogOut,
  Home,
  BadgeCheck,
  FileText,
  Phone,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import Colors from '@/constants/colors';
import { currentUser } from '@/mocks/properties';

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
  const [notificationsEnabled, setNotificationsEnabled] = useState<boolean>(true);

  const handleEditProfile = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Alert.alert('Edit Profile', 'Profile editing will be available soon!');
  }, []);

  const handleLogout = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert(
      'Log Out',
      'Are you sure you want to log out?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Log Out', style: 'destructive', onPress: () => console.log('Logged out') },
      ]
    );
  }, []);

  const menuSections: { title: string; items: MenuItem[] }[] = [
    {
      title: 'Account',
      items: [
        {
          id: 'listings',
          icon: <Home size={20} color={Colors.primary} />,
          label: 'My Listings',
          subtitle: `${currentUser.propertiesCount} properties`,
          action: () => Alert.alert('My Listings', 'Your property listings will appear here.'),
          showArrow: true,
        },
        {
          id: 'favorites',
          icon: <Heart size={20} color={Colors.error} />,
          label: 'Saved Properties',
          subtitle: '12 saved',
          action: () => Alert.alert('Saved', 'Your saved properties will appear here.'),
          showArrow: true,
          badge: 3,
        },
        {
          id: 'reviews',
          icon: <Star size={20} color={Colors.accent} />,
          label: 'My Reviews',
          subtitle: `${currentUser.reviewsCount} reviews`,
          action: () => Alert.alert('Reviews', 'Your reviews will appear here.'),
          showArrow: true,
        },
      ],
    },
    {
      title: 'Preferences',
      items: [
        {
          id: 'notifications',
          icon: <Bell size={20} color={Colors.categoryOffice} />,
          label: 'Notifications',
          action: () => {
            setNotificationsEnabled(prev => !prev);
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          },
        },
        {
          id: 'verification',
          icon: <Shield size={20} color={Colors.success} />,
          label: 'Identity Verification',
          subtitle: currentUser.verified ? 'Verified' : 'Not verified',
          action: () => Alert.alert('Verification', 'Your identity has been verified.'),
          showArrow: true,
        },
      ],
    },
    {
      title: 'Resources',
      items: [
        {
          id: 'tenant-rights',
          icon: <FileText size={20} color={Colors.categoryApartment} />,
          label: 'Tenant Rights Guide',
          action: () => Alert.alert('Tenant Rights', 'A comprehensive guide to tenant rights, rental agreements, and your responsibilities as a renter. Coming soon!'),
          showArrow: true,
        },
        {
          id: 'emergency',
          icon: <Phone size={20} color={Colors.error} />,
          label: 'Emergency Contacts',
          action: () => Alert.alert('Emergency Support', 'Emergency contacts:\n\n• Police: 911\n• Fire: 911\n• Maintenance Hotline: (555) 999-0000\n• Platform Support: (555) 123-HELP'),
          showArrow: true,
        },
      ],
    },
    {
      title: 'Support',
      items: [
        {
          id: 'help',
          icon: <HelpCircle size={20} color={Colors.textSecondary} />,
          label: 'Help Center',
          action: () => Alert.alert('Help', 'How can we help you?\n\nContact us at support@propertyhub.com'),
          showArrow: true,
        },
        {
          id: 'settings',
          icon: <Settings size={20} color={Colors.textSecondary} />,
          label: 'Settings',
          action: () => Alert.alert('Settings', 'App settings coming soon!'),
          showArrow: true,
        },
      ],
    },
  ];

  return (
    <View style={styles.container}>
      <SafeAreaView edges={['top']} style={styles.safeArea}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Profile</Text>
        </View>
      </SafeAreaView>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <View style={styles.profileCard}>
          <Image source={{ uri: currentUser.avatar }} style={styles.profileAvatar} />
          <View style={styles.profileInfo}>
            <View style={styles.nameRow}>
              <Text style={styles.profileName}>{currentUser.name}</Text>
              {currentUser.verified && (
                <BadgeCheck size={18} color={Colors.primary} fill={Colors.primaryLight} />
              )}
            </View>
            <Text style={styles.profileRole}>
              {currentUser.role === 'landlord' ? 'Property Owner' : 'Renter'}
            </Text>
            <Text style={styles.memberSince}>Member since {currentUser.memberSince}</Text>
          </View>
          <Pressable style={styles.editButton} onPress={handleEditProfile} testID="edit-profile">
            <Text style={styles.editButtonText}>Edit</Text>
          </Pressable>
        </View>

        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{currentUser.rating}</Text>
            <Text style={styles.statLabel}>Rating</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{currentUser.reviewsCount}</Text>
            <Text style={styles.statLabel}>Reviews</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{currentUser.propertiesCount}</Text>
            <Text style={styles.statLabel}>Listings</Text>
          </View>
        </View>

        <View style={styles.bioCard}>
          <Text style={styles.bioText}>{currentUser.bio}</Text>
        </View>

        {menuSections.map((section) => (
          <View key={section.title} style={styles.menuSection}>
            <Text style={styles.menuSectionTitle}>{section.title}</Text>
            <View style={styles.menuCard}>
              {section.items.map((item, index) => (
                <Pressable
                  key={item.id}
                  style={[
                    styles.menuItem,
                    index < section.items.length - 1 && styles.menuItemBorder,
                  ]}
                  onPress={item.action}
                  testID={`menu-${item.id}`}
                >
                  <View style={styles.menuItemLeft}>
                    <View style={styles.menuIconContainer}>{item.icon}</View>
                    <View>
                      <Text style={styles.menuItemLabel}>{item.label}</Text>
                      {item.subtitle && (
                        <Text style={styles.menuItemSubtitle}>{item.subtitle}</Text>
                      )}
                    </View>
                  </View>
                  <View style={styles.menuItemRight}>
                    {item.badge && (
                      <View style={styles.badge}>
                        <Text style={styles.badgeText}>{item.badge}</Text>
                      </View>
                    )}
                    {item.id === 'notifications' ? (
                      <Switch
                        value={notificationsEnabled}
                        onValueChange={(value) => {
                          setNotificationsEnabled(value);
                          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        }}
                        trackColor={{ false: Colors.border, true: Colors.primaryLight }}
                        thumbColor={notificationsEnabled ? Colors.primary : Colors.textLight}
                      />
                    ) : item.showArrow ? (
                      <ChevronRight size={18} color={Colors.textLight} />
                    ) : null}
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

        <Text style={styles.versionText}>Property Hub v1.0.0</Text>

        <View style={styles.bottomSpacer} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  safeArea: {
    backgroundColor: Colors.white,
  },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 16,
    paddingTop: 8,
    backgroundColor: Colors.white,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '800' as const,
    color: Colors.text,
  },
  scrollContent: {
    paddingBottom: 30,
  },
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    marginHorizontal: 20,
    marginTop: 16,
    padding: 16,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
    gap: 14,
  },
  profileAvatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 3,
    borderColor: Colors.primaryLight,
  },
  profileInfo: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  profileName: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: Colors.text,
  },
  profileRole: {
    fontSize: 13,
    color: Colors.primary,
    fontWeight: '500' as const,
    marginTop: 2,
  },
  memberSince: {
    fontSize: 12,
    color: Colors.textLight,
    marginTop: 2,
  },
  editButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: Colors.primaryLight,
  },
  editButtonText: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: Colors.primary,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    marginHorizontal: 20,
    marginTop: 12,
    padding: 16,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 20,
    fontWeight: '800' as const,
    color: Colors.text,
  },
  statLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
    fontWeight: '500' as const,
  },
  statDivider: {
    width: 1,
    height: 30,
    backgroundColor: Colors.borderLight,
  },
  bioCard: {
    backgroundColor: Colors.white,
    marginHorizontal: 20,
    marginTop: 12,
    padding: 16,
    borderRadius: 16,
  },
  bioText: {
    fontSize: 14,
    color: Colors.textSecondary,
    lineHeight: 21,
  },
  menuSection: {
    marginTop: 24,
  },
  menuSectionTitle: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: Colors.textSecondary,
    paddingHorizontal: 20,
    marginBottom: 8,
    textTransform: 'uppercase' as const,
    letterSpacing: 0.5,
  },
  menuCard: {
    backgroundColor: Colors.white,
    marginHorizontal: 20,
    borderRadius: 16,
    overflow: 'hidden',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  menuItemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  menuIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuItemLabel: {
    fontSize: 15,
    fontWeight: '500' as const,
    color: Colors.text,
  },
  menuItemSubtitle: {
    fontSize: 12,
    color: Colors.textLight,
    marginTop: 1,
  },
  menuItemRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  badge: {
    backgroundColor: Colors.error,
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  badgeText: {
    color: Colors.white,
    fontSize: 11,
    fontWeight: '700' as const,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginHorizontal: 20,
    marginTop: 32,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.error + '30',
  },
  logoutText: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: Colors.error,
  },
  versionText: {
    textAlign: 'center',
    fontSize: 12,
    color: Colors.textLight,
    marginTop: 16,
  },
  bottomSpacer: {
    height: 20,
  },
});
