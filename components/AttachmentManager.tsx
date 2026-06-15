"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { Attachment } from "@/lib/schema";

/* Sezione "Allegati" in fondo alla pagina: card di download dei file caricati
   a mano + caricamento/eliminazione. I download sono semplici link alla route
   /api/files (che forza il download); l'attributo `download` dà al file il nome
   originale. Caricamento/eliminazione passano da /api/documents/<slug>/attachments. */

function formatBytes(bytes?: number): string {
  if (!bytes && bytes !== 0) return "";
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(kb < 10 ? 1 : 0)} KB`;
  return `${(kb / 1024).toFixed(1)} MB`;
}

function FileIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <path d="M14 2v6h6" />
      <path d="M9 13h6M9 17h6" />
    </svg>
  );
}

export function AttachmentManager({
  slug,
  attachments,
}: {
  slug: string;
  attachments: Attachment[];
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function upload(file: File) {
    setBusy(true);
    setError(null);
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch(`/api/documents/${slug}/attachments`, {
        method: "POST",
        body: form,
      });
      const json = (await res.json().catch(() => null)) as { error?: string } | null;
      if (!res.ok) {
        setError(json?.error ?? "Caricamento non riuscito.");
        return;
      }
      router.refresh();
    } catch {
      setError("Errore di rete. Riprova.");
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  async function remove(href: string) {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/documents/${slug}/attachments`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ href }),
      });
      const json = (await res.json().catch(() => null)) as { error?: string } | null;
      if (!res.ok) {
        setError(json?.error ?? "Eliminazione non riuscita.");
        return;
      }
      router.refresh();
    } catch {
      setError("Errore di rete. Riprova.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-4">
        <div>
          <p className="font-mono text-[0.65rem] font-semibold uppercase tracking-[0.25em] text-navy-400">
            Allegati
          </p>
          <h2 className="mt-2 font-display text-3xl font-bold text-navy-950">
            File da scaricare
          </h2>
        </div>
        <input
          ref={inputRef}
          type="file"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void upload(file);
          }}
        />
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={busy}
          className="creta-badge-grad flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-semibold text-white shadow-md shadow-navy-900/20 transition hover:-translate-y-0.5 disabled:opacity-60"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5">
            <path d="M12 5v14M5 12h14" />
          </svg>
          {busy ? "Caricamento…" : "Allega file"}
        </button>
      </div>

      {error && (
        <p className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900">
          {error}
        </p>
      )}

      {attachments.length > 0 ? (
        <ul className="mt-7 grid gap-3 sm:grid-cols-2">
          {attachments.map((file) => {
            const dl = `${file.href}${file.href.includes("?") ? "&" : "?"}dl=${encodeURIComponent(file.filename)}`;
            const ext = file.filename.split(".").pop()?.toUpperCase() ?? "FILE";
            return (
              <li
                key={file.href + file.filename}
                className="group flex items-center gap-4 rounded-2xl border border-navy-200 bg-white px-4 py-4 shadow-sm transition hover:border-gold-300 hover:shadow-md"
              >
                <span className="creta-badge-grad grid h-11 w-11 shrink-0 place-items-center rounded-xl text-white">
                  <FileIcon className="h-5 w-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold text-navy-900">
                    {file.label || file.filename}
                  </p>
                  <p className="mt-0.5 flex items-center gap-2 font-mono text-[0.68rem] font-medium uppercase tracking-wide text-navy-400">
                    <span>{ext}</span>
                    {file.size ? (
                      <>
                        <span className="h-0.5 w-0.5 rounded-full bg-navy-300" />
                        <span>{formatBytes(file.size)}</span>
                      </>
                    ) : null}
                  </p>
                </div>
                <a
                  href={dl}
                  download={file.filename}
                  className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-navy-200 text-navy-500 transition hover:border-gold-400 hover:text-gold-600"
                  aria-label={`Scarica ${file.filename}`}
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
                    <path d="M12 3v12M7 10l5 5 5-5M5 21h14" />
                  </svg>
                </a>
                <button
                  type="button"
                  onClick={() => void remove(file.href)}
                  disabled={busy}
                  className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-navy-200 text-navy-400 transition hover:border-red-300 hover:text-red-600 disabled:opacity-40"
                  aria-label={`Elimina ${file.filename}`}
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
                    <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                  </svg>
                </button>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="mt-7 rounded-2xl border border-dashed border-navy-300/60 bg-white/70 px-6 py-10 text-center text-sm leading-7 text-navy-500">
          Nessun allegato. Usa{" "}
          <span className="font-semibold text-navy-700">“Allega file”</span>{" "}
          per aggiungere script o documenti scaricabili in fondo alla pagina.
        </p>
      )}
    </div>
  );
}
