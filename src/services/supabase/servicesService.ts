import { supabase } from '../../config/supabase';
import { ServiceProvider } from '../../types/models';

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL ?? ''

interface ProviderRow {
  id: string;
  name: string;
  category: 'nail' | 'gel' | 'beauty';
  specialty?: string;
  city?: string;
  address?: string;
  bio?: string;
  profile_image_path?: string;
  latitude: number;
  longitude: number;
  rating: number;
  phone: string;
  portfolio_paths: string[];
  is_active: boolean;
}

function haversineKm(
  lat1: number, lon1: number,
  lat2: number, lon2: number,
): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
    Math.cos((lat2 * Math.PI) / 180) *
    Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function rowToProvider(r: ProviderRow, userLat?: number, userLon?: number): ServiceProvider {
  const distanceKm =
    userLat !== undefined && userLon !== undefined
      ? haversineKm(userLat, userLon, r.latitude, r.longitude)
      : undefined;

  return {
    id: r.id,
    name: r.name,
    category: r.category,
    specialty: r.specialty,
    city: r.city,
    address: r.address,
    bio: r.bio,
    // Profile image: small avatar — 240x240
    profileImageUrl: r.profile_image_path
      ? `${SUPABASE_URL}/storage/v1/render/image/public/service-portfolios/${r.profile_image_path}?width=240&height=240&resize=cover&quality=80`
      : undefined,
    latitude: r.latitude,
    longitude: r.longitude,
    rating: r.rating,
    phone: r.phone,
    // Portfolio: medium-sized for grid view (loaded eagerly by user click)
    portfolioImages: (r.portfolio_paths ?? []).map(
      (p: string) => `${SUPABASE_URL}/storage/v1/render/image/public/service-portfolios/${p}?width=600&height=600&resize=cover&quality=78`,
    ),
    distanceKm,
  };
}

// Explicit column list — never select('*') here: service_providers also holds
// invoice-integration secrets that must not reach the client.
const PROVIDER_COLS =
  'id, name, category, specialty, city, address, bio, profile_image_path, latitude, longitude, rating, phone, portfolio_paths, is_active';

// A visible business: active, has a bio, at least one photo, and ≥1 active
// service. `select` must include provider_services!inner(...) so the last two
// filters apply. (Filters chain off .select(), not .from().)
function visibleProviders(select: string) {
  return supabase
    .from('service_providers')
    .select(select)
    .eq('is_active', true)
    .eq('provider_services.is_active', true)
    .not('bio', 'is', null)
    .neq('bio', '')
    .not('portfolio_paths', 'eq', '{}');
}

// Everyday words don't match how salons actually name their services: a client
// searches "ציפורניים" but the service is listed as "לק ג׳ל". Each group below
// is mutually interchangeable — searching any word in a group matches a service
// named with any other word in it. Written lowercase; matching is case-folded.
const SYNONYM_GROUPS: string[][] = [
  ['ציפורניים', 'ציפורנים', 'לק', 'לק ג', "ג'ל", 'ג׳ל', 'גל', 'מניקור', 'בניה', 'בנייה', 'טיפס', 'נייל', 'nails', 'nail', 'gel', 'manicure'],
  ['פדיקור', 'רגליים', 'pedicure'],
  ['גבות', 'גבה', 'שעווה', 'חוט', 'שזירה', 'brows', 'eyebrow'],
  ['ריסים', 'ריס', 'הרמת ריסים', 'תוספות ריסים', 'לashes', 'lashes'],
  ['איפור', 'מייקאפ', 'makeup'],
  ['שיער', 'תספורת', 'החלקה', 'צבע שיער', 'פן', 'hair'],
  ['פנים', 'טיפול פנים', 'קוסמטיקה', 'facial'],
  ['עיסוי', 'מסאז', 'massage'],
];

// Expand a query into all interchangeable terms to look for in service names.
function expandServiceTerms(q: string): string[] {
  const lower = q.toLowerCase();
  const terms = new Set<string>([q]);
  for (const group of SYNONYM_GROUPS) {
    if (group.some((w) => lower.includes(w) || w.includes(lower))) {
      group.forEach((w) => terms.add(w));
    }
  }
  return Array.from(terms);
}

/**
 * Search providers by free text.
 *
 * Matches the business (name / specialty / city / category) AND the names of the
 * services it offers — with a synonym map so "ציפורניים" finds a salon whose
 * service is named "לק ג׳ל". Commas are stripped because PostgREST uses them as
 * an .or() separator.
 */
export async function searchProviders(query: string): Promise<ServiceProvider[]> {
  const q = query.trim().replace(/,/g, ' ');
  const { withTimeout } = await import('./session');

  // No term → every visible business.
  if (!q) {
    const { data, error } = await withTimeout(
      visibleProviders(`${PROVIDER_COLS}, provider_services!inner(id)`)
        .limit(50)
        .then((r) => r),
      6000,
      'searchProviders',
    );
    if (error) throw error;
    return (data as unknown as ProviderRow[]).map((r) => rowToProvider(r));
  }

  // Two matches in parallel, then merge:
  //  A) the business fields, B) the name of any service the business offers.
  const byBusiness = visibleProviders(`${PROVIDER_COLS}, provider_services!inner(id)`)
    .or(`name.ilike.%${q}%,specialty.ilike.%${q}%,city.ilike.%${q}%,category.ilike.%${q}%`)
    .limit(50);

  // Match a service whose name contains the query OR any of its synonyms.
  const serviceOr = expandServiceTerms(q)
    .map((term) => `name.ilike.%${term.replace(/,/g, ' ')}%`)
    .join(',');
  const byService = visibleProviders(`${PROVIDER_COLS}, provider_services!inner(id, name)`)
    .or(serviceOr, { referencedTable: 'provider_services' })
    .limit(50);

  const [a, b] = await withTimeout(
    Promise.all([byBusiness.then((r) => r), byService.then((r) => r)]),
    6000,
    'searchProviders',
  );
  if (a.error) throw a.error;
  if (b.error) throw b.error;

  const merged = new Map<string, ProviderRow>();
  for (const row of [...(a.data ?? []), ...(b.data ?? [])] as unknown as ProviderRow[]) {
    merged.set(row.id, row);
  }
  return Array.from(merged.values()).map((r) => rowToProvider(r));
}

/**
 * Fetch active service providers within `radiusKm` of the given location.
 * Sorted by distance ascending.
 */
export async function fetchNearbyProviders(
  userLat: number,
  userLon: number,
  radiusKm = 10,
  category?: 'nail' | 'gel' | 'beauty',
): Promise<ServiceProvider[]> {
  // Explicit column list — see note in searchProviders (no secrets to the client).
  let query = supabase
    .from('service_providers')
    .select(
      'id, name, category, specialty, city, address, bio, profile_image_path, latitude, longitude, rating, phone, portfolio_paths, is_active',
    )
    .eq('is_active', true);

  if (category) query = query.eq('category', category);

  const { data, error } = await query.limit(200);
  if (error) throw error;

  return (data as ProviderRow[])
    .map((r) => rowToProvider(r, userLat, userLon))
    .filter((p) => (p.distanceKm ?? 0) <= radiusKm)
    .sort((a, b) => (a.distanceKm ?? 99) - (b.distanceKm ?? 99));
}

export interface ProviderService {
  id: string;
  name: string;
  price: number;
  duration_minutes: number;
}

// Same-origin path (Vercel rewrite proxies to siel-backoffice)
const BACKOFFICE_SERVICES = '/api/public-services';

export async function fetchProviderServices(providerId: string): Promise<ProviderService[]> {
  // PRIMARY: backoffice API
  try {
    const url = `${BACKOFFICE_SERVICES}?providerId=${encodeURIComponent(providerId)}&_t=${Date.now()}`;
    const res = await fetch(url, { method: 'GET', cache: 'no-store' });
    if (res.ok) {
      const json = await res.json();
      if (Array.isArray(json.services)) return json.services as ProviderService[];
    }
  } catch (e) {
    console.warn('[fetchProviderServices] API failed, falling back to direct query:', e);
  }

  // FALLBACK: direct Supabase
  const { withTimeout } = await import('./session');
  try {
    const { data } = await withTimeout(
      supabase
        .from('provider_services')
        .select('id, name, price, duration_minutes')
        .eq('provider_id', providerId)
        .eq('is_active', true)
        .order('name')
        .then((r) => r),
      6000,
      'fetchProviderServices',
    );
    return (data ?? []) as ProviderService[];
  } catch {
    return [];
  }
}

/** Get a signed (temporary) URL for a portfolio image stored in Supabase Storage. */
export async function getPortfolioImageUrl(
  storagePath: string,
  expiresInSeconds = 3600,
): Promise<string> {
  const { data, error } = await supabase.storage
    .from('portfolio-images')
    .createSignedUrl(storagePath, expiresInSeconds);

  if (error || !data) throw error ?? new Error('Failed to generate signed URL');
  return data.signedUrl;
}
