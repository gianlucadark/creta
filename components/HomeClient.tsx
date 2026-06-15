"use client";

import { type ReactNode, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { UploadModal } from "./UploadModal";
import { CollectionsManager } from "./CollectionsManager";
import { openPalette, useShortcutLabel } from "./CommandPalette";
import { ParticleWordmark } from "./ParticleWordmark";
import { Reveal } from "./Reveal";
import {
  dropReading,
  readingServerSnapshot,
  readingSnapshot,
  subscribeReading,
} from "@/lib/readingProgress";
import type { DocCollection } from "@/lib/collections";
import type { PageMeta } from "@/app/page";

function Mark({ className = "" }: { className?: string }) {
  return (
    <span
      className={`creta-badge-grad creta-hex grid h-9 w-9 place-items-center ${className}`}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/LogoMice.svg"
        alt="MICE"
        className="h-5 w-5 [filter:brightness(0)_invert(1)]"
      />
    </span>
  );
}

/* Numero dentro un esagono outline: il "bullet" del sistema, rima con il logo.
   Il colore del tratto segue currentColor (lo imposta chi lo usa). */
function HexNumber({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <span className={`relative grid shrink-0 place-items-center ${className}`}>
      <svg
        viewBox="0 0 100 100"
        fill="none"
        stroke="currentColor"
        strokeWidth="5"
        strokeLinejoin="round"
        className="absolute inset-0 h-full w-full"
        aria-hidden
      >
        <path d="M50 3 94 27.5V72.5L50 97 6 72.5V27.5Z" />
      </svg>
      <span className="relative">{children}</span>
    </span>
  );
}

function DeleteButton({
  title,
  loading,
  onClick,
}: {
  title: string;
  loading: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={loading}
      className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-navy-200 bg-white text-navy-500 shadow-sm transition hover:border-red-300 hover:bg-red-50 hover:text-red-700 disabled:cursor-not-allowed disabled:opacity-50"
      aria-label={`Elimina ${title}`}
    >
      {loading ? (
        <span className="h-4 w-4 animate-spin rounded-full border-2 border-navy-300 border-t-transparent" />
      ) : (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
          <path d="M18 6 6 18M6 6l12 12" />
        </svg>
      )}
    </button>
  );
}

/* Stella "metti in evidenza": attiva (piena, oro) sul documento attualmente
   in evidenza — di default l'ultimo caricato, o quello scelto a mano. Cliccare
   un altro documento lo promuove; ricliccare quello in evidenza torna
   all'ultimo caricato. */
function FeatureButton({
  title,
  active,
  onClick,
}: {
  title: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      aria-label={
        active
          ? `${title} è in evidenza — torna all'ultimo caricato`
          : `Metti ${title} in evidenza`
      }
      title={active ? "In evidenza — clicca per ripristinare l'ultimo caricato" : "Metti in evidenza"}
      className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg border shadow-sm transition ${
        active
          ? "border-gold-400 bg-gold-400 text-navy-950"
          : "border-navy-200 bg-white text-navy-400 hover:border-gold-400 hover:bg-gold-50 hover:text-gold-700"
      }`}
    >
      <svg
        viewBox="0 0 24 24"
        fill={active ? "currentColor" : "none"}
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="h-4 w-4"
      >
        <path d="m12 3 2.7 5.5 6 .9-4.35 4.25 1.03 6L12 16.9l-5.38 2.75 1.03-6L3.3 9.4l6-.9z" />
      </svg>
    </button>
  );
}

const PORTAL_SECTIONS = [
  {
    label: "News",
    title: "Aggiornamenti AI",
    text: "Comunicazioni e aggiornamenti sulle iniziative AI in corso: cosa cambia, cosa è attivo, cosa arriva.",
  },
  {
    label: "Guide",
    title: "Procedure interne",
    text: "Linee guida operative, configurazioni e manuali pronti all'uso. Consultabili in qualsiasi momento.",
  },
  {
    label: "Archivio",
    title: "Documenti navigabili",
    text: "Tutti i contenuti sono cercabili per testo, organizzati per sezioni e disponibili senza registrazione.",
  },
];

/* Riga dell'indice documenti, condivisa tra elenco piatto e per rubriche. */
function DocRow({
  page,
  number,
  isFeatured,
  pinned,
  pct,
  deleting,
  onRequestDelete,
  onToggleFeature,
}: {
  page: PageMeta;
  number: number;
  isFeatured: boolean;
  pinned: boolean;
  pct: number;
  deleting: boolean;
  onRequestDelete: () => void;
  onToggleFeature: () => void;
}) {
  return (
    <li className="group relative border-b border-navy-900/10">
      <div className="flex items-start gap-5 py-6 sm:gap-8 sm:py-7">
        <span className="hidden w-12 shrink-0 pt-1 font-mono text-sm font-semibold text-navy-300 transition-colors group-hover:text-gold-600 sm:block">
          {String(number).padStart(2, "0")}
        </span>

        <Link
          href={`/${page.slug}`}
          transitionTypes={["nav-forward"]}
          className="min-w-0 flex-1"
        >
          <p className="font-mono text-[0.62rem] font-semibold uppercase tracking-[0.2em] text-navy-400">
            {page.eyebrow}
          </p>
          <h3
            className={`mt-2 max-w-3xl font-display font-bold leading-tight text-navy-950 transition-colors group-hover:text-navy-700 ${
              isFeatured ? "text-3xl sm:text-4xl" : "text-xl sm:text-2xl"
            }`}
            style={{ viewTransitionName: `doc-title-${page.slug}` }}
          >
            {page.title}
          </h3>
          {page.summary && (
            <p
              className={`mt-2.5 max-w-2xl text-sm leading-7 text-navy-500 ${
                isFeatured ? "line-clamp-3 sm:text-[0.95rem]" : "line-clamp-2"
              }`}
            >
              {page.summary}
            </p>
          )}
          <p className="mt-3.5 flex flex-wrap items-center gap-x-2.5 gap-y-1 font-mono text-[0.68rem] font-medium uppercase tracking-wide text-navy-400">
            <span>{page.sectionCount} sezioni</span>
            <span className="h-0.5 w-0.5 rounded-full bg-navy-300" />
            <span>{page.readingMinutes} min</span>
            {page.displayDate && (
              <>
                <span className="h-0.5 w-0.5 rounded-full bg-navy-300" />
                <span>{page.displayDate}</span>
              </>
            )}
            {pct >= 0.97 ? (
              <span className="flex items-center gap-1 text-emerald-700">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" className="h-3 w-3">
                  <path d="m5 12.5 4 4 10-10" />
                </svg>
                Letto
              </span>
            ) : pct > 0.03 ? (
              <span className="text-gold-700">{Math.round(pct * 100)}% letto</span>
            ) : null}
          </p>
        </Link>

        <div className="flex shrink-0 items-center gap-3 self-center">
          <FeatureButton
            title={page.title}
            active={pinned}
            onClick={onToggleFeature}
          />
          <DeleteButton
            title={page.title}
            loading={deleting}
            onClick={onRequestDelete}
          />
          <span className="hidden h-10 w-10 place-items-center rounded-full border border-navy-300 bg-white text-navy-600 shadow-sm transition group-hover:border-gold-400 group-hover:bg-gold-400 group-hover:text-navy-950 sm:grid">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 transition-transform group-hover:translate-x-0.5">
              <path d="M5 12h14M12 5l7 7-7 7" />
            </svg>
          </span>
        </div>
      </div>

      {/* Barra sottile del progresso di lettura */}
      {pct > 0.03 && pct < 0.97 && (
        <span
          className="absolute bottom-[-1px] left-0 h-px bg-gold-500"
          style={{ width: `${Math.round(pct * 100)}%` }}
        />
      )}
    </li>
  );
}

/* Copertina dell'archivio: il documento di apertura reso come "cover story"
   editoriale — sobria, ma distinta dall'indice. Compare solo nell'elenco
   piatto non filtrato; con le rubriche attive la struttura sono i gruppi. */
function FeaturedCard({
  page,
  pct,
  deleting,
  onRequestDelete,
  onToggleFeature,
}: {
  page: PageMeta;
  pct: number;
  deleting: boolean;
  onRequestDelete: () => void;
  onToggleFeature: () => void;
}) {
  return (
    <div className="group relative mt-7 overflow-hidden rounded-3xl border border-navy-900/10 bg-white transition hover:shadow-xl hover:shadow-navy-950/5">
      {/* Filo d'oro: la firma editoriale, niente di più */}
      <span className="creta-rule absolute inset-x-0 top-0 h-0.5" />

      <div className="absolute right-5 top-5 z-10 flex items-center gap-2.5 sm:right-6 sm:top-6">
        <FeatureButton title={page.title} active onClick={onToggleFeature} />
        <DeleteButton title={page.title} loading={deleting} onClick={onRequestDelete} />
      </div>

      <Link
        href={`/${page.slug}`}
        transitionTypes={["nav-forward"]}
        className="grid gap-6 px-7 py-9 sm:grid-cols-[auto_1fr] sm:gap-10 sm:px-10 sm:py-11"
      >
        <span className="creta-stat-grad font-display text-6xl font-bold leading-none sm:text-7xl">
          01
        </span>

        <div className="min-w-0">
          <p className="font-mono text-[0.62rem] font-semibold uppercase tracking-[0.25em] text-gold-600">
            In evidenza
            {page.eyebrow && (
              <span className="ml-3 font-medium text-navy-400">{page.eyebrow}</span>
            )}
          </p>

          <h3
            className="mt-4 max-w-3xl font-display text-4xl font-bold leading-[1.05] text-navy-950 transition-colors group-hover:text-navy-700 sm:text-5xl"
            style={{ viewTransitionName: `doc-title-${page.slug}` }}
          >
            {page.title}
          </h3>

          {page.summary && (
            <p className="mt-4 max-w-2xl text-[0.95rem] leading-7 text-navy-500 line-clamp-3">
              {page.summary}
            </p>
          )}

          <div className="mt-7 flex flex-wrap items-center gap-x-5 gap-y-3">
            <span className="flex items-center gap-2 rounded-full bg-navy-950 px-5 py-2.5 text-sm font-semibold text-white transition group-hover:bg-navy-800">
              Apri il documento
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 transition-transform group-hover:translate-x-0.5">
                <path d="M5 12h14M12 5l7 7-7 7" />
              </svg>
            </span>
            <span className="flex flex-wrap items-center gap-x-2.5 gap-y-1 font-mono text-[0.68rem] font-medium uppercase tracking-wide text-navy-400">
              <span>{page.sectionCount} sezioni</span>
              <span className="h-0.5 w-0.5 rounded-full bg-navy-300" />
              <span>{page.readingMinutes} min</span>
              {page.displayDate && (
                <>
                  <span className="h-0.5 w-0.5 rounded-full bg-navy-300" />
                  <span>{page.displayDate}</span>
                </>
              )}
              {pct >= 0.97 ? (
                <span className="flex items-center gap-1 text-emerald-700">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" className="h-3 w-3">
                    <path d="m5 12.5 4 4 10-10" />
                  </svg>
                  Letto
                </span>
              ) : pct > 0.03 ? (
                <span className="text-gold-700">{Math.round(pct * 100)}% letto</span>
              ) : null}
            </span>
          </div>
        </div>
      </Link>

      {/* Barra sottile del progresso di lettura, come nelle righe dell'indice */}
      {pct > 0.03 && pct < 0.97 && (
        <span
          className="absolute bottom-0 left-0 h-px bg-gold-500"
          style={{ width: `${Math.round(pct * 100)}%` }}
        />
      )}
    </div>
  );
}

/* Pill di rubrica nella navbar: apre un menu coi propri documenti (i
   sottocapitoli). Una sola pill aperta per volta, gestita dal padre. */
function CollectionPill({
  collection,
  docs,
  open,
  onToggle,
  onClose,
  onManage,
}: {
  collection: DocCollection;
  docs: PageMeta[];
  open: boolean;
  onToggle: () => void;
  onClose: () => void;
  onManage: () => void;
}) {
  return (
    <div className="relative shrink-0">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className={`flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium backdrop-blur transition ${
          open
            ? "border-white/60 bg-white/10 text-white"
            : "border-white/20 bg-white/5 text-white/80 hover:border-white/60 hover:text-white"
        }`}
      >
        <span className="max-w-[11rem] truncate">{collection.title}</span>
        <span className="font-mono text-[0.65rem] font-semibold text-gold-300">
          {docs.length}
        </span>
        <svg
          viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"
          className={`h-3 w-3 transition-transform ${open ? "rotate-180" : ""}`}
        >
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>
      {open && (
        <>
          <button
            type="button"
            aria-hidden
            tabIndex={-1}
            onClick={onClose}
            className="fixed inset-0 z-40 cursor-default"
          />
          <div className="absolute left-1/2 top-full z-50 mt-3 w-[min(20rem,calc(100vw-2rem))] -translate-x-1/2 rounded-2xl border border-navy-900/10 bg-white p-2 text-navy-900 shadow-2xl shadow-navy-950/40">
            <div className="flex items-center justify-between gap-2 px-2.5 pb-1.5 pt-1">
              <p className="min-w-0 truncate font-display text-base font-bold text-navy-950">
                {collection.title}
              </p>
              <a
                href={`#rubrica-${collection.id}`}
                onClick={onClose}
                className="shrink-0 font-mono text-[0.6rem] font-semibold uppercase tracking-wide text-gold-600 transition hover:text-gold-700"
              >
                Apri ↓
              </a>
            </div>
            <div className="border-t border-navy-900/10 pt-1">
              {docs.length > 0 ? (
                docs.map((doc) => (
                  <Link
                    key={doc.slug}
                    href={`/${doc.slug}`}
                    onClick={onClose}
                    transitionTypes={["nav-forward"]}
                    className="block truncate rounded-lg px-2.5 py-2 text-sm text-navy-600 transition hover:bg-surface hover:text-navy-950"
                  >
                    {doc.title}
                  </Link>
                ))
              ) : (
                <p className="px-2.5 py-2 text-sm text-navy-400">
                  Rubrica vuota
                </p>
              )}
            </div>
            <div className="mt-1 border-t border-navy-900/10 pt-1">
              <button
                type="button"
                onClick={onManage}
                className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-sm font-semibold text-navy-700 transition hover:bg-surface hover:text-gold-700"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5 text-gold-600">
                  <path d="M12 5v14M5 12h14" />
                </svg>
                Aggiungi o togli capitoli
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export function HomeClient({
  pages,
  collections: initialCollections,
  featured,
}: {
  pages: PageMeta[];
  collections: DocCollection[];
  featured: string | null;
}) {
  const router = useRouter();
  const shortcut = useShortcutLabel();
  const [modalOpen, setModalOpen] = useState(false);
  const [managerOpen, setManagerOpen] = useState(false);
  const [managerFocus, setManagerFocus] = useState<string | null>(null);
  const [openCol, setOpenCol] = useState<string | null>(null);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  function openManager(focusId: string | null = null) {
    setManagerFocus(focusId);
    setOpenCol(null);
    setMobileNavOpen(false);
    setManagerOpen(true);
  }
  const [documents, setDocuments] = useState(pages);
  const [collections, setCollections] = useState(initialCollections);
  const [featuredSlug, setFeaturedSlug] = useState<string | null>(featured);
  const [deletingSlug, setDeletingSlug] = useState<string | null>(null);
  const [deleteRequest, setDeleteRequest] = useState<{
    slug: string;
    title: string;
    error?: string;
  } | null>(null);
  const [query, setQuery] = useState("");

  /* Il progresso di lettura vive in localStorage; sullo snapshot server e' vuoto. */
  const progress = useSyncExternalStore(
    subscribeReading,
    readingSnapshot,
    readingServerSnapshot
  );

  /* Documento in evidenza: la scelta manuale se punta ancora a un documento
     esistente, altrimenti l'ultimo caricato (documents è ordinato per mtime
     desc). La lista piatta lo porta in testa, così la "cover story" e la
     numerazione dell'indice restano coerenti. */
  const currentFeatured =
    featuredSlug && documents.some((doc) => doc.slug === featuredSlug)
      ? featuredSlug
      : documents[0]?.slug ?? null;
  const ordered =
    currentFeatured && documents[0]?.slug !== currentFeatured
      ? [
          ...documents.filter((doc) => doc.slug === currentFeatured),
          ...documents.filter((doc) => doc.slug !== currentFeatured),
        ]
      : documents;

  const needle = query.trim().toLowerCase();
  const filtered = needle
    ? ordered.filter(
        (page) =>
          page.title.toLowerCase().includes(needle) ||
          page.summary.toLowerCase().includes(needle) ||
          page.eyebrow.toLowerCase().includes(needle) ||
          page.slug.includes(needle)
      )
    : ordered;

  async function toggleFeatured(slug: string) {
    const next = slug === currentFeatured ? null : slug;
    const previous = featuredSlug;
    setFeaturedSlug(next); // ottimistico: la home reagisce subito
    try {
      const res = await fetch("/api/featured", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug: next }),
      });
      if (!res.ok) throw new Error("save failed");
    } catch {
      setFeaturedSlug(previous); // rollback se il salvataggio non riesce
    }
  }

  /* Archivio per rubriche: ogni voce raccoglie i propri documenti (ordinati
     come l'archivio, dal piu' recente), gli slug orfani sono ignorati e cio'
     che resta finisce in coda sotto "Fuori rubrica". Col filtro attivo si
     torna all'elenco piatto: i risultati non vanno frammentati. */
  const bySlug = new Map(documents.map((doc) => [doc.slug, doc]));
  const groups: { id: string; title: string; inRubrica: boolean; docs: PageMeta[] }[] = [];
  if (!needle && collections.length > 0) {
    for (const collection of collections) {
      const docs = collection.slugs
        .map((slug) => bySlug.get(slug))
        .filter((doc): doc is PageMeta => Boolean(doc))
        .sort((a, b) => b.mtime - a.mtime);
      if (docs.length > 0) {
        groups.push({ id: collection.id, title: collection.title, inRubrica: true, docs });
      }
    }
    if (groups.length > 0) {
      const assigned = new Set(collections.flatMap((c) => c.slugs));
      const rest = documents.filter((doc) => !assigned.has(doc.slug));
      if (rest.length > 0) {
        groups.push({ id: "fuori-rubrica", title: "Fuori rubrica", inRubrica: false, docs: rest });
      }
    }
  }

  /* Numerazione continua tra i gruppi, per mantenere l'indice editoriale. */
  let rowNumber = 0;
  const numberedGroups = groups.map((group) => ({
    ...group,
    rows: group.docs.map((doc) => ({ doc, number: ++rowNumber })),
  }));

  /* Documenti (sottocapitoli) di una rubrica, dal piu' recente. */
  function collectionDocs(collection: DocCollection) {
    return collection.slugs
      .map((slug) => bySlug.get(slug))
      .filter((doc): doc is PageMeta => Boolean(doc))
      .sort((a, b) => b.mtime - a.mtime);
  }

  function requestDeleteDocument(slug: string, title: string) {
    setDeleteRequest({ slug, title });
  }

  function handleCollectionsSaved(next: DocCollection[]) {
    setCollections(next);
    setManagerOpen(false);
    router.refresh();
  }

  async function deleteDocument() {
    if (!deleteRequest) return;

    const { slug } = deleteRequest;
    setDeletingSlug(slug);
    try {
      const res = await fetch(`/api/documents/${slug}`, { method: "DELETE" });
      if (!res.ok) {
        const json = (await res.json().catch(() => null)) as { error?: string } | null;
        setDeleteRequest((current) =>
          current?.slug === slug
            ? { ...current, error: json?.error ?? "Eliminazione non riuscita." }
            : current
        );
        return;
      }
      setDocuments((current) => current.filter((page) => page.slug !== slug));
      dropReading(slug);
      setDeleteRequest(null);
      router.refresh();
    } catch {
      setDeleteRequest((current) =>
        current?.slug === slug ? { ...current, error: "Errore di rete. Riprova." } : current
      );
    } finally {
      setDeletingSlug(null);
    }
  }

  function renderRows(rows: { doc: PageMeta; number: number }[]) {
    return rows.map(({ doc, number }) => (
      <DocRow
        key={doc.slug}
        page={doc}
        number={number}
        isFeatured={number === 1 && !needle}
        pinned={doc.slug === currentFeatured}
        pct={progress[doc.slug]?.pct ?? 0}
        deleting={deletingSlug === doc.slug}
        onRequestDelete={() => requestDeleteDocument(doc.slug, doc.title)}
        onToggleFeature={() => void toggleFeatured(doc.slug)}
      />
    ));
  }

  return (
    <div className="min-h-screen bg-surface text-navy-900">
      {/* ── Hero a schermo intero ─────────────────────────────── */}
      <section className="creta-hero-bg relative flex min-h-[100svh] flex-col overflow-hidden text-white">
        {/* Logo MICE composto da particelle: qui il segnale principale e'
            l'azienda, mentre Creta resta la tecnologia che alimenta il portale. */}
        <div className="pointer-events-none absolute inset-y-0 right-0 hidden w-[58%] md:block">
          <ParticleWordmark className="h-full w-full opacity-100" />
        </div>

        {/* Navigazione principale */}
        <header className="relative z-30 grid grid-cols-[1fr_auto_1fr] items-center gap-3 px-5 py-5 sm:px-10">
          <Link href="/" className="flex items-center gap-2.5">
            <Mark />
            <span className="font-display text-lg font-bold tracking-tight">MICE AI Hub</span>
          </Link>

          <div className="relative z-40 min-w-0 justify-self-center">
            <nav
              aria-label="Rubriche"
              className="hidden min-w-0 max-w-[min(56rem,60vw)] items-center gap-1.5 sm:flex"
            >
              {collections.length === 0 ? (
                <button
                  type="button"
                  onClick={() => openManager()}
                  className="flex items-center gap-2 rounded-full border border-white/20 bg-white/5 px-4 py-2 text-sm font-medium text-white/80 backdrop-blur transition hover:border-white/60 hover:text-white"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5 text-gold-300">
                    <path d="M12 5v14M5 12h14" />
                  </svg>
                  Crea una rubrica
                </button>
              ) : (
                <>
                  {collections.map((collection) => (
                    <CollectionPill
                      key={collection.id}
                      collection={collection}
                      docs={collectionDocs(collection)}
                      open={openCol === collection.id}
                      onToggle={() =>
                        setOpenCol((cur) =>
                          cur === collection.id ? null : collection.id
                        )
                      }
                      onClose={() => setOpenCol(null)}
                      onManage={() => openManager(collection.id)}
                    />
                  ))}
                  <button
                    type="button"
                    onClick={() => openManager()}
                    aria-label="Gestisci rubriche"
                    title="Gestisci rubriche"
                    className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-white/20 bg-white/5 text-white/70 backdrop-blur transition hover:border-white/60 hover:text-white"
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
                      <path d="M12 5v14M5 12h14" />
                    </svg>
                  </button>
                </>
              )}
            </nav>

            {/* Sotto sm le pill non entrano: un'unica voce "Rubriche" apre il
                menu con le stesse destinazioni (ancore dell'archivio + gestione).
                Senza rubriche resta l'invito a crearne una, come su desktop. */}
            <div className="sm:hidden">
              {collections.length === 0 ? (
                <button
                  type="button"
                  onClick={() => openManager()}
                  className="flex items-center gap-2 rounded-full border border-white/20 bg-white/5 px-4 py-2 text-sm font-medium text-white/80 backdrop-blur transition hover:border-white/60 hover:text-white"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5 text-gold-300">
                    <path d="M12 5v14M5 12h14" />
                  </svg>
                  Crea una rubrica
                </button>
              ) : (
                <>
                <button
                  type="button"
                  onClick={() => setMobileNavOpen((cur) => !cur)}
                  aria-expanded={mobileNavOpen}
                  className={`flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium backdrop-blur transition ${
                    mobileNavOpen
                      ? "border-white/60 bg-white/10 text-white"
                      : "border-white/20 bg-white/5 text-white/80"
                  }`}
                >
                  Rubriche
                  <span className="font-mono text-[0.65rem] font-semibold text-gold-300">
                    {collections.length}
                  </span>
                  <svg
                    viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"
                    className={`h-3 w-3 transition-transform ${mobileNavOpen ? "rotate-180" : ""}`}
                  >
                    <path d="m6 9 6 6 6-6" />
                  </svg>
                </button>
                {mobileNavOpen && (
                  <>
                    <button
                      type="button"
                      aria-hidden
                      tabIndex={-1}
                      onClick={() => setMobileNavOpen(false)}
                      className="fixed inset-0 z-40 cursor-default"
                    />
                    <div className="absolute left-1/2 top-full z-50 mt-3 w-[min(20rem,calc(100vw-2rem))] -translate-x-1/2 rounded-2xl border border-navy-900/10 bg-white p-2 text-navy-900 shadow-2xl shadow-navy-950/40">
                      {collections.map((collection) => {
                        const count = collectionDocs(collection).length;
                        return count > 0 ? (
                          <a
                            key={collection.id}
                            href={`#rubrica-${collection.id}`}
                            onClick={() => setMobileNavOpen(false)}
                            className="flex items-center justify-between gap-2 rounded-lg px-2.5 py-2 text-sm text-navy-600 transition hover:bg-surface hover:text-navy-950"
                          >
                            <span className="min-w-0 truncate">{collection.title}</span>
                            <span className="shrink-0 font-mono text-[0.65rem] font-semibold text-gold-600">
                              {count}
                            </span>
                          </a>
                        ) : (
                          <button
                            key={collection.id}
                            type="button"
                            onClick={() => openManager(collection.id)}
                            className="flex w-full items-center justify-between gap-2 rounded-lg px-2.5 py-2 text-sm text-navy-400 transition hover:bg-surface hover:text-navy-950"
                          >
                            <span className="min-w-0 truncate">{collection.title}</span>
                            <span className="shrink-0 font-mono text-[0.6rem] uppercase">vuota</span>
                          </button>
                        );
                      })}
                      <div className="mt-1 border-t border-navy-900/10 pt-1">
                        <button
                          type="button"
                          onClick={() => openManager()}
                          className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-sm font-semibold text-navy-700 transition hover:bg-surface hover:text-gold-700"
                        >
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5 text-gold-600">
                            <path d="M12 5v14M5 12h14" />
                          </svg>
                          Gestisci rubriche
                        </button>
                      </div>
                    </div>
                  </>
                )}
                </>
              )}
            </div>
          </div>

          <div className="flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={openPalette}
              className="flex items-center gap-2 rounded-full border border-white/20 px-3.5 py-2 text-sm font-medium text-white/80 transition hover:border-white/60 hover:text-white"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5">
                <circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" />
              </svg>
              <span className="hidden sm:block">Cerca</span>
              <kbd className="hidden font-mono text-[0.65rem] font-semibold text-white/50 sm:block">{shortcut}</kbd>
            </button>
          </div>
        </header>

        {/* Titolo e azioni principali */}
        <div className="relative z-10 mx-auto flex w-full max-w-[88rem] flex-1 flex-col justify-center px-5 py-10 sm:px-10">
          <div className="max-w-3xl">
            <Reveal as="p" delay={0} className="flex items-center gap-4 font-mono text-[0.68rem] font-semibold uppercase tracking-[0.3em] text-gold-400">
              <span className="h-px w-10 bg-gold-400/60" />
              Documentazione interna MICE
            </Reveal>

            <Reveal as="h1" delay={80} className="mt-7 max-w-4xl font-display text-[clamp(2.8rem,8vw,5.8rem)] font-bold leading-[0.95] tracking-tight">
              Base di conoscenza
              <br />
              interna{" "}
              <em className="creta-gradient-text font-semibold italic">MICE</em>.
            </Reveal>

            <Reveal as="p" delay={160} className="mt-8 max-w-2xl text-[1.02rem] leading-8 text-white/68">
              Procedure, guide operative e aggiornamenti AI in un unico posto.
              Cerca per testo, naviga per sezioni, riprendi da dove hai lasciato.
            </Reveal>

            <Reveal delay={240} className="mt-9 grid gap-3 sm:max-w-2xl sm:grid-cols-3">
              <button
                onClick={() => setModalOpen(true)}
                className="flex items-center justify-center gap-2 rounded-2xl bg-gold-400 px-5 py-4 text-sm font-semibold text-navy-950 transition hover:-translate-y-0.5 hover:bg-gold-300"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
                  <path d="M12 5v14M5 12h14" />
                </svg>
                Carica
              </button>
              <Link
                href="/scrivi"
                className="flex items-center justify-center gap-2 rounded-2xl border border-white/20 bg-white/6 px-5 py-4 text-sm font-medium text-white transition hover:border-white/55 hover:bg-white/10"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
                  <path d="M12 20h9" /><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
                </svg>
                Scrivi
              </Link>
              <Link
                href="/componi"
                className="flex items-center justify-center gap-2 rounded-2xl border border-white/20 bg-white/6 px-5 py-4 text-sm font-medium text-white transition hover:border-white/55 hover:bg-white/10"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
                  <path d="M4 7h16M4 12h10M4 17h16" />
                </svg>
                Componi
              </Link>
            </Reveal>

            <Reveal delay={320} className="mt-5 flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={openPalette}
                className="flex items-center gap-2 rounded-full border border-white/15 px-4 py-2 text-sm font-medium text-white/75 transition hover:border-white/45 hover:text-white"
              >
                Cerca nell&apos;hub
                <kbd className="font-mono text-[0.65rem] text-white/45">{shortcut}</kbd>
              </button>
              <Link
                href="/cos-e-creta"
                className="rounded-full border border-white/15 px-4 py-2 text-sm font-medium text-white/75 transition hover:border-white/45 hover:text-white"
              >
                Cos&apos;è Creta
              </Link>
            </Reveal>
          </div>
        </div>

      </section>

      {/* ── Orientamento portale ─────────────────────────────── */}
      <section className="border-b border-navy-900/10 bg-white">
        <div className="mx-auto grid max-w-[88rem] gap-10 px-5 py-14 sm:px-10 lg:grid-cols-[16rem_1fr] lg:gap-16">
          <div>
            <p className="font-mono text-[0.65rem] font-semibold uppercase tracking-[0.25em] text-navy-400">
              Dentro il portale
            </p>
            <h2 className="mt-3 font-display text-3xl font-bold leading-tight">
              Cosa trovi
              <br />
              <em className="italic text-gold-600">nel portale.</em>
            </h2>
            <p className="mt-4 text-sm leading-7 text-navy-500">
              Il contenuto è aziendale. Creta gestisce la struttura, la
              navigazione e la ricerca.
            </p>
          </div>
          <ol className="grid gap-8 sm:grid-cols-3 sm:gap-0 sm:divide-x sm:divide-navy-900/10">
            {PORTAL_SECTIONS.map((step, index) => (
              <li key={step.title} className="sm:px-7 sm:first:pl-0 sm:last:pr-0">
                <p className="flex items-center gap-2.5 font-mono text-[0.7rem] font-semibold">
                  <HexNumber className="h-8 w-8 text-gold-400">
                    <span className="text-[0.62rem] text-gold-700">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                  </HexNumber>
                  <span className="font-medium uppercase tracking-[0.2em] text-navy-400">
                    {step.label}
                  </span>
                </p>
                <p className="mt-3 font-display text-lg font-bold text-navy-950">
                  {step.title}
                </p>
                <p className="mt-2 text-sm leading-7 text-navy-600">{step.text}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* ── Archivio ─────────────────────────────────────────── */}
      <section id="archivio" className="mx-auto w-full max-w-[88rem] scroll-mt-6 px-5 py-14 sm:px-10">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="font-mono text-[0.65rem] font-semibold uppercase tracking-[0.25em] text-navy-400">
              Documenti e aggiornamenti · {documents.length}{" "}
              {documents.length === 1 ? "documento" : "documenti"}
            </p>
            <h2 className="mt-2 font-display text-4xl font-bold">Archivio AI MICE</h2>
          </div>
          <div className="flex w-full flex-col gap-2.5 sm:w-auto sm:flex-row sm:items-center">
            <div className="relative w-full sm:w-80">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-navy-400">
                <circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" />
              </svg>
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Filtra l'indice…"
                className="w-full rounded-full border border-navy-900/15 bg-white py-3 pl-11 pr-4 text-sm text-navy-900 placeholder:text-navy-400 outline-none transition focus:border-gold-500"
              />
            </div>
            <button
              type="button"
              onClick={() => openManager()}
              className="flex shrink-0 items-center justify-center gap-2 rounded-full border border-navy-900/15 bg-white px-5 py-3 text-sm font-medium text-navy-700 transition hover:border-gold-500 hover:text-gold-700"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5">
                <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
              </svg>
              Organizza
            </button>
          </div>
        </div>

        {/* Rail delle rubriche: salto rapido ai gruppi dell'archivio. */}
        {numberedGroups.length > 0 && (
          <nav className="mt-8 flex flex-wrap items-center gap-2" aria-label="Rubriche">
            {numberedGroups.map((group, index) => (
              <a
                key={group.id}
                href={`#rubrica-${group.id}`}
                className="flex items-center gap-2 rounded-full border border-navy-900/15 bg-white py-2 pl-2 pr-4 font-mono text-[0.65rem] font-semibold uppercase tracking-[0.15em] text-navy-600 transition hover:border-gold-500 hover:text-gold-700"
              >
                <HexNumber className="h-5 w-5 text-gold-400">
                  <span className="text-[0.55rem] text-gold-700">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                </HexNumber>
                {group.title}
                <span className="text-navy-300">{group.docs.length}</span>
              </a>
            ))}
          </nav>
        )}

        {/* Indice dei documenti */}
        {documents.length === 0 ? (
          <div className="mt-7 rounded-2xl border border-dashed border-navy-900/20 bg-white px-6 py-20 text-center">
            <Mark className="mx-auto" />
            <h3 className="mt-5 font-display text-3xl font-bold">L&apos;archivio è vuoto.</h3>
            <p className="mx-auto mt-3 max-w-sm text-sm leading-7 text-navy-500">
              Carica il primo .docx: diventera una pagina interna MICE,
              navigabile e pronta da condividere.
            </p>
            <button
              onClick={() => setModalOpen(true)}
              className="mt-7 rounded-full bg-navy-950 px-6 py-3 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:bg-navy-800"
            >
              + Aggiungi documento
            </button>
          </div>
        ) : filtered.length === 0 ? (
          <p className="mt-7 rounded-2xl border border-dashed border-navy-900/20 bg-white px-5 py-14 text-center text-navy-500">
            Nessun documento corrisponde a &ldquo;{query}&rdquo;. Prova{" "}
            <button onClick={openPalette} className="font-semibold text-navy-900 underline decoration-gold-400 underline-offset-4">
              la ricerca full-text {shortcut}
            </button>
            , che guarda anche dentro le sezioni.
          </p>
        ) : numberedGroups.length > 0 ? (
          numberedGroups.map((group, index) => (
            <div key={group.id} id={`rubrica-${group.id}`} className="scroll-mt-10">
              <div className="mt-12 flex items-baseline gap-4 first:mt-7">
                <p className="font-mono text-[0.65rem] font-semibold uppercase tracking-[0.25em] text-gold-600">
                  {group.inRubrica ? `Rubrica ${String(index + 1).padStart(2, "0")}` : "In coda"}
                </p>
                <h3 className="font-display text-2xl font-bold text-navy-950">
                  {group.title}
                </h3>
                <span className="font-mono text-[0.68rem] font-medium uppercase tracking-wide text-navy-400">
                  {group.docs.length} {group.docs.length === 1 ? "documento" : "documenti"}
                </span>
              </div>
              <ul className="mt-4 border-t-2 border-gold-500/70">
                {renderRows(group.rows)}
              </ul>
            </div>
          ))
        ) : !needle ? (
          <>
            <FeaturedCard
              page={filtered[0]}
              pct={progress[filtered[0].slug]?.pct ?? 0}
              deleting={deletingSlug === filtered[0].slug}
              onRequestDelete={() =>
                requestDeleteDocument(filtered[0].slug, filtered[0].title)
              }
              onToggleFeature={() => void toggleFeatured(filtered[0].slug)}
            />
            {filtered.length > 1 && (
              <ul className="mt-4 border-t border-navy-900/10">
                {renderRows(
                  filtered.slice(1).map((doc, index) => ({ doc, number: index + 2 }))
                )}
              </ul>
            )}
          </>
        ) : (
          <ul className="mt-7 border-t border-navy-900/10">
            {renderRows(filtered.map((doc, index) => ({ doc, number: index + 1 })))}
          </ul>
        )}
      </section>

      {/* ── Piè di pagina ────────────────────────────────────── */}
      <footer className="bg-navy-950 text-white">
        <div className="mx-auto flex max-w-[88rem] flex-col gap-3 px-5 py-10 sm:flex-row sm:items-center sm:justify-between sm:px-10">
          <p className="flex items-center gap-3 text-sm text-white/50">
            <span className="creta-badge-grad creta-hex grid h-7 w-7 place-items-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/LogoMice.svg"
                alt="MICE"
                className="h-4 w-4 [filter:brightness(0)_invert(1)]"
              />
            </span>
            MICE AI Hub — portale interno realizzato con Creta.
          </p>
          <button
            onClick={openPalette}
            className="flex items-center gap-2 self-start font-mono text-[0.68rem] font-semibold uppercase tracking-[0.2em] text-white/40 transition hover:text-gold-300 sm:self-auto"
          >
            Cerca ovunque
            <kbd className="rounded border border-white/20 px-1.5 py-0.5">{shortcut}</kbd>
          </button>
        </div>
      </footer>

      {modalOpen && <UploadModal onClose={() => setModalOpen(false)} />}
      {managerOpen && (
        <CollectionsManager
          documents={documents}
          collections={collections}
          initialOpenId={managerFocus}
          onClose={() => setManagerOpen(false)}
          onSaved={handleCollectionsSaved}
        />
      )}
      {deleteRequest && (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-navy-950/55 px-4 py-6 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-document-title"
        >
          <div className="w-full max-w-md rounded-2xl border border-white/70 bg-white p-5 shadow-2xl shadow-navy-950/20">
            <div className="flex items-start gap-4">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-red-50 text-red-700">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
                  <path d="M18 6 6 18M6 6l12 12" />
                </svg>
              </span>
              <div className="min-w-0">
                <p className="font-mono text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-red-700">
                  Eliminazione definitiva
                </p>
                <h2 id="delete-document-title" className="mt-1 font-display text-2xl font-bold leading-tight text-navy-950">
                  Eliminare questo documento?
                </h2>
                <p className="mt-3 text-sm leading-6 text-navy-500">
                  Stai per eliminare <span className="font-semibold text-navy-900">&ldquo;{deleteRequest.title}&rdquo;</span>. Il documento sparirà dalla libreria e non sarà più disponibile alla lettura.
                </p>
              </div>
            </div>

            {deleteRequest.error && (
              <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-3.5 py-3 text-sm font-medium text-red-800">
                {deleteRequest.error}
              </div>
            )}

            <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => setDeleteRequest(null)}
                disabled={deletingSlug === deleteRequest.slug}
                className="rounded-full border border-navy-200 px-4 py-2.5 text-sm font-semibold text-navy-700 transition hover:border-navy-300 hover:bg-navy-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Annulla
              </button>
              <button
                type="button"
                onClick={() => void deleteDocument()}
                disabled={deletingSlug === deleteRequest.slug}
                className="inline-flex items-center justify-center gap-2 rounded-full bg-red-700 px-4 py-2.5 text-sm font-semibold text-white shadow-sm shadow-red-900/20 transition hover:bg-red-800 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {deletingSlug === deleteRequest.slug && (
                  <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/70 border-t-transparent" />
                )}
                Elimina
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
