import { Tabs, Redirect } from 'expo-router';
import { Home, Search, MessageCircle, User, Bell } from 'lucide-react-native';
import React from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import Colors from '@/constants/colors';
import { useAuth } from '@/contexts/AuthContext';
import { useData } from '@/contexts/DataContext';

export default function TabLayout() {
  const { user, isLoading } = useAuth();
  const { unreadNotificationCount, conversations } = useData();

  if (isLoading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  if (!user) {
    return <Redirect href="/login" />;
  }

  const unreadMessages = conversations.reduce((count, c) => count + (c.unreadCount[user.id] ?? 0), 0);

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colors.primary,
        tabBarInactiveTintColor: Colors.light.tabIconDefault,
        headerShown: false,
        tabBarStyle: {
          backgroundColor: Colors.white,
          borderTopColor: Colors.borderLight,
          borderTopWidth: 1,
          paddingTop: 4,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600' as const,
        },
      }}
    >
      <Tabs.Screen
        name="(home)"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, size }) => <Home size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="explore"
        options={{
          title: 'Explore',
          tabBarIcon: ({ color, size }) => <Search size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="messages"
        options={{
          title: 'Messages',
          tabBarIcon: ({ color, size }) => (
            <View>
              <MessageCircle size={size} color={color} />
              {unreadMessages > 0 && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{unreadMessages > 9 ? '9+' : unreadMessages}</Text>
                </View>
              )}
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, size }) => (
            <View>
              <User size={size} color={color} />
              {unreadNotificationCount > 0 && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{unreadNotificationCount > 9 ? '9+' : unreadNotificationCount}</Text>
                </View>
              )}
            </View>
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.background,
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -8,
    backgroundColor: Colors.error,
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  badgeText: {
    color: Colors.white,
    fontSize: 9,
    fontWeight: '700' as const,
  },
});
