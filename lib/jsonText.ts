/* Detects text that is actually a JSON object/array (documents often embed
   config snippets as plain prose) and returns it pretty-printed, or null. */
export function tryFormatJson(text: string): string | null {
  const trimmed = text.trim();
  if (!/^[\[{]/.test(trimmed) || !/[\]}]$/.test(trimmed)) return null;
  try {
    const parsed: unknown = JSON.parse(trimmed);
    if (parsed && typeof parsed === "object") {
      return JSON.stringify(parsed, null, 2);
    }
  } catch {
    // not valid JSON — leave the text as-is
  }
  return null;
}
