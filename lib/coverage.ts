/* Scoring di copertura: misura quanto testo del chunk sorgente entra davvero
   nelle sezioni generate. Serve a rilevare e riparare output LLM che perdono
   o riassumono contenuto senza segnalarlo. */

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

/** Frazione, da 0 a 1, delle parole significative sorgente presenti nell'output. */
export function coverageRatio(sourceText: string, outputText: string): number {
  const source = new Set(words(sourceText));
  if (source.size === 0) return 1;
  const output = new Set(words(outputText));
  let hit = 0;
  for (const word of source) if (output.has(word)) hit += 1;
  return hit / source.size;
}
