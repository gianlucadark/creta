import { readFeatured, writeFeatured } from "@/lib/featuredStore";
import { listPageFiles } from "@/lib/pagesStore";
import { isValidSlug } from "@/lib/slug";
import { authorizeEditor } from "@/lib/editors";

export const dynamic = "force-dynamic";

export async function GET() {
  return Response.json({ slug: await readFeatured() });
}

/* Imposta (o azzera, con slug null) il documento in evidenza in home. Solo
   uno slug ancora esistente può essere messo in evidenza: dopo le eliminazioni
   la home ricade comunque sull'ultimo caricato. */
export async function PUT(req: Request) {
  const denied = authorizeEditor(req);
  if (denied) return denied;

  const body = (await req.json().catch(() => null)) as { slug?: unknown } | null;
  const slug = body && typeof body.slug === "string" ? body.slug : null;
  if (slug !== null && !isValidSlug(slug)) {
    return Response.json({ error: "Richiesta non valida." }, { status: 400 });
  }

  try {
    if (slug) {
      const existing = new Set((await listPageFiles()).map((file) => file.slug));
      if (!existing.has(slug)) {
        return Response.json({ error: "Documento inesistente." }, { status: 404 });
      }
    }
    const saved = await writeFeatured(slug);
    return Response.json({ ok: true, slug: saved });
  } catch (error) {
    console.error("[creta] featured save failed:", error);
    return Response.json(
      { error: "Salvataggio non riuscito." },
      { status: 500 }
    );
  }
}
