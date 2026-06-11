import {
  EmptyDocumentError,
  ingestAuthoredDocument,
} from "@/lib/ingestDocx";
import {
  AuthorBodySchema,
  MAX_TOTAL_MARKDOWN_CHARS,
  authoringFromBody,
  totalMarkdownChars,
} from "@/lib/authorBody";
import { readPageDesign, writePageDesign } from "@/lib/pagesStore";
import { isValidSlug } from "@/lib/slug";
import { authorizeEditor } from "@/lib/editors";

/* The Gemini map-reduce can take minutes on long documents: allow the
   full Fluid Compute window on Vercel instead of the default timeout. */
export const maxDuration = 300;

/* Regenerate a document written in the app from its (edited) markdown
   source. The slug never changes, even if the title does: URLs stay
   stable and writePageDesign simply overwrites. */
export async function PUT(
  req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const denied = authorizeEditor(req);
  if (denied) return denied;

  const { slug } = await params;
  if (!isValidSlug(slug)) {
    return Response.json({ error: "Documento non valido." }, { status: 400 });
  }

  const body = AuthorBodySchema.safeParse(await req.json().catch(() => null));
  if (!body.success) {
    return Response.json({ error: "Richiesta non valida." }, { status: 400 });
  }
  if (totalMarkdownChars(body.data) > MAX_TOTAL_MARKDOWN_CHARS) {
    return Response.json(
      { error: "Il testo supera la dimensione massima consentita." },
      { status: 413 }
    );
  }

  try {
    const source = await readPageDesign(slug);
    if (source.status === "not-found") {
      return Response.json({ error: "Documento non trovato." }, { status: 404 });
    }
    if (source.status === "not-v2" || !source.design.authoring) {
      return Response.json(
        { error: "Documento non modificabile come testo." },
        { status: 400 }
      );
    }

    const { design, engine, report } = await ingestAuthoredDocument(body.data);
    design.authoring = authoringFromBody(body.data);

    console.info(
      `[creta] author regen "${slug}": ${report.chunks} chunk (${report.llmChunks} LLM, ${report.fallbackChunks} fallback), coverage ${report.coverage
        .map((c) => c.toFixed(2))
        .join(" ")}`
    );

    await writePageDesign(slug, design);

    return Response.json({ slug, title: design.page.title, engine });
  } catch (error) {
    if (error instanceof EmptyDocumentError) {
      return Response.json({ error: error.message }, { status: 400 });
    }
    console.error("[creta] author regen failed:", error);
    return Response.json(
      { error: "Rigenerazione non riuscita: il testo non è stato elaborato. Riprova." },
      { status: 500 }
    );
  }
}
