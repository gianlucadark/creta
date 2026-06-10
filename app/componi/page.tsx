import type { Metadata } from "next";
import { PageDesignSchema } from "@/lib/schema";
import { listPageFiles, readPageRaw } from "@/lib/pagesStore";
import { ComposerClient } from "@/components/ComposerClient";

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

async function loadDocs(): Promise<ComposerDoc[]> {
  let files: { slug: string; mtime: number }[] = [];
  try {
    files = await listPageFiles();
  } catch {
    return [];
  }

  const contents = await Promise.all(
    files.map((file) => readPageRaw(file.slug).catch(() => null))
  );

  const docs: (ComposerDoc & { mtime: number })[] = [];
  for (const [i, file] of files.entries()) {
    const raw = contents[i];
    if (raw === null) continue;
    try {
      const parsed = PageDesignSchema.safeParse(JSON.parse(raw));
      if (!parsed.success) continue; // legacy v1: not composable

      const chapters: string[] = [];
      for (const section of parsed.data.sections) {
        if (section.chapter && !chapters.includes(section.chapter)) {
          chapters.push(section.chapter);
        }
      }

      docs.push({
        slug: file.slug,
        title: parsed.data.page.title,
        chapters,
        sectionCount: parsed.data.sections.length,
        mtime: file.mtime,
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

export default async function ComponiPage() {
  return <ComposerClient docs={await loadDocs()} />;
}
