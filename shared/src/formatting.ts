export function titleCase(value: string) {
  return value
    .replace(/[_-]+/g, " ")
    .split(" ")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function normalizeDegrees(value: number) {
  return ((value % 360) + 360) % 360;
}

export function normalizeIntegerDegrees(value: number) {
  return normalizeDegrees(Math.round(value));
}

export function parseTagsText(value: string): string[] {
  if (!value) {
    return [];
  }

  const seen = new Set<string>();
  const tags: string[] = [];

  for (const part of value.split(",")) {
    const trimmed = part.trim();

    if (trimmed.length === 0 || seen.has(trimmed)) {
      continue;
    }

    seen.add(trimmed);
    tags.push(trimmed);
  }

  return tags;
}
