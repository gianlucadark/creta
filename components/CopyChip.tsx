"use client";

import { useRef, useState } from "react";
import { copyText } from "@/lib/clipboard";

/* Inline monospace chip used for `backtick` tokens: click to copy.
   Rendered as a button so commands/paths can be grabbed with one click. */
export function CopyChip({ code, onDark = false }: { code: string; onDark?: boolean }) {
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  async function onCopy() {
    if (!(await copyText(code))) return;
    setCopied(true);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setCopied(false), 1800);
  }

  return (
    <button
      type="button"
      onClick={() => void onCopy()}
      title={copied ? "Copiato!" : "Clicca per copiare"}
      aria-label={`Copia: ${code}`}
      className={`group/chip inline cursor-pointer break-all rounded-md px-1.5 py-0.5 text-left align-baseline font-mono text-[0.86em] transition ${
        copied
          ? onDark
            ? "bg-emerald-400/15 text-emerald-300"
            : "bg-emerald-600/10 text-emerald-700"
          : onDark
            ? "bg-white/10 text-gold-300 hover:bg-white/20"
            : "bg-navy-900/[0.06] text-navy-700 hover:bg-navy-900/[0.12]"
      }`}
    >
      {code}
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden
        className={`mb-0.5 ml-1 inline h-[0.8em] w-[0.8em] align-middle transition ${
          copied ? "opacity-90" : "opacity-35 group-hover/chip:opacity-80"
        }`}
      >
        {copied ? (
          <path d="m5 12.5 4 4 10-10" />
        ) : (
          <>
            <rect x="9" y="9" width="11" height="11" rx="2" />
            <path d="M5 15V5a2 2 0 0 1 2-2h10" />
          </>
        )}
      </svg>
    </button>
  );
}
