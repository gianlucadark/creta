import { readdirSync, readFileSync, statSync } from "fs";
import { join } from "path";
import type { Metadata } from "next";
import { PageDesignSchema } from "@/lib/schema";
import { ComposerClient } from "@/components/ComposerClient";

const PAGES_DIR = join(process.cwd(), "content", "pages");

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Componi documento",
  description: "Crea un nuovo documento unendo capitoli da documenti esistenti.",
};

export type ComposerDoc = {
  slug: string;
  title: string;
  /** Distinct chapter titles in document order; empty when the document
      has no named chapters (it can only be added whole). */
  chapters: string[];
  sectionCount: number;
};

function loadDocs(): ComposerDoc[] {
  let files: string[] = [];
  try {
    files = readdirSync(PAGES_DIR).filter((f) => f.endsWith(".json"));
  } catch {
    return [];
  }

  const docs: (ComposerDoc & { mtime: number })[] = [];
  for (const file of files) {
    try {
      const path = join(PAGES_DIR, file);
      const parsed = PageDesignSchema.safeParse(
        JSON.parse(readFileSync(path, "utf8"))
      );
      if (!parsed.success) continue; // legacy v1: not composable

      const chapters: string[] = [];
      for (const section of parsed.data.sections) {
        if (section.chapter && !chapters.includes(section.chapter)) {
          chapters.push(section.chapter);
        }
      }

      docs.push({
        slug: file.replace(/\.json$/, ""),
        title: parsed.data.page.title,
        chapters,
        sectionCount: parsed.data.sections.length,
        mtime: statSync(path).mtimeMs,
      });
    } catch {
      // skip unreadable files
    }
  }

  docs.sort((a, b) => b.mtime - a.mtime);
  return docs.map(({ slug, title, chapters, sectionCount }) => ({
    slug,
    title,
    chapters,
    sectionCount,
  }));
}

export default function ComponiPage() {
  return <ComposerClient docs={loadDocs()} />;
}
