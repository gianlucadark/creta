import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { StoredPageSchema, DocumentTreeSchema, BlockSchema } from "@/lib/schema";
import { designReadingMinutes, getLibraryIndex } from "@/lib/searchIndex";
import { readPageRaw } from "@/lib/pagesStore";
import { renderBlock } from "@/components/registry";
import {
  PageDesignRenderer,
  type RelatedDocMeta,
} from "@/components/PageDesignRenderer";
import { DocHeader } from "@/components/DocHeader";

export const dynamic = "force-dynamic";

async function loadPage(slug: string) {
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) return null;
  try {
    const raw = await readPageRaw(slug);
    if (raw === null) return null;
    const parsed = StoredPageSchema.safeParse(JSON.parse(raw));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

/* Resolve the stored related slugs against the library index: deleted
   documents silently drop out, titles stay fresh after renames. */
async function resolveRelated(slugs?: string[]): Promise<RelatedDocMeta[]> {
  if (!slugs || slugs.length === 0) return [];
  const { docs } = await getLibraryIndex();
  const bySlug = new Map(docs.map((doc) => [doc.slug, doc]));
  return slugs.flatMap((slug) => {
    const doc = bySlug.get(slug);
    return doc
      ? [
          {
            slug: doc.slug,
            title: doc.title,
            eyebrow: doc.eyebrow,
            summary: doc.summary,
            sectionCount: doc.sectionCount,
            readingMinutes: doc.readingMinutes,
          },
        ]
      : [];
  });
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const page = await loadPage(slug);
  if (!page || !("version" in page)) return {};
  return {
    title: page.page.title,
    description: page.page.summary.slice(0, 300),
  };
}

export default async function Page({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const page = await loadPage(slug);

  if (!page) notFound();

  if ("version" in page && page.version === 2) {
    const minutes = designReadingMinutes(page);
    const related = await resolveRelated(page.related);
    return (
      <div className="creta-grid-bg min-h-screen">
        <DocHeader
          meta={`${page.sections.length} sezioni · ${minutes} min`}
          title={page.page.title}
          slug={slug}
        />
        <PageDesignRenderer design={page} slug={slug} related={related} />
      </div>
    );
  }

  const legacyPage = DocumentTreeSchema.parse(page);
  const validBlocks = legacyPage.blocks.filter((block) =>
    BlockSchema.safeParse(block).success
  );
  const legacyTitle = (() => {
    const hero = legacyPage.blocks.find((b) => b.component === "PageHero");
    return hero && hero.component === "PageHero" ? hero.props.title : undefined;
  })();

  return (
    <div className="creta-grid-bg min-h-screen">
      <DocHeader meta={`${validBlocks.length} blocchi`} title={legacyTitle} slug={slug} />
      <main className="mx-auto max-w-4xl px-5 pb-16 pt-28">
        {validBlocks.map((block, i) => renderBlock(block, i))}
      </main>
    </div>
  );
}
