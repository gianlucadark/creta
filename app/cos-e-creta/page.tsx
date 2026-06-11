import type { Metadata } from "next";
import Link from "next/link";
import { Reveal } from "@/components/Reveal";

export const metadata: Metadata = {
  title: "Cos'è Creta",
  description:
    "Creta è una generative UI engine: trasforma documenti in pagine web tipizzate, navigabili e servite in modo deterministico, senza riscrivere una parola.",
};

/* I due momenti separati: authoring (una volta) vs serving (ogni visita). */
const MOMENTS = [
  {
    tag: "Una volta",
    title: "Ingest",
    lead: "Il documento viene letto e mappato su blocchi tipizzati.",
    points: [
      "La struttura — capitoli, sezioni, liste, tabelle — diventa il piano della pagina.",
      "Ogni elemento del testo trova un blocco adatto: hero, callout, step, citazione, codice.",
      "Niente è inventato: la forma è scelta, le parole restano quelle del documento.",
    ],
  },
  {
    tag: "Ogni visita",
    title: "Serving",
    lead: "La pagina è servita da dati strutturati, senza modello a runtime.",
    points: [
      "Il risultato è salvato come struttura versionabile, non come generazione effimera.",
      "Ogni visita rilegge lo stesso JSON: stabile, veloce, identico a sé stesso.",
      "Nessuna chiamata AI quando qualcuno apre la pagina. Zero attese, zero deriva.",
    ],
  },
];

/* La pipeline di authoring, in quattro passaggi leggibili. */
const PIPELINE = [
  {
    title: "Legge la struttura",
    text: "Il file sorgente viene convertito in struttura semantica e diviso per capitoli: titoli, gerarchie e blocchi diventano il materiale di partenza.",
  },
  {
    title: "Mappa su blocchi tipizzati",
    text: "Ogni sezione viene assegnata a un blocco pre-approvato. Il modello sceglie la forma adatta al contenuto, mai il contenuto stesso.",
  },
  {
    title: "Misura la copertura",
    text: "Un controllo verifica che il testo della fonte sia presente per intero. Se qualcosa manca, la sezione viene ricostruita: un capitolo non sparisce mai.",
  },
  {
    title: "Serve in modo stabile",
    text: "La pagina pronta è pubblicata come dato deterministico, entra nell'indice di ricerca e resta navigabile, cercabile e condivisibile.",
  },
];

/* Il vocabolario visivo: i blocchi che Creta può comporre. */
const BLOCKS = [
  "Hero",
  "Sezioni",
  "Callout",
  "Liste",
  "Step",
  "Tabelle",
  "Codice",
  "Citazioni",
  "Statistiche",
  "Indice",
];

/* I principi non negoziabili. */
const PRINCIPLES = [
  {
    title: "Testo fedele alla fonte",
    text: "Il documento non viene riscritto, riassunto né abbellito. Creta lavora sulla forma; ogni parola resta verbatim quella originale.",
  },
  {
    title: "Output deterministico",
    text: "La generazione produce dati tipizzati e versionabili. La stessa pagina, ogni volta — niente sorprese a ogni apertura.",
  },
  {
    title: "Navigazione integrata",
    text: "Indice di sezione, ancore profonde, stato di lettura, ricerca full-text: muoversi dentro documenti lunghi diventa naturale.",
  },
];

function Wordmark() {
  return (
    <Link href="/cos-e-creta" className="flex items-center gap-2.5">
      <span className="creta-badge-grad grid h-9 w-9 place-items-center rounded-xl text-sm font-black text-white shadow-sm shadow-navy-900/20">
        C
      </span>
      <span className="font-display text-lg font-bold tracking-tight">Creta</span>
    </Link>
  );
}

export default function AboutCretaPage() {
  return (
    <main className="bg-surface text-navy-900">
      {/* ── Hero ─────────────────────────────────────────────── */}
      <section className="creta-hero-bg relative flex min-h-[100svh] flex-col overflow-hidden text-white">
        <span className="creta-orb left-[-8%] top-[-6%] h-[26rem] w-[26rem] bg-navy-400/30" />
        <span
          className="creta-orb right-[-10%] top-[20%] h-[30rem] w-[30rem] bg-gold-400/15"
          style={{ animationDelay: "-7s" }}
        />
        <span
          className="creta-orb bottom-[-12%] left-[30%] h-[28rem] w-[28rem] bg-navy-500/25"
          style={{ animationDelay: "-13s" }}
        />
        <div className="creta-grain pointer-events-none absolute inset-0 opacity-[0.18] mix-blend-soft-light" />

        <header className="relative z-20 flex items-center justify-between gap-3 px-5 py-5 sm:px-10">
          <Wordmark />
          <Link
            href="/"
            className="flex items-center gap-2 rounded-full border border-white/20 px-4 py-2 text-sm font-medium text-white/80 transition hover:border-white/60 hover:text-white"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5">
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
            Torna al portale
          </Link>
        </header>

        <div className="relative z-10 mx-auto flex w-full max-w-[88rem] flex-1 flex-col justify-center px-5 py-12 sm:px-10">
          <Reveal>
            <p className="flex items-center gap-4 font-mono text-[0.68rem] font-semibold uppercase tracking-[0.3em] text-gold-400">
              <span className="h-px w-10 bg-gold-400/60" />
              Generative UI Engine
            </p>
          </Reveal>

          <Reveal delay={80}>
            <h1 className="mt-7 font-display text-[clamp(3.4rem,12vw,8.5rem)] font-bold leading-[0.9] tracking-tight">
              <span className="creta-gradient-text">Creta</span>
            </h1>
          </Reveal>

          <Reveal delay={160}>
            <p className="mt-6 max-w-2xl text-[1.35rem] font-light leading-9 text-white/85 sm:text-[1.6rem] sm:leading-[2.8rem]">
              Trasforma un documento in un&apos;interfaccia.{" "}
              <span className="text-white">
                La struttura diventa design, il testo resta intatto.
              </span>
            </p>
          </Reveal>

          <Reveal delay={240}>
            <div className="mt-10 flex flex-wrap items-center gap-2.5">
              {["Zero LLM a runtime", "Output deterministico", "Testo verbatim"].map(
                (chip) => (
                  <span
                    key={chip}
                    className="rounded-full border border-white/15 bg-white/5 px-4 py-2 font-mono text-[0.7rem] font-semibold uppercase tracking-[0.15em] text-white/70 backdrop-blur-sm"
                  >
                    {chip}
                  </span>
                )
              )}
            </div>
          </Reveal>
        </div>

        <div className="relative z-10 mx-auto w-full max-w-[88rem] px-5 pb-8 sm:px-10">
          <p className="flex items-center gap-3 font-mono text-[0.65rem] font-semibold uppercase tracking-[0.25em] text-white/40">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 animate-[creta-bob_2.4s_ease-in-out_infinite]">
              <path d="M12 5v14M5 12l7 7 7-7" />
            </svg>
            Scorri per capire come
          </p>
        </div>
      </section>

      {/* ── Definizione ──────────────────────────────────────── */}
      <section className="border-b border-navy-900/10 bg-white">
        <div className="mx-auto max-w-[88rem] px-5 py-20 sm:px-10 lg:py-28">
          <Reveal>
            <p className="font-mono text-[0.68rem] font-semibold uppercase tracking-[0.3em] text-gold-700">
              Cos&apos;è
            </p>
          </Reveal>
          <Reveal delay={80}>
            <p className="mt-6 max-w-5xl font-display text-[clamp(1.9rem,4.5vw,3.4rem)] font-bold leading-[1.1] tracking-tight text-navy-950">
              Creta è una{" "}
              <span className="creta-stat-grad">generative UI</span>: legge la
              struttura di un documento e la ricompone in una pagina web
              progettata per essere letta, non solo aperta.
            </p>
          </Reveal>
          <Reveal delay={140}>
            <p className="mt-8 max-w-2xl text-base leading-8 text-navy-500">
              Il punto non è generare testo. Il documento resta la fonte di
              verità; Creta si occupa della forma — sceglie i componenti, monta
              la navigazione, cura la leggibilità — e pubblica il risultato come
              esperienza digitale coerente e durevole.
            </p>
          </Reveal>
        </div>
      </section>

      {/* ── I due momenti ────────────────────────────────────── */}
      <section className="creta-grid-bg border-b border-navy-900/10">
        <div className="mx-auto max-w-[88rem] px-5 py-20 sm:px-10 lg:py-24">
          <Reveal>
            <div className="max-w-2xl">
              <p className="font-mono text-[0.65rem] font-semibold uppercase tracking-[0.25em] text-navy-400">
                Architettura
              </p>
              <h2 className="mt-3 font-display text-3xl font-bold leading-tight text-navy-950 sm:text-4xl">
                Due momenti che non si toccano mai.
              </h2>
              <p className="mt-4 text-sm leading-7 text-navy-500">
                Il lavoro intelligente avviene una volta sola, in fase di
                authoring. Dopo, ogni visita è pura lettura di dati già pronti.
              </p>
            </div>
          </Reveal>

          <div className="mt-12 grid gap-6 lg:grid-cols-2">
            {MOMENTS.map((moment, index) => (
              <Reveal key={moment.title} delay={index * 120}>
                <article className="group relative h-full overflow-hidden rounded-3xl border border-navy-900/10 bg-white p-8 shadow-sm shadow-navy-950/5 transition hover:-translate-y-1 hover:shadow-xl hover:shadow-navy-950/10 sm:p-10">
                  <span className="creta-rule absolute inset-x-0 top-0 h-1" />
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-[0.62rem] font-semibold uppercase tracking-[0.25em] text-gold-700">
                      {moment.tag}
                    </span>
                    <span className="creta-stat-grad font-display text-5xl font-bold leading-none">
                      0{index + 1}
                    </span>
                  </div>
                  <h3 className="mt-6 font-display text-3xl font-bold text-navy-950">
                    {moment.title}
                  </h3>
                  <p className="mt-2 text-base font-medium leading-7 text-navy-700">
                    {moment.lead}
                  </p>
                  <ul className="mt-7 space-y-4 border-t border-navy-900/10 pt-7">
                    {moment.points.map((point) => (
                      <li key={point} className="flex gap-3 text-sm leading-7 text-navy-600">
                        <span className="mt-2.5 h-1.5 w-1.5 shrink-0 rounded-full bg-gold-500" />
                        {point}
                      </li>
                    ))}
                  </ul>
                </article>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── Come nasce una pagina ────────────────────────────── */}
      <section className="border-b border-navy-900/10 bg-white">
        <div className="mx-auto max-w-[88rem] px-5 py-20 sm:px-10 lg:py-24">
          <Reveal>
            <div className="max-w-2xl">
              <p className="font-mono text-[0.65rem] font-semibold uppercase tracking-[0.25em] text-navy-400">
                Come funziona
              </p>
              <h2 className="mt-3 font-display text-3xl font-bold leading-tight text-navy-950 sm:text-4xl">
                Dal file alla pagina, in quattro passaggi.
              </h2>
            </div>
          </Reveal>

          <div className="mt-12 grid gap-x-12 gap-y-10 sm:grid-cols-2 lg:grid-cols-4">
            {PIPELINE.map((step, index) => (
              <Reveal key={step.title} delay={index * 90}>
                <div className="relative border-t-2 border-navy-900/10 pt-6">
                  <span className="absolute -top-px left-0 h-0.5 w-12 bg-gold-500" />
                  <span className="creta-num-grad grid h-11 w-11 place-items-center rounded-xl font-display text-lg font-bold text-white shadow-sm shadow-navy-900/20">
                    {index + 1}
                  </span>
                  <h3 className="mt-5 font-display text-xl font-bold text-navy-950">
                    {step.title}
                  </h3>
                  <p className="mt-3 text-sm leading-7 text-navy-600">{step.text}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── Principio verbatim ───────────────────────────────── */}
      <section className="creta-quote-grad relative overflow-hidden text-white">
        <span className="creta-orb right-[-6%] top-[-20%] h-[24rem] w-[24rem] bg-gold-400/15" />
        <div className="relative mx-auto max-w-[88rem] px-5 py-24 sm:px-10 lg:py-32">
          <Reveal>
            <p className="font-mono text-[0.65rem] font-semibold uppercase tracking-[0.3em] text-gold-300">
              Il principio non negoziabile
            </p>
          </Reveal>
          <Reveal delay={100}>
            <blockquote className="mt-8 max-w-5xl font-display text-[clamp(1.9rem,4.5vw,3.6rem)] font-semibold leading-[1.12] tracking-tight">
              <span className="text-gold-300">“</span>
              La forma può cambiare. Le parole no. Creta non riscrive, non
              riassume, non parafrasa: copia il testo verbatim e gli costruisce
              attorno l&apos;interfaccia giusta.
              <span className="text-gold-300">”</span>
            </blockquote>
          </Reveal>
        </div>
      </section>

      {/* ── Vocabolario visivo ───────────────────────────────── */}
      <section className="border-b border-navy-900/10 bg-white">
        <div className="mx-auto grid max-w-[88rem] gap-12 px-5 py-20 sm:px-10 lg:grid-cols-[20rem_1fr] lg:gap-20 lg:py-24">
          <Reveal>
            <div>
              <p className="font-mono text-[0.65rem] font-semibold uppercase tracking-[0.25em] text-navy-400">
                Vocabolario
              </p>
              <h2 className="mt-3 font-display text-3xl font-bold leading-tight text-navy-950 sm:text-4xl">
                Un set di blocchi pre-approvati.
              </h2>
              <p className="mt-4 text-sm leading-7 text-navy-500">
                Creta non compone HTML libero: assembla una pagina da componenti
                tipizzati e prevedibili. Ecco con cosa lavora.
              </p>
            </div>
          </Reveal>

          <Reveal delay={120}>
            <div className="flex flex-wrap gap-3">
              {BLOCKS.map((block, index) => (
                <span
                  key={block}
                  className="group inline-flex items-center gap-2.5 rounded-2xl border border-navy-900/10 bg-surface px-5 py-3.5 text-sm font-semibold text-navy-800 transition hover:border-gold-500 hover:bg-white hover:shadow-sm hover:shadow-navy-950/5"
                >
                  <span className="font-mono text-[0.62rem] font-semibold text-gold-600">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  {block}
                </span>
              ))}
            </div>
          </Reveal>
        </div>
      </section>

      {/* ── Principi ─────────────────────────────────────────── */}
      <section className="bg-surface">
        <div className="mx-auto max-w-[88rem] px-5 py-20 sm:px-10 lg:py-24">
          <div className="grid gap-8 md:grid-cols-3">
            {PRINCIPLES.map((item, index) => (
              <Reveal key={item.title} delay={index * 100}>
                <article className="h-full border-t border-navy-900/10 pt-6">
                  <p className="font-mono text-[0.7rem] font-semibold uppercase tracking-[0.2em] text-gold-700">
                    {String(index + 1).padStart(2, "0")}
                  </p>
                  <h3 className="mt-3 font-display text-2xl font-bold text-navy-950">
                    {item.title}
                  </h3>
                  <p className="mt-3 text-sm leading-7 text-navy-600">{item.text}</p>
                </article>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ──────────────────────────────────────────────── */}
      <section className="creta-hero-bg relative overflow-hidden text-white">
        <span className="creta-orb left-[10%] top-[-30%] h-[26rem] w-[26rem] bg-navy-400/25" />
        <span
          className="creta-orb bottom-[-40%] right-[5%] h-[24rem] w-[24rem] bg-gold-400/12"
          style={{ animationDelay: "-9s" }}
        />
        <div className="relative mx-auto flex max-w-[88rem] flex-col items-start gap-8 px-5 py-24 sm:px-10 md:flex-row md:items-center md:justify-between lg:py-28">
          <div className="max-w-2xl">
            <h2 className="font-display text-[clamp(2rem,5vw,3.4rem)] font-bold leading-[1.05] tracking-tight">
              Il testo resta documento.
              <br />
              <span className="creta-gradient-text">La lettura diventa prodotto.</span>
            </h2>
            <p className="mt-5 max-w-xl text-base leading-8 text-white/60">
              Porta un file: Creta ne fa una pagina navigabile, cercabile e
              pronta da condividere — senza toccarne le parole.
            </p>
          </div>
          <div className="flex shrink-0 flex-col gap-3 sm:flex-row md:flex-col">
            <Link
              href="/"
              className="rounded-full bg-gold-400 px-7 py-3.5 text-center text-sm font-semibold text-navy-950 transition hover:-translate-y-0.5 hover:bg-gold-300"
            >
              Vai al portale
            </Link>
          
          </div>
        </div>
      </section>

      {/* ── Footer ───────────────────────────────────────────── */}
      <footer className="bg-navy-950 text-white">
        <div className="mx-auto flex max-w-[88rem] flex-col gap-3 px-5 py-10 sm:flex-row sm:items-center sm:justify-between sm:px-10">
          <p className="flex items-center gap-3 text-sm text-white/50">
            <span className="creta-badge-grad grid h-7 w-7 place-items-center rounded-lg text-xs font-black text-white">
              C
            </span>
            Creta — generative UI engine.
          </p>
          <Link
            href="/"
            className="self-start font-mono text-[0.68rem] font-semibold uppercase tracking-[0.2em] text-white/40 transition hover:text-gold-300 sm:self-auto"
          >
            Torna al portale →
          </Link>
        </div>
      </footer>
    </main>
  );
}
