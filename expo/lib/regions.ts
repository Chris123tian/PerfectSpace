/**
 * Regions (states / provinces) per country, used by the listing form and the
 * search filters (African markets only). Countries not listed here accept
 * free-text regions, and any region already used by a listing is offered too.
 */
export const regionsByCountry: Record<string, string[]> = {
  Ghana: [
    'Greater Accra', 'Ashanti', 'Western', 'Western North', 'Central', 'Eastern', 'Volta', 'Oti',
    'Northern', 'Savannah', 'North East', 'Upper East', 'Upper West', 'Bono', 'Bono East', 'Ahafo',
  ],
  Nigeria: [
    'Abia', 'Adamawa', 'Akwa Ibom', 'Anambra', 'Bauchi', 'Bayelsa', 'Benue', 'Borno', 'Cross River',
    'Delta', 'Ebonyi', 'Edo', 'Ekiti', 'Enugu', 'FCT Abuja', 'Gombe', 'Imo', 'Jigawa', 'Kaduna', 'Kano',
    'Katsina', 'Kebbi', 'Kogi', 'Kwara', 'Lagos', 'Nasarawa', 'Niger', 'Ogun', 'Ondo', 'Osun', 'Oyo',
    'Plateau', 'Rivers', 'Sokoto', 'Taraba', 'Yobe', 'Zamfara',
  ],
  Kenya: [
    'Nairobi', 'Mombasa', 'Kisumu', 'Nakuru', 'Kiambu', 'Uasin Gishu', 'Machakos', 'Kajiado', 'Kilifi',
    'Nyeri', 'Kakamega', 'Meru', 'Kwale', 'Laikipia', 'Murang\'a', 'Kericho', 'Embu', 'Nyandarua',
  ],
  'South Africa': [
    'Gauteng', 'Western Cape', 'KwaZulu-Natal', 'Eastern Cape', 'Free State', 'Limpopo',
    'Mpumalanga', 'North West', 'Northern Cape',
  ],
  "Côte d'Ivoire": ['Abidjan', 'Yamoussoukro', 'Bas-Sassandra', 'Vallée du Bandama', 'Lagunes', 'Savanes', 'Comoé'],
  Egypt: ['Cairo', 'Giza', 'Alexandria', 'Qalyubia', 'Red Sea', 'South Sinai', 'Luxor', 'Aswan', 'Dakahlia', 'Sharqia'],
  Rwanda: ['Kigali', 'Northern', 'Southern', 'Eastern', 'Western'],
  Tanzania: ['Dar es Salaam', 'Arusha', 'Dodoma', 'Mwanza', 'Zanzibar', 'Kilimanjaro', 'Mbeya', 'Morogoro', 'Tanga'],
  Uganda: ['Central', 'Eastern', 'Northern', 'Western'],
  Senegal: ['Dakar', 'Thiès', 'Saint-Louis', 'Diourbel', 'Ziguinchor', 'Kaolack'],
  Cameroon: ['Centre', 'Littoral', 'West', 'North West', 'South West', 'North', 'Far North', 'Adamawa', 'East', 'South'],
  Ethiopia: ['Addis Ababa', 'Oromia', 'Amhara', 'Tigray', 'Sidama', 'Dire Dawa', 'Somali'],
  Morocco: ['Casablanca-Settat', 'Rabat-Salé-Kénitra', 'Marrakech-Safi', 'Fès-Meknès', 'Tanger-Tetouan-Al Hoceima', 'Souss-Massa', 'Oriental'],
  Zambia: ['Lusaka', 'Copperbelt', 'Central', 'Southern', 'Eastern', 'Northern', 'North-Western', 'Western', 'Luapula', 'Muchinga'],
  Zimbabwe: ['Harare', 'Bulawayo', 'Manicaland', 'Mashonaland East', 'Mashonaland West', 'Mashonaland Central', 'Masvingo', 'Midlands', 'Matabeleland North', 'Matabeleland South'],
  Botswana: ['South-East', 'Central', 'North-East', 'North-West', 'Kgatleng', 'Kweneng', 'Southern'],
  Namibia: ['Khomas', 'Erongo', 'Oshana', 'Otjozondjupa', 'Karas', 'Hardap', 'Zambezi'],
  Togo: ['Maritime', 'Plateaux', 'Centrale', 'Kara', 'Savanes'],
  Benin: ['Littoral', 'Atlantique', 'Ouémé', 'Borgou', 'Zou', 'Mono'],
  'Sierra Leone': ['Western Area', 'Northern', 'North West', 'Southern', 'Eastern'],
  Liberia: ['Montserrado', 'Margibi', 'Grand Bassa', 'Nimba', 'Bong', 'Lofa'],
  Gambia: ['Banjul', 'Kanifing', 'West Coast', 'North Bank', 'Lower River', 'Central River', 'Upper River'],
  Malawi: ['Southern', 'Central', 'Northern'],
  Mozambique: ['Maputo City', 'Maputo', 'Gaza', 'Inhambane', 'Sofala', 'Manica', 'Tete', 'Zambezia', 'Nampula', 'Cabo Delgado', 'Niassa'],
  Angola: ['Luanda', 'Benguela', 'Huambo', 'Huíla', 'Cabinda', 'Bié', 'Malanje'],
  Tunisia: ['Tunis', 'Ariana', 'Ben Arous', 'Sousse', 'Sfax', 'Nabeul', 'Monastir', 'Bizerte'],
  Algeria: ['Algiers', 'Oran', 'Constantine', 'Annaba', 'Blida', 'Sétif', 'Tlemcen'],
};

/** Main towns per region, so the town picker works before any listing exists. */
export const townsByRegion: Record<string, Record<string, string[]>> = {
  Ghana: {
    'Greater Accra': ['Accra', 'Tema', 'East Legon', 'Madina', 'Adenta', 'Spintex', 'Osu', 'Cantonments', 'Airport Residential', 'Dansoman', 'Kasoa', 'Lapaz', 'Dzorwulu', 'Labone', 'Teshie', 'Nungua', 'Ashaiman', 'Dodowa', 'Weija', 'Achimota'],
    Ashanti: ['Kumasi', 'Obuasi', 'Ejisu', 'Konongo', 'Mampong', 'Bekwai', 'Asokwa', 'Bantama', 'Ahodwo', 'Nhyiaeso', 'Kwadaso', 'Tafo'],
    Western: ['Takoradi', 'Sekondi', 'Tarkwa', 'Prestea', 'Axim', 'Shama'],
    'Western North': ['Sefwi Wiawso', 'Bibiani', 'Enchi', 'Juaboso'],
    Central: ['Cape Coast', 'Winneba', 'Elmina', 'Saltpond', 'Mankessim', 'Agona Swedru', 'Dunkwa-On-Offin'],
    Eastern: ['Koforidua', 'Nkawkaw', 'Akosombo', 'Somanya', 'Suhum', 'Nsawam', 'Akim Oda', 'Aburi'],
    Volta: ['Ho', 'Hohoe', 'Keta', 'Aflao', 'Kpando', 'Sogakope', 'Anloga'],
    Oti: ['Dambai', 'Nkwanta', 'Jasikan', 'Kadjebi', 'Krachi'],
    Northern: ['Tamale', 'Yendi', 'Savelugu', 'Bimbilla', 'Tolon'],
    Savannah: ['Damongo', 'Bole', 'Salaga', 'Buipe', 'Sawla'],
    'North East': ['Nalerigu', 'Walewale', 'Gambaga', 'Chereponi'],
    'Upper East': ['Bolgatanga', 'Navrongo', 'Bawku', 'Paga', 'Zebilla'],
    'Upper West': ['Wa', 'Lawra', 'Tumu', 'Jirapa', 'Nandom'],
    Bono: ['Sunyani', 'Berekum', 'Dormaa Ahenkro', 'Wenchi', 'Japekrom'],
    'Bono East': ['Techiman', 'Kintampo', 'Atebubu', 'Nkoranza', 'Yeji'],
    Ahafo: ['Goaso', 'Bechem', 'Duayaw Nkwanta', 'Kenyasi'],
  },
  Nigeria: {
    Lagos: ['Ikeja', 'Lekki', 'Victoria Island', 'Ikoyi', 'Yaba', 'Surulere', 'Ajah', 'Gbagada', 'Magodo', 'Festac', 'Ikorodu', 'Epe', 'Badagry'],
    'FCT Abuja': ['Abuja', 'Maitama', 'Asokoro', 'Wuse', 'Garki', 'Gwarinpa', 'Jabi', 'Kubwa', 'Lugbe'],
    Rivers: ['Port Harcourt', 'Obio-Akpor', 'Bonny', 'Eleme'],
    Oyo: ['Ibadan', 'Ogbomosho', 'Oyo', 'Iseyin'],
    Kano: ['Kano', 'Wudil', 'Gaya'],
    Kaduna: ['Kaduna', 'Zaria', 'Kafanchan'],
    Ogun: ['Abeokuta', 'Ijebu Ode', 'Sagamu', 'Ota', 'Mowe'],
    Enugu: ['Enugu', 'Nsukka', 'Agbani'],
    Anambra: ['Awka', 'Onitsha', 'Nnewi'],
    Delta: ['Asaba', 'Warri', 'Sapele', 'Ughelli'],
    Edo: ['Benin City', 'Auchi', 'Ekpoma'],
    'Akwa Ibom': ['Uyo', 'Eket', 'Ikot Ekpene'],
    'Cross River': ['Calabar', 'Ikom', 'Ogoja'],
    Plateau: ['Jos', 'Bukuru', 'Pankshin'],
    Kwara: ['Ilorin', 'Offa'],
  },
  Kenya: {
    Nairobi: ['Westlands', 'Kilimani', 'Kileleshwa', 'Lavington', 'Karen', 'Runda', 'Parklands', 'South B', 'South C', 'Embakasi', 'Kasarani', 'Langata', 'CBD'],
    Mombasa: ['Nyali', 'Bamburi', 'Mombasa Island', 'Likoni', 'Shanzu', 'Mtwapa'],
    Kisumu: ['Kisumu', 'Milimani', 'Nyalenda'],
    Nakuru: ['Nakuru', 'Naivasha', 'Gilgil'],
    Kiambu: ['Thika', 'Ruiru', 'Kiambu', 'Juja', 'Kikuyu', 'Limuru'],
    'Uasin Gishu': ['Eldoret'],
    Machakos: ['Machakos', 'Athi River', 'Syokimau', 'Mlolongo'],
    Kajiado: ['Kitengela', 'Ongata Rongai', 'Ngong', 'Kajiado'],
    Kilifi: ['Malindi', 'Kilifi', 'Watamu'],
  },
  'South Africa': {
    Gauteng: ['Johannesburg', 'Sandton', 'Pretoria', 'Midrand', 'Soweto', 'Centurion', 'Rosebank', 'Randburg', 'Fourways'],
    'Western Cape': ['Cape Town', 'Stellenbosch', 'Paarl', 'George', 'Sea Point', 'Claremont', 'Bellville'],
    'KwaZulu-Natal': ['Durban', 'Umhlanga', 'Pietermaritzburg', 'Ballito'],
    'Eastern Cape': ['Gqeberha', 'East London', 'Mthatha'],
    'Free State': ['Bloemfontein', 'Welkom'],
    Limpopo: ['Polokwane', 'Tzaneen'],
    Mpumalanga: ['Mbombela', 'Witbank'],
    'North West': ['Rustenburg', 'Mahikeng', 'Potchefstroom'],
    'Northern Cape': ['Kimberley', 'Upington'],
  },
};

/** Major towns for countries without a region→town breakdown. */
export const majorTownsByCountry: Record<string, string[]> = {
  "Côte d'Ivoire": ['Abidjan', 'Cocody', 'Plateau', 'Marcory', 'Yamoussoukro', 'Bouaké', 'San-Pédro'],
  Egypt: ['Cairo', 'New Cairo', 'Giza', '6th of October', 'Alexandria', 'Hurghada', 'Sharm El Sheikh', 'Luxor'],
  Rwanda: ['Kigali', 'Kacyiru', 'Kimihurura', 'Nyarutarama', 'Musanze', 'Huye', 'Rubavu'],
  Tanzania: ['Dar es Salaam', 'Masaki', 'Mikocheni', 'Arusha', 'Dodoma', 'Mwanza', 'Stone Town', 'Moshi'],
  Uganda: ['Kampala', 'Entebbe', 'Kololo', 'Ntinda', 'Muyenga', 'Jinja', 'Mbarara', 'Gulu'],
  Senegal: ['Dakar', 'Almadies', 'Plateau', 'Thiès', 'Saint-Louis', 'Saly'],
  Cameroon: ['Douala', 'Yaoundé', 'Bamenda', 'Buea', 'Limbe', 'Bafoussam'],
  Ethiopia: ['Addis Ababa', 'Bole', 'Adama', 'Bahir Dar', 'Hawassa', 'Mekelle'],
  Morocco: ['Casablanca', 'Rabat', 'Marrakech', 'Fès', 'Tangier', 'Agadir'],
  Zambia: ['Lusaka', 'Kitwe', 'Ndola', 'Livingstone'],
  Zimbabwe: ['Harare', 'Borrowdale', 'Bulawayo', 'Mutare', 'Victoria Falls'],
  Botswana: ['Gaborone', 'Francistown', 'Maun'],
  Namibia: ['Windhoek', 'Swakopmund', 'Walvis Bay'],
  Togo: ['Lomé', 'Kara', 'Sokodé'],
  Benin: ['Cotonou', 'Porto-Novo', 'Parakou'],
  'Sierra Leone': ['Freetown', 'Bo', 'Makeni'],
  Liberia: ['Monrovia', 'Sinkor', 'Paynesville'],
  Gambia: ['Banjul', 'Serrekunda', 'Bakau', 'Brikama'],
  Malawi: ['Lilongwe', 'Blantyre', 'Mzuzu'],
  Mozambique: ['Maputo', 'Matola', 'Beira', 'Nampula'],
  Angola: ['Luanda', 'Talatona', 'Benguela', 'Lubango'],
  Tunisia: ['Tunis', 'La Marsa', 'Sousse', 'Sfax', 'Hammamet'],
  Algeria: ['Algiers', 'Oran', 'Constantine', 'Annaba'],
  Mauritius: ['Port Louis', 'Grand Baie', 'Curepipe', 'Quatre Bornes'],
  'DR Congo': ['Kinshasa', 'Lubumbashi', 'Goma'],
  Gabon: ['Libreville', 'Port-Gentil'],
  Mali: ['Bamako'],
  'Burkina Faso': ['Ouagadougou', 'Bobo-Dioulasso'],
  Niger: ['Niamey'],
  Guinea: ['Conakry'],
  Seychelles: ['Victoria', 'Mahé'],
  Madagascar: ['Antananarivo', 'Toamasina'],
  Sudan: ['Khartoum', 'Omdurman'],
  Libya: ['Tripoli', 'Benghazi'],
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
  if (country) {
    const byRegion = townsByRegion[country];
    if (byRegion) {
      if (region) (byRegion[region] ?? []).forEach(add);
      else Object.values(byRegion).flat().forEach(add);
    } else {
      (majorTownsByCountry[country] ?? []).forEach(add);
    }
  }
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
