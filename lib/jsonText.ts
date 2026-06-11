/* Riconosce il testo che e' in realta' un oggetto/array JSON: alcuni
   documenti includono configurazioni come prosa. Restituisce il JSON
   formattato oppure null. */
export function tryFormatJson(text: string): string | null {
  const trimmed = text.trim();
  if (!/^[\[{]/.test(trimmed) || !/[\]}]$/.test(trimmed)) return null;
  try {
    const parsed: unknown = JSON.parse(trimmed);
    if (parsed && typeof parsed === "object") {
      return JSON.stringify(parsed, null, 2);
    }
  } catch {
    // JSON non valido: il testo resta invariato.
  }
  return null;
}
