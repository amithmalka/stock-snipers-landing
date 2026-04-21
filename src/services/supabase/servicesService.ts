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
    profileImageUrl: r.profile_image_path
      ? `${SUPABASE_URL}/storage/v1/object/public/service-portfolios/${r.profile_image_path}`
      : undefined,
    latitude: r.latitude,
    longitude: r.longitude,
    rating: r.rating,
    phone: r.phone,
    portfolioImages: (r.portfolio_paths ?? []).map(
      (p: string) => `${SUPABASE_URL}/storage/v1/object/public/service-portfolios/${p}`,
    ),
    distanceKm,
  };
}

/**
 * Search providers by free text (specialty + city + name).
 * e.g. query = "ציפורניים ירושלים"
 */
export async function searchProviders(query: string): Promise<ServiceProvider[]> {
  const q = query.trim();

  // Only show providers that completed all mandatory fields + have at least one active service
  const { data: serviceRows } = await supabase
    .from('provider_services')
    .select('provider_id')
    .eq('is_active', true);
  const providerIdsWithServices = [...new Set((serviceRows ?? []).map((r: { provider_id: string }) => r.provider_id))];

  if (providerIdsWithServices.length === 0) return [];

  let dbQuery = supabase
    .from('service_providers')
    .select('*')
    .eq('is_active', true)
    .not('bio', 'is', null)
    .neq('bio', '')
    .not('portfolio_paths', 'eq', '{}')
    .in('id', providerIdsWithServices);

  if (q) {
    dbQuery = dbQuery.or(
      `name.ilike.%${q}%,specialty.ilike.%${q}%,city.ilike.%${q}%,category.ilike.%${q}%`,
    );
  }

  const { data, error } = await dbQuery.limit(50);
  if (error) throw error;
  return (data as ProviderRow[]).map((r) => rowToProvider(r));
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
  let query = supabase
    .from('service_providers')
    .select('*')
    .eq('is_active', true);

  if (category) query = query.eq('category', category);

  const { data, error } = await query;
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

export async function fetchProviderServices(providerId: string): Promise<ProviderService[]> {
  const { data } = await supabase
    .from('provider_services')
    .select('id, name, price, duration_minutes')
    .eq('provider_id', providerId)
    .eq('is_active', true)
    .order('name');
  return (data ?? []) as ProviderService[];
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
