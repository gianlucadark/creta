"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

const LOADING_STEPS = [
  "Lettura del testo…",
  "Analisi della struttura…",
  "Scelta dei componenti…",
  "Composizione della pagina…",
];

type Chapter = { id: number; title: string; markdown: string };

type State =
  | { phase: "idle" }
  | { phase: "loading" }
  | { phase: "fallback"; slug: string }
  | { phase: "error"; message: string };

export type WriterInitial = {
  title: string;
  summary: string;
  eyebrow?: string;
  chapters: { title: string; markdown: string }[];
};

let nextChapterId = 1;
function makeChapter(title = "", markdown = ""): Chapter {
  return { id: nextChapterId++, title, markdown };
}

const SYNTAX_ROWS: [string, string][] = [
  ["## Titolo", "sezione del capitolo"],
  ["### Titolo", "sottotitolo"],
  ["- voce", "elenco puntato"],
  ["1. voce", "elenco numerato"],
  ["**testo**", "grassetto"],
  ["`testo`", "termine tecnico"],
  ["```", "blocco di codice (apri e chiudi)"],
];

type FormatAction =
  | { type: "wrap"; before: string; after: string; placeholder: string }
  | { type: "line-prefix"; prefix: string; placeholder: string }
  | { type: "insert"; template: string };

function applyFormat(
  textarea: HTMLTextAreaElement,
  action: FormatAction,
  onChange: (value: string) => void
) {
  const { value, selectionStart: ss, selectionEnd: se } = textarea;
  const selected = value.slice(ss, se);

  let next: string;
  let cursorStart: number;
  let cursorEnd: number;

  if (action.type === "insert") {
    // Se il cursore non è a inizio riga aggiunge una riga vuota prima
    const needsNewline = ss > 0 && value[ss - 1] !== "\n";
    const insertion = (needsNewline ? "\n" : "") + action.template;
    next = value.slice(0, ss) + insertion + value.slice(se);
    cursorStart = ss + insertion.length;
    cursorEnd = cursorStart;
  } else if (action.type === "wrap") {
    const text = selected || action.placeholder;
    next =
      value.slice(0, ss) + action.before + text + action.after + value.slice(se);
    cursorStart = ss + action.before.length;
    cursorEnd = cursorStart + text.length;
  } else {
    // line-prefix: opera sulla riga corrente o sulle righe selezionate
    const lineStart = value.lastIndexOf("\n", ss - 1) + 1;
    const lineEnd = value.indexOf("\n", se);
    const end = lineEnd === -1 ? value.length : lineEnd;
    const lines = value.slice(lineStart, end).split("\n");
    const prefixed = lines.map((l) => action.prefix + l).join("\n");
    next = value.slice(0, lineStart) + prefixed + value.slice(end);
    cursorStart = lineStart + action.prefix.length;
    cursorEnd = lineStart + prefixed.length;
  }

  onChange(next);
  // Ripristina la selezione dopo il re-render
  requestAnimationFrame(() => {
    textarea.focus();
    textarea.setSelectionRange(cursorStart, cursorEnd);
  });
}

function escHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function applyInline(raw: string): string {
  let s = escHtml(raw);
  s = s.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");
  s = s.replace(
    /`([^`\n]+)`/g,
    '<code class="rounded bg-navy-100 px-1 font-mono text-[0.8em] text-navy-700">$1</code>'
  );
  return s;
}

function renderMarkdown(md: string): string {
  if (!md.trim())
    return '<p class="text-sm italic text-navy-400">Nessun contenuto ancora…</p>';

  const lines = md.split("\n");
  const output: string[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    if (line.trimStart().startsWith("```")) {
      const codeLines: string[] = [];
      i++;
      while (i < lines.length && !lines[i].trimStart().startsWith("```")) {
        codeLines.push(escHtml(lines[i]));
        i++;
      }
      output.push(
        `<pre class="my-2 overflow-x-auto rounded-lg bg-navy-900/[0.06] p-3 font-mono text-[0.78em] leading-5 text-navy-800"><code>${codeLines.join("\n")}</code></pre>`
      );
      i++;
      continue;
    }

    if (line.startsWith("|")) {
      const tableLines: string[] = [];
      while (i < lines.length && lines[i].startsWith("|")) {
        tableLines.push(lines[i]);
        i++;
      }
      const [headerRow, , ...bodyRows] = tableLines;
      const headers = (headerRow ?? "")
        .split("|")
        .filter((s) => s.trim())
        .map(
          (h) =>
            `<th class="border border-navy-200 px-2 py-1.5 text-left text-[0.75em] font-semibold bg-navy-50">${applyInline(h.trim())}</th>`
        )
        .join("");
      const body = bodyRows
        .map((row) => {
          const cells = row
            .split("|")
            .filter((s) => s.trim())
            .map(
              (c) =>
                `<td class="border border-navy-200 px-2 py-1.5 text-[0.78em]">${applyInline(c.trim())}</td>`
            )
            .join("");
          return `<tr>${cells}</tr>`;
        })
        .join("");
      output.push(
        `<div class="my-2 overflow-x-auto"><table class="w-full border-collapse text-navy-700">${
          headers ? `<thead><tr>${headers}</tr></thead>` : ""
        }${body ? `<tbody>${body}</tbody>` : ""}</table></div>`
      );
      continue;
    }

    const h2 = line.match(/^##\s+(.+)/);
    if (h2) {
      output.push(
        `<h2 class="mt-5 mb-1.5 font-display text-base font-bold text-navy-900">${applyInline(h2[1])}</h2>`
      );
      i++;
      continue;
    }

    const h3 = line.match(/^###\s+(.+)/);
    if (h3) {
      output.push(
        `<h3 class="mt-3.5 mb-1 text-sm font-semibold text-navy-800">${applyInline(h3[1])}</h3>`
      );
      i++;
      continue;
    }

    if (/^- /.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^- /.test(lines[i])) {
        items.push(`<li>${applyInline(lines[i].slice(2))}</li>`);
        i++;
      }
      output.push(
        `<ul class="my-2 ml-4 list-disc space-y-0.5 text-sm text-navy-700">${items.join("")}</ul>`
      );
      continue;
    }

    if (/^\d+\. /.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\d+\. /.test(lines[i])) {
        items.push(`<li>${applyInline(lines[i].replace(/^\d+\. /, ""))}</li>`);
        i++;
      }
      output.push(
        `<ol class="my-2 ml-4 list-decimal space-y-0.5 text-sm text-navy-700">${items.join("")}</ol>`
      );
      continue;
    }

    if (!line.trim()) {
      i++;
      continue;
    }

    output.push(
      `<p class="my-1 text-sm leading-7 text-navy-700">${applyInline(line)}</p>`
    );
    i++;
  }

  return output.join("");
}

export function WriterClient({
  slug,
  initial,
}: {
  slug?: string;
  initial?: WriterInitial;
}) {
  const router = useRouter();
  const editing = Boolean(slug);
  const [title, setTitle] = useState(initial?.title ?? "");
  const [summary, setSummary] = useState(initial?.summary ?? "");
  const [eyebrow, setEyebrow] = useState(initial?.eyebrow ?? "");
  const [chapters, setChapters] = useState<Chapter[]>(() =>
    initial && initial.chapters.length > 0
      ? initial.chapters.map((c) => makeChapter(c.title, c.markdown))
      : [makeChapter()]
  );
  const [state, setState] = useState<State>({ phase: "idle" });
  const [stepIndex, setStepIndex] = useState(0);
  const [previewMode, setPreviewMode] = useState(false);
  const textareaRefs = useRef<Map<number, HTMLTextAreaElement>>(new Map());

  const isLoading = state.phase === "loading";

  useEffect(() => {
    if (!isLoading) return;
    const timer = setInterval(
      () => setStepIndex((i) => Math.min(i + 1, LOADING_STEPS.length - 1)),
      3500
    );
    return () => clearInterval(timer);
  }, [isLoading]);

  function updateChapter(id: number, patch: Partial<Chapter>) {
    setChapters((current) =>
      current.map((c) => (c.id === id ? { ...c, ...patch } : c))
    );
  }

  function moveChapter(position: number, delta: number) {
    setChapters((current) => {
      const target = position + delta;
      if (target < 0 || target >= current.length) return current;
      const next = [...current];
      [next[position], next[target]] = [next[target], next[position]];
      return next;
    });
  }

  function removeChapter(id: number) {
    setChapters((current) =>
      current.length > 1 ? current.filter((c) => c.id !== id) : current
    );
  }

  async function submit() {
    // I capitoli completamente vuoti vengono ignorati; quelli parziali sono un errore.
    const kept = chapters.filter((c) => c.title.trim() || c.markdown.trim());
    if (!title.trim()) {
      setState({ phase: "error", message: "Dai un titolo al documento." });
      return;
    }
    if (!summary.trim()) {
      setState({ phase: "error", message: "Scrivi una breve descrizione del documento." });
      return;
    }
    if (kept.length === 0) {
      setState({ phase: "error", message: "Scrivi almeno un capitolo." });
      return;
    }
    const incomplete = kept.find((c) => !c.title.trim() || !c.markdown.trim());
    if (incomplete) {
      setState({
        phase: "error",
        message: "Ogni capitolo deve avere sia il titolo sia il testo.",
      });
      return;
    }

    setStepIndex(0);
    setState({ phase: "loading" });

    try {
      const res = await fetch(editing ? `/api/author/${slug}` : "/api/author", {
        method: editing ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          summary: summary.trim(),
          eyebrow: eyebrow.trim() || undefined,
          chapters: kept.map((c) => ({
            title: c.title.trim(),
            markdown: c.markdown,
          })),
        }),
      });
      const json = (await res.json().catch(() => null)) as {
        slug?: string;
        engine?: string;
        error?: string;
      } | null;

      if (!res.ok || !json?.slug) {
        setState({
          phase: "error",
          message: json?.error ?? "Creazione non riuscita.",
        });
        return;
      }
      if (json.engine === "fallback") {
        setState({ phase: "fallback", slug: json.slug });
        return;
      }
      router.push(`/${json.slug}`);
    } catch {
      setState({ phase: "error", message: "Errore di rete. Riprova." });
    }
  }

  const inputClass =
    "w-full rounded-xl border border-navy-200 bg-surface px-3.5 py-2.5 text-sm text-navy-900 outline-none transition focus:border-gold-400 focus:bg-white";
  const labelClass =
    "mb-1.5 block text-[0.65rem] font-bold uppercase tracking-[0.16em] text-navy-400";
  const moveButtonClass =
    "grid h-7 w-7 place-items-center rounded-lg border border-navy-100 bg-white text-navy-400 transition hover:border-gold-400 hover:text-gold-600 disabled:opacity-30";

  return (
    <div className="creta-grid-bg min-h-screen text-navy-900">
      {/* Navigazione */}
      <header className="sticky top-0 z-30 border-b border-white/10 bg-navy-950/94 px-4 py-3 text-white backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3">
          <Link href="/" className="flex items-center gap-2.5">
            <span className="creta-badge-grad grid h-9 w-9 place-items-center rounded-xl text-sm font-black text-white shadow-sm shadow-navy-900/20">
              C
            </span>
            <span className="font-display text-lg font-bold tracking-tight">Creta</span>
          </Link>
          <Link
            href={editing ? `/${slug}` : "/"}
            className="flex items-center gap-1.5 rounded-full border border-white/30 px-3.5 py-1.5 text-sm font-medium text-white transition hover:border-white/70"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5">
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
            Indietro
          </Link>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 sm:py-12">
        <p className="text-[0.65rem] font-bold uppercase tracking-[0.2em] text-navy-400">
          Fai da te
        </p>
        <h1 className="mt-1 font-display text-3xl font-bold sm:text-4xl">
          {editing ? "Modifica il documento" : "Scrivi un nuovo documento"}
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-7 text-navy-500">
          Scrivi il contenuto capitolo per capitolo: la pagina viene impaginata
          automaticamente con i componenti più adatti. Il testo resta tuo,
          parola per parola.
        </p>

        {state.phase === "loading" ? (
          <div className="mx-auto mt-12 max-w-md rounded-2xl border border-navy-100 bg-white p-6 shadow-sm">
            <div className="rounded-xl border border-navy-100 bg-surface px-6 py-10 text-center space-y-4">
              <div className="creta-badge-grad mx-auto h-10 w-10 rounded-xl animate-pulse" />
              <p className="font-semibold text-navy-900">{LOADING_STEPS[stepIndex]}</p>
              <p className="text-sm text-navy-500 truncate">{title}</p>
              <div className="w-40 mx-auto h-1 rounded-full bg-navy-100 overflow-hidden">
                <div className="creta-progress-grad h-full animate-[loading_1.25s_ease-in-out_infinite] rounded-full" />
              </div>
              <p className="text-xs text-navy-400">
                Può richiedere qualche minuto per i testi lunghi.
              </p>
            </div>
          </div>
        ) : state.phase === "fallback" ? (
          <div className="mx-auto mt-12 max-w-md rounded-2xl border border-navy-100 bg-white p-6 shadow-sm">
            <div className="rounded-xl border border-gold-300/40 bg-gold-50 px-6 py-8 text-center space-y-4">
              <p className="font-semibold text-navy-900">
                Pagina creata in modalità semplificata
              </p>
              <p className="text-sm leading-6 text-navy-600">
                L&apos;analisi automatica del layout non era disponibile in
                questo momento, quindi la pagina è stata impaginata in modo
                semplificato. Il contenuto c&apos;è tutto: puoi aprirla
                comunque, oppure riprovare più tardi.
              </p>
              <div className="flex justify-center gap-3">
                <button
                  onClick={() => setState({ phase: "idle" })}
                  className="rounded-full border border-navy-200 px-4 py-2 text-sm font-medium text-navy-700 transition hover:border-gold-400 hover:text-gold-500"
                >
                  Torna al testo
                </button>
                <button
                  onClick={() => router.push(`/${state.slug}`)}
                  className="creta-badge-grad rounded-full px-4 py-2 text-sm font-semibold text-white shadow-md shadow-navy-900/20 transition hover:-translate-y-0.5"
                >
                  Apri comunque
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="mt-8 grid gap-5 lg:grid-cols-[1fr_24rem]">
            {/* Colonna sinistra: capitoli */}
            <section className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-[0.65rem] font-bold uppercase tracking-[0.2em] text-navy-400">
                  Capitoli
                </p>
                <button
                  type="button"
                  onClick={() => setPreviewMode((v) => !v)}
                  className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition ${
                    previewMode
                      ? "border-gold-400 bg-gold-50 text-gold-700"
                      : "border-navy-200 bg-white text-navy-600 hover:border-gold-400 hover:text-gold-600"
                  }`}
                >
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="h-3.5 w-3.5"
                  >
                    <rect x="2" y="3" width="20" height="14" rx="2" />
                    <path d="M8 21h8M12 17v4" />
                  </svg>
                  {previewMode ? "Nascondi anteprima" : "Mostra anteprima"}
                </button>
              </div>
              {chapters.map((chapter, position) => (
                <div
                  key={chapter.id}
                  className="rounded-2xl border border-navy-100 bg-white p-5 shadow-sm"
                >
                  <div className="flex items-center gap-3">
                    <span className="w-6 shrink-0 text-sm font-bold tabular-nums text-navy-300">
                      {position + 1}
                    </span>
                    <input
                      value={chapter.title}
                      onChange={(e) => updateChapter(chapter.id, { title: e.target.value })}
                      placeholder="Titolo del capitolo"
                      className={inputClass}
                    />
                    <span className="flex shrink-0 gap-1">
                      <button
                        onClick={() => moveChapter(position, -1)}
                        disabled={position === 0}
                        className={moveButtonClass}
                        aria-label="Sposta su"
                      >
                        ↑
                      </button>
                      <button
                        onClick={() => moveChapter(position, 1)}
                        disabled={position === chapters.length - 1}
                        className={moveButtonClass}
                        aria-label="Sposta giù"
                      >
                        ↓
                      </button>
                      <button
                        onClick={() => removeChapter(chapter.id)}
                        disabled={chapters.length === 1}
                        className="grid h-7 w-7 place-items-center rounded-lg border border-navy-100 bg-white text-navy-300 transition hover:border-red-200 hover:bg-red-50 hover:text-red-700 disabled:opacity-30"
                        aria-label="Rimuovi capitolo"
                      >
                        ✕
                      </button>
                    </span>
                  </div>
                  {/* Toolbar di formattazione */}
                  <div className="mt-3 flex flex-wrap items-center gap-1 border-b border-navy-100 pb-2">
                    {(
                      [
                        { label: "H2", title: "Sezione (##)", extra: "", action: { type: "line-prefix", prefix: "## ", placeholder: "Titolo sezione" } },
                        { label: "H3", title: "Sottotitolo (###)", extra: "", action: { type: "line-prefix", prefix: "### ", placeholder: "Sottotitolo" } },
                        { label: "G", title: "Grassetto (**testo**)", extra: "font-bold", action: { type: "wrap", before: "**", after: "**", placeholder: "testo" } },
                        { label: "`…`", title: "Codice inline", extra: "font-mono", action: { type: "wrap", before: "`", after: "`", placeholder: "codice" } },
                        { label: "• lista", title: "Elenco puntato", extra: "", action: { type: "line-prefix", prefix: "- ", placeholder: "voce" } },
                        { label: "tabella", title: "Inserisci tabella", extra: "", action: { type: "insert", template: "| Colonna 1 | Colonna 2 |\n|-----------|----------|\n| cella     | cella     |\n" } },
                      ] as { label: string; title: string; extra: string; action: FormatAction }[]
                    ).map(({ label, title, extra, action }) => (
                      <button
                        key={label}
                        type="button"
                        title={title}
                        onMouseDown={(e) => {
                          e.preventDefault();
                          const ta = textareaRefs.current.get(chapter.id);
                          if (ta)
                            applyFormat(ta, action, (v) =>
                              updateChapter(chapter.id, { markdown: v })
                            );
                        }}
                        className={`rounded border border-navy-100 bg-white px-2 py-0.5 text-xs text-navy-600 transition hover:border-gold-400 hover:text-gold-700 ${extra}`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                  {previewMode ? (
                    <div className="mt-2 grid gap-3 sm:grid-cols-2">
                      <textarea
                        ref={(el) => {
                          if (el) textareaRefs.current.set(chapter.id, el);
                          else textareaRefs.current.delete(chapter.id);
                        }}
                        value={chapter.markdown}
                        onChange={(e) =>
                          updateChapter(chapter.id, { markdown: e.target.value })
                        }
                        rows={10}
                        placeholder={
                          "Scrivi qui il contenuto del capitolo.\n\n## Una sezione\nIl testo della sezione…\n\n- un elenco\n- di punti"
                        }
                        className={`${inputClass} min-h-[15rem] resize-y font-mono text-[0.85rem] leading-6`}
                      />
                      <div
                        className="min-h-[15rem] overflow-y-auto rounded-xl border border-navy-100 bg-surface p-4"
                        dangerouslySetInnerHTML={{
                          __html: renderMarkdown(chapter.markdown),
                        }}
                      />
                    </div>
                  ) : (
                    <textarea
                      ref={(el) => {
                        if (el) textareaRefs.current.set(chapter.id, el);
                        else textareaRefs.current.delete(chapter.id);
                      }}
                      value={chapter.markdown}
                      onChange={(e) =>
                        updateChapter(chapter.id, { markdown: e.target.value })
                      }
                      rows={10}
                      placeholder={
                        "Scrivi qui il contenuto del capitolo.\n\n## Una sezione\nIl testo della sezione…\n\n- un elenco\n- di punti"
                      }
                      className={`${inputClass} mt-2 resize-y font-mono text-[0.85rem] leading-6`}
                    />
                  )}
                </div>
              ))}
              <button
                onClick={() => setChapters((current) => [...current, makeChapter()])}
                className="w-full rounded-2xl border-2 border-dashed border-navy-200 bg-white/60 px-5 py-4 text-sm font-medium text-navy-500 transition hover:border-gold-400 hover:text-gold-600"
              >
                + Aggiungi capitolo
              </button>
            </section>

            {/* Colonna destra: metadati documento e aiuto */}
            <section className="h-fit space-y-5 rounded-2xl border border-navy-100 bg-white p-5 shadow-sm lg:sticky lg:top-20">
              <div>
                <label className={labelClass}>Titolo del documento</label>
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Es. Guida all'onboarding"
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>Descrizione</label>
                <textarea
                  value={summary}
                  onChange={(e) => setSummary(e.target.value)}
                  rows={3}
                  placeholder="Una o due frasi che presentano il documento."
                  className={`${inputClass} resize-y`}
                />
              </div>
              <div>
                <label className={labelClass}>Etichetta (opzionale)</label>
                <input
                  value={eyebrow}
                  onChange={(e) => setEyebrow(e.target.value)}
                  placeholder="Es. Manuale operativo"
                  className={inputClass}
                />
              </div>

              <details className="rounded-xl border border-navy-100 bg-surface px-4 py-3 text-sm open:pb-4">
                <summary className="cursor-pointer font-semibold text-navy-700">
                  Come si formatta il testo
                </summary>
                <ul className="mt-3 space-y-1.5">
                  {SYNTAX_ROWS.map(([syntax, label]) => (
                    <li key={syntax} className="flex items-baseline gap-3">
                      <code className="shrink-0 rounded bg-navy-800/[0.07] px-1.5 py-0.5 font-mono text-[0.75rem] text-navy-800">
                        {syntax}
                      </code>
                      <span className="text-xs text-navy-500">{label}</span>
                    </li>
                  ))}
                </ul>
                <p className="mt-3 text-xs font-semibold text-navy-700">
                  Per una tabella, una riga per ogni riga della tabella:
                </p>
                <pre className="mt-1.5 overflow-x-auto rounded-lg bg-navy-800/[0.07] px-3 py-2 font-mono text-[0.75rem] leading-5 text-navy-800">
{`| Piano | Prezzo |
|-------|--------|
| Free  | 0€     |`}
                </pre>
              </details>

              {state.phase === "error" && (
                <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900">
                  {state.message}
                </div>
              )}

              <button
                onClick={() => void submit()}
                className="creta-badge-grad w-full rounded-full px-5 py-3 text-sm font-semibold text-white shadow-md shadow-navy-900/20 transition hover:-translate-y-0.5"
              >
                {editing ? "Rigenera la pagina" : "Crea la pagina"}
              </button>
            </section>
          </div>
        )}
      </main>
    </div>
  );
}
