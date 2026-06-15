import type { Metadata } from "next";
import Link from "next/link";
import { CretaParticleTitle } from "@/components/CretaParticleTitle";
import { Reveal } from "@/components/Reveal";

export const metadata: Metadata = {
  title: "Cos'è Creta",
  description:
    "Creta trasforma documenti in pagine web tipizzate, navigabili e deterministiche: il testo resta fedele, l'esperienza diventa prodotto.",
};

const HERO_CHIPS = [
  "Documenti in pagine",
  "Testo verbatim",
  "Zero AI a runtime",
];

const SIGNALS = [
  { value: "1", label: "fonte di verità", text: "Il documento originale resta l'unica sorgente del contenuto." },
  { value: "0", label: "testo inventato", text: "Creta genera la forma, non riscrive le parole." },
  { value: "∞", label: "letture stabili", text: "Ogni visita serve dati già salvati e versionabili." },
];

const PAIN_POINTS = [
  {
    title: "Il documento resta un file",
    text: "PDF, DOCX e manuali interni sono ricchi, ma spesso finiscono come allegati difficili da scansionare, cercare e condividere.",
  },
  {
    title: "La pagina web costa troppo",
    text: "Trasformare ogni contenuto in un'interfaccia richiede design, sviluppo, copy adaptation e manutenzione manuale.",
  },
  {
    title: "L'AI pura non basta",
    text: "Un modello può aiutare a scegliere la struttura, ma non deve diventare la fonte: serve un sistema con vincoli, schema e verifica.",
  },
];

const TRANSFORM_STEPS = [
  "Documento sorgente",
  "Struttura semantica",
  "Blocchi tipizzati",
  "Pagina navigabile",
];

const SOURCE_LINES = [
  "1. Obiettivo",
  "Definire linee guida operative per usare strumenti AI nei flussi interni.",
  "2. Regole",
  "- Non inserire dati riservati",
  "- Verificare sempre l'output",
  "- Documentare le decisioni rilevanti",
  "3. Processo",
  "Analisi, generazione, revisione, pubblicazione.",
];

const OUTPUT_BLOCKS = [
  { tag: "Hero", title: "Linee guida operative AI", text: "Una pagina di apertura con titolo, sintesi e metadati." },
  { tag: "Callout", title: "Regola critica", text: "Non inserire dati riservati negli strumenti non approvati." },
  { tag: "Step flow", title: "Processo", text: "Analisi → generazione → revisione → pubblicazione." },
];

const PIPELINE = [
  {
    title: "Ingest",
    text: "Il file viene letto, normalizzato e diviso in capitoli, sezioni, liste, tabelle e blocchi di testo.",
  },
  {
    title: "Mapping",
    text: "La struttura viene assegnata a componenti pre-approvati: hero, sezioni, callout, step, codice, tabelle.",
  },
  {
    title: "Coverage",
    text: "Il sistema controlla che il testo della fonte sia coperto. Se manca qualcosa, la sezione viene rigenerata.",
  },
  {
    title: "Serving",
    text: "Il risultato diventa JSON tipizzato: veloce da servire, stabile nel tempo, indicizzabile e condivisibile.",
  },
];

const GUARANTEES = [
  {
    title: "Fedele alla fonte",
    text: "Le parole non vengono abbellite, parafrasate o sostituite. La trasformazione riguarda solo la presentazione.",
  },
  {
    title: "Deterministico",
    text: "La pagina pubblicata non cambia a ogni apertura: viene servita da dati salvati, non da una generazione live.",
  },
  {
    title: "Navigabile",
    text: "Indice, ancore, ricerca, sezioni e metadati trasformano un documento lungo in un'esperienza consultabile.",
  },
];

const USE_CASES = [
  "Guide interne",
  "Manuali operativi",
  "Policy aziendali",
  "Onboarding",
  "Knowledge base",
  "Report e procedure",
];

const LIMITS = [
  "Non inventa contenuti assenti dalla fonte.",
  "Non sostituisce una revisione editoriale quando il documento è ambiguo.",
  "Non chiama un modello quando il lettore apre la pagina.",
];

function Wordmark() {
  return (
    <Link href="/cos-e-creta" className="flex items-center gap-2.5">
      <span className="creta-badge-grad grid h-9 w-9 place-items-center rounded-lg text-sm font-black text-white shadow-sm shadow-navy-900/20">
        C
      </span>
      <span className="font-display text-lg font-bold tracking-tight">Creta</span>
    </Link>
  );
}

function ArrowRight({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2.2"
      className={className}
      aria-hidden
    >
      <path d="M5 12h14M13 6l6 6-6 6" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2.4"
      className="h-4 w-4"
      aria-hidden
    >
      <path d="m5 12.5 4 4 10-10" />
    </svg>
  );
}

export default function AboutCretaPage() {
  return (
    <main className="bg-surface text-navy-900">
      <section className="creta-hero-bg relative flex min-h-[100svh] flex-col overflow-hidden text-white">
        <div className="pointer-events-none absolute inset-0 creta-grid-bg opacity-[0.08] mix-blend-screen" />
        <div className="creta-grain pointer-events-none absolute inset-0 opacity-[0.16] mix-blend-soft-light" />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-48 bg-gradient-to-t from-navy-950/70 to-transparent" />

        <header className="relative z-20 flex items-center justify-between gap-3 px-5 py-5 sm:px-10">
          <Wordmark />
          <Link
            href="/"
            className="flex items-center gap-2 rounded-lg border border-white/20 px-4 py-2 text-sm font-medium text-white/80 transition hover:border-white/60 hover:text-white"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5" aria-hidden>
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
            Portale
          </Link>
        </header>

        <div className="relative z-10 mx-auto flex w-full max-w-[96rem] flex-1 flex-col items-center justify-center px-5 py-14 text-center sm:px-10">
          <Reveal>
            <p className="flex items-center justify-center gap-4 font-mono text-[0.68rem] font-semibold uppercase tracking-[0.3em] text-gold-300">
              <span className="h-px w-10 bg-gold-300/60" />
              Generative UI engine
              <span className="h-px w-10 bg-gold-300/60" />
            </p>
          </Reveal>

          <Reveal delay={80}>
            <h1 className="sr-only">Creta</h1>
            <CretaParticleTitle className="mt-3 h-[12rem] w-[min(96vw,78rem)] sm:h-[17rem] lg:h-[24rem]" />
          </Reveal>

          <Reveal delay={160}>
            <p className="-mt-2 max-w-3xl text-[1.35rem] font-light leading-9 text-white/85 sm:text-[1.72rem] sm:leading-[3rem] lg:-mt-6">
              Trasforma un documento in un&apos;interfaccia.{" "}
              <span className="text-white">
                La struttura diventa design, il testo resta intatto.
              </span>
            </p>
          </Reveal>

          <Reveal delay={230}>
            <div className="mt-9 flex flex-wrap items-center justify-center gap-2.5">
              {HERO_CHIPS.map((chip) => (
                <span
                  key={chip}
                  className="rounded-lg border border-white/15 bg-white/7 px-4 py-2 font-mono text-[0.68rem] font-semibold uppercase tracking-[0.14em] text-white/70 backdrop-blur-sm"
                >
                  {chip}
                </span>
              ))}
            </div>
          </Reveal>

          <Reveal delay={300}>
            <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
              <Link
                href="/"
                className="inline-flex items-center gap-2 rounded-lg bg-gold-400 px-5 py-3 text-sm font-semibold text-navy-950 transition hover:-translate-y-0.5 hover:bg-gold-300"
              >
                Apri il portale
                <ArrowRight />
              </Link>
              <Link
                href="/scrivi"
                className="inline-flex items-center gap-2 rounded-lg border border-white/18 bg-white/7 px-5 py-3 text-sm font-semibold text-white transition hover:border-white/45 hover:bg-white/12"
              >
                Scrivi una fonte
                <ArrowRight />
              </Link>
            </div>
          </Reveal>
        </div>

        <div className="relative z-10 mx-auto w-full max-w-[88rem] px-5 pb-8 sm:px-10">
          <p className="flex items-center gap-3 font-mono text-[0.65rem] font-semibold uppercase tracking-[0.25em] text-white/40">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 animate-[creta-bob_2.4s_ease-in-out_infinite]" aria-hidden>
              <path d="M12 5v14M5 12l7 7 7-7" />
            </svg>
            Scorri per vedere come
          </p>
        </div>
      </section>

      <section className="border-b border-navy-900/10 bg-white">
        <div className="mx-auto grid max-w-[88rem] gap-6 px-5 py-12 sm:px-10 md:grid-cols-3">
          {SIGNALS.map((signal, index) => (
            <Reveal key={signal.label} delay={index * 80}>
              <article className="border-t border-navy-900/10 pt-5">
                <p className="creta-stat-grad font-display text-5xl font-bold leading-none">
                  {signal.value}
                </p>
                <h2 className="mt-3 text-sm font-bold uppercase tracking-[0.16em] text-navy-950">
                  {signal.label}
                </h2>
                <p className="mt-2 text-sm leading-7 text-navy-500">{signal.text}</p>
              </article>
            </Reveal>
          ))}
        </div>
      </section>

      <section className="creta-grid-bg border-b border-navy-900/10">
        <div className="mx-auto max-w-[88rem] px-5 py-20 sm:px-10 lg:py-28">
          <Reveal>
            <div className="max-w-3xl">
              <p className="font-mono text-[0.65rem] font-semibold uppercase tracking-[0.25em] text-navy-400">
                Il problema
              </p>
              <h2 className="mt-3 font-display text-4xl font-bold leading-tight text-navy-950 sm:text-5xl">
                I documenti contengono conoscenza. Raramente diventano esperienza.
              </h2>
            </div>
          </Reveal>

          <div className="mt-12 grid gap-5 md:grid-cols-3">
            {PAIN_POINTS.map((item, index) => (
              <Reveal key={item.title} delay={index * 100}>
                <article className="h-full rounded-lg border border-navy-900/10 bg-white p-7 shadow-sm shadow-navy-950/5">
                  <span className="font-mono text-[0.65rem] font-semibold text-gold-700">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <h3 className="mt-4 font-display text-2xl font-bold text-navy-950">
                    {item.title}
                  </h3>
                  <p className="mt-3 text-sm leading-7 text-navy-600">{item.text}</p>
                </article>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section className="border-b border-navy-900/10 bg-white">
        <div className="mx-auto max-w-[88rem] px-5 py-20 sm:px-10 lg:py-28">
          <Reveal>
            <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
              <div className="max-w-3xl">
                <p className="font-mono text-[0.65rem] font-semibold uppercase tracking-[0.25em] text-gold-700">
                  Prima / dopo
                </p>
                <h2 className="mt-3 font-display text-4xl font-bold leading-tight text-navy-950 sm:text-5xl">
                  Dal testo grezzo a una pagina pronta da leggere.
                </h2>
              </div>
              <p className="max-w-md text-sm leading-7 text-navy-500">
                Il contenuto non viene riscritto: la struttura del documento
                diventa navigazione, gerarchia visiva e componenti.
              </p>
            </div>
          </Reveal>

          <div className="mt-12 grid gap-6 lg:grid-cols-[0.92fr_auto_1.08fr] lg:items-stretch">
            <Reveal>
              <article className="h-full rounded-lg border border-navy-900/10 bg-surface p-5 sm:p-6">
                <div className="flex items-center justify-between border-b border-navy-900/10 pb-4">
                  <span className="font-mono text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-navy-400">
                    sorgente.docx
                  </span>
                  <span className="rounded-md bg-white px-2.5 py-1 font-mono text-[0.6rem] font-semibold uppercase tracking-[0.14em] text-navy-400">
                    input
                  </span>
                </div>
                <div className="mt-5 space-y-3 font-mono text-[0.78rem] leading-6 text-navy-600">
                  {SOURCE_LINES.map((line, index) => (
                    <p key={`${line}-${index}`} className={line[0] >= "1" && line[0] <= "9" ? "font-bold text-navy-950" : ""}>
                      {line}
                    </p>
                  ))}
                </div>
              </article>
            </Reveal>

            <Reveal delay={120}>
              <div className="flex items-center justify-center">
                <span className="grid h-12 w-12 place-items-center rounded-lg border border-gold-400/60 bg-gold-50 text-gold-700 shadow-sm shadow-navy-950/5">
                  <ArrowRight className="h-5 w-5 rotate-90 lg:rotate-0" />
                </span>
              </div>
            </Reveal>

            <Reveal delay={180}>
              <article className="h-full overflow-hidden rounded-lg border border-navy-900/10 bg-white shadow-xl shadow-navy-950/7">
                <div className="creta-rule h-1" />
                <div className="p-6 sm:p-7">
                  <p className="font-mono text-[0.65rem] font-semibold uppercase tracking-[0.22em] text-gold-700">
                    output Creta
                  </p>
                  <h3 className="mt-3 font-display text-3xl font-bold leading-tight text-navy-950">
                    Linee guida operative AI
                  </h3>
                  <p className="mt-3 max-w-xl text-sm leading-7 text-navy-500">
                    Una pagina con hero, indice, callout, step operativi e
                    blocchi leggibili. Stesse parole, forma diversa.
                  </p>
                  <div className="mt-6 grid gap-3 sm:grid-cols-3">
                    {OUTPUT_BLOCKS.map((block) => (
                      <div key={block.tag} className="rounded-md border border-navy-900/10 bg-surface p-4">
                        <span className="font-mono text-[0.58rem] font-bold uppercase tracking-[0.18em] text-gold-700">
                          {block.tag}
                        </span>
                        <h4 className="mt-2 text-sm font-bold text-navy-950">{block.title}</h4>
                        <p className="mt-1 text-xs leading-5 text-navy-500">{block.text}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </article>
            </Reveal>
          </div>
        </div>
      </section>

      <section className="creta-quote-grad relative overflow-hidden text-white">
        <div className="creta-grain pointer-events-none absolute inset-0 opacity-[0.12] mix-blend-soft-light" />
        <div className="relative mx-auto max-w-[88rem] px-5 py-20 sm:px-10 lg:py-28">
          <Reveal>
            <p className="font-mono text-[0.65rem] font-semibold uppercase tracking-[0.3em] text-gold-300">
              Come funziona
            </p>
          </Reveal>
          <Reveal delay={80}>
            <h2 className="mt-4 max-w-4xl font-display text-[clamp(2.1rem,5vw,4.5rem)] font-bold leading-[1.02] tracking-tight">
              Una generazione sola. Poi solo dati stabili.
            </h2>
          </Reveal>

          <div className="mt-12 grid gap-4 lg:grid-cols-4">
            {TRANSFORM_STEPS.map((step, index) => (
              <Reveal key={step} delay={index * 90}>
                <div className="relative rounded-lg border border-white/12 bg-white/[0.055] p-5">
                  <span className="font-mono text-[0.62rem] font-semibold uppercase tracking-[0.18em] text-gold-300">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <h3 className="mt-3 text-lg font-semibold text-white">{step}</h3>
                  {index < TRANSFORM_STEPS.length - 1 && (
                    <ArrowRight className="absolute -right-5 top-1/2 hidden h-5 w-5 -translate-y-1/2 text-gold-300/70 lg:block" />
                  )}
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section className="border-b border-navy-900/10 bg-white">
        <div className="mx-auto max-w-[88rem] px-5 py-20 sm:px-10 lg:py-24">
          <div className="grid gap-12 lg:grid-cols-[20rem_1fr] lg:gap-16">
            <Reveal>
              <div>
                <p className="font-mono text-[0.65rem] font-semibold uppercase tracking-[0.25em] text-navy-400">
                  Pipeline
                </p>
                <h2 className="mt-3 font-display text-4xl font-bold leading-tight text-navy-950">
                  Il lavoro dietro la pagina.
                </h2>
              </div>
            </Reveal>

            <div className="grid gap-5 md:grid-cols-2">
              {PIPELINE.map((step, index) => (
                <Reveal key={step.title} delay={index * 80}>
                  <article className="h-full rounded-lg border border-navy-900/10 bg-surface p-6">
                    <span className="creta-num-grad grid h-10 w-10 place-items-center rounded-lg font-display text-lg font-bold text-white">
                      {index + 1}
                    </span>
                    <h3 className="mt-5 font-display text-2xl font-bold text-navy-950">
                      {step.title}
                    </h3>
                    <p className="mt-3 text-sm leading-7 text-navy-600">{step.text}</p>
                  </article>
                </Reveal>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="creta-grid-bg border-b border-navy-900/10">
        <div className="mx-auto max-w-[88rem] px-5 py-20 sm:px-10 lg:py-24">
          <Reveal>
            <div className="max-w-3xl">
              <p className="font-mono text-[0.65rem] font-semibold uppercase tracking-[0.25em] text-navy-400">
                Garanzie
              </p>
              <h2 className="mt-3 font-display text-4xl font-bold leading-tight text-navy-950 sm:text-5xl">
                Bello, ma soprattutto affidabile.
              </h2>
            </div>
          </Reveal>

          <div className="mt-12 grid gap-5 md:grid-cols-3">
            {GUARANTEES.map((item, index) => (
              <Reveal key={item.title} delay={index * 100}>
                <article className="h-full rounded-lg border border-navy-900/10 bg-white p-7 shadow-sm shadow-navy-950/5">
                  <span className="grid h-10 w-10 place-items-center rounded-lg bg-gold-400 text-navy-950">
                    <CheckIcon />
                  </span>
                  <h3 className="mt-5 font-display text-2xl font-bold text-navy-950">
                    {item.title}
                  </h3>
                  <p className="mt-3 text-sm leading-7 text-navy-600">{item.text}</p>
                </article>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section className="border-b border-navy-900/10 bg-white">
        <div className="mx-auto grid max-w-[88rem] gap-12 px-5 py-20 sm:px-10 lg:grid-cols-[1fr_1fr] lg:gap-16 lg:py-24">
          <Reveal>
            <div>
              <p className="font-mono text-[0.65rem] font-semibold uppercase tracking-[0.25em] text-gold-700">
                Dove serve
              </p>
              <h2 className="mt-3 font-display text-4xl font-bold leading-tight text-navy-950 sm:text-5xl">
                Quando un documento deve essere usato, non solo archiviato.
              </h2>
              <div className="mt-8 flex flex-wrap gap-3">
                {USE_CASES.map((item) => (
                  <span
                    key={item}
                    className="rounded-lg border border-navy-900/10 bg-surface px-4 py-3 text-sm font-semibold text-navy-800"
                  >
                    {item}
                  </span>
                ))}
              </div>
            </div>
          </Reveal>

          <Reveal delay={120}>
            <div className="rounded-lg border border-navy-900/10 bg-navy-950 p-7 text-white shadow-xl shadow-navy-950/10">
              <p className="font-mono text-[0.65rem] font-semibold uppercase tracking-[0.25em] text-gold-300">
                Cosa non fa
              </p>
              <h3 className="mt-4 font-display text-3xl font-bold">
                I limiti sono parte del prodotto.
              </h3>
              <ul className="mt-7 space-y-4 border-t border-white/10 pt-7">
                {LIMITS.map((item) => (
                  <li key={item} className="flex gap-3 text-sm leading-7 text-white/68">
                    <span className="mt-2.5 h-1.5 w-1.5 shrink-0 rounded-full bg-gold-300" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </Reveal>
        </div>
      </section>

      <section className="creta-hero-bg relative overflow-hidden text-white">
        <div className="creta-grain pointer-events-none absolute inset-0 opacity-[0.14] mix-blend-soft-light" />
        <div className="relative mx-auto flex max-w-[88rem] flex-col items-start gap-8 px-5 py-20 sm:px-10 md:flex-row md:items-center md:justify-between lg:py-28">
          <div className="max-w-2xl">
            <p className="font-mono text-[0.65rem] font-semibold uppercase tracking-[0.25em] text-gold-300">
              Prova concreta
            </p>
            <h2 className="mt-4 font-display text-[clamp(2.1rem,5vw,4rem)] font-bold leading-[1.04] tracking-tight">
              Porta un documento.
              <br />
              <span className="creta-gradient-text">Creta gli dà una forma.</span>
            </h2>
            <p className="mt-5 max-w-xl text-base leading-8 text-white/62">
              Apri il portale per vedere i documenti già trasformati, oppure
              scrivi una nuova fonte e lascia che diventi una pagina.
            </p>
          </div>
          <div className="flex shrink-0 flex-col gap-3 sm:flex-row md:flex-col">
            <Link
              href="/"
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-gold-400 px-7 py-3.5 text-sm font-semibold text-navy-950 transition hover:-translate-y-0.5 hover:bg-gold-300"
            >
              Vai al portale
              <ArrowRight />
            </Link>
            <Link
              href="/scrivi"
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-white/20 bg-white/7 px-7 py-3.5 text-sm font-semibold text-white transition hover:border-white/50 hover:bg-white/12"
            >
              Scrivi una fonte
              <ArrowRight />
            </Link>
          </div>
        </div>
      </section>

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
