/**
 * Shared country + currency registry used by signup, the listing form and
 * search filters. Perfect Space serves African markets only.
 */
export interface CountryOption {
  name: string;
  currency: string;
  symbol: string;
  flag: string;
}

// Most-used markets first, then the rest of Africa alphabetically.
export const countryOptions: CountryOption[] = [
  { name: 'Ghana', currency: 'GHS', symbol: 'GH₵', flag: '🇬🇭' },
  { name: 'Nigeria', currency: 'NGN', symbol: '₦', flag: '🇳🇬' },
  { name: 'Kenya', currency: 'KES', symbol: 'KSh', flag: '🇰🇪' },
  { name: 'South Africa', currency: 'ZAR', symbol: 'R', flag: '🇿🇦' },
  { name: "Côte d'Ivoire", currency: 'XOF', symbol: 'CFA', flag: '🇨🇮' },
  { name: 'Egypt', currency: 'EGP', symbol: 'E£', flag: '🇪🇬' },
  { name: 'Rwanda', currency: 'RWF', symbol: 'FRw', flag: '🇷🇼' },
  { name: 'Tanzania', currency: 'TZS', symbol: 'TSh', flag: '🇹🇿' },
  { name: 'Uganda', currency: 'UGX', symbol: 'USh', flag: '🇺🇬' },
  { name: 'Algeria', currency: 'DZD', symbol: 'DA', flag: '🇩🇿' },
  { name: 'Angola', currency: 'AOA', symbol: 'Kz', flag: '🇦🇴' },
  { name: 'Benin', currency: 'XOF', symbol: 'CFA', flag: '🇧🇯' },
  { name: 'Botswana', currency: 'BWP', symbol: 'P', flag: '🇧🇼' },
  { name: 'Burkina Faso', currency: 'XOF', symbol: 'CFA', flag: '🇧🇫' },
  { name: 'Burundi', currency: 'BIF', symbol: 'FBu', flag: '🇧🇮' },
  { name: 'Cabo Verde', currency: 'CVE', symbol: 'Esc', flag: '🇨🇻' },
  { name: 'Cameroon', currency: 'XAF', symbol: 'FCFA', flag: '🇨🇲' },
  { name: 'Central African Republic', currency: 'XAF', symbol: 'FCFA', flag: '🇨🇫' },
  { name: 'Chad', currency: 'XAF', symbol: 'FCFA', flag: '🇹🇩' },
  { name: 'Comoros', currency: 'KMF', symbol: 'CF', flag: '🇰🇲' },
  { name: 'Congo', currency: 'XAF', symbol: 'FCFA', flag: '🇨🇬' },
  { name: 'DR Congo', currency: 'CDF', symbol: 'FC', flag: '🇨🇩' },
  { name: 'Djibouti', currency: 'DJF', symbol: 'Fdj', flag: '🇩🇯' },
  { name: 'Equatorial Guinea', currency: 'XAF', symbol: 'FCFA', flag: '🇬🇶' },
  { name: 'Eritrea', currency: 'ERN', symbol: 'Nfk', flag: '🇪🇷' },
  { name: 'Eswatini', currency: 'SZL', symbol: 'E', flag: '🇸🇿' },
  { name: 'Ethiopia', currency: 'ETB', symbol: 'Br', flag: '🇪🇹' },
  { name: 'Gabon', currency: 'XAF', symbol: 'FCFA', flag: '🇬🇦' },
  { name: 'Gambia', currency: 'GMD', symbol: 'D', flag: '🇬🇲' },
  { name: 'Guinea', currency: 'GNF', symbol: 'FG', flag: '🇬🇳' },
  { name: 'Guinea-Bissau', currency: 'XOF', symbol: 'CFA', flag: '🇬🇼' },
  { name: 'Lesotho', currency: 'LSL', symbol: 'L', flag: '🇱🇸' },
  { name: 'Liberia', currency: 'LRD', symbol: 'L$', flag: '🇱🇷' },
  { name: 'Libya', currency: 'LYD', symbol: 'LD', flag: '🇱🇾' },
  { name: 'Madagascar', currency: 'MGA', symbol: 'Ar', flag: '🇲🇬' },
  { name: 'Malawi', currency: 'MWK', symbol: 'MK', flag: '🇲🇼' },
  { name: 'Mali', currency: 'XOF', symbol: 'CFA', flag: '🇲🇱' },
  { name: 'Mauritania', currency: 'MRU', symbol: 'UM', flag: '🇲🇷' },
  { name: 'Mauritius', currency: 'MUR', symbol: 'Rs', flag: '🇲🇺' },
  { name: 'Morocco', currency: 'MAD', symbol: 'DH', flag: '🇲🇦' },
  { name: 'Mozambique', currency: 'MZN', symbol: 'MT', flag: '🇲🇿' },
  { name: 'Namibia', currency: 'NAD', symbol: 'N$', flag: '🇳🇦' },
  { name: 'Niger', currency: 'XOF', symbol: 'CFA', flag: '🇳🇪' },
  { name: 'São Tomé and Príncipe', currency: 'STN', symbol: 'Db', flag: '🇸🇹' },
  { name: 'Senegal', currency: 'XOF', symbol: 'CFA', flag: '🇸🇳' },
  { name: 'Seychelles', currency: 'SCR', symbol: 'SR', flag: '🇸🇨' },
  { name: 'Sierra Leone', currency: 'SLE', symbol: 'Le', flag: '🇸🇱' },
  { name: 'Somalia', currency: 'SOS', symbol: 'Sh', flag: '🇸🇴' },
  { name: 'South Sudan', currency: 'SSP', symbol: 'SSP', flag: '🇸🇸' },
  { name: 'Sudan', currency: 'SDG', symbol: 'SDG', flag: '🇸🇩' },
  { name: 'Togo', currency: 'XOF', symbol: 'CFA', flag: '🇹🇬' },
  { name: 'Tunisia', currency: 'TND', symbol: 'DT', flag: '🇹🇳' },
  { name: 'Zambia', currency: 'ZMW', symbol: 'ZK', flag: '🇿🇲' },
  { name: 'Zimbabwe', currency: 'USD', symbol: '$', flag: '🇿🇼' },
];

export const defaultCountry = countryOptions[0];

/** Currencies Paystack can collect (the merchant account decides which actually work). */
export const PAYSTACK_CURRENCIES = ['GHS', 'NGN', 'ZAR', 'KES', 'USD', 'XOF', 'EGP', 'RWF'];

export function findCountry(name?: string): CountryOption | undefined {
  if (!name) return undefined;
  return countryOptions.find(c => c.name.toLowerCase() === name.toLowerCase());
}

export function symbolFor(currency: string): string {
  return countryOptions.find((c) => c.currency === currency)?.symbol ?? currency;
}
