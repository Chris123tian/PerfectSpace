/**
 * Shared country + currency registry used by signup, the listing form and
 * search filters so every surface offers the same markets.
 */
export interface CountryOption {
  name: string;
  currency: string;
  symbol: string;
  flag: string;
}

export const countryOptions: CountryOption[] = [
  { name: 'Ghana', currency: 'GHS', symbol: 'GH₵', flag: '🇬🇭' },
  { name: 'Nigeria', currency: 'NGN', symbol: '₦', flag: '🇳🇬' },
  { name: 'Kenya', currency: 'KES', symbol: 'KSh', flag: '🇰🇪' },
  { name: 'South Africa', currency: 'ZAR', symbol: 'R', flag: '🇿🇦' },
  { name: 'Tanzania', currency: 'TZS', symbol: 'TSh', flag: '🇹🇿' },
  { name: 'Egypt', currency: 'EGP', symbol: 'E£', flag: '🇪🇬' },
  { name: 'United States', currency: 'USD', symbol: '$', flag: '🇺🇸' },
  { name: 'United Kingdom', currency: 'GBP', symbol: '£', flag: '🇬🇧' },
  { name: 'Canada', currency: 'CAD', symbol: 'CA$', flag: '🇨🇦' },
  { name: 'European Union', currency: 'EUR', symbol: '€', flag: '🇪🇺' },
  { name: 'United Arab Emirates', currency: 'AED', symbol: 'د.إ', flag: '🇦🇪' },
  { name: 'Saudi Arabia', currency: 'SAR', symbol: '﷼', flag: '🇸🇦' },
  { name: 'India', currency: 'INR', symbol: '₹', flag: '🇮🇳' },
  { name: 'China', currency: 'CNY', symbol: '¥', flag: '🇨🇳' },
  { name: 'Japan', currency: 'JPY', symbol: '¥', flag: '🇯🇵' },
  { name: 'Brazil', currency: 'BRL', symbol: 'R$', flag: '🇧🇷' },
  { name: 'Mexico', currency: 'MXN', symbol: 'MX$', flag: '🇲🇽' },
  { name: 'Australia', currency: 'AUD', symbol: 'A$', flag: '🇦🇺' },
];

export const defaultCountry = countryOptions[0];

export function findCountry(name?: string): CountryOption | undefined {
  if (!name) return undefined;
  return countryOptions.find(c => c.name.toLowerCase() === name.toLowerCase());
}
