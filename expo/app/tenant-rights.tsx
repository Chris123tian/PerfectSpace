import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { ArrowLeft, ChevronDown, ChevronUp, Shield, FileText, Scale, Home, AlertTriangle, Phone } from 'lucide-react-native';
import Colors from '@/constants/colors';

interface Section {
  id: string;
  title: string;
  icon: React.ReactNode;
  content: string;
}

const sections: Section[] = [
  {
    id: 'rights',
    title: 'Your Rights as a Tenant',
    icon: <Shield size={20} color={Colors.primary} />,
    content: `As a tenant, you have several fundamental rights:\n\n• Right to a habitable dwelling — Your landlord must maintain the property in a livable condition, including working plumbing, heating, and electrical systems.\n\n• Right to privacy — Your landlord must provide reasonable notice (usually 24-48 hours) before entering your rental unit, except in emergencies.\n\n• Right to security deposit return — Your deposit must be returned within 30 days of moving out, minus any legitimate deductions.\n\n• Right against discrimination — Landlords cannot refuse to rent based on race, color, religion, sex, national origin, familial status, or disability.\n\n• Right to a written lease — Always request a written lease agreement outlining all terms and conditions.`,
  },
  {
    id: 'agreements',
    title: 'Understanding Rental Agreements',
    icon: <FileText size={20} color={Colors.categoryApartment} />,
    content: `Key elements of a rental agreement:\n\n• Lease Term — The duration of the rental period (month-to-month or fixed term).\n\n• Rent Amount & Due Date — The monthly rent and when it's due. Late fees should be clearly stated.\n\n• Security Deposit — Amount, conditions for deductions, and return timeline.\n\n• Maintenance Responsibilities — What the landlord covers vs. what the tenant handles.\n\n• Rules & Restrictions — Pet policies, noise regulations, guest policies, and modification permissions.\n\n• Termination Clause — Notice period required and early termination fees.\n\nTip: Always read the entire agreement before signing and keep a copy for your records.`,
  },
  {
    id: 'disputes',
    title: 'Handling Disputes',
    icon: <Scale size={20} color={Colors.accent} />,
    content: `Steps to resolve landlord-tenant disputes:\n\n1. Document Everything — Keep records of all communications, photos of issues, and copies of your lease.\n\n2. Communicate in Writing — Send formal letters or emails about issues. Keep copies of all correspondence.\n\n3. Know Your Local Laws — Tenant rights vary by state and city. Research your local housing authority resources.\n\n4. Seek Mediation — Many communities offer free mediation services for landlord-tenant disputes.\n\n5. Contact Housing Authority — If your landlord violates housing codes, report to your local housing authority.\n\n6. Legal Action — As a last resort, you may file a complaint in small claims court or seek legal aid.`,
  },
  {
    id: 'maintenance',
    title: 'Maintenance & Repairs',
    icon: <Home size={20} color={Colors.success} />,
    content: `Your landlord is generally responsible for:\n\n• Structural repairs (roof, walls, foundation)\n• Plumbing and electrical systems\n• Heating and cooling systems\n• Pest control (pre-existing infestations)\n• Common area maintenance\n• Appliances provided with the rental\n\nYou are typically responsible for:\n\n• Keeping the unit clean and sanitary\n• Minor repairs caused by your negligence\n• Replacing light bulbs and batteries\n• Reporting maintenance issues promptly\n• Not blocking fire exits or smoke detectors\n\nAlways report maintenance issues in writing and keep copies.`,
  },
  {
    id: 'eviction',
    title: 'Eviction Protection',
    icon: <AlertTriangle size={20} color={Colors.error} />,
    content: `Know your eviction rights:\n\n• Proper Notice — Your landlord must give written notice before starting eviction proceedings. The notice period varies by jurisdiction (typically 3-30 days).\n\n• Valid Reasons — Common legal grounds include non-payment of rent, lease violations, or property damage. Retaliatory eviction is illegal.\n\n• Court Process — A landlord cannot forcibly remove you without a court order. Self-help evictions (changing locks, removing belongings, shutting off utilities) are illegal.\n\n• Right to Respond — You have the right to appear in court and present your case.\n\n• Relocation Assistance — Some jurisdictions require landlords to provide relocation assistance for no-fault evictions.\n\nIf you receive an eviction notice, seek legal counsel immediately.`,
  },
  {
    id: 'emergency',
    title: 'Emergency Contacts & Resources',
    icon: <Phone size={20} color={Colors.categoryOffice} />,
    content: `Important contacts:\n\n• Emergency Services: 911\n• National Housing Hotline: 1-800-569-4287\n• Legal Aid Society: 1-800-649-9125\n• Fair Housing Complaints: 1-800-669-9777\n• PropertyHub Support: support@propertyhub.com\n\nOnline Resources:\n• HUD.gov — Federal housing information\n• LawHelp.org — Free legal resources\n• TenantUnion.org — Tenant advocacy resources\n\nLocal Resources:\n• Check your city's tenant rights office\n• Community legal aid clinics\n• Housing advocacy organizations`,
  },
];

export default function TenantRightsScreen() {
  const [expandedId, setExpandedId] = useState<string | null>('rights');

  const toggleSection = (id: string) => {
    setExpandedId(prev => prev === id ? null : id);
  };

  return (
    <View style={styles.container}>
      <SafeAreaView edges={['top']} style={styles.safeArea}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.backBtn} testID="back">
            <ArrowLeft size={22} color={Colors.text} />
          </Pressable>
          <Text style={styles.headerTitle}>Tenant Rights Guide</Text>
          <View style={{ width: 40 }} />
        </View>
      </SafeAreaView>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <View style={styles.introBanner}>
          <Shield size={32} color={Colors.primary} />
          <Text style={styles.introTitle}>Know Your Rights</Text>
          <Text style={styles.introSubtitle}>
            Understanding your rights as a tenant is essential for a positive rental experience. This guide covers the key topics every renter should know.
          </Text>
        </View>

        {sections.map((section) => (
          <View key={section.id} style={styles.sectionCard}>
            <Pressable
              style={styles.sectionHeader}
              onPress={() => toggleSection(section.id)}
              testID={`section-${section.id}`}
            >
              <View style={styles.sectionLeft}>
                <View style={styles.sectionIcon}>{section.icon}</View>
                <Text style={styles.sectionTitle}>{section.title}</Text>
              </View>
              {expandedId === section.id ? (
                <ChevronUp size={20} color={Colors.textSecondary} />
              ) : (
                <ChevronDown size={20} color={Colors.textSecondary} />
              )}
            </Pressable>
            {expandedId === section.id && (
              <View style={styles.sectionContent}>
                <Text style={styles.sectionText}>{section.content}</Text>
              </View>
            )}
          </View>
        ))}

        <View style={styles.disclaimer}>
          <Text style={styles.disclaimerText}>
            This guide provides general information only and is not legal advice. Laws vary by jurisdiction. Consult a local attorney for specific legal questions.
          </Text>
        </View>

        <View style={styles.bottomSpacer} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  safeArea: { backgroundColor: Colors.white },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 12, backgroundColor: Colors.white, borderBottomWidth: 1, borderBottomColor: Colors.borderLight },
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: Colors.background, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 20, fontWeight: '700' as const, color: Colors.text },
  scrollContent: { padding: 20 },
  introBanner: { backgroundColor: Colors.primaryLight, borderRadius: 20, padding: 24, alignItems: 'center', marginBottom: 20 },
  introTitle: { fontSize: 22, fontWeight: '800' as const, color: Colors.text, marginTop: 12 },
  introSubtitle: { fontSize: 14, color: Colors.textSecondary, textAlign: 'center', marginTop: 8, lineHeight: 21 },
  sectionCard: { backgroundColor: Colors.white, borderRadius: 16, marginBottom: 10, overflow: 'hidden' },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16 },
  sectionLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  sectionIcon: { width: 40, height: 40, borderRadius: 12, backgroundColor: Colors.background, alignItems: 'center', justifyContent: 'center' },
  sectionTitle: { fontSize: 15, fontWeight: '600' as const, color: Colors.text, flex: 1 },
  sectionContent: { paddingHorizontal: 16, paddingBottom: 16 },
  sectionText: { fontSize: 14, color: Colors.textSecondary, lineHeight: 22 },
  disclaimer: { backgroundColor: Colors.warning + '12', borderRadius: 14, padding: 16, marginTop: 10 },
  disclaimerText: { fontSize: 12, color: Colors.warning, lineHeight: 18, textAlign: 'center' },
  bottomSpacer: { height: 30 },
});
