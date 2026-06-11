"use client";

import { useMemo, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { UploadModal } from "./UploadModal";
import { openPalette } from "./CommandPalette";
import { ParticleWordmark } from "./ParticleWordmark";
import {
  dropReading,
  readingServerSnapshot,
  readingSnapshot,
  subscribeReading,
} from "@/lib/readingProgress";
import type { PageMeta } from "@/app/page";

/* The 13 typed blocks a document can be mapped onto — shown in the hero
   marquee as a plain statement of what the engine actually does. */
const BLOCK_TYPES = [
  "paragraph", "callout", "steps", "timeline", "table", "code", "cards",
  "feature", "stats", "checklist", "list", "quote", "accordion",
];

function Mark({ className = "" }: { className?: string }) {
  return (
    <span
      className={`creta-badge-grad grid h-9 w-9 place-items-center rounded-xl text-sm font-black text-white shadow-sm shadow-navy-900/20 ${className}`}
    >
      C
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
      className="grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-navy-100 bg-white text-navy-300 transition hover:border-red-200 hover:bg-red-50 hover:text-red-700 disabled:cursor-not-allowed disabled:opacity-50"
      aria-label={`Elimina ${title}`}
    >
      {loading ? (
        <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-navy-300 border-t-transparent" />
      ) : (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5">
          <path d="M18 6 6 18M6 6l12 12" />
        </svg>
      )}
    </button>
  );
}

/* I tre passaggi raccontati con la metafora che dà il nome al progetto:
   il documento è argilla — la materia non si tocca, si modella la forma. */
const HOW_IT_WORKS = [
  {
    metaphor: "L'argilla",
    title: "Carica un .docx",
    text: "Un file Word qualsiasi: è la materia prima. La struttura semantica viene estratta capitolo per capitolo, senza template da preparare.",
  },
  {
    metaphor: "Il tornio",
    title: "Mappato, mai riscritto",
    text: "Ogni capitolo prende forma su blocchi tipizzati pre-approvati. La materia resta verbatim: parola per parola quella d'origine.",
  },
  {
    metaphor: "La cottura",
    title: "Una pagina, per sempre",
    text: "Il risultato è un JSON versionato, servito in modo deterministico a ogni visita: come argilla cotta, la forma non cambia più. Nessuna AI a runtime.",
  },
];

export function HomeClient({ pages }: { pages: PageMeta[] }) {
  const router = useRouter();
  const [modalOpen, setModalOpen] = useState(false);
  const [documents, setDocuments] = useState(pages);
  const [deletingSlug, setDeletingSlug] = useState<string | null>(null);
  const [deleteRequest, setDeleteRequest] = useState<{
    slug: string;
    title: string;
    error?: string;
  } | null>(null);
  const [query, setQuery] = useState("");

  /* reading progress lives in localStorage; empty on the server snapshot */
  const progress = useSyncExternalStore(
    subscribeReading,
    readingSnapshot,
    readingServerSnapshot
  );

  const needle = query.trim().toLowerCase();
  const filtered = needle
    ? documents.filter(
        (page) =>
          page.title.toLowerCase().includes(needle) ||
          page.summary.toLowerCase().includes(needle) ||
          page.eyebrow.toLowerCase().includes(needle) ||
          page.slug.includes(needle)
      )
    : documents;

  const stats = useMemo(() => {
    const sectionTotal = documents.reduce((sum, page) => sum + page.sectionCount, 0);
    const minutesTotal = documents.reduce((sum, page) => sum + page.readingMinutes, 0);
    return { sectionTotal, minutesTotal };
  }, [documents]);

  function requestDeleteDocument(slug: string, title: string) {
    setDeleteRequest({ slug, title });
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

  return (
    <div className="min-h-screen bg-surface text-navy-900">
      {/* ── Hero — full screen ───────────────────────────────── */}
      <section className="creta-hero-bg relative flex min-h-[100svh] flex-col overflow-hidden text-white">
        <div className="creta-grain pointer-events-none absolute inset-0 opacity-[0.05]" />

        {/* sciame di particelle: la stessa materia si ricompone in MICE, poi
            in Creta — la metafora del motore, in movimento */}
        <div className="pointer-events-none absolute inset-y-0 right-0 hidden w-[58%] md:block">
          <ParticleWordmark className="h-full w-full opacity-100" />
        </div>

        {/* nav */}
        <header className="relative z-10 flex items-center justify-between gap-3 px-5 py-5 sm:px-10">
          <Link href="/" className="flex items-center gap-2.5">
            <Mark />
            <span className="font-display text-lg font-bold tracking-tight">Creta</span>
          </Link>
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={openPalette}
              className="flex items-center gap-2 rounded-full border border-white/20 px-3.5 py-2 text-sm font-medium text-white/80 transition hover:border-white/60 hover:text-white"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5">
                <circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" />
              </svg>
              <span className="hidden sm:block">Cerca</span>
              <kbd className="hidden font-mono text-[0.65rem] font-semibold text-white/50 sm:block">⌘K</kbd>
            </button>
            <Link
              href="/scrivi"
              className="hidden rounded-full border border-white/20 px-4 py-2 text-sm font-medium text-white/80 transition hover:border-white/60 hover:text-white sm:block"
            >
              Scrivi
            </Link>
            <Link
              href="/componi"
              className="hidden rounded-full border border-white/20 px-4 py-2 text-sm font-medium text-white/80 transition hover:border-white/60 hover:text-white sm:block"
            >
              Componi
            </Link>
            <button
              onClick={() => setModalOpen(true)}
              className="rounded-full bg-gold-400 px-4 py-2 text-sm font-semibold text-navy-950 transition hover:-translate-y-0.5 hover:bg-gold-300"
            >
              + Documento
            </button>
          </div>
        </header>

        {/* headline */}
        <div className="relative z-10 mx-auto flex w-full max-w-[88rem] flex-1 flex-col justify-center px-5 py-10 sm:px-10">
          <p className="flex items-center gap-4 font-mono text-[0.68rem] font-semibold uppercase tracking-[0.3em] text-gold-400">
            <span className="h-px w-10 bg-gold-400/60" />
            Generative UI — Portale interno
          </p>
          
          <h1 className="mt-7 font-display text-[clamp(2.9rem,9vw,5.5rem)] font-bold leading-[0.98] tracking-tight">
            CRETA
            <br />
            il testo diventa{" "}
            <em className="font-semibold italic text-gold-300">interfaccia</em>.
          </h1>

          <div className="mt-10 flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
            <p className="max-w-xl text-[1.02rem] leading-8 text-white/60">
              Creta legge la struttura di un{" "}
              <code className="rounded bg-white/10 px-1.5 py-0.5 font-mono text-[0.85em] text-gold-300">.docx</code>{" "}
              e la ricompone in una pagina tipizzata e navigabile.
              Il design è generato. Il testo, mai:{" "}
              <strong className="font-semibold text-white/90">ogni parola resta quella d&apos;origine</strong>.
              <span className="mt-3 block text-sm italic text-white/40">
                Come l&apos;argilla da cui prende il nome: la materia non cambia
                mai, è la forma a essere modellata.
              </span>
            </p>
            <div className="flex flex-wrap items-center gap-3">
              <button
                onClick={() => setModalOpen(true)}
                className="rounded-full bg-gold-400 px-6 py-3 text-sm font-semibold text-navy-950 transition hover:-translate-y-0.5 hover:bg-gold-300"
              >
                Carica un documento
              </button>
              <Link
                href="/scrivi"
                className="rounded-full border border-white/25 px-6 py-3 text-sm font-medium text-white transition hover:border-white/70"
              >
                Scrivi un documento
              </Link>
              <a
                href="#archivio"
                className="flex items-center gap-2 rounded-full border border-white/25 px-6 py-3 text-sm font-medium text-white transition hover:border-white/70"
              >
                Sfoglia l&apos;archivio
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5 animate-[creta-bob_2.4s_ease-in-out_infinite]">
                  <path d="M12 5v14M19 12l-7 7-7-7" />
                </svg>
              </a>
            </div>
          </div>
        </div>

        {/* marquee of typed blocks */}
        {/* <div className="relative z-10 overflow-hidden border-t border-white/10 py-3.5">
          <div className="creta-marquee">
            {[0, 1].map((copy) => (
              <div
                key={copy}
                aria-hidden={copy === 1}
                className="flex shrink-0 items-center font-mono text-[0.68rem] font-medium uppercase tracking-[0.25em] text-white/35"
              >
                {BLOCK_TYPES.map((name) => (
                  <span key={name} className="flex items-center">
                    <span className="px-6">{name}</span>
                    <span className="h-1 w-1 rounded-full bg-gold-400/50" />
                  </span>
                ))}
              </div>
            ))}
          </div>
        </div> */}

        {/* live stats */}
        {/* <div className="relative z-10 grid grid-cols-2 border-t border-white/10 sm:grid-cols-4">
          {[
            { value: documents.length, label: "Documenti" },
            { value: stats.sectionTotal, label: "Sezioni" },
            { value: stats.minutesTotal, label: "Minuti di lettura" },
            { value: BLOCK_TYPES.length, label: "Blocchi tipizzati" },
          ].map((stat, index) => (
            <div
              key={stat.label}
              className={`px-5 py-5 sm:px-10 ${index > 0 ? "border-l border-white/10" : ""} ${index === 2 ? "max-sm:border-l-0" : ""}`}
            >
              <p className="font-display text-3xl font-bold tabular-nums sm:text-4xl">
                {stat.value}
              </p>
              <p className="mt-1 font-mono text-[0.62rem] font-semibold uppercase tracking-[0.2em] text-white/40">
                {stat.label}
              </p>
            </div>
          ))}
        </div> */}
      </section>

      {/* ── Come funziona ────────────────────────────────────── */}
      <section className="border-b border-navy-900/10 bg-white">
        <div className="mx-auto grid max-w-[88rem] gap-10 px-5 py-14 sm:px-10 lg:grid-cols-[16rem_1fr] lg:gap-16">
          <div>
            <p className="font-mono text-[0.65rem] font-semibold uppercase tracking-[0.25em] text-navy-400">
              Come funziona
            </p>
            <h2 className="mt-3 font-display text-3xl font-bold leading-tight">
              Tre passaggi.
              <br />
              <em className="italic text-gold-600">Zero parole riscritte.</em>
            </h2>
            <p className="mt-4 text-sm leading-7 text-navy-500">
              Come al tornio: si modella la forma, mai la materia.
            </p>
          </div>
          <ol className="grid gap-8 sm:grid-cols-3 sm:gap-0 sm:divide-x sm:divide-navy-900/10">
            {HOW_IT_WORKS.map((step, index) => (
              <li key={step.title} className="sm:px-7 sm:first:pl-0 sm:last:pr-0">
                <p className="font-mono text-[0.7rem] font-semibold text-gold-600">
                  {String(index + 1).padStart(2, "0")}
                  <span className="ml-2 font-medium uppercase tracking-[0.2em] text-navy-400">
                    {step.metaphor}
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
              Archivio · {documents.length}{" "}
              {documents.length === 1 ? "documento" : "documenti"}
            </p>
            <h2 className="mt-2 font-display text-4xl font-bold">Indice</h2>
          </div>
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
        </div>

        {/* document index */}
        {documents.length === 0 ? (
          <div className="mt-7 rounded-2xl border border-dashed border-navy-900/20 bg-white px-6 py-20 text-center">
            <Mark className="mx-auto" />
            <h3 className="mt-5 font-display text-3xl font-bold">L&apos;archivio è vuoto.</h3>
            <p className="mx-auto mt-3 max-w-sm text-sm leading-7 text-navy-500">
              Carica il primo .docx: ci pensa Creta a trasformarlo in una pagina.
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
              la ricerca full-text ⌘K
            </button>
            , che guarda anche dentro le sezioni.
          </p>
        ) : (
          <ul className="mt-7 border-t border-navy-900/10">
            {filtered.map((page, index) => {
              const pct = progress[page.slug]?.pct ?? 0;
              const isFeatured = index === 0 && !needle;
              return (
                <li key={page.slug} className="group relative border-b border-navy-900/10">
                  <div className="flex items-start gap-5 py-6 sm:gap-8 sm:py-7">
                    <span className="hidden w-12 shrink-0 pt-1 font-mono text-sm font-semibold text-navy-300 transition-colors group-hover:text-gold-600 sm:block">
                      {String(index + 1).padStart(2, "0")}
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
                      <DeleteButton
                        title={page.title}
                        loading={deletingSlug === page.slug}
                        onClick={() => requestDeleteDocument(page.slug, page.title)}
                      />
                      <span className="hidden h-10 w-10 place-items-center rounded-full border border-navy-900/15 text-navy-400 transition group-hover:border-gold-500 group-hover:text-gold-600 sm:grid">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 transition-transform group-hover:translate-x-0.5">
                          <path d="M5 12h14M12 5l7 7-7 7" />
                        </svg>
                      </span>
                    </div>
                  </div>

                  {/* reading progress hairline */}
                  {pct > 0.03 && pct < 0.97 && (
                    <span
                      className="absolute bottom-[-1px] left-0 h-px bg-gold-500"
                      style={{ width: `${Math.round(pct * 100)}%` }}
                    />
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {/* ── Footer ───────────────────────────────────────────── */}
      <footer className="bg-navy-950 text-white">
        <div className="mx-auto flex max-w-[88rem] flex-col gap-3 px-5 py-10 sm:flex-row sm:items-center sm:justify-between sm:px-10">
          <p className="flex items-center gap-3 text-sm text-white/50">
            <span className="creta-badge-grad grid h-7 w-7 place-items-center rounded-lg text-xs font-black text-white">
              C
            </span>
            Creta — il testo è sacro, il design è generato.
          </p>
          <button
            onClick={openPalette}
            className="flex items-center gap-2 self-start font-mono text-[0.68rem] font-semibold uppercase tracking-[0.2em] text-white/40 transition hover:text-gold-300 sm:self-auto"
          >
            Cerca ovunque
            <kbd className="rounded border border-white/20 px-1.5 py-0.5">⌘K</kbd>
          </button>
        </div>
      </footer>

      {modalOpen && <UploadModal onClose={() => setModalOpen(false)} />}
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
