import { ALLOWED_FILE_EXT, extFromName, readFile } from "@/lib/filesStore";
import { isValidSlug } from "@/lib/slug";

/* Serve un allegato di un documento dal blob privato. Sicurezza: il file è
   sempre forzato al DOWNLOAD, mai reso inline. Servire file caricati dalla
   stessa origine del sito è rischioso (un .html/.svg eseguirebbe JS nella
   nostra origine), quindi:
   - Content-Type fisso application/octet-stream (mai text/html)
   - Content-Disposition: attachment → il browser scarica e basta
   - whitelist delle estensioni anche in lettura
   Lettura pubblica come il resto del sito; il nome è l'hash del contenuto,
   quindi la risposta è immutabile e cacheabile. Il nome originale per il
   download arriva dal parametro ?dl=… (sanificato), altrimenti si usa il
   nome salvato. */

const NAME_RE = /^[a-f0-9]{8,}\.[a-z0-9]+$/;

/** Sanifica il nome scelto per il download: niente percorsi, virgolette o
    caratteri di controllo che potrebbero rompere l'header. */
function safeDownloadName(raw: string | null, fallback: string): string {
  if (!raw) return fallback;
  const cleaned = raw
    .replace(/[\\/]/g, "_")
    .replace(/"/g, "")
    // eslint-disable-next-line no-control-regex
    .replace(/[\x00-\x1f\x7f]/g, "")
    .trim()
    .slice(0, 200);
  return cleaned || fallback;
}

export async function GET(
  req: Request,
  { params }: { params: Promise<{ slug: string; name: string }> }
) {
  const { slug, name } = await params;

  if (
    !isValidSlug(slug) ||
    !NAME_RE.test(name) ||
    !ALLOWED_FILE_EXT.has(extFromName(name))
  ) {
    return new Response("Not found", { status: 404 });
  }

  try {
    const file = await readFile(slug, name);
    if (!file) return new Response("Not found", { status: 404 });

    const dl = safeDownloadName(new URL(req.url).searchParams.get("dl"), name);

    return new Response(file.body, {
      headers: {
        "Content-Type": "application/octet-stream",
        "Content-Disposition": `attachment; filename="${dl}"`,
        "X-Content-Type-Options": "nosniff",
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch (error) {
    console.error("[creta] file read failed:", error);
    return new Response("Errore", { status: 500 });
  }
}
