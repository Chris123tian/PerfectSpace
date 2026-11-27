/**
 * Regions (states / provinces) per country, used by the listing form and the
 * search filters. Countries not listed here accept free-text regions, and any
 * region already used by a listing is offered too.
 */
export const regionsByCountry: Record<string, string[]> = {
  Ghana: [
    'Greater Accra', 'Ashanti', 'Western', 'Western North', 'Central', 'Eastern', 'Volta', 'Oti',
    'Northern', 'Savannah', 'North East', 'Upper East', 'Upper West', 'Bono', 'Bono East', 'Ahafo',
  ],
  Nigeria: [
    'Lagos', 'FCT Abuja', 'Rivers', 'Oyo', 'Kano', 'Kaduna', 'Ogun', 'Enugu', 'Anambra', 'Delta',
    'Edo', 'Akwa Ibom', 'Cross River', 'Imo', 'Abia', 'Plateau', 'Kwara', 'Osun', 'Ondo', 'Ekiti',
  ],
  Kenya: ['Nairobi', 'Mombasa', 'Kisumu', 'Nakuru', 'Kiambu', 'Uasin Gishu', 'Machakos', 'Kajiado', 'Kilifi', 'Nyeri'],
  'South Africa': [
    'Gauteng', 'Western Cape', 'KwaZulu-Natal', 'Eastern Cape', 'Free State', 'Limpopo',
    'Mpumalanga', 'North West', 'Northern Cape',
  ],
  'United States': [
    'Alabama', 'Alaska', 'Arizona', 'Arkansas', 'California', 'Colorado', 'Connecticut', 'Delaware',
    'District of Columbia', 'Florida', 'Georgia', 'Hawaii', 'Idaho', 'Illinois', 'Indiana', 'Iowa',
    'Kansas', 'Kentucky', 'Louisiana', 'Maine', 'Maryland', 'Massachusetts', 'Michigan', 'Minnesota',
    'Mississippi', 'Missouri', 'Montana', 'Nebraska', 'Nevada', 'New Hampshire', 'New Jersey',
    'New Mexico', 'New York', 'North Carolina', 'North Dakota', 'Ohio', 'Oklahoma', 'Oregon',
    'Pennsylvania', 'Rhode Island', 'South Carolina', 'South Dakota', 'Tennessee', 'Texas', 'Utah',
    'Vermont', 'Virginia', 'Washington', 'West Virginia', 'Wisconsin', 'Wyoming',
  ],
  'United Kingdom': ['England', 'Scotland', 'Wales', 'Northern Ireland', 'Greater London'],
  Canada: [
    'Ontario', 'Quebec', 'British Columbia', 'Alberta', 'Manitoba', 'Saskatchewan', 'Nova Scotia',
    'New Brunswick', 'Newfoundland and Labrador', 'Prince Edward Island',
  ],
  Australia: [
    'New South Wales', 'Victoria', 'Queensland', 'Western Australia', 'South Australia', 'Tasmania',
    'Australian Capital Territory', 'Northern Territory',
  ],
};

const norm = (s: string | undefined | null) => (s ?? '').trim().toLowerCase();

/** Predefined regions for a country merged with regions seen in listings. */
export function regionOptions(
  country: string | null | undefined,
  listings: { country?: string; region?: string }[],
): string[] {
  const set = new Map<string, string>();
  const add = (r?: string) => {
    const k = norm(r);
    if (k && !set.has(k)) set.set(k, r!.trim());
  };
  if (country) (regionsByCountry[country] ?? []).forEach(add);
  listings
    .filter((p) => !country || norm(p.country) === norm(country))
    .forEach((p) => add(p.region));
  return [...set.values()].sort((a, b) => a.localeCompare(b));
}

/** Towns/cities and neighbourhoods from listings, narrowed by country/region. */
export function townOptions(
  country: string | null | undefined,
  region: string | null | undefined,
  listings: { country?: string; region?: string; city: string; neighborhood?: string }[],
): string[] {
  const set = new Map<string, string>();
  const add = (t?: string) => {
    const k = norm(t);
    if (k && !set.has(k)) set.set(k, t!.trim());
  };
  listings
    .filter((p) => (!country || norm(p.country) === norm(country)) && (!region || norm(p.region) === norm(region)))
    .forEach((p) => {
      add(p.city);
      add(p.neighborhood);
    });
  return [...set.values()].sort((a, b) => a.localeCompare(b));
}

/** Does a listing match the chosen region/town (case-insensitive, partial town match)? */
export function matchesLocation(
  p: { region?: string; city: string; neighborhood?: string; address?: string },
  region: string | null | undefined,
  town: string | null | undefined,
): boolean {
  if (region && norm(p.region) !== norm(region)) return false;
  if (town) {
    const t = norm(town);
    const hay = [p.city, p.neighborhood, p.address].map(norm);
    if (!hay.some((h) => h.includes(t))) return false;
  }
  return true;
}
