import type { Metadata } from "next";
import { readPageDesign } from "@/lib/pagesStore";
import { isValidSlug } from "@/lib/slug";
import { WriterClient } from "@/components/WriterClient";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Scrivi documento",
  description:
    "Scrivi un documento capitolo per capitolo e trasformalo in una pagina impaginata automaticamente.",
};

export default async function ScriviPage({
  searchParams,
}: {
  searchParams: Promise<{ slug?: string }>;
}) {
  const { slug } = await searchParams;

  // edit mode: prefill the form from the saved markdown source
  if (slug && isValidSlug(slug)) {
    const source = await readPageDesign(slug);
    if (source.status === "ok" && source.design.authoring) {
      return (
        <WriterClient
          slug={slug}
          initial={{
            title: source.design.page.title,
            summary: source.design.page.summary,
            eyebrow: source.design.page.eyebrow,
            chapters: source.design.authoring.chapters,
          }}
        />
      );
    }
  }

  return <WriterClient />;
}
