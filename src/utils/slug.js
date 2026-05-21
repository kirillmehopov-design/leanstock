export function slugify(value) {
  const base = value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

  return `${base || 'tenant'}-${Math.random().toString(36).slice(2, 8)}`;
}
