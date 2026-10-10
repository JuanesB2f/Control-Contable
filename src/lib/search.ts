function normalize(text: string) {
  return text.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase()
}

/** Accent- and case-insensitive match, so "acido" finds "Ácido". */
export function matchesSearch(query: string, ...fields: (string | null | undefined)[]) {
  const needle = normalize(query.trim())
  if (!needle) return true
  return fields.some((field) => field && normalize(field).includes(needle))
}
