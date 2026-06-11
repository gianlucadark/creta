"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { openPalette } from "./CommandPalette";
import { saveReading } from "@/lib/readingProgress";

export function DocHeader({
  meta,
  title,
  slug,
}: {
  meta: string;
  title?: string;
  slug?: string;
}) {
  const [scrolled, setScrolled] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [progress, setProgress] = useState(0);
  const lastSaved = useRef(-1);
  const lastY = useRef(0);
  const ticking = useRef(false);

  useEffect(() => {
    function measure() {
      ticking.current = false;
      const top = Math.max(0, window.scrollY);
      const max = document.documentElement.scrollHeight - window.innerHeight;
      const pct = max > 0 ? Math.min(1, top / max) : 0;
      setScrolled(top > 80);
      setProgress(pct);
      /* Si nasconde durante la lettura verso il basso e riappare appena si risale. */
      const delta = top - lastY.current;
      if (delta > 4 && top > 360) setHidden(true);
      else if (delta < -4 || top <= 360) setHidden(false);
      lastY.current = top;
      /* Persiste il punto raggiunto solo dopo movimenti significativi. */
      if (slug && Math.abs(pct - lastSaved.current) > 0.02) {
        lastSaved.current = pct;
        saveReading(slug, pct);
      }
    }
    function onScroll() {
      if (ticking.current) return;
      ticking.current = true;
      requestAnimationFrame(measure);
    }
    measure();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [slug]);

  return (
    <header
      className={`fixed inset-x-0 top-0 z-30 transition-[transform,background-color,border-color] duration-300 ease-out ${
        hidden ? "-translate-y-[calc(100%-2px)]" : "translate-y-0"
      } ${
        scrolled
          ? "border-b border-navy-200/70 bg-white/92 backdrop-blur-md"
          : "border-b border-transparent bg-transparent"
      }`}
    >
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-6 py-3.5">
        {/* Logo e ritorno */}
        <Link href="/" transitionTypes={["nav-back"]} className="group flex shrink-0 items-center gap-2.5">
          <span className="creta-badge-grad grid h-8 w-8 place-items-center rounded-lg text-sm font-black text-white shadow-sm shadow-navy-900/20 transition-transform group-hover:-rotate-6">
            C
          </span>
          <span
            className={`font-display text-lg font-bold tracking-tight transition-colors ${
              scrolled ? "text-navy-900" : "text-white"
            }`}
          >
            Creta
          </span>
        </Link>

        {/* Centro: titolo documento, visibile solo dopo lo scroll */}
        {title && (
          <p
            className={`hidden min-w-0 max-w-sm flex-1 truncate text-center text-sm font-semibold transition-all duration-300 md:block ${
              scrolled ? "translate-y-0 text-navy-800 opacity-100" : "-translate-y-1 opacity-0"
            }`}
          >
            {title}
          </p>
        )}

        <div className="flex shrink-0 items-center gap-3">
          <span
            className={`hidden text-xs font-medium tracking-wide transition-colors sm:block ${
              scrolled ? "text-navy-400" : "text-white/60"
            }`}
          >
            {meta}
          </span>
          <button
            type="button"
            onClick={openPalette}
            aria-label="Cerca nell'archivio"
            className={`flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm font-medium transition ${
              scrolled
                ? "border-navy-200 text-navy-600 hover:border-gold-400 hover:text-gold-600"
                : "border-white/30 text-white/85 hover:border-white/70"
            }`}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5">
              <circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" />
            </svg>
            <kbd className="hidden font-mono text-[0.65rem] font-semibold sm:block">⌘K</kbd>
          </button>
          <Link
            href="/"
            transitionTypes={["nav-back"]}
            className={`flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-sm font-medium transition ${
              scrolled
                ? "border-navy-200 text-navy-700 hover:border-gold-400 hover:text-gold-600"
                : "border-white/30 text-white hover:border-white/70"
            }`}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5">
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
            Indietro
          </Link>
        </div>
      </div>

      {/* Barra del progresso di lettura */}
      <div className="h-0.5 w-full bg-transparent">
        <div
          className="creta-progress-grad h-full origin-left transition-transform duration-150 ease-out"
          style={{ transform: `scaleX(${progress})`, transformOrigin: "left" }}
        />
      </div>
    </header>
  );
}
