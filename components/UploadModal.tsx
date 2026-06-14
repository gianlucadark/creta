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

type Segment = {
  index: number;
  title: string;
  level: number;
  charCount: number;
};

type State =
  | { phase: "idle" }
  | { phase: "analyzing"; fileName: string }
  | { phase: "select"; file: File; segments: Segment[]; selected: number[] }
  | { phase: "loading"; fileName: string }
  | { phase: "conflict"; file: File; slug: string; segments: number[] | undefined }
  | { phase: "fallback"; slug: string; title: string }
  | { phase: "error"; message: string };

export function UploadModal({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [state, setState] = useState<State>({ phase: "idle" });
  const [stepIndex, setStepIndex] = useState(0);
  const [dragging, setDragging] = useState(false);

  const isLoading = state.phase === "loading";
  /* "analyzing" e "loading" non vanno interrotte chiudendo la modale. */
  const isBusy = isLoading || state.phase === "analyzing";

  useEffect(() => {
    if (!isLoading) return;
    const timer = setInterval(
      () => setStepIndex((i) => Math.min(i + 1, LOADING_STEPS.length - 1)),
      3500
    );
    return () => clearInterval(timer);
  }, [isLoading]);

  /* Passo 1: legge la struttura del documento e mostra la scelta dei capitoli.
     Con 0 o 1 capitolo non c'e' nulla da scegliere: si genera direttamente. */
  async function analyzeFile(file: File) {
    if (!file.name.toLowerCase().endsWith(".docx") && file.type !== ACCEPTED_MIME) {
      setState({ phase: "error", message: "Carica un file Word in formato .docx." });
      return;
    }

    if (file.size > MAX_FILE_BYTES) {
      setState({ phase: "error", message: "Il file supera il limite di 4 MB." });
      return;
    }

    setState({ phase: "analyzing", fileName: file.name });

    const body = new FormData();
    body.append("docx", file);

    try {
      const res = await fetch("/api/ingest/analyze", { method: "POST", body });
      const json = (await res.json()) as {
        segments?: Segment[];
        error?: string;
      };

      if (!res.ok || !json.segments) {
        setState({ phase: "error", message: json.error ?? "Analisi non riuscita." });
        return;
      }

      if (json.segments.length <= 1) {
        // Niente da scegliere: si importa tutto.
        void generate(file);
        return;
      }

      setState({
        phase: "select",
        file,
        segments: json.segments,
        selected: json.segments.map((s) => s.index),
      });
    } catch {
      setState({ phase: "error", message: "Errore di rete. Riprova." });
    }
  }

  /* Passo 2: genera la pagina dai capitoli scelti. `selected` assente => tutto
     il documento (caso 0/1 capitolo). Su collisione di slug chiede conferma. */
  async function generate(
    file: File,
    selected?: number[],
    mode?: "overwrite" | "copy"
  ) {
    setStepIndex(0);
    setState({ phase: "loading", fileName: file.name });

    const body = new FormData();
    body.append("docx", file);
    if (mode) body.append("mode", mode);
    if (selected) body.append("segments", JSON.stringify(selected));

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
        setState({ phase: "conflict", file, slug: json.slug, segments: selected });
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
    if (file) void analyzeFile(file);
  }

  function handleDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) void analyzeFile(file);
  }

  return (
    /* Sfondo modale */
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-navy-900/50 backdrop-blur-sm px-4"
      onClick={(e) => { if (e.target === e.currentTarget && !isBusy) onClose(); }}
    >
      <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl border border-navy-100 p-6 space-y-5">
        {/* Testata */}
        <div className="flex items-center justify-between">
          <h2 className="font-display text-xl font-bold text-navy-900">
            Aggiungi documento
          </h2>
          {!isBusy && (
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
        {state.phase === "analyzing" ? (
          <div className="rounded-xl border border-navy-100 bg-surface px-6 py-10 text-center space-y-4">
            <div className="creta-badge-grad mx-auto h-10 w-10 rounded-xl animate-pulse" />
            <p className="font-semibold text-navy-900">Lettura del documento…</p>
            <p className="text-sm text-navy-500 truncate">{state.fileName}</p>
            <div className="w-40 mx-auto h-1 rounded-full bg-navy-100 overflow-hidden">
              <div className="creta-progress-grad h-full animate-[loading_1.25s_ease-in-out_infinite] rounded-full" />
            </div>
          </div>
        ) : state.phase === "select" ? (
          <SelectSegments
            segments={state.segments}
            selected={state.selected}
            onChange={(selected) => setState({ ...state, selected })}
            onCancel={() => setState({ phase: "idle" })}
            onConfirm={() => void generate(state.file, state.selected)}
          />
        ) : state.phase === "loading" ? (
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
                onClick={() => void generate(state.file, state.segments, "overwrite")}
                className="rounded-full border border-navy-200 px-4 py-2 text-sm font-medium text-navy-700 transition hover:border-gold-400 hover:text-gold-500"
              >
                Sostituisci
              </button>
              <button
                onClick={() => void generate(state.file, state.segments, "copy")}
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

/* Indici dei discendenti di un nodo: i successivi finche' il livello resta
   piu' profondo (le sotto-sezioni di un capitolo, le sotto-sotto, ecc.). */
function descendantsOf(segments: Segment[], i: number): number[] {
  const res: number[] = [];
  for (let j = i + 1; j < segments.length; j += 1) {
    if (segments[j].level <= segments[i].level) break;
    res.push(j);
  }
  return res;
}

/* Indici degli antenati di un nodo: la catena di intestazioni piu' superficiali
   che lo contengono. */
function ancestorsOf(segments: Segment[], i: number): number[] {
  const res: number[] = [];
  let level = segments[i].level;
  for (let j = i - 1; j >= 0; j -= 1) {
    if (segments[j].level < level) {
      res.push(j);
      level = segments[j].level;
    }
  }
  return res;
}

/* Scelta gerarchica di capitoli e sezioni in accordion: tutto selezionato di
   default. Spuntare un nodo include i suoi figli e i suoi antenati (per non
   perdere il contesto); toglierlo esclude l'intero sotto-albero. Le sezioni di
   un capitolo restano nascoste finche' non lo si espande. */
function SelectSegments({
  segments,
  selected,
  onChange,
  onCancel,
  onConfirm,
}: {
  segments: Segment[];
  selected: number[];
  onChange: (selected: number[]) => void;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const selectedSet = new Set(selected);
  const allSelected = selected.length === segments.length;
  const baseLevel = Math.min(...segments.map((s) => s.level));
  const orderedFrom = (set: Set<number>) =>
    segments.map((s) => s.index).filter((i) => set.has(i));

  // Raggruppa ogni capitolo di primo livello con le sue sotto-sezioni.
  const groups: { headPos: number | null; childPos: number[] }[] = [];
  segments.forEach((segment, pos) => {
    if (segment.level === baseLevel) {
      groups.push({ headPos: pos, childPos: descendantsOf(segments, pos) });
    } else if (!groups.length) {
      // Sezioni orfane prima di qualsiasi capitolo: gruppo senza testata.
      groups.push({ headPos: null, childPos: [pos] });
    }
  });

  const expandable = groups
    .filter((g) => g.headPos !== null && g.childPos.length > 0)
    .map((g) => segments[g.headPos as number].index);
  const [expanded, setExpanded] = useState<Set<number>>(new Set());
  const allExpanded =
    expandable.length > 0 && expandable.every((k) => expanded.has(k));

  function toggle(i: number) {
    const next = new Set(selectedSet);
    const subtree = [i, ...descendantsOf(segments, i)];
    if (next.has(i)) {
      subtree.forEach((k) => next.delete(k));
    } else {
      subtree.forEach((k) => next.add(k));
      ancestorsOf(segments, i).forEach((k) => next.add(k));
    }
    onChange(orderedFrom(next));
  }

  function toggleAll() {
    onChange(allSelected ? [] : segments.map((s) => s.index));
  }

  function toggleExpand(key: number) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  function toggleExpandAll() {
    setExpanded(allExpanded ? new Set() : new Set(expandable));
  }

  const formatChars = (chars: number) =>
    chars >= 1000
      ? `${Math.round(chars / 1000)} mila caratteri`
      : `${chars} caratteri`;

  // Stato di selezione del sotto-albero di un nodo.
  function nodeState(pos: number) {
    const subtree = [pos, ...descendantsOf(segments, pos)];
    const selInSubtree = subtree.filter((k) => selectedSet.has(k)).length;
    const checked = selInSubtree === subtree.length;
    return {
      checked,
      indeterminate: selInSubtree > 0 && !checked,
      totalChars: subtree.reduce((n, k) => n + segments[k].charCount, 0),
    };
  }

  function checkbox(pos: number, checked: boolean, indeterminate: boolean) {
    return (
      <input
        type="checkbox"
        checked={checked}
        ref={(el) => {
          if (el) el.indeterminate = indeterminate;
        }}
        onChange={() => toggle(pos)}
        onClick={(e) => e.stopPropagation()}
        className="h-[18px] w-[18px] shrink-0 accent-gold-500"
      />
    );
  }

  // Riga di una sezione (figlia di un capitolo), con guida verticale a sinistra.
  function sectionRow(pos: number) {
    const segment = segments[pos];
    const { checked, indeterminate, totalChars } = nodeState(pos);
    const depth = segment.level - baseLevel - 1; // 0 per le sezioni dirette
    return (
      <li key={segment.index}>
        <label
          style={{ paddingLeft: depth ? `${depth * 1.25}rem` : undefined }}
          className={`flex cursor-pointer items-center gap-3 rounded-md py-1.5 pl-3 pr-2 transition hover:bg-navy-50 ${
            checked || indeterminate ? "" : "opacity-55 hover:opacity-100"
          }`}
        >
          {checkbox(pos, checked, indeterminate)}
          <span className="min-w-0 flex-1 truncate text-sm text-navy-700">
            {segment.title}
          </span>
          <span className="shrink-0 text-xs text-navy-400">
            {formatChars(totalChars)}
          </span>
        </label>
      </li>
    );
  }

  const selectedCount = selected.length;

  return (
    <div className="space-y-3">
      <div className="flex items-end justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-navy-900">
            Scegli cosa importare
          </p>
          <p className="text-xs text-navy-500">
            {selectedCount} di {segments.length} selezionati
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-3 text-xs font-medium">
          {expandable.length > 0 && (
            <button
              onClick={toggleExpandAll}
              className="text-navy-400 transition hover:text-navy-700"
            >
              {allExpanded ? "Comprimi tutto" : "Espandi tutto"}
            </button>
          )}
          <button
            onClick={toggleAll}
            className="text-gold-500 transition hover:text-gold-600"
          >
            {allSelected ? "Deseleziona tutto" : "Seleziona tutto"}
          </button>
        </div>
      </div>

      <ul className="max-h-80 space-y-2 overflow-y-auto rounded-xl border border-navy-100 bg-surface p-2">
        {groups.map((group) => {
          if (group.headPos === null) {
            return group.childPos.map((pos) => sectionRow(pos));
          }
          const head = segments[group.headPos];
          const hasChildren = group.childPos.length > 0;
          const isOpen = expanded.has(head.index);
          const { checked, indeterminate, totalChars } = nodeState(
            group.headPos
          );
          return (
            <li
              key={head.index}
              className={`overflow-hidden rounded-lg border bg-white transition ${
                checked || indeterminate
                  ? "border-navy-200"
                  : "border-navy-100 opacity-60 hover:opacity-100"
              }`}
            >
              <div className="flex items-center gap-2 px-2.5 py-2.5">
                {checkbox(group.headPos, checked, indeterminate)}
                <button
                  type="button"
                  onClick={() => hasChildren && toggleExpand(head.index)}
                  className={`flex min-w-0 flex-1 items-center gap-2 text-left ${
                    hasChildren ? "cursor-pointer" : "cursor-default"
                  }`}
                  aria-expanded={hasChildren ? isOpen : undefined}
                >
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold text-navy-900">
                      {head.title}
                    </span>
                    <span className="text-xs text-navy-400">
                      {hasChildren
                        ? `${group.childPos.length} ${
                            group.childPos.length === 1 ? "sezione" : "sezioni"
                          } · ${formatChars(totalChars)}`
                        : formatChars(totalChars)}
                    </span>
                  </span>
                  {hasChildren && (
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className={`shrink-0 text-navy-300 transition-transform ${
                        isOpen ? "rotate-90" : ""
                      }`}
                    >
                      <polyline points="9 18 15 12 9 6" />
                    </svg>
                  )}
                </button>
              </div>
              {hasChildren && isOpen && (
                <ul className="ml-5 space-y-0.5 border-l border-navy-100 py-1 pl-1.5 pr-2">
                  {group.childPos.map((pos) => sectionRow(pos))}
                </ul>
              )}
            </li>
          );
        })}
      </ul>

      <div className="flex items-center justify-between gap-3">
        <button
          onClick={onCancel}
          className="rounded-full border border-navy-200 px-4 py-2 text-sm font-medium text-navy-700 transition hover:border-gold-400 hover:text-gold-500"
        >
          Annulla
        </button>
        <button
          onClick={onConfirm}
          disabled={selected.length === 0}
          className="creta-badge-grad rounded-full px-5 py-2 text-sm font-semibold text-white shadow-md shadow-navy-900/20 transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:translate-y-0"
        >
          Genera pagina
          {selectedCount > 0 && selectedCount < segments.length
            ? ` (${selectedCount})`
            : ""}
        </button>
      </div>
    </div>
  );
}
