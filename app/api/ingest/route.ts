import { extname } from "path";
import { EmptyDocumentError, ingestDocxBuffer } from "@/lib/ingestDocx";
import { writePageDesign } from "@/lib/pagesStore";
import { authorizeEditor } from "@/lib/editors";

/* The Gemini map-reduce can take minutes on long documents: allow the
   full Fluid Compute window on Vercel instead of the default timeout. */
export const maxDuration = 300;

/* Vercel rejects request bodies over ~4.5 MB before the function runs,
   so the limit must stay under that (with margin for multipart overhead). */
const MAX_FILE_BYTES = 4 * 1024 * 1024;

function slugify(fileName: string) {
  return (
    fileName
      .replace(/\.docx$/i, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") || "document"
  );
}

export async function POST(req: Request) {
  const denied = authorizeEditor(req);
  if (denied) return denied;

  try {
    const formData = await req.formData();
    const file = formData.get("docx") as File | null;

    if (!file) {
      return Response.json({ error: "Nessun file ricevuto." }, { status: 400 });
    }

    if (extname(file.name).toLowerCase() !== ".docx") {
      return Response.json(
        { error: "Sono supportati solo file .docx." },
        { status: 400 }
      );
    }

    if (file.size > MAX_FILE_BYTES) {
      return Response.json(
        { error: "Il file supera il limite di 4 MB." },
        { status: 413 }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const { design, engine, report } = await ingestDocxBuffer(buffer);

    console.info(
      `[creta] ingest "${file.name}": ${report.chunks} chunk (${report.llmChunks} LLM, ${report.fallbackChunks} fallback), coverage ${report.coverage
        .map((c) => c.toFixed(2))
        .join(" ")}`
    );

    const slug = slugify(file.name);
    await writePageDesign(slug, design);

    return Response.json({ slug, title: design.page.title, engine });
  } catch (error) {
    if (error instanceof EmptyDocumentError) {
      return Response.json({ error: error.message }, { status: 400 });
    }
    console.error("[creta] ingest failed:", error);
    return Response.json(
      { error: "Ingest non riuscito: il documento non è stato elaborato. Riprova o verifica il file." },
      { status: 500 }
    );
  }
}
