import { imageContentType, readImage } from "@/lib/assetsStore";
import { isValidSlug } from "@/lib/slug";

/* Serve un'immagine estratta da un documento, leggendola dal blob privato
   (lo store è ad accesso privato, quindi niente URL CDN dirette). Lettura
   pubblica come il resto del sito; il nome è l'hash del contenuto, quindi la
   risposta è immutabile e fortemente cacheabile. */

const NAME_RE = /^[a-f0-9]{8,}\.[a-z0-9]+$/;

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ slug: string; name: string }> }
) {
  const { slug, name } = await params;

  if (!isValidSlug(slug) || !NAME_RE.test(name)) {
    return new Response("Not found", { status: 404 });
  }

  try {
    const image = await readImage(slug, name);
    if (!image) return new Response("Not found", { status: 404 });

    return new Response(image.body, {
      headers: {
        "Content-Type": image.contentType || imageContentType(name),
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch (error) {
    console.error("[creta] asset read failed:", error);
    return new Response("Errore", { status: 500 });
  }
}
