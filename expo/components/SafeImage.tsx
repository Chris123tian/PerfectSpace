import React, { useState, useCallback } from 'react';
import { View, StyleSheet } from 'react-native';
import { Image, ImageContentFit, ImageStyle } from 'expo-image';
import { PropertyType } from '@/types/property';
import {
  isValidUrl,
  getValidImageUrl,
  getValidAvatarUrl,
  SVG_PROPERTY_PLACEHOLDER,
  SVG_AVATAR_PLACEHOLDER,
} from '@/constants/images';

// ── Types ─────────────────────────────────────────────────────────────────────

type SafeImageVariant = 'property' | 'avatar' | 'auto';

interface SafeImageProps {
  uri?: string | null;
  style?: ImageStyle | object;
  contentFit?: ImageContentFit;
  transition?: number;
  /** Used to pick the right typed fallback when variant='property' */
  propertyType?: PropertyType;
  /** Used to pick the right role-based avatar fallback */
  role?: string;
  /** Controls which fallback bucket to use */
  variant?: SafeImageVariant;
  /** Override the placeholder completely */
  placeholderUri?: string;
  testID?: string;
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function SafeImage({
  uri,
  style,
  contentFit = 'cover',
  transition = 250,
  propertyType = 'apartment',
  role = 'default',
  variant = 'auto',
  placeholderUri,
  testID,
}: SafeImageProps) {
  // Determine the resolved initial source
  const getResolvedUri = useCallback((): string => {
    if (placeholderUri) return placeholderUri;

    const effectiveVariant =
      variant === 'auto' ? (role !== 'default' || uri?.includes('face') ? 'avatar' : 'property') : variant;

    if (effectiveVariant === 'avatar') {
      return getValidAvatarUrl(uri, role);
    }
    return getValidImageUrl(uri, propertyType);
  }, [uri, variant, role, propertyType, placeholderUri]);

  const [source, setSource] = useState<string>(getResolvedUri);
  const [errored, setErrored] = useState(false);

  const handleError = useCallback(() => {
    if (errored) return; // prevent infinite loop
    setErrored(true);

    // Fall back to static SVG placeholder
    if (placeholderUri) {
      setSource(placeholderUri);
      return;
    }

    const effectiveVariant =
      variant === 'auto' ? (role !== 'default' || uri?.includes('face') ? 'avatar' : 'property') : variant;

    setSource(
      effectiveVariant === 'avatar' ? SVG_AVATAR_PLACEHOLDER : SVG_PROPERTY_PLACEHOLDER
    );
  }, [errored, variant, role, uri, placeholderUri]);

  // If the uri prop changes externally, re-derive the source
  React.useEffect(() => {
    setErrored(false);
    setSource(getResolvedUri());
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uri]);

  const isDataUri = source.startsWith('data:');

  return (
    <View style={[styles.container, style as object]}>
      <Image
        source={isDataUri ? source : { uri: source }}
        style={StyleSheet.absoluteFill}
        contentFit={contentFit}
        transition={transition}
        onError={handleError}
        testID={testID}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
    backgroundColor: '#1E293B',
  },
});
