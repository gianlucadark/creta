import { writeFileSync, mkdirSync } from "fs";
import { join, extname } from "path";
import { EmptyDocumentError, ingestDocxBuffer } from "@/lib/ingestDocx";
import { authorizeEditor } from "@/lib/editors";

const MAX_FILE_BYTES = 12 * 1024 * 1024;

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
        { error: "Il file supera il limite di 12 MB." },
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
    const outDir = join(process.cwd(), "content", "pages");
    mkdirSync(outDir, { recursive: true });
    writeFileSync(
      join(outDir, `${slug}.json`),
      JSON.stringify(design, null, 2),
      "utf8"
    );

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
