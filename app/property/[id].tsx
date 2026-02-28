import React, { useState, useCallback, useRef, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Dimensions,
  Alert,
  Animated,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { useLocalSearchParams, router } from 'expo-router';
import {
  ArrowLeft,
  Heart,
  Share2,
  Star,
  MapPin,
  Bed,
  Bath,
  Maximize,
  MessageCircle,
  Phone,
  Calendar,
  ChevronRight,
  Check,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import Colors from '@/constants/colors';
import { properties, reviews } from '@/mocks/properties';

const { width } = Dimensions.get('window');

export default function PropertyDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [saved, setSaved] = useState<boolean>(false);
  const [activeImageIndex, setActiveImageIndex] = useState<number>(0);
  const heartScale = useRef(new Animated.Value(1)).current;

  const property = useMemo(() => properties.find(p => p.id === id), [id]);

  const handleBack = useCallback(() => {
    router.back();
  }, []);

  const handleSave = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setSaved(prev => !prev);
    Animated.sequence([
      Animated.spring(heartScale, { toValue: 1.3, useNativeDriver: true }),
      Animated.spring(heartScale, { toValue: 1, friction: 3, useNativeDriver: true }),
    ]).start();
  }, [heartScale]);

  const handleShare = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Alert.alert('Share', 'Share this property with friends and family!');
  }, []);

  const handleContact = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert(
      'Contact Owner',
      `Send a message to ${property?.ownerName} about this property?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Message', onPress: () => Alert.alert('Sent!', 'Your message has been sent to the owner.') },
        { text: 'Call', onPress: () => Alert.alert('Calling...', `Calling ${property?.ownerName}`) },
      ]
    );
  }, [property]);

  const handleScheduleViewing = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert(
      'Schedule Viewing',
      'Choose a time to visit this property',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'This Week', onPress: () => Alert.alert('Booked!', 'Your viewing has been scheduled for this week. The owner will confirm the exact time.') },
        { text: 'Next Week', onPress: () => Alert.alert('Booked!', 'Your viewing has been scheduled for next week. The owner will confirm the exact time.') },
      ]
    );
  }, []);

  const handleVirtualTour = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Alert.alert('Virtual Tour', 'Virtual tour feature coming soon! Experience properties from the comfort of your home.');
  }, []);

  const formatPrice = (price: number) => {
    if (price >= 1000000) {
      return `${(price / 1000000).toFixed(1)}M`;
    }
    return price.toLocaleString();
  };

  if (!property) {
    return (
      <View style={styles.errorContainer}>
        <SafeAreaView edges={['top']}>
          <Pressable style={styles.backButton} onPress={handleBack}>
            <ArrowLeft size={24} color={Colors.text} />
          </Pressable>
        </SafeAreaView>
        <Text style={styles.errorText}>Property not found</Text>
      </View>
    );
  }

  const typeColors: Record<string, string> = {
    apartment: Colors.categoryApartment,
    office: Colors.categoryOffice,
    hostel: Colors.categoryHostel,
    room: Colors.categoryRoom,
  };

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false} bounces={false}>
        <View style={styles.imageSection}>
          <ScrollView
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onMomentumScrollEnd={(e) => {
              const index = Math.round(e.nativeEvent.contentOffset.x / width);
              setActiveImageIndex(index);
            }}
          >
            {property.images.map((img, idx) => (
              <Image
                key={idx}
                source={{ uri: img }}
                style={styles.heroImage}
                contentFit="cover"
                transition={200}
              />
            ))}
          </ScrollView>

          <SafeAreaView edges={['top']} style={styles.imageOverlay}>
            <Pressable style={styles.backButtonOverlay} onPress={handleBack} testID="back-button">
              <ArrowLeft size={22} color={Colors.text} />
            </Pressable>
            <View style={styles.imageActions}>
              <Pressable style={styles.actionButtonOverlay} onPress={handleShare} testID="share-button">
                <Share2 size={20} color={Colors.text} />
              </Pressable>
              <Pressable style={styles.actionButtonOverlay} onPress={handleSave} testID="save-button">
                <Animated.View style={{ transform: [{ scale: heartScale }] }}>
                  <Heart
                    size={20}
                    color={saved ? Colors.error : Colors.text}
                    fill={saved ? Colors.error : 'transparent'}
                  />
                </Animated.View>
              </Pressable>
            </View>
          </SafeAreaView>

          <View style={styles.imageDots}>
            {property.images.map((_, idx) => (
              <View
                key={idx}
                style={[
                  styles.dot,
                  activeImageIndex === idx && styles.dotActive,
                ]}
              />
            ))}
          </View>
        </View>

        <View style={styles.content}>
          <View style={styles.topRow}>
            <View style={[styles.typeBadge, { backgroundColor: typeColors[property.type] }]}>
              <Text style={styles.typeBadgeText}>
                {property.type.charAt(0).toUpperCase() + property.type.slice(1)}
              </Text>
            </View>
            <View style={styles.listingBadge}>
              <Text style={styles.listingBadgeText}>
                For {property.listingType === 'rent' ? 'Rent' : 'Sale'}
              </Text>
            </View>
          </View>

          <Text style={styles.title}>{property.title}</Text>

          <View style={styles.locationRow}>
            <MapPin size={16} color={Colors.primary} />
            <Text style={styles.locationText}>{property.address}, {property.city}</Text>
          </View>

          <View style={styles.priceRatingRow}>
            <View>
              <Text style={styles.price}>
                {property.currency}{formatPrice(property.price)}
                {property.period && <Text style={styles.period}>{property.period}</Text>}
              </Text>
            </View>
            <View style={styles.ratingBox}>
              <Star size={16} color={Colors.accent} fill={Colors.accent} />
              <Text style={styles.ratingValue}>{property.rating}</Text>
              <Text style={styles.reviewCount}>({property.reviewCount})</Text>
            </View>
          </View>

          <View style={styles.statsCard}>
            {property.bedrooms > 0 && (
              <View style={styles.statBox}>
                <View style={styles.statIconBg}>
                  <Bed size={18} color={Colors.primary} />
                </View>
                <Text style={styles.statValue}>{property.bedrooms}</Text>
                <Text style={styles.statLabel}>{property.bedrooms === 1 ? 'Bedroom' : 'Bedrooms'}</Text>
              </View>
            )}
            <View style={styles.statBox}>
              <View style={styles.statIconBg}>
                <Bath size={18} color={Colors.primary} />
              </View>
              <Text style={styles.statValue}>{property.bathrooms}</Text>
              <Text style={styles.statLabel}>{property.bathrooms === 1 ? 'Bathroom' : 'Bathrooms'}</Text>
            </View>
            <View style={styles.statBox}>
              <View style={styles.statIconBg}>
                <Maximize size={18} color={Colors.primary} />
              </View>
              <Text style={styles.statValue}>{property.area}</Text>
              <Text style={styles.statLabel}>Sq. Ft.</Text>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Description</Text>
            <Text style={styles.description}>{property.description}</Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Amenities</Text>
            <View style={styles.amenitiesGrid}>
              {property.amenities.map((amenity) => (
                <View key={amenity} style={styles.amenityChip}>
                  <Check size={14} color={Colors.primary} />
                  <Text style={styles.amenityText}>{amenity}</Text>
                </View>
              ))}
            </View>
          </View>

          <Pressable style={styles.virtualTourButton} onPress={handleVirtualTour} testID="virtual-tour">
            <Text style={styles.virtualTourText}>🎥  Take a Virtual Tour</Text>
            <ChevronRight size={18} color={Colors.primary} />
          </Pressable>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Owner</Text>
            <View style={styles.ownerCard}>
              <Image source={{ uri: property.ownerAvatar }} style={styles.ownerAvatar} />
              <View style={styles.ownerInfo}>
                <Text style={styles.ownerName}>{property.ownerName}</Text>
                <Text style={styles.ownerRole}>Property Owner</Text>
              </View>
              <View style={styles.ownerActions}>
                <Pressable
                  style={styles.ownerActionButton}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    Alert.alert('Message', `Start a conversation with ${property.ownerName}`);
                  }}
                  testID="message-owner"
                >
                  <MessageCircle size={18} color={Colors.primary} />
                </Pressable>
                <Pressable
                  style={styles.ownerActionButton}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    Alert.alert('Call', `Calling ${property.ownerName}...`);
                  }}
                  testID="call-owner"
                >
                  <Phone size={18} color={Colors.primary} />
                </Pressable>
              </View>
            </View>
          </View>

          <View style={styles.section}>
            <View style={styles.reviewsHeader}>
              <Text style={styles.sectionTitle}>Reviews</Text>
              <Pressable onPress={() => Alert.alert('All Reviews', 'Full reviews page coming soon!')}>
                <Text style={styles.seeAll}>See all</Text>
              </Pressable>
            </View>
            {reviews.slice(0, 2).map((review) => (
              <View key={review.id} style={styles.reviewCard}>
                <View style={styles.reviewHeader}>
                  <Image source={{ uri: review.userAvatar }} style={styles.reviewAvatar} />
                  <View style={styles.reviewInfo}>
                    <Text style={styles.reviewName}>{review.userName}</Text>
                    <Text style={styles.reviewDate}>{review.date}</Text>
                  </View>
                  <View style={styles.reviewRating}>
                    <Star size={12} color={Colors.accent} fill={Colors.accent} />
                    <Text style={styles.reviewRatingText}>{review.rating}</Text>
                  </View>
                </View>
                <Text style={styles.reviewComment}>{review.comment}</Text>
              </View>
            ))}
          </View>

          <View style={styles.bottomSpacer} />
        </View>
      </ScrollView>

      <SafeAreaView edges={['bottom']} style={styles.bottomBar}>
        <View style={styles.bottomBarContent}>
          <View style={styles.bottomPrice}>
            <Text style={styles.bottomPriceValue}>
              {property.currency}{formatPrice(property.price)}
            </Text>
            {property.period && <Text style={styles.bottomPeriod}>{property.period}</Text>}
          </View>
          <View style={styles.bottomActions}>
            <Pressable style={styles.scheduleButton} onPress={handleScheduleViewing} testID="schedule-viewing">
              <Calendar size={18} color={Colors.primary} />
              <Text style={styles.scheduleText}>Visit</Text>
            </Pressable>
            <Pressable style={styles.contactButton} onPress={handleContact} testID="contact-owner">
              <MessageCircle size={18} color={Colors.white} />
              <Text style={styles.contactText}>Contact</Text>
            </Pressable>
          </View>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.white,
  },
  errorContainer: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  errorText: {
    fontSize: 18,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginTop: 100,
  },
  imageSection: {
    position: 'relative',
  },
  heroImage: {
    width: width,
    height: 320,
  },
  imageOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  backButton: {
    padding: 16,
  },
  backButtonOverlay: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.9)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  imageActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButtonOverlay: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.9)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  imageDots: {
    position: 'absolute',
    bottom: 16,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.5)',
  },
  dotActive: {
    backgroundColor: Colors.white,
    width: 24,
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  topRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  typeBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  typeBadgeText: {
    color: Colors.white,
    fontSize: 12,
    fontWeight: '700' as const,
  },
  listingBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: Colors.text,
  },
  listingBadgeText: {
    color: Colors.white,
    fontSize: 12,
    fontWeight: '600' as const,
  },
  title: {
    fontSize: 24,
    fontWeight: '800' as const,
    color: Colors.text,
    marginBottom: 8,
    letterSpacing: -0.3,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 16,
  },
  locationText: {
    fontSize: 14,
    color: Colors.textSecondary,
    flex: 1,
  },
  priceRatingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  price: {
    fontSize: 28,
    fontWeight: '800' as const,
    color: Colors.primary,
  },
  period: {
    fontSize: 16,
    fontWeight: '400' as const,
    color: Colors.textSecondary,
  },
  ratingBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.accentLight,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
  },
  ratingValue: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: Colors.text,
  },
  reviewCount: {
    fontSize: 13,
    color: Colors.textSecondary,
  },
  statsCard: {
    flexDirection: 'row',
    backgroundColor: Colors.background,
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
    justifyContent: 'space-around',
  },
  statBox: {
    alignItems: 'center',
    gap: 6,
  },
  statIconBg: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statValue: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: Colors.text,
  },
  statLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontWeight: '500' as const,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: Colors.text,
    marginBottom: 12,
  },
  description: {
    fontSize: 15,
    color: Colors.textSecondary,
    lineHeight: 24,
  },
  amenitiesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  amenityChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: Colors.primaryLight,
  },
  amenityText: {
    fontSize: 13,
    color: Colors.primary,
    fontWeight: '500' as const,
  },
  virtualTourButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.accentLight,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 14,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: Colors.accent + '30',
  },
  virtualTourText: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: Colors.text,
  },
  ownerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background,
    padding: 14,
    borderRadius: 16,
    gap: 12,
  },
  ownerAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  ownerInfo: {
    flex: 1,
  },
  ownerName: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.text,
  },
  ownerRole: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  ownerActions: {
    flexDirection: 'row',
    gap: 8,
  },
  ownerActionButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reviewsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  seeAll: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.primary,
  },
  reviewCard: {
    backgroundColor: Colors.background,
    padding: 14,
    borderRadius: 14,
    marginBottom: 10,
  },
  reviewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 8,
  },
  reviewAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },
  reviewInfo: {
    flex: 1,
  },
  reviewName: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.text,
  },
  reviewDate: {
    fontSize: 12,
    color: Colors.textLight,
  },
  reviewRating: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.accentLight,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  reviewRatingText: {
    fontSize: 13,
    fontWeight: '700' as const,
    color: Colors.text,
  },
  reviewComment: {
    fontSize: 14,
    color: Colors.textSecondary,
    lineHeight: 20,
  },
  bottomSpacer: {
    height: 40,
  },
  bottomBar: {
    backgroundColor: Colors.white,
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 8,
  },
  bottomBarContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  bottomPrice: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  bottomPriceValue: {
    fontSize: 22,
    fontWeight: '800' as const,
    color: Colors.primary,
  },
  bottomPeriod: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginLeft: 2,
  },
  bottomActions: {
    flexDirection: 'row',
    gap: 10,
  },
  scheduleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 14,
    backgroundColor: Colors.primaryLight,
  },
  scheduleText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.primary,
  },
  contactButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 14,
    backgroundColor: Colors.primary,
  },
  contactText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.white,
  },
});
