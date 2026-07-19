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

export interface SearchOptions {
  /** Bias results towards the user's position, for a "near me" search. */
  latitude?: number;
  longitude?: number;
}

/**
 * A mikveh is listed under a different word depending on where in the world it
 * is: Hebrew locally, "mikveh"/"mikvah" in English-speaking countries, and
 * "bain rituel"/"Ritualbad" in parts of Europe. Searching a single Hebrew term
 * only ever found Israeli results, so ask for all of them and merge.
 */
const QUERY_TERMS = ['מקווה טהרה', 'mikveh', 'mikvah', 'bain rituel juif', 'jüdisches Ritualbad'];

const HEBREW = /[֐-׿]/;

function friendlyError(status: number, body: string): Error {
  // The screen renders this message straight to the user, so it has to read
  // like a sentence rather than an API dump. The detail still goes to console.
  if (status === 403 || status === 401) {
    console.warn('[mikveh] Places API rejected the request:', body.slice(0, 300));
    return new Error('שירות חיפוש המקוואות אינו זמין כרגע. נסי שוב מאוחר יותר.');
  }
  if (status === 429) {
    return new Error('יותר מדי חיפושים כרגע. נסי שוב בעוד רגע.');
  }
  console.warn('[mikveh] Places API error', status, body.slice(0, 300));
  return new Error('החיפוש נכשל. נסי שוב.');
}

async function runQuery(
  textQuery: string,
  languageCode: string,
  opts: SearchOptions,
): Promise<NewPlace[]> {
  const body: Record<string, unknown> = {
    textQuery,
    languageCode,
    maxResultCount: 20,
  };

  if (opts.latitude != null && opts.longitude != null) {
    body.locationBias = {
      circle: {
        center: { latitude: opts.latitude, longitude: opts.longitude },
        radius: 50000, // 50km — wide enough for a metro area
      },
    };
  }

  const res = await fetch(SEARCH_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': API_KEY,
      'X-Goog-FieldMask': FIELD_MASK,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) throw friendlyError(res.status, await res.text());

  const json = await res.json();
  return (json.places ?? []) as NewPlace[];
}

function toResult(p: NewPlace): MikvehResult {
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
}

/**
 * Search for mikvaot anywhere in the world.
 *
 * @param place  A city, address or neighbourhood, in any language. May be empty
 *               when coordinates are supplied, which gives a "near me" search.
 */
export async function searchMikvaot(
  place: string,
  opts: SearchOptions = {},
): Promise<MikvehResult[]> {
  if (!API_KEY) {
    console.warn('[mikveh] EXPO_PUBLIC_GOOGLE_PLACES_KEY is not set in this build');
    throw new Error('שירות חיפוש המקוואות אינו זמין כרגע. נסי שוב מאוחר יותר.');
  }

  const where = place.trim();
  const hasCoords = opts.latitude != null && opts.longitude != null;
  if (!where && !hasCoords) return [];

  // Show names in the language the search was typed in.
  const languageCode = HEBREW.test(where) ? 'he' : 'en';

  // Put the term matching the query's own language first: its results are the
  // most likely to be relevant, and first-seen wins when de-duplicating.
  const terms = HEBREW.test(where)
    ? QUERY_TERMS
    : [...QUERY_TERMS.slice(1), QUERY_TERMS[0]];

  const settled = await Promise.allSettled(
    terms.map((term) => runQuery(where ? `${term} ${where}` : term, languageCode, opts)),
  );

  const fulfilled = settled.filter(
    (s): s is PromiseFulfilledResult<NewPlace[]> => s.status === 'fulfilled',
  );

  // Every variant failed — surface the reason rather than an empty list, so the
  // user isn't told "no mikvaot found" when the service is actually down.
  if (fulfilled.length === 0) {
    const first = settled[0];
    throw first && first.status === 'rejected' && first.reason instanceof Error
      ? first.reason
      : new Error('החיפוש נכשל. נסי שוב.');
  }

  const byId = new Map<string, MikvehResult>();
  for (const r of fulfilled) {
    for (const p of r.value) {
      if (!p.id || byId.has(p.id)) continue;
      byId.set(p.id, toResult(p));
    }
  }

  return Array.from(byId.values());
}

/** Mikvaot close to a given position, for a "near me" search. */
export function searchMikvaotNearby(
  latitude: number,
  longitude: number,
): Promise<MikvehResult[]> {
  return searchMikvaot('', { latitude, longitude });
}
