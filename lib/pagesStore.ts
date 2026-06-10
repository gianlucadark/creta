import { mkdirSync, readFileSync, writeFileSync } from "fs";
import { join } from "path";
import { PageDesignSchema, type PageDesign } from "./schema";

/* Server-only access to the JSON document store in content/pages.
   Used by the API routes that manipulate documents (extract, edit, compose). */

export const PAGES_DIR = join(process.cwd(), "content", "pages");

export type ReadPageResult =
  | { status: "ok"; design: PageDesign }
  | { status: "not-found" }
  | { status: "not-v2" };

export function readPageDesign(slug: string): ReadPageResult {
  let raw: string;
  try {
    raw = readFileSync(join(PAGES_DIR, `${slug}.json`), "utf8");
  } catch (error) {
    if (
      error &&
      typeof error === "object" &&
      "code" in error &&
      error.code === "ENOENT"
    ) {
      return { status: "not-found" };
    }
    throw error;
  }

  try {
    const parsed = PageDesignSchema.safeParse(JSON.parse(raw));
    return parsed.success
      ? { status: "ok", design: parsed.data }
      : { status: "not-v2" };
  } catch {
    return { status: "not-v2" };
  }
}

export function writePageDesign(slug: string, design: PageDesign) {
  mkdirSync(PAGES_DIR, { recursive: true });
  writeFileSync(
    join(PAGES_DIR, `${slug}.json`),
    JSON.stringify(design, null, 2),
    "utf8"
  );
}
