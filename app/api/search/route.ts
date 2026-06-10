import { searchLibrary } from "@/lib/searchIndex";

export const dynamic = "force-dynamic";

/* Full-text search over the JSON document store. With an empty query it
   returns the whole library (used by the palette as the starting list). */
export async function GET(req: Request) {
  const q = new URL(req.url).searchParams.get("q") ?? "";
  return Response.json(await searchLibrary(q));
}
