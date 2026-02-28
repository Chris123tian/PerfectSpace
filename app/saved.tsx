import React, { useMemo } from 'react';
import { View, Text, StyleSheet, FlatList, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { ArrowLeft, Heart } from 'lucide-react-native';
import Colors from '@/constants/colors';
import { useData } from '@/contexts/DataContext';
import PropertyCard from '@/components/PropertyCard';
import { Property } from '@/types/property';

export default function SavedScreen() {
  const { savedPropertyIds, activeProperties } = useData();

  const savedProperties = useMemo(() => {
    return activeProperties.filter(p => savedPropertyIds.includes(p.id));
  }, [savedPropertyIds, activeProperties]);

  return (
    <View style={styles.container}>
      <SafeAreaView edges={['top']} style={styles.safeArea}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.backBtn} testID="back">
            <ArrowLeft size={22} color={Colors.text} />
          </Pressable>
          <Text style={styles.headerTitle}>Saved Properties</Text>
          <View style={{ width: 40 }} />
        </View>
      </SafeAreaView>

      <FlatList
        data={savedProperties}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <PropertyCard property={item} />}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Heart size={56} color={Colors.textLight} />
            <Text style={styles.emptyTitle}>No saved properties</Text>
            <Text style={styles.emptySubtitle}>Tap the heart icon on properties you like to save them here</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  safeArea: { backgroundColor: Colors.white },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 12, backgroundColor: Colors.white, borderBottomWidth: 1, borderBottomColor: Colors.borderLight },
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: Colors.background, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 20, fontWeight: '700' as const, color: Colors.text },
  listContent: { paddingTop: 12, paddingBottom: 30 },
  emptyState: { alignItems: 'center', paddingVertical: 80, paddingHorizontal: 40 },
  emptyTitle: { fontSize: 20, fontWeight: '600' as const, color: Colors.text, marginTop: 16 },
  emptySubtitle: { fontSize: 14, color: Colors.textSecondary, textAlign: 'center', marginTop: 8, lineHeight: 20 },
});
