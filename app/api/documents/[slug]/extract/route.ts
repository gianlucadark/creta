import { z } from "zod";
import type { PageDesign } from "@/lib/schema";
import { readPageDesign, uniqueSlug, writePageDesign } from "@/lib/pagesStore";
import { isValidSlug, slugify } from "@/lib/slug";
import { authorizeEditor } from "@/lib/editors";

const BodySchema = z.object({
  chapter: z.string().min(1),
  removeFromSource: z.boolean().default(false),
});

/* Derive the new page summary without rewriting anything: first paragraph
   of the extracted chapter, else the first section intro, else the source summary. */
function deriveSummary(sections: PageDesign["sections"], fallback: string) {
  for (const section of sections) {
    for (const block of section.blocks) {
      if (block.type === "paragraph") return block.text;
    }
  }
  return sections[0]?.intro ?? fallback;
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const denied = authorizeEditor(req);
  if (denied) return denied;

  const { slug } = await params;

  if (!isValidSlug(slug)) {
    return Response.json({ error: "Documento non valido." }, { status: 400 });
  }

  const body = BodySchema.safeParse(await req.json().catch(() => null));
  if (!body.success) {
    return Response.json({ error: "Richiesta non valida." }, { status: 400 });
  }
  const { chapter, removeFromSource } = body.data;

  try {
    const source = await readPageDesign(slug);
    if (source.status === "not-found") {
      return Response.json({ error: "Documento non trovato." }, { status: 404 });
    }
    if (source.status === "not-v2") {
      return Response.json(
        { error: "Funzione disponibile solo per i documenti più recenti." },
        { status: 400 }
      );
    }

    const { design } = source;
    const extracted = design.sections.filter((s) => s.chapter === chapter);
    if (extracted.length === 0) {
      return Response.json(
        { error: "Capitolo non trovato nel documento." },
        { status: 400 }
      );
    }

    const remaining = design.sections.filter((s) => s.chapter !== chapter);
    if (removeFromSource && remaining.length === 0) {
      return Response.json(
        { error: "Non puoi rimuovere l'unico capitolo del documento." },
        { status: 400 }
      );
    }

    const newDesign: PageDesign = {
      version: 2,
      page: {
        title: chapter,
        eyebrow: design.page.title,
        summary: deriveSummary(extracted, design.page.summary),
        audience: design.page.audience,
        source: { slug, title: design.page.title },
      },
      sections: extracted,
    };

    const newSlug = await uniqueSlug(slugify(chapter));
    // Write the new document first: a failure rewriting the source never loses content.
    await writePageDesign(newSlug, newDesign);
    if (removeFromSource) {
      await writePageDesign(slug, { ...design, sections: remaining });
    }

    return Response.json({
      slug: newSlug,
      title: chapter,
      removedFromSource: removeFromSource,
    });
  } catch (error) {
    console.error("[creta] extract failed:", error);
    return Response.json(
      { error: "Estrazione non riuscita." },
      { status: 500 }
    );
  }
}
