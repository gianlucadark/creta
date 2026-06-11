"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

const ACCEPTED_MIME =
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

/* Deve restare allineato a MAX_FILE_BYTES in app/api/ingest/route.ts:
   Vercel limita i body a circa 4,5 MB, quindi il server non puo' accettare
   file piu' grandi. */
const MAX_FILE_BYTES = 4 * 1024 * 1024;

const LOADING_STEPS = [
  "Lettura del documento…",
  "Analisi della struttura…",
  "Scelta dei componenti…",
  "Composizione della pagina…",
];

type State =
  | { phase: "idle" }
  | { phase: "loading"; fileName: string }
  | { phase: "conflict"; file: File; slug: string }
  | { phase: "fallback"; slug: string; title: string }
  | { phase: "error"; message: string };

export function UploadModal({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [state, setState] = useState<State>({ phase: "idle" });
  const [stepIndex, setStepIndex] = useState(0);
  const [dragging, setDragging] = useState(false);

  const isLoading = state.phase === "loading";

  useEffect(() => {
    if (!isLoading) return;
    const timer = setInterval(
      () => setStepIndex((i) => Math.min(i + 1, LOADING_STEPS.length - 1)),
      3500
    );
    return () => clearInterval(timer);
  }, [isLoading]);

  async function handleFile(file: File, mode?: "overwrite" | "copy") {
    if (!file.name.toLowerCase().endsWith(".docx") && file.type !== ACCEPTED_MIME) {
      setState({ phase: "error", message: "Carica un file Word in formato .docx." });
      return;
    }

    if (file.size > MAX_FILE_BYTES) {
      setState({ phase: "error", message: "Il file supera il limite di 4 MB." });
      return;
    }

    setStepIndex(0);
    setState({ phase: "loading", fileName: file.name });

    const body = new FormData();
    body.append("docx", file);
    if (mode) body.append("mode", mode);

    try {
      const res = await fetch("/api/ingest", { method: "POST", body });
      const json = (await res.json()) as {
        slug?: string;
        title?: string;
        engine?: string;
        error?: string;
        conflict?: boolean;
      };

      if (res.status === 409 && json.conflict && json.slug) {
        setState({ phase: "conflict", file, slug: json.slug });
        return;
      }

      if (!res.ok || !json.slug) {
        setState({ phase: "error", message: json.error ?? "Ingest non riuscito." });
        return;
      }

      if (json.engine === "fallback") {
        setState({
          phase: "fallback",
          slug: json.slug,
          title: json.title ?? json.slug,
        });
        return;
      }

      router.push(`/${json.slug}`);
      onClose();
    } catch {
      setState({ phase: "error", message: "Errore di rete. Riprova." });
    }
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) void handleFile(file);
  }

  function handleDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) void handleFile(file);
  }

  return (
    /* Sfondo modale */
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-navy-900/50 backdrop-blur-sm px-4"
      onClick={(e) => { if (e.target === e.currentTarget && !isLoading) onClose(); }}
    >
      <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl border border-navy-100 p-6 space-y-5">
        {/* Testata */}
        <div className="flex items-center justify-between">
          <h2 className="font-display text-xl font-bold text-navy-900">
            Aggiungi documento
          </h2>
          {!isLoading && (
            <button
              onClick={onClose}
              className="grid h-8 w-8 place-items-center rounded-lg text-navy-400 hover:text-navy-900 hover:bg-navy-100 transition"
              aria-label="Chiudi"
            >
              ✕
            </button>
          )}
        </div>

        {/* Corpo */}
        {state.phase === "loading" ? (
          <div className="rounded-xl border border-navy-100 bg-surface px-6 py-10 text-center space-y-4">
            <div className="creta-badge-grad mx-auto h-10 w-10 rounded-xl animate-pulse" />
            <p className="font-semibold text-navy-900">
              {LOADING_STEPS[stepIndex]}
            </p>
            <p className="text-sm text-navy-500 truncate">{state.fileName}</p>
            <div className="w-40 mx-auto h-1 rounded-full bg-navy-100 overflow-hidden">
              <div className="creta-progress-grad h-full animate-[loading_1.25s_ease-in-out_infinite] rounded-full" />
            </div>
            <p className="text-xs text-navy-400">
              Può richiedere qualche minuto per i documenti lunghi.
            </p>
          </div>
        ) : state.phase === "conflict" ? (
          <div className="rounded-xl border border-gold-300/40 bg-gold-50 px-6 py-8 text-center space-y-4">
            <p className="font-semibold text-navy-900">
              Esiste già un documento con questo nome
            </p>
            <p className="text-sm leading-6 text-navy-600">
              Nell&apos;archivio c&apos;è già una pagina creata da un file chiamato{" "}
              <span className="font-semibold text-navy-900">{state.file.name}</span>.
              Vuoi sostituirla con questa versione o tenerle entrambe?
            </p>
            <div className="flex flex-wrap justify-center gap-3">
              <button
                onClick={() => setState({ phase: "idle" })}
                className="rounded-full border border-navy-200 px-4 py-2 text-sm font-medium text-navy-700 transition hover:border-gold-400 hover:text-gold-500"
              >
                Annulla
              </button>
              <button
                onClick={() => void handleFile(state.file, "overwrite")}
                className="rounded-full border border-navy-200 px-4 py-2 text-sm font-medium text-navy-700 transition hover:border-gold-400 hover:text-gold-500"
              >
                Sostituisci
              </button>
              <button
                onClick={() => void handleFile(state.file, "copy")}
                className="creta-badge-grad rounded-full px-4 py-2 text-sm font-semibold text-white shadow-md shadow-navy-900/20 transition hover:-translate-y-0.5"
              >
                Tieni entrambi
              </button>
            </div>
          </div>
        ) : state.phase === "fallback" ? (
          <div className="rounded-xl border border-gold-300/40 bg-gold-50 px-6 py-8 text-center space-y-4">
            <p className="font-semibold text-navy-900">
              Pagina creata in modalità semplificata
            </p>
            <p className="text-sm leading-6 text-navy-600">
              L&apos;analisi automatica del layout non era disponibile in questo
              momento, quindi la pagina è stata impaginata in modo semplificato.
              Il contenuto c&apos;è tutto: puoi aprirla comunque, oppure
              riprovare più tardi.
            </p>
            <div className="flex justify-center gap-3">
              <button
                onClick={() => setState({ phase: "idle" })}
                className="rounded-full border border-navy-200 px-4 py-2 text-sm font-medium text-navy-700 transition hover:border-gold-400 hover:text-gold-500"
              >
                Riprova
              </button>
              <button
                onClick={() => {
                  router.push(`/${state.slug}`);
                  onClose();
                }}
                className="creta-badge-grad rounded-full px-4 py-2 text-sm font-semibold text-white shadow-md shadow-navy-900/20 transition hover:-translate-y-0.5"
              >
                Apri comunque
              </button>
            </div>
          </div>
        ) : (
          <div
            className={`cursor-pointer rounded-xl border-2 border-dashed px-6 py-10 text-center transition ${
              dragging
                ? "border-gold-400 bg-gold-50"
                : "border-navy-200 bg-surface hover:border-gold-400 hover:bg-white"
            }`}
            onClick={() => inputRef.current?.click()}
            onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={handleDrop}
          >
            <div className="mx-auto mb-3 grid h-11 w-11 place-items-center rounded-xl bg-navy-100 text-navy-500">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="12" y1="18" x2="12" y2="12" />
                <polyline points="9 15 12 12 15 15" />
              </svg>
            </div>
            <p className="font-semibold text-navy-900">Trascina qui il tuo .docx</p>
            <p className="mt-1 text-sm text-navy-500">oppure clicca per selezionarlo</p>
            <p className="mt-3 text-xs text-navy-400">Solo .docx · max 4 MB</p>
          </div>
        )}

        {/* Errore */}
        {state.phase === "error" && (
          <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-900">
            {state.message}
          </div>
        )}

        <input
          ref={inputRef}
          type="file"
          accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
          className="hidden"
          onChange={handleChange}
        />
      </div>
    </div>
  );
}
