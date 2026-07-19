const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
const DEFAULT_BUCKET = 'service-portfolios';

export interface ImageOpts {
  width?: number;
  height?: number;
  quality?: number;
  resize?: 'cover' | 'contain' | 'fill';
  bucket?: string;
}

/**
 * Optimized image URL via Supabase Image Transformation API.
 * Saves 70-90% bandwidth compared to raw originals. Requires Pro plan.
 */
export function optimizedImageUrl(path: string | null | undefined, opts: ImageOpts = {}): string {
  if (!path) return '';
  const safe = path.replace(/[^A-Za-z0-9/_.\-]/g, '');
  const bucket = opts.bucket || DEFAULT_BUCKET;
  const params = new URLSearchParams();
  if (opts.width) params.set('width', String(opts.width));
  if (opts.height) params.set('height', String(opts.height));
  if (opts.resize) params.set('resize', opts.resize);
  params.set('quality', String(opts.quality ?? 75));
  const query = params.toString();
  return `${SUPABASE_URL}/storage/v1/render/image/public/${bucket}/${encodeURI(safe)}${query ? '?' + query : ''}`;
}

export function rawImageUrl(path: string | null | undefined, bucket: string = DEFAULT_BUCKET): string {
  if (!path) return '';
  const safe = path.replace(/[^A-Za-z0-9/_.\-]/g, '');
  return `${SUPABASE_URL}/storage/v1/object/public/${bucket}/${encodeURI(safe)}`;
}
