import { z } from "zod";
import type { PageDesign } from "@/lib/schema";
import { PAGES_DIR, readPageDesign, writePageDesign } from "@/lib/pagesStore";
import { isValidSlug, slugify, uniqueSlug } from "@/lib/slug";
import { authorizeEditor } from "@/lib/editors";

const BodySchema = z.object({
  title: z.string().min(1),
  summary: z.string().optional(),
  items: z
    .array(
      z.object({
        slug: z.string(),
        chapter: z.string().optional(),
      })
    )
    .min(1),
});

/* Compose a new document by concatenating chapters (or whole documents)
   from existing ones. Sections are copied verbatim — no LLM involved. */
export async function POST(req: Request) {
  const denied = authorizeEditor(req);
  if (denied) return denied;

  const body = BodySchema.safeParse(await req.json().catch(() => null));
  if (!body.success) {
    return Response.json({ error: "Richiesta non valida." }, { status: 400 });
  }
  const { title, summary, items } = body.data;

  try {
    const sections: PageDesign["sections"] = [];

    for (const item of items) {
      if (!isValidSlug(item.slug)) {
        return Response.json(
          { error: `Documento non valido: ${item.slug}` },
          { status: 400 }
        );
      }
      const source = readPageDesign(item.slug);
      if (source.status !== "ok") {
        return Response.json(
          { error: `Documento non trovato o non supportato: ${item.slug}` },
          { status: 400 }
        );
      }

      const { design } = source;
      const picked = item.chapter
        ? design.sections.filter((s) => s.chapter === item.chapter)
        : design.sections;
      if (picked.length === 0) {
        return Response.json(
          {
            error: `Capitolo "${item.chapter}" non trovato in "${design.page.title}".`,
          },
          { status: 400 }
        );
      }

      // Sections are verbatim; only the grouping label is filled in when
      // missing, so the composed page can show where each part comes from.
      sections.push(
        ...picked.map((s) => ({
          ...s,
          chapter: s.chapter ?? design.page.title,
        }))
      );
    }

    const design: PageDesign = {
      version: 2,
      page: {
        title: title.trim(),
        eyebrow: "Documento composto",
        summary:
          summary?.trim() ||
          firstParagraph(sections) ||
          `Raccolta composta da ${items.length} parti.`,
      },
      sections,
    };

    const slug = uniqueSlug(slugify(design.page.title), PAGES_DIR);
    writePageDesign(slug, design);

    return Response.json({ slug, title: design.page.title });
  } catch (error) {
    console.error("[creta] compose failed:", error);
    return Response.json(
      { error: "Composizione non riuscita." },
      { status: 500 }
    );
  }
}

function firstParagraph(sections: PageDesign["sections"]) {
  for (const section of sections) {
    for (const block of section.blocks) {
      if (block.type === "paragraph") return block.text;
    }
  }
  return sections[0]?.intro;
}
