import { extname } from "path";
import { analyzeDocxBuffer, EmptyDocumentError } from "@/lib/ingestDocx";
import { authorizeEditor } from "@/lib/editors";

/* Solo conversione + split in capitoli (niente LLM): rientra ampiamente nel
   timeout di default, ma la lasciamo allineata alla route di ingest. */
export const maxDuration = 60;

/* Deve restare allineato a MAX_FILE_BYTES in app/api/ingest/route.ts e nel
   client: Vercel taglia i body oltre ~4,5 MB. */
const MAX_FILE_BYTES = 4 * 1024 * 1024;

/* Passo 1 del flusso a due tempi: l'utente carica il .docx, riceve la scaletta
   dei capitoli e sceglie quali importare prima della generazione vera. */
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
    const outline = await analyzeDocxBuffer(buffer);

    return Response.json(outline);
  } catch (error) {
    if (error instanceof EmptyDocumentError) {
      return Response.json({ error: error.message }, { status: 400 });
    }
    console.error("[creta] analyze failed:", error);
    return Response.json(
      { error: "Analisi non riuscita: il documento non è stato letto. Riprova o verifica il file." },
      { status: 500 }
    );
  }
}
