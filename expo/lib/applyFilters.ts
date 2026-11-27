import type { Property } from '@/types/property';
import type { SearchFilters } from '@/contexts/FilterContext';
import { findCountry } from '@/lib/countries';
import { matchesLocation } from '@/lib/regions';

/** Applies the shared search filters (filters screen) to a list of listings. */
export function applySearchFilters(list: Property[], filters: SearchFilters): Property[] {
  let result = list;
  if (filters.listingType) result = result.filter(p => p.listingType === filters.listingType);
  if (filters.types.length > 0) result = result.filter(p => filters.types.includes(p.type));
  if (filters.country) {
    const c = filters.country.toLowerCase();
    result = result.filter(p => (p.country ?? '').toLowerCase() === c);
  }
  if (filters.region || filters.town) {
    result = result.filter(p => matchesLocation(p, filters.region, filters.town));
  }
  if (filters.bedrooms !== null && filters.bedrooms > 0) {
    result = result.filter(p => p.bedrooms >= filters.bedrooms!);
  }
  if (filters.minPrice !== null || filters.maxPrice !== null) {
    const symbol = filters.country ? findCountry(filters.country)?.symbol : undefined;
    result = result.filter(p => {
      if (symbol && p.currency !== symbol) return false;
      if (filters.minPrice !== null && p.price < filters.minPrice) return false;
      if (filters.maxPrice !== null && p.price > filters.maxPrice) return false;
      return true;
    });
  }
  return result;
}

/** Free-text search across title, type and every location field. */
export function matchesSearch(p: Property, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return [p.title, p.type, p.city, p.region, p.neighborhood, p.address, p.country]
    .some(v => (v ?? '').toLowerCase().includes(q));
}
