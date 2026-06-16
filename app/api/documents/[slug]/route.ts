import { z } from "zod";
import {
  deletePage,
  listPageFiles,
  readPageDesign,
  writePageDesign,
} from "@/lib/pagesStore";
import { isValidSlug } from "@/lib/slug";
import { authorizeEditor } from "@/lib/editors";
import { normalizeBlocks } from "@/lib/schema";

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

  try {
    const deleted = await deletePage(slug);
    if (!deleted) {
      return Response.json({ error: "Documento non trovato." }, { status: 404 });
    }
    return Response.json({ ok: true });
  } catch (error) {
    console.error("[creta] delete failed:", error);
    return Response.json(
      { error: "Eliminazione non riuscita." },
      { status: 500 }
    );
  }
}

const PatchSchema = z.object({
  page: z
    .object({
      title: z.string().optional(),
      eyebrow: z.string().optional(),
      summary: z.string().optional(),
      audience: z.string().optional(),
    })
    .optional(),
  order: z.array(z.number().int().nonnegative()).optional(),
  /** Slugs of the hand-picked related documents ("Vedi anche").
      An empty array clears the list. */
  related: z.array(z.string()).max(8).optional(),
  /** Per-section content edits applied by hand from the detail page. Each
      entry replaces the title/intro/blocks of the section at `index`. The
      blocks are raw (unknown) and pass through `normalizeBlocks` for tolerant
      validation: a malformed block is coerced or downgraded to a paragraph,
      never accepted as-is. */
  sections: z
    .array(
      z.object({
        index: z.number().int().nonnegative(),
        title: z.string().optional(),
        intro: z.string().optional(),
        blocks: z.array(z.unknown()),
      })
    )
    .optional(),
});

/* Update document metadata, reorder its sections and/or set its related
   documents. Pure JSON manipulation: section content is never touched. */
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const denied = authorizeEditor(req);
  if (denied) return denied;

  const { slug } = await params;

  if (!isValidSlug(slug)) {
    return Response.json({ error: "Documento non valido." }, { status: 400 });
  }

  const body = PatchSchema.safeParse(await req.json().catch(() => null));
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
    const { page, order, related, sections: sectionEdits } = body.data;

    /* Le modifiche per-sezione si applicano sugli indici originali, prima di
       un eventuale riordino: l'editor del dettaglio invia solo `sections`. */
    if (sectionEdits) {
      if (design.authoring) {
        return Response.json(
          {
            error:
              "Questo documento si modifica da /scrivi: la modifica per sezione non è disponibile.",
          },
          { status: 400 }
        );
      }
      for (const edit of sectionEdits) {
        if (edit.index >= design.sections.length) {
          return Response.json(
            { error: "Sezione non valida." },
            { status: 400 }
          );
        }
        const target = design.sections[edit.index];
        if (edit.title !== undefined) {
          const title = edit.title.trim();
          if (title) target.title = title;
        }
        if (edit.intro !== undefined) {
          target.intro = edit.intro.trim() || undefined;
        }
        const blocks = normalizeBlocks(edit.blocks);
        if (blocks.length === 0) {
          return Response.json(
            { error: "Una sezione non può restare senza contenuti." },
            { status: 400 }
          );
        }
        target.blocks = blocks;
      }
    }

    if (page) {
      const title = page.title?.trim();
      const summary = page.summary?.trim();
      if (title) design.page.title = title;
      if (summary) design.page.summary = summary;
      if (page.eyebrow !== undefined) {
        design.page.eyebrow = page.eyebrow.trim() || undefined;
      }
      if (page.audience !== undefined) {
        design.page.audience = page.audience.trim() || undefined;
      }
    }

    if (order) {
      const isPermutation =
        order.length === design.sections.length &&
        new Set(order).size === order.length &&
        order.every((i) => i >= 0 && i < design.sections.length);
      if (!isPermutation) {
        return Response.json(
          { error: "Ordine delle sezioni non valido." },
          { status: 400 }
        );
      }
      design.sections = order.map((i) => design.sections[i]);
    }

    if (related !== undefined) {
      const cleaned = [...new Set(related)].filter(
        (s) => s !== slug && isValidSlug(s)
      );
      const existing = new Set((await listPageFiles()).map((f) => f.slug));
      if (cleaned.some((s) => !existing.has(s))) {
        return Response.json(
          { error: "Uno dei documenti collegati non esiste più." },
          { status: 400 }
        );
      }
      design.related = cleaned.length > 0 ? cleaned : undefined;
    }

    await writePageDesign(slug, design);
    return Response.json({ ok: true });
  } catch (error) {
    console.error("[creta] patch failed:", error);
    return Response.json(
      { error: "Salvataggio non riuscito." },
      { status: 500 }
    );
  }
}
