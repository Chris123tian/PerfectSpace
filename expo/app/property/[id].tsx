import React, { useState, useCallback, useRef, useMemo } from 'react';
import { showAlert } from '@/lib/alert';
import {
  View, Text, StyleSheet, ScrollView, Pressable, Dimensions, Alert, Animated, Platform, TextInput, Modal, Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import SafeImage from '@/components/SafeImage';
import { useLocalSearchParams, router } from 'expo-router';
import {
  ArrowLeft, Heart, Share2, Star, MapPin, Bed, Bath, Maximize, MessageCircle, Calendar, Check, Send, X, Video, Globe2, ChevronLeft as ChevronLeftIcon, ChevronRight as ChevronRightIcon, Images as ImagesIcon, Mail, ShieldAlert,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import Colors from '@/constants/colors';
import { useAuth } from '@/contexts/AuthContext';
import { useData } from '@/contexts/DataContext';

const { width, height: screenHeight } = Dimensions.get('window');

export default function PropertyDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const { properties, isSaved, toggleSave, getPropertyReviews, addReview, startConversation, createBooking } = useData();
  const [activeImageIndex, setActiveImageIndex] = useState<number>(0);
  const [showGallery, setShowGallery] = useState<boolean>(false);
  const [galleryIndex, setGalleryIndex] = useState<number>(0);
  const [showReviewForm, setShowReviewForm] = useState<boolean>(false);
  const galleryScrollRef = useRef<ScrollView>(null);
  const [reviewRating, setReviewRating] = useState<number>(5);
  const [reviewComment, setReviewComment] = useState<string>('');
  const [showBookingModal, setShowBookingModal] = useState<boolean>(false);
  const [bookingType, setBookingType] = useState<'in_person' | 'video'>('in_person');
  const [bookingDate, setBookingDate] = useState<string>('');
  const [bookingTime, setBookingTime] = useState<string>('');
  const [bookingNotes, setBookingNotes] = useState<string>('');
  const [bookingError, setBookingError] = useState<string | undefined>(undefined);
  const heartScale = useRef(new Animated.Value(1)).current;

  const property = useMemo(() => properties.find(p => p.id === id), [id, properties]);
  const propertyReviews = useMemo(() => getPropertyReviews(id ?? ''), [getPropertyReviews, id]);
  const saved = useMemo(() => isSaved(id ?? ''), [isSaved, id]);

  const handleBack = useCallback(() => router.back(), []);

  const openGallery = useCallback((index: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setGalleryIndex(index);
    setShowGallery(true);
    setTimeout(() => {
      galleryScrollRef.current?.scrollTo({ x: index * width, animated: false });
    }, 50);
  }, []);

  const handleGalleryScroll = useCallback((e: { nativeEvent: { contentOffset: { x: number } } }) => {
    const idx = Math.round(e.nativeEvent.contentOffset.x / width);
    setGalleryIndex(idx);
  }, []);

  const goGalleryPrev = useCallback(() => {
    if (!property) return;
    const newIdx = Math.max(0, galleryIndex - 1);
    setGalleryIndex(newIdx);
    galleryScrollRef.current?.scrollTo({ x: newIdx * width, animated: true });
  }, [galleryIndex, property]);

  const goGalleryNext = useCallback(() => {
    if (!property) return;
    const newIdx = Math.min(property.images.length - 1, galleryIndex + 1);
    setGalleryIndex(newIdx);
    galleryScrollRef.current?.scrollTo({ x: newIdx * width, animated: true });
  }, [galleryIndex, property]);

  const handleSave = useCallback(async () => {
    if (!id) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Animated.sequence([
      Animated.spring(heartScale, { toValue: 1.3, useNativeDriver: true }),
      Animated.spring(heartScale, { toValue: 1, friction: 3, useNativeDriver: true }),
    ]).start();
    try { await toggleSave(id); } catch (e) { console.log('[Property] Save error:', e); }
  }, [id, heartScale, toggleSave]);

  const handleShare = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    showAlert('Share', 'Share this property with friends and family!');
  }, []);

  const promptSignIn = useCallback(() => {
    showAlert('Create an account to book', 'Sign up free to reserve your space from anywhere in the world.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign In', onPress: () => router.push('/login') },
    ]);
  }, []);

  const handleContact = useCallback(async () => {
    if (!property) return;
    if (!user) {
      promptSignIn();
      return;
    }
    if (property.ownerId === user.id) {
      showAlert('Info', 'This is your own property.');
      return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      const convId = await startConversation({
        otherUserId: property.ownerId,
        otherUserName: property.ownerName,
        otherUserAvatar: property.ownerAvatar,
        propertyId: property.id,
        propertyTitle: property.title,
        propertyImage: property.images[0],
        initialMessage: `Hi! I'm interested in ${property.title}.`,
      });
      router.push(`/chat/${convId}`);
    } catch (e) {
      console.log('[Property] Contact error:', e);
      showAlert('Error', 'Could not start the conversation. Please try again.');
    }
  }, [property, user, startConversation, promptSignIn]);

  // promptSignIn is defined below; hoist-safe because these callbacks run on press only.
  const openWhatsApp = useCallback(async () => {
    if (!property) return;
    const number = (property.contactWhatsApp ?? '').replace(/[^\d]/g, '');
    if (!number) {
      showAlert('No WhatsApp', 'This owner has not added a WhatsApp number.');
      return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const text = encodeURIComponent(`Hi! I'm interested in "${property.title}" on Perfect Space (${property.currency}${property.price.toLocaleString()}${property.period ?? ''}). Is it still available?`);
    try { await Linking.openURL(`https://wa.me/${number}?text=${text}`); } catch (e) {
      console.log('[Property] WhatsApp open error:', e);
    }
  }, [property]);

  const openOwnerEmail = useCallback(async () => {
    if (!property?.contactEmail) return;
    try { await Linking.openURL(`mailto:${property.contactEmail}?subject=${encodeURIComponent(`Interest in ${property.title}`)}`); } catch (e) {
      console.log('[Property] Email open error:', e);
    }
  }, [property]);

  const openBookingModal = useCallback((type: 'in_person' | 'video') => {
    if (!property || !user) return;
    const defaultDate = new Date();
    defaultDate.setDate(defaultDate.getDate() + (type === 'video' ? 3 : 14));
    setBookingType(type);
    setBookingDate(defaultDate.toISOString().split('T')[0]);
    setBookingTime(type === 'video' ? '4:00 PM' : '10:00 AM');
    setBookingNotes('');
    setBookingError(undefined);
    setShowBookingModal(true);
  }, [property, user]);

  const handleScheduleViewing = useCallback(() => {
    if (!property) return;
    if (!user) {
      promptSignIn();
      return;
    }
    if (property.ownerId === user.id) {
      showAlert('Info', 'This is your own property.');
      return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (property.bookingChannel === 'whatsapp') {
      void openWhatsApp();
      return;
    }
    openBookingModal('in_person');
  }, [property, user, openBookingModal, promptSignIn, openWhatsApp]);

  const handleBookFromAbroad = useCallback(() => {
    if (!property) return;
    if (!user) {
      promptSignIn();
      return;
    }
    if (property.ownerId === user.id) {
      showAlert('Info', 'This is your own property.');
      return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (property.bookingChannel === 'whatsapp') {
      void openWhatsApp();
      return;
    }
    openBookingModal('video');
  }, [property, user, openBookingModal, promptSignIn, openWhatsApp]);

  const handleConfirmBooking = useCallback(async () => {
    if (!property || !user) return;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(bookingDate.trim())) {
      setBookingError('Enter the date as YYYY-MM-DD');
      return;
    }
    if (!bookingTime.trim()) {
      setBookingError('Enter a time, e.g. 2:00 PM');
      return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      await createBooking({
        id: 'b_' + Date.now().toString(36),
        propertyId: property.id,
        propertyTitle: property.title,
        propertyImage: property.images[0],
        renterId: user.id,
        renterName: user.name,
        renterAvatar: user.avatar,
        ownerId: property.ownerId,
        ownerName: property.ownerName,
        date: bookingDate.trim(),
        time: bookingTime.trim(),
        status: 'pending',
        notes: bookingNotes.trim(),
        type: bookingType,
        createdAt: new Date().toISOString(),
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setShowBookingModal(false);
      showAlert(
        'Booked!',
        bookingType === 'video'
          ? 'Video tour requested. The owner will confirm the time — you can do this all before you fly in.'
          : 'Your viewing request has been sent. The owner will confirm.'
      );
    } catch (e) {
      console.log('[Property] Booking error:', e);
      setBookingError('Could not send the booking. Try again.');
    }
  }, [property, user, bookingDate, bookingTime, bookingNotes, bookingType, createBooking]);

  const handleSubmitReview = useCallback(async () => {
    if (!id || !reviewComment.trim()) {
      showAlert('Error', 'Please write a review comment.');
      return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      await addReview({ propertyId: id, rating: reviewRating, comment: reviewComment.trim() });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setShowReviewForm(false);
      setReviewComment('');
      setReviewRating(5);
    } catch (e) {
      console.log('[Property] Review error:', e);
    }
  }, [id, reviewRating, reviewComment, addReview]);

  const formatPrice = (price: number) => {
    if (price >= 1000000) return `${(price / 1000000).toFixed(1)}M`;
    return price.toLocaleString();
  };

  if (!property) {
    return (
      <View style={styles.errorContainer}>
        <SafeAreaView edges={['top']}>
          <Pressable style={styles.backButton} onPress={handleBack}><ArrowLeft size={24} color={Colors.text} /></Pressable>
        </SafeAreaView>
        <Text style={styles.errorText}>Property not found</Text>
      </View>
    );
  }

  const typeColors: Record<string, string> = {
    apartment: Colors.categoryApartment, office: Colors.categoryOffice,
    hostel: Colors.categoryHostel, room: Colors.categoryRoom,
    hotel: Colors.categoryHotel,
  };

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false} bounces={false}>
        <View style={styles.imageSection}>
          <ScrollView
            horizontal pagingEnabled showsHorizontalScrollIndicator={false}
            onMomentumScrollEnd={(e) => setActiveImageIndex(Math.round(e.nativeEvent.contentOffset.x / width))}
          >
            {property.images.map((img, idx) => (
              <Pressable key={idx} onPress={() => openGallery(idx)} testID={`hero-image-${idx}`}>
                <SafeImage uri={img} style={styles.heroImage} contentFit="cover" transition={200} />
              </Pressable>
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
                  <Heart size={20} color={saved ? Colors.error : Colors.text} fill={saved ? Colors.error : 'transparent'} />
                </Animated.View>
              </Pressable>
            </View>
          </SafeAreaView>
          <View style={styles.imageDotsRow}>
            <View style={styles.imageDots}>
              {property.images.map((_, idx) => (
                <View key={idx} style={[styles.dot, activeImageIndex === idx && styles.dotActive]} />
              ))}
            </View>
            <View style={styles.imageCountBadge}>
              <Text style={styles.imageCountText}>{activeImageIndex + 1}/{property.images.length}</Text>
            </View>
          </View>
        </View>

        {property.images.length > 1 && (
          <View style={styles.thumbnailRow}>
            {property.images.map((img, idx) => (
              <Pressable
                key={idx}
                style={[styles.thumbnail, activeImageIndex === idx && styles.thumbnailActive]}
                onPress={() => openGallery(idx)}
                testID={`thumb-${idx}`}
              >
                <SafeImage uri={img} style={styles.thumbnailImage} contentFit="cover" />
              </Pressable>
            ))}
          </View>
        )}

        <View style={styles.quickActionsRow}>
          <Pressable
            style={[styles.quickActionBtn, styles.quickActionSecondary]}
            onPress={() => openGallery(activeImageIndex)}
            testID="view-photos"
          >
            <ImagesIcon size={18} color={Colors.primary} />
            <Text style={[styles.quickActionText, styles.quickActionTextSecondary]}>View Photos</Text>
          </Pressable>
          <Pressable
            style={[styles.quickActionBtn, styles.quickActionPrimary]}
            onPress={handleScheduleViewing}
            testID="book-below-images"
          >
            <Calendar size={18} color={Colors.white} />
            <Text style={[styles.quickActionText, styles.quickActionTextPrimary]}>
              {property.bookingChannel === 'whatsapp' ? 'Book via WhatsApp' : 'Book Viewing'}
            </Text>
          </Pressable>
        </View>

        <View style={styles.content}>
          <View style={styles.topRow}>
            <View style={[styles.typeBadge, { backgroundColor: typeColors[property.type] }]}>
              <Text style={styles.typeBadgeText}>{property.type.charAt(0).toUpperCase() + property.type.slice(1)}</Text>
            </View>
            <View style={styles.listingBadge}>
              <Text style={styles.listingBadgeText}>For {property.listingType === 'rent' ? 'Rent' : 'Sale'}</Text>
            </View>
          </View>

          <Text style={styles.title}>{property.title}</Text>
          <View style={styles.locationRow}>
            <MapPin size={16} color={Colors.primary} />
            <Text style={styles.locationText}>{property.address}, {property.city}</Text>
          </View>

          <View style={styles.priceRatingRow}>
            <Text style={styles.price}>{property.currency}{formatPrice(property.price)}{property.period && <Text style={styles.period}>{property.period}</Text>}</Text>
            <View style={styles.ratingBox}>
              <Star size={16} color={Colors.accent} fill={Colors.accent} />
              <Text style={styles.ratingValue}>{property.rating || '-'}</Text>
              <Text style={styles.reviewCount}>({property.reviewCount})</Text>
            </View>
          </View>

          <View style={styles.statsCard}>
            {property.bedrooms > 0 && (
              <View style={styles.statBox}>
                <View style={styles.statIconBg}><Bed size={18} color={Colors.primary} /></View>
                <Text style={styles.statValue}>{property.bedrooms}</Text>
                <Text style={styles.statLabel}>{property.bedrooms === 1 ? 'Bedroom' : 'Bedrooms'}</Text>
              </View>
            )}
            <View style={styles.statBox}>
              <View style={styles.statIconBg}><Bath size={18} color={Colors.primary} /></View>
              <Text style={styles.statValue}>{property.bathrooms}</Text>
              <Text style={styles.statLabel}>{property.bathrooms === 1 ? 'Bathroom' : 'Bathrooms'}</Text>
            </View>
            <View style={styles.statBox}>
              <View style={styles.statIconBg}><Maximize size={18} color={Colors.primary} /></View>
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

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Owner</Text>
            <View style={styles.ownerCard}>
              <SafeImage uri={property.ownerAvatar} style={styles.ownerAvatar} />
              <View style={styles.ownerInfo}>
                <Text style={styles.ownerName}>{property.ownerName}</Text>
                <Text style={styles.ownerRole}>Property Owner</Text>
              </View>
              <View style={styles.ownerActions}>
                {!!property.contactWhatsApp && (
                  <Pressable style={styles.ownerActionButton} onPress={openWhatsApp} testID="owner-whatsapp">
                    <MessageCircle size={18} color={Colors.success} />
                  </Pressable>
                )}
                {!!property.contactEmail && (
                  <Pressable style={styles.ownerActionButton} onPress={openOwnerEmail} testID="owner-email">
                    <Mail size={18} color={Colors.primary} />
                  </Pressable>
                )}
                <Pressable style={styles.ownerActionButton} onPress={handleContact} testID="message-owner">
                  <MessageCircle size={18} color={Colors.primary} />
                </Pressable>
              </View>
            </View>
          </View>

          <View style={styles.section}>
            <View style={styles.reviewsHeader}>
              <Text style={styles.sectionTitle}>Reviews ({propertyReviews.length})</Text>
              {user && property.ownerId !== user.id && (
                <Pressable onPress={() => setShowReviewForm(!showReviewForm)}>
                  <Text style={styles.seeAll}>{showReviewForm ? 'Cancel' : 'Write Review'}</Text>
                </Pressable>
              )}
            </View>

            {showReviewForm && (
              <View style={styles.reviewForm}>
                <View style={styles.ratingRow}>
                  {[1, 2, 3, 4, 5].map(n => (
                    <Pressable key={n} onPress={() => setReviewRating(n)}>
                      <Star size={28} color={Colors.accent} fill={n <= reviewRating ? Colors.accent : 'transparent'} />
                    </Pressable>
                  ))}
                </View>
                <TextInput
                  style={styles.reviewInput}
                  value={reviewComment}
                  onChangeText={setReviewComment}
                  placeholder="Write your review..."
                  placeholderTextColor={Colors.textLight}
                  multiline
                  maxLength={300}
                  testID="review-input"
                />
                <Pressable style={styles.submitReviewBtn} onPress={handleSubmitReview} testID="submit-review">
                  <Send size={16} color={Colors.white} />
                  <Text style={styles.submitReviewText}>Submit Review</Text>
                </Pressable>
              </View>
            )}

            {propertyReviews.slice(0, 5).map((review) => (
              <View key={review.id} style={styles.reviewCard}>
                <View style={styles.reviewHeader}>
                  <SafeImage uri={review.userAvatar} style={styles.reviewAvatar} />
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

      <Modal visible={showGallery} animationType="fade" transparent statusBarTranslucent>
        <View style={styles.galleryOverlay}>
          <SafeAreaView edges={['top']} style={styles.galleryHeader}>
            <Pressable style={styles.galleryCloseBtn} onPress={() => setShowGallery(false)} testID="close-gallery">
              <X size={24} color={Colors.white} />
            </Pressable>
            <Text style={styles.galleryCounter}>{galleryIndex + 1} / {property.images.length}</Text>
            <View style={{ width: 40 }} />
          </SafeAreaView>

          <ScrollView
            ref={galleryScrollRef}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onMomentumScrollEnd={handleGalleryScroll}
            style={styles.galleryScroll}
          >
            {property.images.map((img, idx) => (
              <View key={idx} style={styles.gallerySlide}>
                <SafeImage uri={img} style={styles.galleryImage} contentFit="contain" />
              </View>
            ))}
          </ScrollView>

          {galleryIndex > 0 && (
            <Pressable style={styles.galleryNavLeft} onPress={goGalleryPrev}>
              <ChevronLeftIcon size={32} color={Colors.white} />
            </Pressable>
          )}
          {property.images.length > 1 && galleryIndex < property.images.length - 1 && (
            <Pressable style={styles.galleryNavRight} onPress={goGalleryNext}>
              <ChevronRightIcon size={32} color={Colors.white} />
            </Pressable>
          )}

          <SafeAreaView edges={['bottom']} style={styles.galleryFooter}>
            <View style={styles.galleryDotsRow}>
              {property.images.map((_, idx) => (
                <View key={idx} style={[styles.galleryDot, galleryIndex === idx && styles.galleryDotActive]} />
              ))}
            </View>
          </SafeAreaView>
        </View>
      </Modal>

      <SafeAreaView edges={['bottom']} style={styles.bottomBar}>
        <View style={styles.bottomBarContent}>
          <View style={styles.bottomPrice}>
            <Text style={styles.bottomPriceValue}>{property.currency}{formatPrice(property.price)}</Text>
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
        <Pressable style={styles.abroadButton} onPress={handleBookFromAbroad} testID="book-from-abroad">
          <Globe2 size={16} color={Colors.primary} />
          <Text style={styles.abroadText}>Outside the country? Book a video tour before you fly in</Text>
        </Pressable>
      </SafeAreaView>

      <Modal visible={showBookingModal} animationType="slide" transparent>
        <View style={styles.bookingOverlay}>
          <SafeAreaView edges={['bottom']} style={styles.bookingSheet}>
            <View style={styles.bookingHeader}>
              <Text style={styles.bookingTitle}>Book {property.title}</Text>
              <Pressable onPress={() => setShowBookingModal(false)} testID="booking-close">
                <X size={22} color={Colors.textSecondary} />
              </Pressable>
            </View>
            <Text style={styles.bookingSubtitle}>Reserve from anywhere in the world — even before your visa or flight is booked.</Text>

            <View style={styles.bookingTypeRow}>
              <Pressable
                style={[styles.bookingTypeBtn, bookingType === 'in_person' && styles.bookingTypeBtnActive]}
                onPress={() => setBookingType('in_person')}
                testID="booking-type-in-person"
              >
                <Calendar size={18} color={bookingType === 'in_person' ? Colors.white : Colors.primary} />
                <Text style={[styles.bookingTypeText, bookingType === 'in_person' && styles.bookingTypeTextActive]}>In-person viewing</Text>
              </Pressable>
              <Pressable
                style={[styles.bookingTypeBtn, bookingType === 'video' && styles.bookingTypeBtnActive]}
                onPress={() => setBookingType('video')}
                testID="booking-type-video"
              >
                <Video size={18} color={bookingType === 'video' ? Colors.white : Colors.primary} />
                <Text style={[styles.bookingTypeText, bookingType === 'video' && styles.bookingTypeTextActive]}>Video tour (from abroad)</Text>
              </Pressable>
            </View>

            <View style={styles.bookingRow}>
              <View style={styles.bookingField}>
                <Text style={styles.bookingLabel}>Date (YYYY-MM-DD)</Text>
                <TextInput
                  style={styles.bookingInput}
                  value={bookingDate}
                  onChangeText={(t) => { setBookingDate(t); setBookingError(undefined); }}
                  placeholder="2026-12-20"
                  placeholderTextColor={Colors.textLight}
                  autoCapitalize="none"
                  testID="booking-date"
                />
              </View>
              <View style={styles.bookingField}>
                <Text style={styles.bookingLabel}>Time</Text>
                <TextInput
                  style={styles.bookingInput}
                  value={bookingTime}
                  onChangeText={(t) => { setBookingTime(t); setBookingError(undefined); }}
                  placeholder="2:00 PM"
                  placeholderTextColor={Colors.textLight}
                  testID="booking-time"
                />
              </View>
            </View>
            <View style={styles.bookingQuickRow}>
              {[1, 2, 4].map((weeks) => {
                const d = new Date();
                d.setDate(d.getDate() + weeks * 7);
                const value = d.toISOString().split('T')[0];
                return (
                  <Pressable key={weeks} style={styles.bookingQuickChip} onPress={() => { setBookingDate(value); setBookingError(undefined); }}>
                    <Text style={styles.bookingQuickText}>In {weeks} week{weeks > 1 ? 's' : ''}</Text>
                  </Pressable>
                );
              })}
            </View>

            <Text style={styles.bookingLabel}>Notes for the owner (optional)</Text>
            <TextInput
              style={[styles.bookingInput, styles.bookingNotes]}
              value={bookingNotes}
              onChangeText={setBookingNotes}
              placeholder="Arrival date, flight number, questions…"
              placeholderTextColor={Colors.textLight}
              multiline
              testID="booking-notes"
            />

            {bookingError ? <Text style={styles.bookingError}>{bookingError}</Text> : null}

            <View style={styles.noPaymentWarning}>
              <ShieldAlert size={16} color={Colors.warning} />
              <Text style={styles.noPaymentText}>
                No payment needed. Perfect Space never asks for payment — do not send money to anyone before viewing the property and signing a lease.
              </Text>
            </View>

            <Pressable style={styles.bookingConfirm} onPress={handleConfirmBooking} testID="booking-confirm">
              <Text style={styles.bookingConfirmText}>Request Booking</Text>
            </Pressable>
          </SafeAreaView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.white },
  errorContainer: { flex: 1, backgroundColor: Colors.background },
  errorText: { fontSize: 18, color: Colors.textSecondary, textAlign: 'center', marginTop: 100 },
  imageSection: { position: 'relative' as const },
  heroImage: { width: width, height: 320 },
  imageOverlay: { position: 'absolute' as const, top: 0, left: 0, right: 0, flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 8 },
  backButton: { padding: 16 },
  abroadButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginHorizontal: 20, marginBottom: 8, paddingVertical: 8, borderRadius: 12, backgroundColor: Colors.primaryLight },
  abroadText: { fontSize: 12, fontWeight: '600' as const, color: Colors.primary, flex: 1, flexShrink: 1 },
  bookingOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' as const },
  bookingSheet: { backgroundColor: Colors.white, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20 },
  bookingHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 },
  bookingTitle: { fontSize: 20, fontWeight: '800' as const, color: Colors.text, flex: 1, marginRight: 12 },
  bookingSubtitle: { fontSize: 13, color: Colors.textSecondary, marginBottom: 16, lineHeight: 19 },
  bookingTypeRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  bookingTypeBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 12, borderRadius: 12, borderWidth: 1.5, borderColor: Colors.border, backgroundColor: Colors.background },
  bookingTypeBtnActive: { borderColor: Colors.primary, backgroundColor: Colors.primary },
  bookingTypeText: { fontSize: 12, fontWeight: '700' as const, color: Colors.primary, flexShrink: 1 },
  bookingTypeTextActive: { color: Colors.white },
  bookingRow: { flexDirection: 'row', gap: 10 },
  bookingField: { flex: 1 },
  bookingLabel: { fontSize: 12, fontWeight: '600' as const, color: Colors.textSecondary, marginBottom: 6 },
  bookingInput: { borderWidth: 1.5, borderColor: Colors.border, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, fontSize: 15, color: Colors.text, backgroundColor: Colors.background },
  bookingQuickRow: { flexDirection: 'row', gap: 8, marginTop: 10, marginBottom: 14 },
  bookingQuickChip: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 14, backgroundColor: Colors.primaryLight },
  bookingQuickText: { fontSize: 11, fontWeight: '600' as const, color: Colors.primary },
  bookingNotes: { height: 70, paddingTop: 10, textAlignVertical: 'top' as const, marginBottom: 14 },
  bookingError: { color: Colors.error, fontSize: 13, fontWeight: '600' as const, marginBottom: 10 },
  bookingConfirm: { backgroundColor: Colors.primary, borderRadius: 14, paddingVertical: 14, alignItems: 'center' as const },
  bookingConfirmText: { color: Colors.white, fontSize: 16, fontWeight: '700' as const },
  backButtonOverlay: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.9)', alignItems: 'center', justifyContent: 'center' },
  imageActions: { flexDirection: 'row', gap: 8 },
  actionButtonOverlay: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.9)', alignItems: 'center', justifyContent: 'center' },
  imageDots: { position: 'absolute' as const, bottom: 16, left: 0, right: 0, flexDirection: 'row', justifyContent: 'center', gap: 6 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.5)' },
  dotActive: { backgroundColor: Colors.white, width: 24 },
  quickActionsRow: { flexDirection: 'row', gap: 10, paddingHorizontal: 20, paddingTop: 14 },
  quickActionBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14, borderRadius: 14 },
  quickActionSecondary: { backgroundColor: Colors.primaryLight },
  quickActionPrimary: { backgroundColor: Colors.primary },
  quickActionText: { fontSize: 15, fontWeight: '700' as const },
  quickActionTextSecondary: { color: Colors.primary },
  quickActionTextPrimary: { color: Colors.white },
  noPaymentWarning: { flexDirection: 'row', gap: 8, alignItems: 'flex-start', backgroundColor: Colors.warning + '14', borderWidth: 1, borderColor: Colors.warning + '35', borderRadius: 12, padding: 12, marginBottom: 14 },
  noPaymentText: { flex: 1, fontSize: 12, lineHeight: 18, color: Colors.warning, fontWeight: '600' as const },
  content: { paddingHorizontal: 20, paddingTop: 20 },
  topRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  typeBadge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  typeBadgeText: { color: Colors.white, fontSize: 12, fontWeight: '700' as const },
  listingBadge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, backgroundColor: Colors.text },
  listingBadgeText: { color: Colors.white, fontSize: 12, fontWeight: '600' as const },
  title: { fontSize: 24, fontWeight: '800' as const, color: Colors.text, marginBottom: 8, letterSpacing: -0.3 },
  locationRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 16 },
  locationText: { fontSize: 14, color: Colors.textSecondary, flex: 1 },
  priceRatingRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  price: { fontSize: 28, fontWeight: '800' as const, color: Colors.primary },
  period: { fontSize: 16, fontWeight: '400' as const, color: Colors.textSecondary },
  ratingBox: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: Colors.accentLight, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 12 },
  ratingValue: { fontSize: 16, fontWeight: '700' as const, color: Colors.text },
  reviewCount: { fontSize: 13, color: Colors.textSecondary },
  statsCard: { flexDirection: 'row', backgroundColor: Colors.background, borderRadius: 16, padding: 16, marginBottom: 24, justifyContent: 'space-around' },
  statBox: { alignItems: 'center', gap: 6 },
  statIconBg: { width: 40, height: 40, borderRadius: 12, backgroundColor: Colors.primaryLight, alignItems: 'center', justifyContent: 'center' },
  statValue: { fontSize: 18, fontWeight: '700' as const, color: Colors.text },
  statLabel: { fontSize: 12, color: Colors.textSecondary, fontWeight: '500' as const },
  section: { marginBottom: 24 },
  sectionTitle: { fontSize: 18, fontWeight: '700' as const, color: Colors.text, marginBottom: 12 },
  description: { fontSize: 15, color: Colors.textSecondary, lineHeight: 24 },
  amenitiesGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  amenityChip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12, backgroundColor: Colors.primaryLight },
  amenityText: { fontSize: 13, color: Colors.primary, fontWeight: '500' as const },
  ownerCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.background, padding: 14, borderRadius: 16, gap: 12 },
  ownerAvatar: { width: 50, height: 50, borderRadius: 25 },
  ownerInfo: { flex: 1 },
  ownerName: { fontSize: 16, fontWeight: '600' as const, color: Colors.text },
  ownerRole: { fontSize: 13, color: Colors.textSecondary, marginTop: 2 },
  ownerActions: { flexDirection: 'row', gap: 8 },
  ownerActionButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: Colors.primaryLight, alignItems: 'center', justifyContent: 'center' },
  reviewsHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  seeAll: { fontSize: 14, fontWeight: '600' as const, color: Colors.primary },
  reviewForm: { backgroundColor: Colors.background, padding: 14, borderRadius: 14, marginBottom: 14, gap: 12 },
  ratingRow: { flexDirection: 'row', justifyContent: 'center', gap: 8 },
  reviewInput: { backgroundColor: Colors.white, borderRadius: 12, paddingHorizontal: 14, paddingVertical: Platform.OS === 'ios' ? 12 : 10, fontSize: 15, color: Colors.text, minHeight: 80, textAlignVertical: 'top' as const },
  submitReviewBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: Colors.primary, paddingVertical: 12, borderRadius: 12 },
  submitReviewText: { fontSize: 15, fontWeight: '600' as const, color: Colors.white },
  reviewCard: { backgroundColor: Colors.background, padding: 14, borderRadius: 14, marginBottom: 10 },
  reviewHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
  reviewAvatar: { width: 36, height: 36, borderRadius: 18 },
  reviewInfo: { flex: 1 },
  reviewName: { fontSize: 14, fontWeight: '600' as const, color: Colors.text },
  reviewDate: { fontSize: 12, color: Colors.textLight },
  reviewRating: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: Colors.accentLight, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  reviewRatingText: { fontSize: 13, fontWeight: '700' as const, color: Colors.text },
  reviewComment: { fontSize: 14, color: Colors.textSecondary, lineHeight: 20 },
  bottomSpacer: { height: 40 },
  bottomBar: { backgroundColor: Colors.white, borderTopWidth: 1, borderTopColor: Colors.borderLight, shadowColor: '#000', shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.06, shadowRadius: 12, elevation: 8 },
  bottomBarContent: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 12 },
  bottomPrice: { flexDirection: 'row', alignItems: 'baseline' },
  bottomPriceValue: { fontSize: 22, fontWeight: '800' as const, color: Colors.primary },
  bottomPeriod: { fontSize: 14, color: Colors.textSecondary, marginLeft: 2 },
  bottomActions: { flexDirection: 'row', gap: 10 },
  scheduleButton: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 16, paddingVertical: 12, borderRadius: 14, backgroundColor: Colors.primaryLight },
  scheduleText: { fontSize: 14, fontWeight: '600' as const, color: Colors.primary },
  contactButton: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 20, paddingVertical: 12, borderRadius: 14, backgroundColor: Colors.primary },
  contactText: { fontSize: 14, fontWeight: '600' as const, color: Colors.white },
  imageDotsRow: { position: 'absolute' as const, bottom: 16, left: 0, right: 0, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 10 },
  imageCountBadge: { backgroundColor: 'rgba(0,0,0,0.6)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  imageCountText: { color: Colors.white, fontSize: 12, fontWeight: '600' as const },
  thumbnailRow: { flexDirection: 'row', paddingHorizontal: 20, paddingTop: 12, paddingBottom: 4, gap: 8 },
  thumbnail: { flex: 1, height: 72, borderRadius: 10, overflow: 'hidden', borderWidth: 2, borderColor: 'transparent' },
  thumbnailActive: { borderColor: Colors.primary },
  thumbnailImage: { width: '100%', height: '100%' },
  galleryOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.95)' },
  galleryHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 8 },
  galleryCloseBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center' },
  galleryCounter: { fontSize: 16, fontWeight: '600' as const, color: Colors.white },
  galleryScroll: { flex: 1 },
  gallerySlide: { width: width, justifyContent: 'center', alignItems: 'center' },
  galleryImage: { width: width, height: screenHeight * 0.65 },
  galleryNavLeft: { position: 'absolute' as const, left: 12, top: '50%', marginTop: -24, width: 48, height: 48, borderRadius: 24, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
  galleryNavRight: { position: 'absolute' as const, right: 12, top: '50%', marginTop: -24, width: 48, height: 48, borderRadius: 24, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
  galleryFooter: { alignItems: 'center', paddingVertical: 16 },
  galleryDotsRow: { flexDirection: 'row', gap: 8 },
  galleryDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.3)' },
  galleryDotActive: { backgroundColor: Colors.white, width: 24 },
});
