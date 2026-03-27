import React, { useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Animated,
  useWindowDimensions,
} from 'react-native';
import { Image } from 'expo-image';
import { Star, MapPin, Bed, Bath, Maximize } from 'lucide-react-native';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import Colors from '@/constants/colors';
import { Property } from '@/types/property';

interface PropertyCardProps {
  property: Property;
  compact?: boolean;
}

function PropertyCard({ property, compact = false }: PropertyCardProps) {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const { width: screenWidth } = useWindowDimensions();
  const isWide = screenWidth > 600;

  const handlePressIn = useCallback(() => {
    Animated.spring(scaleAnim, {
      toValue: 0.97,
      useNativeDriver: true,
    }).start();
  }, [scaleAnim]);

  const handlePressOut = useCallback(() => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      friction: 3,
      useNativeDriver: true,
    }).start();
  }, [scaleAnim]);

  const handlePress = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push(`/property/${property.id}`);
  }, [property.id]);

  const formatPrice = (price: number) => {
    if (price >= 1000000) {
      return `${(price / 1000000).toFixed(1)}M`;
    }
    if (price >= 1000) {
      return price.toLocaleString();
    }
    return price.toString();
  };

  const typeColors: Record<string, string> = {
    apartment: Colors.categoryApartment,
    office: Colors.categoryOffice,
    hostel: Colors.categoryHostel,
    room: Colors.categoryRoom,
    hotel: Colors.categoryHotel,
  };

  if (compact) {
    return (
      <Pressable
        onPress={handlePress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        testID={`property-card-${property.id}`}
      >
        <Animated.View style={[styles.compactCard, { transform: [{ scale: scaleAnim }] }]}>
          <Image
            source={{ uri: property.images[0] }}
            style={styles.compactImage}
            contentFit="cover"
            transition={200}
          />
          <View style={styles.compactInfo}>
            <View style={[styles.typeBadgeSmall, { backgroundColor: typeColors[property.type] + '20' }]}>
              <Text style={[styles.typeBadgeTextSmall, { color: typeColors[property.type] }]}>
                {property.type.charAt(0).toUpperCase() + property.type.slice(1)}
              </Text>
            </View>
            <Text style={styles.compactTitle} numberOfLines={1}>{property.title}</Text>
            <View style={styles.compactLocation}>
              <MapPin size={12} color={Colors.textSecondary} />
              <Text style={styles.compactLocationText} numberOfLines={1}>{property.city}</Text>
            </View>
            <Text style={styles.compactPrice}>
              {property.currency}{formatPrice(property.price)}
              {property.period && <Text style={styles.period}>{property.period}</Text>}
            </Text>
          </View>
        </Animated.View>
      </Pressable>
    );
  }

  return (
    <Pressable
      onPress={handlePress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      testID={`property-card-${property.id}`}
    >
      <Animated.View style={[
        styles.card,
        isWide && styles.cardWide,
        { transform: [{ scale: scaleAnim }] },
      ]}>
        <View style={[styles.imageContainer, isWide && styles.imageContainerWide]}>
          <Image
            source={{ uri: property.images[0] }}
            style={[styles.image, isWide && styles.imageWide]}
            contentFit="cover"
            transition={300}
          />
          <View style={styles.imageOverlay}>
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
          {property.featured && (
            <View style={styles.featuredBadge}>
              <Star size={10} color={Colors.accent} fill={Colors.accent} />
              <Text style={styles.featuredText}>Featured</Text>
            </View>
          )}
        </View>

        <View style={[styles.info, isWide && styles.infoWide]}>
          <View style={styles.priceRow}>
            <Text style={styles.price}>
              {property.currency}{formatPrice(property.price)}
              {property.period && <Text style={styles.period}>{property.period}</Text>}
            </Text>
            <View style={styles.ratingContainer}>
              <Star size={14} color={Colors.accent} fill={Colors.accent} />
              <Text style={styles.ratingText}>{property.rating}</Text>
              <Text style={styles.reviewText}>({property.reviewCount})</Text>
            </View>
          </View>

          <Text style={styles.title} numberOfLines={1}>{property.title}</Text>

          <View style={styles.locationRow}>
            <MapPin size={14} color={Colors.primary} />
            <Text style={styles.locationText} numberOfLines={1}>
              {property.address}, {property.city}
            </Text>
          </View>

          <View style={styles.statsRow}>
            {property.bedrooms > 0 && (
              <View style={styles.stat}>
                <Bed size={14} color={Colors.textSecondary} />
                <Text style={styles.statText}>{property.bedrooms} {property.bedrooms === 1 ? 'Bed' : 'Beds'}</Text>
              </View>
            )}
            <View style={styles.stat}>
              <Bath size={14} color={Colors.textSecondary} />
              <Text style={styles.statText}>{property.bathrooms} {property.bathrooms === 1 ? 'Bath' : 'Baths'}</Text>
            </View>
            <View style={styles.stat}>
              <Maximize size={14} color={Colors.textSecondary} />
              <Text style={styles.statText}>{property.area} ft²</Text>
            </View>
          </View>
        </View>
      </Animated.View>
    </Pressable>
  );
}

export default React.memo(PropertyCard);

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.card,
    borderRadius: 16,
    marginHorizontal: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
    overflow: 'hidden',
  },
  cardWide: {
    flexDirection: 'row',
    maxWidth: 800,
    alignSelf: 'center',
    width: '100%',
  },
  imageContainer: {
    position: 'relative',
  },
  imageContainerWide: {
    width: '40%',
  },
  image: {
    width: '100%',
    height: 200,
  },
  imageWide: {
    height: '100%',
    minHeight: 200,
  },
  imageOverlay: {
    position: 'absolute',
    top: 12,
    left: 12,
    flexDirection: 'row',
    gap: 8,
  },
  typeBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
  },
  typeBadgeText: {
    color: Colors.white,
    fontSize: 11,
    fontWeight: '700' as const,
    letterSpacing: 0.3,
  },
  typeBadgeSmall: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    alignSelf: 'flex-start' as const,
  },
  typeBadgeTextSmall: {
    fontSize: 10,
    fontWeight: '600' as const,
  },
  listingBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  listingBadgeText: {
    color: Colors.white,
    fontSize: 11,
    fontWeight: '600' as const,
  },
  featuredBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.95)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  featuredText: {
    fontSize: 10,
    fontWeight: '700' as const,
    color: Colors.accent,
  },
  info: {
    padding: 16,
  },
  infoWide: {
    flex: 1,
    justifyContent: 'center',
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  price: {
    fontSize: 22,
    fontWeight: '800' as const,
    color: Colors.primary,
  },
  period: {
    fontSize: 14,
    fontWeight: '400' as const,
    color: Colors.textSecondary,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  ratingText: {
    fontSize: 14,
    fontWeight: '700' as const,
    color: Colors.text,
  },
  reviewText: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  title: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.text,
    marginBottom: 8,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 12,
  },
  locationText: {
    fontSize: 13,
    color: Colors.textSecondary,
    flex: 1,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
    flexWrap: 'wrap',
  },
  stat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statText: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontWeight: '500' as const,
  },
  compactCard: {
    backgroundColor: Colors.card,
    borderRadius: 14,
    width: 200,
    marginRight: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
    overflow: 'hidden',
  },
  compactImage: {
    width: '100%',
    height: 130,
  },
  compactInfo: {
    padding: 10,
  },
  compactTitle: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: Colors.text,
    marginTop: 4,
    marginBottom: 4,
  },
  compactLocation: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    marginBottom: 6,
  },
  compactLocationText: {
    fontSize: 11,
    color: Colors.textSecondary,
  },
  compactPrice: {
    fontSize: 15,
    fontWeight: '800' as const,
    color: Colors.primary,
  },
});
