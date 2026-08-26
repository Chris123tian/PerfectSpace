import { PropertyType } from '@/types/property';

// ── SVG Data URI Fallback Placeholders ───────────────────────────────────────

export const SVG_PROPERTY_PLACEHOLDER = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="800" height="600" viewBox="0 0 800 600"><rect width="800" height="600" fill="%231E293B"/><path d="M400 150 L650 350 L650 500 L150 500 L150 350 Z" fill="%23334155"/><rect x="350" y="380" width="100" height="120" rx="8" fill="%232563EB"/><rect x="230" y="320" width="80" height="80" rx="8" fill="%23F59E0B"/><rect x="490" y="320" width="80" height="80" rx="8" fill="%23F59E0B"/><text x="400" y="550" font-family="sans-serif" font-size="24" font-weight="bold" fill="%2394A3B8" text-anchor="middle">Perfect Space</text></svg>`;

export const SVG_AVATAR_PLACEHOLDER = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 200 200"><rect width="200" height="200" fill="%232563EB"/><circle cx="100" cy="80" r="40" fill="%23FFFFFF"/><path d="M30 180 C 30 130, 170 130, 170 180 Z" fill="%23FFFFFF"/></svg>`;

// ── Reliable Unsplash Image Fallbacks ─────────────────────────────────────────

export const FALLBACK_PROPERTY_IMAGES: Record<PropertyType, string[]> = {
  apartment: [
    'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?auto=format&fit=crop&w=800&q=80',
  ],
  office: [
    'https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1497366811353-6870744d04b2?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1524758631624-e2822e304c36?auto=format&fit=crop&w=800&q=80',
  ],
  hostel: [
    'https://images.unsplash.com/photo-1555854877-bab0e564b8d5?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1596276020587-8044fe049813?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1520277739336-7bf67edfa768?auto=format&fit=crop&w=800&q=80',
  ],
  room: [
    'https://images.unsplash.com/photo-1540518614846-7eded433c457?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1595526114035-0d45ed16cfbf?auto=format&fit=crop&w=800&q=80',
  ],
  hotel: [
    'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1582719508461-905c673771fd?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?auto=format&fit=crop&w=800&q=80',
  ],
};

export const FALLBACK_AVATARS: Record<string, string> = {
  admin: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&w=200&h=200&crop=face&q=80',
  landlord: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&w=200&h=200&crop=face&q=80',
  renter: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=200&h=200&crop=face&q=80',
  default: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=200&h=200&crop=face&q=80',
};

// ── URI Inspection & Validation Helpers ─────────────────────────────────────

export function isTransientUri(uri?: string | null): boolean {
  if (!uri) return true;
  const str = uri.trim().toLowerCase();
  // blob: URIs are transient in web browsers; ph: is an old iOS asset format
  // file:// URIs from expo-image-picker are valid local file references — do NOT block them
  return str.startsWith('blob:') || str.startsWith('ph://');
}

export function isValidUrl(url?: string | null): boolean {
  if (!url) return false;
  const str = url.trim();
  if (str.length === 0) return false;
  if (str.startsWith('data:image')) return true;
  if (str.startsWith('file://')) return true; // ImagePicker native URIs
  if (isTransientUri(str)) return false;
  return str.startsWith('http://') || str.startsWith('https://');
}

export function getValidImageUrl(url?: string | null, type: PropertyType = 'apartment'): string {
  if (isValidUrl(url)) {
    return url!.trim();
  }
  const pool = FALLBACK_PROPERTY_IMAGES[type] ?? FALLBACK_PROPERTY_IMAGES.apartment;
  return pool[0];
}

export function getValidAvatarUrl(url?: string | null, role: string = 'default'): string {
  if (isValidUrl(url)) {
    return url!.trim();
  }
  return FALLBACK_AVATARS[role] ?? FALLBACK_AVATARS.default;
}
