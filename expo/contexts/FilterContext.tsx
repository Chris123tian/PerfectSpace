import { useCallback, useMemo, useState } from 'react';
import createContextHook from '@nkzw/create-context-hook';
import { ListingType, PropertyType } from '@/types/property';

export interface SearchFilters {
  listingType: ListingType | null;
  types: PropertyType[];
  country: string | null;
  minPrice: number | null;
  maxPrice: number | null;
  currency: string | null;
  bedrooms: number | null;
}

export const emptyFilters: SearchFilters = {
  listingType: null,
  types: [],
  country: null,
  minPrice: null,
  maxPrice: null,
  currency: null,
  bedrooms: null,
};

export const [FilterProvider, useFilters] = createContextHook(() => {
  const [filters, setFilters] = useState<SearchFilters>(emptyFilters);

  const applyFilters = useCallback((next: SearchFilters) => {
    setFilters(next);
  }, []);

  const resetFilters = useCallback(() => {
    setFilters(emptyFilters);
  }, []);

  const hasActiveFilters = useMemo(
    () =>
      !!filters.listingType ||
      filters.types.length > 0 ||
      !!filters.country ||
      filters.minPrice !== null ||
      filters.maxPrice !== null ||
      filters.bedrooms !== null,
    [filters]
  );

  return useMemo(
    () => ({ filters, applyFilters, resetFilters, hasActiveFilters }),
    [filters, applyFilters, resetFilters, hasActiveFilters]
  );
});
