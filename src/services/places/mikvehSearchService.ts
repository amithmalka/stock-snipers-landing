const API_KEY = process.env.EXPO_PUBLIC_GOOGLE_PLACES_KEY ?? '';

const SEARCH_URL = 'https://places.googleapis.com/v1/places:searchText';

const FIELD_MASK = [
  'places.id',
  'places.displayName',
  'places.formattedAddress',
  'places.location',
  'places.internationalPhoneNumber',
  'places.regularOpeningHours',
].join(',');

export interface MikvehResult {
  id: string;
  name: string;
  address: string;
  phone: string;
  hours: string;
  latitude: number;
  longitude: number;
}

interface NewPlace {
  id: string;
  displayName?: { text: string };
  formattedAddress?: string;
  location?: { latitude: number; longitude: number };
  internationalPhoneNumber?: string;
  regularOpeningHours?: { weekdayDescriptions?: string[] };
}

export async function searchMikvaot(city: string): Promise<MikvehResult[]> {
  if (!API_KEY) throw new Error('Google Places API key is missing');

  const res = await fetch(SEARCH_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': API_KEY,
      'X-Goog-FieldMask': FIELD_MASK,
    },
    body: JSON.stringify({
      textQuery: `מקווה טהרה ${city.trim()}`,
      languageCode: 'he',
      maxResultCount: 10,
    }),
  });

  if (!res.ok) {
    const errBody = await res.text();
    throw new Error(`Places API error ${res.status}: ${errBody}`);
  }

  const json = await res.json();
  const places: NewPlace[] = json.places ?? [];

  return places.map((p): MikvehResult => {
    const hoursText = p.regularOpeningHours?.weekdayDescriptions?.slice(0, 2).join(' | ') ?? '';
    return {
      id: p.id,
      name: p.displayName?.text ?? '',
      address: p.formattedAddress ?? '',
      phone: p.internationalPhoneNumber ?? '',
      hours: hoursText,
      latitude: p.location?.latitude ?? 0,
      longitude: p.location?.longitude ?? 0,
    };
  });
}
