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
import { uniqueSlug, writePageDesign } from "@/lib/pagesStore";
import { slugify } from "@/lib/slug";
import { authorizeEditor } from "@/lib/editors";

/* The Gemini map-reduce can take minutes on long documents: allow the
   full Fluid Compute window on Vercel instead of the default timeout. */
export const maxDuration = 300;

/* Create a document written in the app: markdown chapters → semantic HTML →
   the same Gemini map-reduce used for .docx. The markdown source is saved
   in design.authoring so the document stays text-editable. */
export async function POST(req: Request) {
  const denied = authorizeEditor(req);
  if (denied) return denied;

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
    const { design, engine, report } = await ingestAuthoredDocument(body.data);
    design.authoring = authoringFromBody(body.data);

    console.info(
      `[creta] author "${design.page.title}": ${report.chunks} chunk (${report.llmChunks} LLM, ${report.fallbackChunks} fallback), coverage ${report.coverage
        .map((c) => c.toFixed(2))
        .join(" ")}`
    );

    const slug = await uniqueSlug(slugify(design.page.title));
    await writePageDesign(slug, design);

    return Response.json({ slug, title: design.page.title, engine });
  } catch (error) {
    if (error instanceof EmptyDocumentError) {
      return Response.json({ error: error.message }, { status: 400 });
    }
    console.error("[creta] author failed:", error);
    return Response.json(
      { error: "Creazione non riuscita: il testo non è stato elaborato. Riprova." },
      { status: 500 }
    );
  }
}
