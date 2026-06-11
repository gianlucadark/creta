"use client";

import Link from "next/link";
import { useEffect } from "react";

/* Pagina di errore brandizzata: copre gli errori imprevisti delle route
   (per esempio una lettura fallita dello store) al posto della schermata
   grezza di Next. */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[creta] route error:", error);
  }, [error]);

  return (
    <div className="creta-hero-bg grid min-h-screen place-items-center px-6 text-white">
      <div className="max-w-md text-center">
        <span className="creta-badge-grad mx-auto grid h-12 w-12 place-items-center rounded-2xl text-lg font-black text-white shadow-lg shadow-navy-950/40">
          C
        </span>
        <h1 className="mt-7 font-display text-4xl font-bold">
          Qualcosa è andato storto.
        </h1>
        <p className="mx-auto mt-4 text-sm leading-7 text-white/55">
          Un errore imprevisto ha interrotto il caricamento della pagina. Di
          solito basta riprovare; se succede di nuovo, segnalalo a chi gestisce
          il sito.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <button
            type="button"
            onClick={reset}
            className="rounded-full bg-gold-400 px-6 py-3 text-sm font-semibold text-navy-950 transition hover:-translate-y-0.5 hover:bg-gold-300"
          >
            Riprova
          </button>
          <Link
            href="/"
            className="rounded-full border border-white/25 px-6 py-3 text-sm font-medium text-white transition hover:border-white/70"
          >
            Torna alla home
          </Link>
        </div>
      </div>
    </div>
  );
}
