/* Coverage scoring: measures how much of a source chunk's text actually
   made it into the generated sections. Used to detect (and repair) LLM
   outputs that silently dropped or summarised content. */

import type { PageDesign } from "./schema";

const WORD = /[\p{L}\p{N}][\p{L}\p{N}'’._\-/]{3,}/gu;

function words(text: string): string[] {
  return (text.toLowerCase().match(WORD) ?? []).map((word) =>
    word.replace(/[**`]/g, "")
  );
}

function collectStrings(value: unknown, out: string[]): void {
  if (typeof value === "string") {
    if (value.trim()) out.push(value);
    return;
  }
  if (Array.isArray(value)) {
    for (const item of value) collectStrings(item, out);
    return;
  }
  if (value && typeof value === "object") {
    for (const item of Object.values(value)) collectStrings(item, out);
  }
}

export function designText(sections: PageDesign["sections"]): string {
  const out: string[] = [];
  collectStrings(sections, out);
  return out.join("\n");
}

/** Fraction (0–1) of the source's significant words present in the output. */
export function coverageRatio(sourceText: string, outputText: string): number {
  const source = new Set(words(sourceText));
  if (source.size === 0) return 1;
  const output = new Set(words(outputText));
  let hit = 0;
  for (const word of source) if (output.has(word)) hit += 1;
  return hit / source.size;
}
