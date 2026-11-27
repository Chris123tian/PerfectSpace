import React from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { goBack } from '@/lib/nav';
import { ArrowLeft, User, IdCard, Home, MessageCircle, MonitorSmartphone, ShieldCheck, Clock, Share2, Hand } from 'lucide-react-native';
import Colors from '@/constants/colors';

interface DataGroup {
  icon: React.ReactNode;
  title: string;
  items: string[];
  why: string;
}

const GROUPS: DataGroup[] = [
  {
    icon: <User size={18} color={Colors.primary} />,
    title: 'Account details',
    items: ['Name, email address and phone number', 'Date of birth, country and region', 'Account type (renter or property owner)', 'Profile photo, bio and WhatsApp number if you add them', 'If you use Google sign-in: your Google name, email and photo'],
    why: 'To create your account, let you sign in, show your profile to people you deal with, and let you reset your password (we check the phone number on file).',
  },
  {
    icon: <IdCard size={18} color={Colors.success} />,
    title: 'Identity verification (property owners only)',
    items: ['Document type, the name and number on it', 'A photo of the document'],
    why: 'To confirm property owners are who they say they are and show a verified badge. Document photos are stored privately: they are never shown publicly and only you and our staff can open them.',
  },
  {
    icon: <Home size={18} color={Colors.accent} />,
    title: 'Listings, bookings and reviews',
    items: ['Property details, address, region, town and the photos you upload', 'Viewing requests and bookings you make or receive', 'Reviews and saved properties'],
    why: 'To publish your listings, run bookings between renters and owners, and personalise what you see.',
  },
  {
    icon: <MessageCircle size={18} color={Colors.categoryOffice} />,
    title: 'Messages and support',
    items: ['Messages you exchange with other members', 'Conversations with Perfect Space Support', 'Notifications we send you'],
    why: 'To deliver your conversations and help you when you contact support. Staff can read support chats, not your private chats with other members.',
  },
  {
    icon: <MonitorSmartphone size={18} color={Colors.categoryApartment} />,
    title: 'Security and activity records',
    items: ['Sign-in and sign-out times', 'IP address and device/browser type for each session', 'A log of security-relevant actions (password changes, failed sign-ins, admin changes)'],
    why: 'To protect your account, block password-guessing (we lock sign-in for 15 minutes after 5 failed attempts), and investigate abuse.',
  },
];

const RETENTION = [
  'Your account, listings, bookings and messages are kept until you delete them or delete your account.',
  'Deleting your account (Settings \u2192 Delete Account) permanently removes your profile, listings, bookings, saved items, messages and notifications.',
  'Security and activity records are kept so suspicious activity can be investigated; they are visible only to the platform administrator.',
];

const RIGHTS = [
  'See and edit your details any time in Edit Profile.',
  'Delete individual notifications, listings and bookings, or your whole account.',
  'Turn push and email notifications on or off in Settings.',
  'Ask us for a copy of your data or any correction at support@perfectspace.com.',
];

const SECURITY = [
  'Passwords are never stored in readable form: they are salted and hashed (PBKDF2, 100,000 rounds).',
  'Every request is tied to a signed-in session; changing your password signs out your other devices.',
  'All traffic is encrypted over HTTPS.',
  'Staff use a separate, restricted console, and every staff action is recorded.',
];

export default function PrivacyScreen() {
  return (
    <View style={styles.container}>
      <SafeAreaView edges={['top']} style={styles.safeArea}>
        <View style={styles.header}>
          <Pressable onPress={() => (router.canGoBack() ? goBack() : router.replace('/'))} style={styles.backBtn} testID="back">
            <ArrowLeft size={22} color={Colors.text} />
          </Pressable>
          <Text style={styles.headerTitle}>Privacy & Data</Text>
          <View style={{ width: 40 }} />
        </View>
      </SafeAreaView>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.hero}>
          <Text style={styles.heroTitle}>What we collect, and why</Text>
          <Text style={styles.heroText}>
            Perfect Space collects only what it needs to connect renters with property owners safely. We do not sell your data and we do not show you third-party ads.
          </Text>
          <Text style={styles.updated}>Last updated: November 2026</Text>
        </View>

        {GROUPS.map(g => (
          <View key={g.title} style={styles.card}>
            <View style={styles.cardHeader}>
              <View style={styles.iconBg}>{g.icon}</View>
              <Text style={styles.cardTitle}>{g.title}</Text>
            </View>
            {g.items.map(i => (
              <Text key={i} style={styles.bullet}>{'\u2022'}  {i}</Text>
            ))}
            <View style={styles.whyBox}>
              <Text style={styles.whyLabel}>WHY</Text>
              <Text style={styles.whyText}>{g.why}</Text>
            </View>
          </View>
        ))}

        <Section icon={<Share2 size={18} color={Colors.primary} />} title="Who sees it">
          <Text style={styles.bullet}>{'\u2022'}  Other members see your public profile (name, photo, rating) and your listings. Your email and phone are shared only with people you book with or message.</Text>
          <Text style={styles.bullet}>{'\u2022'}  Our staff can see account details to run the platform. We share data with authorities only when legally required.</Text>
          <Text style={styles.bullet}>{'\u2022'}  Our hosting provider stores the data on our behalf; Google receives your sign-in request if you use Google sign-in.</Text>
        </Section>
        <Section icon={<Clock size={18} color={Colors.accent} />} title="How long we keep it">
          {RETENTION.map(r => <Text key={r} style={styles.bullet}>{'\u2022'}  {r}</Text>)}
        </Section>
        <Section icon={<ShieldCheck size={18} color={Colors.success} />} title="How we protect it">
          {SECURITY.map(r => <Text key={r} style={styles.bullet}>{'\u2022'}  {r}</Text>)}
        </Section>
        <Section icon={<Hand size={18} color={Colors.categoryOffice} />} title="Your choices">
          {RIGHTS.map(r => <Text key={r} style={styles.bullet}>{'\u2022'}  {r}</Text>)}
        </Section>

        <Text style={styles.contact}>Questions? Contact support@perfectspace.com</Text>
      </ScrollView>
    </View>
  );
}

function Section({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.iconBg}>{icon}</View>
        <Text style={styles.cardTitle}>{title}</Text>
      </View>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  safeArea: { backgroundColor: Colors.white },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 12, backgroundColor: Colors.white, borderBottomWidth: 1, borderBottomColor: Colors.borderLight },
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: Colors.background, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 20, fontWeight: '700' as const, color: Colors.text },
  scroll: { padding: 20, paddingBottom: 48, gap: 12, width: '100%', maxWidth: 720, alignSelf: 'center' },
  hero: { backgroundColor: Colors.primary, borderRadius: 20, padding: 20, gap: 8 },
  heroTitle: { fontSize: 22, fontWeight: '800' as const, color: Colors.white },
  heroText: { fontSize: 14, color: Colors.white, opacity: 0.92, lineHeight: 21 },
  updated: { fontSize: 11, color: Colors.white, opacity: 0.7, marginTop: 4 },
  card: { backgroundColor: Colors.white, borderRadius: 16, padding: 16, gap: 6 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 4 },
  iconBg: { width: 34, height: 34, borderRadius: 10, backgroundColor: Colors.background, alignItems: 'center', justifyContent: 'center' },
  cardTitle: { fontSize: 16, fontWeight: '700' as const, color: Colors.text, flex: 1 },
  bullet: { fontSize: 14, color: Colors.textSecondary, lineHeight: 21 },
  whyBox: { marginTop: 6, backgroundColor: Colors.background, borderRadius: 10, padding: 10, gap: 2 },
  whyLabel: { fontSize: 10, fontWeight: '800' as const, color: Colors.primary, letterSpacing: 1 },
  whyText: { fontSize: 13, color: Colors.text, lineHeight: 19 },
  contact: { textAlign: 'center', fontSize: 13, color: Colors.textSecondary, marginTop: 8 },
});
