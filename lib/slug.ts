import { existsSync } from "fs";
import { join } from "path";

/* Shared slug helpers for the document store (extract / compose / API routes). */

export function slugify(text: string) {
  return (
    text
      .toLowerCase()
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") || "documento"
  );
}

export function isValidSlug(slug: string) {
  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug);
}

/* First free slug among base, base-2, base-3, … in `dir`. */
export function uniqueSlug(base: string, dir: string) {
  if (!existsSync(join(dir, `${base}.json`))) return base;
  let n = 2;
  while (existsSync(join(dir, `${base}-${n}.json`))) n++;
  return `${base}-${n}`;
}
