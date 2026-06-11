import {
  CollectionsConfigSchema,
  normalizeCollections,
} from "@/lib/collections";
import { readCollections, writeCollections } from "@/lib/collectionsStore";
import { listPageFiles } from "@/lib/pagesStore";
import { authorizeEditor } from "@/lib/editors";

export const dynamic = "force-dynamic";

export async function GET() {
  return Response.json(await readCollections());
}

/* Sostituisce per intero la config delle rubriche (il pannello di gestione
   lavora su una bozza completa e la salva in un colpo solo). Gli slug che
   non corrispondono più a un documento vengono scartati in silenzio: la
   config si auto-ripara dopo le eliminazioni. */
export async function PUT(req: Request) {
  const denied = authorizeEditor(req);
  if (denied) return denied;

  const body = CollectionsConfigSchema.safeParse(
    await req.json().catch(() => null)
  );
  if (!body.success) {
    return Response.json({ error: "Richiesta non valida." }, { status: 400 });
  }

  try {
    const existing = new Set((await listPageFiles()).map((file) => file.slug));
    const config = normalizeCollections({
      ...body.data,
      collections: body.data.collections.map((collection) => ({
        ...collection,
        slugs: collection.slugs.filter((slug) => existing.has(slug)),
      })),
    });
    const saved = await writeCollections(config);
    return Response.json({ ok: true, collections: saved.collections });
  } catch (error) {
    console.error("[creta] collections save failed:", error);
    return Response.json(
      { error: "Salvataggio non riuscito." },
      { status: 500 }
    );
  }
}
