/**
 * Basic keyword moderation for the community forum.
 * Returns true if the text passes moderation (no blocked words found).
 */
const BLOCKED_PATTERNS: RegExp[] = [
  /\bספאם\b/i,
  /\bspam\b/i,
  /\bפורנו\b/i,
  /\bporn\b/i,
  /\bאלימות\b/i,
  /\bhate\b/i,
];

export function passesModeration(text: string): boolean {
  return !BLOCKED_PATTERNS.some((pattern) => pattern.test(text));
}

export function sanitizeInput(text: string): string {
  // Strip HTML-like tags to prevent injection
  return text.replace(/<[^>]*>/g, '').trim();
}
