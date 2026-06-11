import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Cos'e Creta",
  description:
    "Una spiegazione sintetica di Creta, il sistema usato per trasformare documenti aziendali in pagine interne navigabili.",
};

const PRINCIPLES = [
  {
    title: "Il contenuto resta aziendale",
    text: "Creta non sostituisce il documento originale: lo prende come fonte e lo rende piu leggibile, sezionato e facile da consultare.",
  },
  {
    title: "La forma diventa interfaccia",
    text: "Titoli, sezioni, callout, tabelle e blocchi operativi vengono organizzati in una pagina coerente, senza chiedere template manuali.",
  },
  {
    title: "La consultazione e' piu rapida",
    text: "Ogni pagina puo essere cercata, navigata per capitoli e ripresa dal punto di lettura precedente.",
  },
];

export default function AboutCretaPage() {
  return (
    <main className="min-h-screen bg-surface text-navy-900">
      <section className="border-b border-navy-900/10 bg-white">
        <div className="mx-auto flex max-w-[88rem] items-center justify-between gap-4 px-5 py-5 sm:px-10">
          <Link href="/" className="flex items-center gap-2.5">
            <span className="creta-badge-grad grid h-9 w-9 place-items-center rounded-xl text-sm font-black text-white shadow-sm shadow-navy-900/20">
              M
            </span>
            <span className="font-display text-lg font-bold tracking-tight">
              MICE AI Hub
            </span>
          </Link>
          <Link
            href="/"
            className="rounded-full border border-navy-900/15 px-4 py-2 text-sm font-semibold text-navy-700 transition hover:border-gold-500 hover:text-navy-950"
          >
            Torna al portale
          </Link>
        </div>
      </section>

      <section className="mx-auto grid max-w-[88rem] gap-12 px-5 py-16 sm:px-10 lg:grid-cols-[0.95fr_1.05fr] lg:items-end lg:py-24">
        <div>
          <p className="font-mono text-[0.68rem] font-semibold uppercase tracking-[0.3em] text-gold-700">
            Tecnologia del portale
          </p>
          <h1 className="mt-5 font-display text-[clamp(3rem,8vw,5.8rem)] font-bold leading-[0.95] tracking-tight text-navy-950">
            Cos&apos;e
            <br />
            Creta
          </h1>
        </div>

        <div className="max-w-2xl">
          <p className="text-xl leading-9 text-navy-700">
            Creta e&apos; il sistema con cui questo portale interno MICE trasforma
            documenti aziendali in pagine web navigabili, cercabili e piu
            semplici da leggere.
          </p>
          <p className="mt-5 text-sm leading-7 text-navy-500">
            Il prodotto visibile qui e&apos; l&apos;AI Hub aziendale. Creta e&apos; il motore
            editoriale dietro: prende contenuti strutturati, li organizza in
            componenti di lettura e li pubblica come esperienza digitale stabile.
          </p>
        </div>
      </section>

      <section className="border-y border-navy-900/10 bg-white">
        <div className="mx-auto grid max-w-[88rem] gap-8 px-5 py-14 sm:px-10 lg:grid-cols-3 lg:divide-x lg:divide-navy-900/10">
          {PRINCIPLES.map((item, index) => (
            <article key={item.title} className="lg:px-8 lg:first:pl-0 lg:last:pr-0">
              <p className="font-mono text-[0.7rem] font-semibold uppercase tracking-[0.2em] text-gold-700">
                {String(index + 1).padStart(2, "0")}
              </p>
              <h2 className="mt-3 font-display text-2xl font-bold text-navy-950">
                {item.title}
              </h2>
              <p className="mt-3 text-sm leading-7 text-navy-600">{item.text}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="mx-auto flex max-w-[88rem] flex-col gap-5 px-5 py-14 sm:px-10 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="font-mono text-[0.65rem] font-semibold uppercase tracking-[0.25em] text-navy-400">
            In pratica
          </p>
          <h2 className="mt-2 font-display text-3xl font-bold text-navy-950">
            MICE pubblica contenuti. Creta li rende consultabili.
          </h2>
        </div>
        <Link
          href="/#archivio"
          className="self-start rounded-full bg-navy-950 px-6 py-3 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:bg-navy-800"
        >
          Sfoglia l&apos;archivio
        </Link>
      </section>
    </main>
  );
}
