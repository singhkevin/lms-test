export function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function uniqueSlug(base: string): string {
  const slug = slugify(base);
  const suffix = Math.random().toString(36).substring(2, 7);
  return `${slug}-${suffix}`;
}
