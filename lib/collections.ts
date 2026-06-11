import { z } from "zod";
import { isValidSlug, slugify } from "./slug";

/* Rubriche: voci di menu persistenti che raggruppano i documenti della home.
   Il file è importato sia dal server (store + route API) sia dal client
   (HomeClient/CollectionsManager, solo per i tipi): niente segreti né
   codice server-only, come lib/schema.ts. */

export const MAX_COLLECTIONS = 16;
export const MAX_COLLECTION_TITLE = 60;

export const CollectionSchema = z.object({
  /** Slug stabile della rubrica, usato per gli anchor in home. Può arrivare
      vuoto dal client (rubrica appena creata): normalizeCollections lo
      rigenera dal titolo. */
  id: z.string(),
  title: z.string().max(MAX_COLLECTION_TITLE),
  /** Slug dei documenti assegnati. Un documento appartiene al massimo a una
      rubrica: i duplicati tra rubriche sono risolti da normalizeCollections. */
  slugs: z.array(z.string()).max(500),
});

export const CollectionsConfigSchema = z.object({
  version: z.literal(1),
  collections: z.array(CollectionSchema).max(MAX_COLLECTIONS),
});

export type DocCollection = z.infer<typeof CollectionSchema>;
export type CollectionsConfig = z.infer<typeof CollectionsConfigSchema>;

export const EMPTY_COLLECTIONS: CollectionsConfig = {
  version: 1,
  collections: [],
};

/* Riporta una config in forma canonica: titoli trimmati (rubriche senza
   titolo scartate), id unici e validi, ogni documento in una sola rubrica
   (vince la prima in ordine), slug malformati eliminati. */
export function normalizeCollections(
  input: CollectionsConfig
): CollectionsConfig {
  const seenIds = new Set<string>();
  const seenSlugs = new Set<string>();
  const collections: DocCollection[] = [];

  for (const item of input.collections) {
    const title = item.title.trim();
    if (!title) continue;

    const base = isValidSlug(item.id) ? item.id : slugify(title);
    let id = base;
    for (let n = 2; seenIds.has(id); n++) id = `${base}-${n}`;
    seenIds.add(id);

    const slugs = item.slugs.filter(
      (slug) => isValidSlug(slug) && !seenSlugs.has(slug)
    );
    for (const slug of slugs) seenSlugs.add(slug);

    collections.push({ id, title, slugs });
  }

  return { version: 1, collections };
}
