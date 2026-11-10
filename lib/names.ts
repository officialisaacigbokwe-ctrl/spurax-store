// Compares a name written on an ID with a bank account name.
// Bank names are often in a different order (SURNAME FIRST MIDDLE), so we
// compare words, not the whole text.
function words(value: string) {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z\s]/g, " ")
    .split(/\s+/)
    .filter((word) => word.length > 2);
}

export function namesMatch(a: string, b: string): boolean {
  const first = words(a);
  const second = new Set(words(b));

  if (first.length === 0 || second.size === 0) {
    return false;
  }

  const common = first.filter((word) => second.has(word)).length;
  const needed = Math.min(2, first.length, second.size);

  return common >= needed;
}