import { z } from "zod";
import { readPageDesign, writePageDesign } from "@/lib/pagesStore";
import {
  ALLOWED_FILE_EXT,
  deleteFile,
  extFromName,
  isAllowedFileName,
  storeFile,
} from "@/lib/filesStore";
import { isValidSlug } from "@/lib/slug";
import { authorizeEditor } from "@/lib/editors";
import type { Attachment } from "@/lib/schema";

/* Vercel rifiuta i body oltre ~4,5 MB: gli allegati restano sotto i 4 MB,
   come l'ingest. Per file più grandi servirebbe l'upload diretto al Blob. */
const MAX_FILE_BYTES = 4 * 1024 * 1024;

/* POST: carica un file e lo aggiunge in fondo agli allegati del documento.
   DELETE: rimuove un allegato (e il file dallo store). Solo documenti v2. */

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

  let file: File | null;
  let label: string;
  try {
    const formData = await req.formData();
    file = formData.get("file") as File | null;
    const rawLabel = formData.get("label");
    label = typeof rawLabel === "string" ? rawLabel.trim() : "";
  } catch {
    return Response.json({ error: "Richiesta non valida." }, { status: 400 });
  }

  if (!file) {
    return Response.json({ error: "Nessun file ricevuto." }, { status: 400 });
  }
  if (!isAllowedFileName(file.name)) {
    return Response.json(
      {
        error: `Tipo di file non ammesso. Estensioni consentite: ${[...ALLOWED_FILE_EXT].join(", ")}.`,
      },
      { status: 415 }
    );
  }
  if (file.size > MAX_FILE_BYTES) {
    return Response.json(
      { error: "Il file supera il limite di 4 MB." },
      { status: 413 }
    );
  }

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

    const buffer = Buffer.from(await file.arrayBuffer());
    const stored = await storeFile(slug, buffer, file.name);

    const attachment: Attachment = {
      href: stored.href,
      filename: file.name,
      label: label || undefined,
      size: file.size,
      mime: file.type || undefined,
    };

    const { design } = source;
    design.attachments = [...(design.attachments ?? []), attachment];
    await writePageDesign(slug, design);

    return Response.json({ ok: true, attachment });
  } catch (error) {
    console.error("[creta] attachment upload failed:", error);
    return Response.json({ error: "Caricamento non riuscito." }, { status: 500 });
  }
}

const DeleteSchema = z.object({ href: z.string() });

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const denied = authorizeEditor(req);
  if (denied) return denied;

  const { slug } = await params;
  if (!isValidSlug(slug)) {
    return Response.json({ error: "Documento non valido." }, { status: 400 });
  }

  const body = DeleteSchema.safeParse(await req.json().catch(() => null));
  if (!body.success) {
    return Response.json({ error: "Richiesta non valida." }, { status: 400 });
  }

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
    const target = body.data.href;
    const remaining = (design.attachments ?? []).filter((a) => a.href !== target);
    if (remaining.length === (design.attachments?.length ?? 0)) {
      return Response.json({ error: "Allegato non trovato." }, { status: 404 });
    }

    design.attachments = remaining.length > 0 ? remaining : undefined;
    await writePageDesign(slug, design);

    /* Rimuove anche il file dallo store, ma solo se nessun altro allegato lo
       referenzia ancora (l'href è hash del contenuto: può ripetersi). */
    const prefix = `/api/files/${slug}/`;
    const stillUsed = remaining.some((a) => a.href === target);
    if (!stillUsed && target.startsWith(prefix)) {
      const name = target.slice(prefix.length).split("?")[0];
      if (/^[a-f0-9]{8,}\.[a-z0-9]+$/.test(name) && ALLOWED_FILE_EXT.has(extFromName(name))) {
        await deleteFile(slug, name);
      }
    }

    return Response.json({ ok: true });
  } catch (error) {
    console.error("[creta] attachment delete failed:", error);
    return Response.json({ error: "Eliminazione non riuscita." }, { status: 500 });
  }
}
