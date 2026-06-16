"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createPortal } from "react-dom";
import type { PageDesignBlock } from "@/lib/schema";

/* Editor manuale per-sezione, montato sul dettaglio del documento. Modifica
   verbatim i blocchi gia' salvati (nessun LLM): il salvataggio passa per
   PATCH /api/documents/<slug> con { sections: [{ index, title, intro, blocks }] }
   e i blocchi vengono ri-validati lato server da normalizeBlocks. */

type SectionData = {
  title: string;
  intro?: string;
  blocks: PageDesignBlock[];
};

type BlockType = PageDesignBlock["type"];

/* Tipi creabili dal menu "Aggiungi blocco": `image` e' escluso perche' le
   immagini provengono dallo store dell'ingest, non si inventano a mano. */
const ADDABLE_TYPES: { type: BlockType; label: string }[] = [
  { type: "paragraph", label: "Paragrafo" },
  { type: "callout", label: "Nota / avviso" },
  { type: "list", label: "Elenco puntato" },
  { type: "checklist", label: "Checklist" },
  { type: "steps", label: "Passi numerati" },
  { type: "timeline", label: "Timeline" },
  { type: "cards", label: "Schede" },
  { type: "feature", label: "Feature" },
  { type: "accordion", label: "Accordion (FAQ)" },
  { type: "spec", label: "Scheda campi" },
  { type: "compare", label: "Confronto 2 colonne" },
  { type: "stats", label: "Statistiche" },
  { type: "quote", label: "Citazione" },
  { type: "table", label: "Tabella" },
  { type: "code", label: "Codice" },
];

const TYPE_LABEL: Record<BlockType, string> = {
  paragraph: "Paragrafo",
  callout: "Nota / avviso",
  list: "Elenco puntato",
  checklist: "Checklist",
  steps: "Passi numerati",
  timeline: "Timeline",
  cards: "Schede",
  feature: "Feature",
  accordion: "Accordion",
  spec: "Scheda campi",
  compare: "Confronto",
  stats: "Statistiche",
  quote: "Citazione",
  table: "Tabella",
  code: "Codice",
  image: "Immagine",
};

function emptyBlock(type: BlockType): PageDesignBlock {
  switch (type) {
    case "paragraph":
      return { type: "paragraph", text: "" };
    case "callout":
      return { type: "callout", tone: "info", text: "" };
    case "list":
      return { type: "list", items: [""] };
    case "checklist":
      return { type: "checklist", items: [""] };
    case "steps":
      return { type: "steps", items: [{ text: "" }] };
    case "timeline":
      return { type: "timeline", items: [{ text: "" }] };
    case "cards":
      return { type: "cards", items: [{ text: "" }] };
    case "feature":
      return { type: "feature", items: [{ text: "" }] };
    case "accordion":
      return { type: "accordion", items: [{ title: "", text: "" }] };
    case "spec":
      return { type: "spec", items: [{ term: "", definition: "" }] };
    case "compare":
      return {
        type: "compare",
        left: { heading: "", items: [""] },
        right: { heading: "", items: [""] },
      };
    case "stats":
      return { type: "stats", items: [{ value: "", label: "" }] };
    case "quote":
      return { type: "quote", text: "" };
    case "table":
      return { type: "table", headers: ["", ""], rows: [["", ""]] };
    case "code":
      return { type: "code", code: "" };
    case "image":
      return { type: "image", src: "" };
  }
}

/* ── Classi condivise (allineate a EditDocButton) ───────────────── */

const inputClass =
  "w-full rounded-xl border border-navy-200 bg-surface px-3.5 py-2.5 text-[0.92rem] text-navy-900 outline-none transition focus:border-gold-400 focus:bg-white";
const labelClass =
  "mb-1.5 block text-[0.66rem] font-bold uppercase tracking-[0.16em] text-navy-400";
const iconBtn =
  "grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-navy-100 bg-white text-navy-400 transition hover:border-red-300 hover:text-red-500";
const addBtn =
  "rounded-full border border-dashed border-navy-300 px-3.5 py-1.5 text-[0.82rem] font-semibold text-navy-500 transition hover:border-gold-400 hover:text-gold-600";

/* ── Editor di liste di stringhe (list, checklist, compare, table cols) ── */

function StringList({
  items,
  onChange,
  placeholder,
  multiline = false,
}: {
  items: string[];
  onChange: (next: string[]) => void;
  placeholder?: string;
  multiline?: boolean;
}) {
  return (
    <div className="space-y-2">
      {items.map((item, i) => (
        <div key={i} className="flex items-start gap-2">
          {multiline ? (
            <textarea
              value={item}
              placeholder={placeholder}
              rows={2}
              onChange={(e) =>
                onChange(items.map((v, j) => (j === i ? e.target.value : v)))
              }
              className={`${inputClass} resize-y leading-6`}
            />
          ) : (
            <input
              value={item}
              placeholder={placeholder}
              onChange={(e) =>
                onChange(items.map((v, j) => (j === i ? e.target.value : v)))
              }
              className={inputClass}
            />
          )}
          <button
            type="button"
            onClick={() => onChange(items.filter((_, j) => j !== i))}
            disabled={items.length === 1}
            className={`${iconBtn} disabled:opacity-30`}
            aria-label="Rimuovi voce"
          >
            &times;
          </button>
        </div>
      ))}
      <button type="button" onClick={() => onChange([...items, ""])} className={addBtn}>
        + Aggiungi voce
      </button>
    </div>
  );
}

/* ── Editor di item { title?, text } (steps, timeline, cards, feature) ── */

type TitledItem = { title?: string; text: string };

function TitledItemsEditor({
  items,
  onChange,
  requireTitle = false,
}: {
  items: TitledItem[];
  onChange: (next: TitledItem[]) => void;
  requireTitle?: boolean;
}) {
  const update = (i: number, patch: Partial<TitledItem>) =>
    onChange(items.map((it, j) => (j === i ? { ...it, ...patch } : it)));
  return (
    <div className="space-y-3">
      {items.map((item, i) => (
        <div
          key={i}
          className="space-y-2 rounded-xl border border-navy-100 bg-white p-3"
        >
          <div className="flex items-center gap-2">
            <input
              value={item.title ?? ""}
              placeholder={requireTitle ? "Titolo" : "Titolo (facoltativo)"}
              onChange={(e) => update(i, { title: e.target.value })}
              className={inputClass}
            />
            <button
              type="button"
              onClick={() => onChange(items.filter((_, j) => j !== i))}
              disabled={items.length === 1}
              className={`${iconBtn} disabled:opacity-30`}
              aria-label="Rimuovi elemento"
            >
              &times;
            </button>
          </div>
          <textarea
            value={item.text}
            placeholder="Testo"
            rows={2}
            onChange={(e) => update(i, { text: e.target.value })}
            className={`${inputClass} resize-y leading-6`}
          />
        </div>
      ))}
      <button
        type="button"
        onClick={() => onChange([...items, { title: "", text: "" }])}
        className={addBtn}
      >
        + Aggiungi elemento
      </button>
    </div>
  );
}

/* ── Editor tabella (header + righe, aggiunta/rimozione colonne e righe) ── */

function TableEditor({
  headers,
  rows,
  onChange,
}: {
  headers: string[];
  rows: string[][];
  onChange: (next: { headers: string[]; rows: string[][] }) => void;
}) {
  const cols = headers.length;
  const setHeaders = (h: string[]) => onChange({ headers: h, rows });
  const setRows = (r: string[][]) => onChange({ headers, rows: r });

  const addColumn = () =>
    onChange({
      headers: [...headers, ""],
      rows: rows.map((r) => [...r, ""]),
    });
  const removeColumn = (c: number) =>
    onChange({
      headers: headers.filter((_, j) => j !== c),
      rows: rows.map((r) => r.filter((_, j) => j !== c)),
    });

  return (
    <div className="space-y-2 overflow-x-auto">
      <div className="flex items-center gap-2">
        {headers.map((h, c) => (
          <div key={c} className="flex min-w-[8rem] flex-1 items-center gap-1">
            <input
              value={h}
              placeholder={`Col ${c + 1}`}
              onChange={(e) =>
                setHeaders(headers.map((v, j) => (j === c ? e.target.value : v)))
              }
              className={`${inputClass} font-semibold`}
            />
            <button
              type="button"
              onClick={() => removeColumn(c)}
              disabled={cols === 1}
              className={`${iconBtn} disabled:opacity-30`}
              aria-label="Rimuovi colonna"
            >
              &times;
            </button>
          </div>
        ))}
      </div>
      {rows.map((row, r) => (
        <div key={r} className="flex items-center gap-2">
          {Array.from({ length: cols }).map((_, c) => (
            <input
              key={c}
              value={row[c] ?? ""}
              placeholder={`R${r + 1}C${c + 1}`}
              onChange={(e) =>
                setRows(
                  rows.map((rr, ri) =>
                    ri === r
                      ? rr.map((v, ci) => (ci === c ? e.target.value : v))
                      : rr
                  )
                )
              }
              className={`${inputClass} min-w-[8rem] flex-1`}
            />
          ))}
          <button
            type="button"
            onClick={() => setRows(rows.filter((_, j) => j !== r))}
            disabled={rows.length === 1}
            className={`${iconBtn} disabled:opacity-30`}
            aria-label="Rimuovi riga"
          >
            &times;
          </button>
        </div>
      ))}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setRows([...rows, Array.from({ length: cols }, () => "")])}
          className={addBtn}
        >
          + Riga
        </button>
        <button type="button" onClick={addColumn} className={addBtn}>
          + Colonna
        </button>
      </div>
    </div>
  );
}

/* ── Dispatcher: form specifico per ciascun tipo di blocco ──────── */

function BlockEditor({
  block,
  onChange,
}: {
  block: PageDesignBlock;
  onChange: (next: PageDesignBlock) => void;
}) {
  switch (block.type) {
    case "paragraph":
      return (
        <textarea
          value={block.text}
          rows={3}
          onChange={(e) => onChange({ type: "paragraph", text: e.target.value })}
          className={`${inputClass} resize-y leading-7`}
        />
      );
    case "quote":
      return (
        <div className="space-y-2">
          <textarea
            value={block.text}
            rows={2}
            placeholder="Testo della citazione"
            onChange={(e) => onChange({ ...block, text: e.target.value })}
            className={`${inputClass} resize-y leading-7`}
          />
          <input
            value={block.attribution ?? ""}
            placeholder="Attribuzione (facoltativa)"
            onChange={(e) =>
              onChange({ ...block, attribution: e.target.value || undefined })
            }
            className={inputClass}
          />
        </div>
      );
    case "code":
      return (
        <div className="space-y-2">
          <input
            value={block.title ?? ""}
            placeholder="Titolo (facoltativo)"
            onChange={(e) =>
              onChange({ ...block, title: e.target.value || undefined })
            }
            className={inputClass}
          />
          <textarea
            value={block.code}
            rows={5}
            placeholder="Codice"
            onChange={(e) => onChange({ ...block, code: e.target.value })}
            className={`${inputClass} resize-y font-mono text-[0.85rem] leading-6`}
          />
        </div>
      );
    case "callout":
      return (
        <div className="space-y-2">
          <div className="flex gap-2">
            <select
              value={block.tone}
              onChange={(e) =>
                onChange({
                  ...block,
                  tone: e.target.value as "info" | "warning" | "success",
                })
              }
              className={`${inputClass} max-w-[10rem]`}
            >
              <option value="info">Info</option>
              <option value="warning">Avviso</option>
              <option value="success">Successo</option>
            </select>
            <input
              value={block.title ?? ""}
              placeholder="Titolo (facoltativo)"
              onChange={(e) =>
                onChange({ ...block, title: e.target.value || undefined })
              }
              className={inputClass}
            />
          </div>
          <textarea
            value={block.text}
            rows={2}
            placeholder="Testo"
            onChange={(e) => onChange({ ...block, text: e.target.value })}
            className={`${inputClass} resize-y leading-6`}
          />
        </div>
      );
    case "list":
    case "checklist":
      return (
        <StringList
          items={block.items}
          onChange={(items) => onChange({ ...block, items })}
          placeholder="Voce dell'elenco"
        />
      );
    case "steps":
    case "timeline":
    case "cards":
    case "feature":
      return (
        <TitledItemsEditor
          items={block.items}
          onChange={(items) => onChange({ ...block, items })}
        />
      );
    case "accordion":
      return (
        <TitledItemsEditor
          items={block.items}
          requireTitle
          onChange={(items) =>
            onChange({
              ...block,
              items: items.map((it) => ({
                title: it.title ?? "",
                text: it.text,
              })),
            })
          }
        />
      );
    case "spec":
      return (
        <div className="space-y-2">
          {block.items.map((item, i) => (
            <div key={i} className="flex items-start gap-2">
              <input
                value={item.term}
                placeholder="Termine"
                onChange={(e) =>
                  onChange({
                    ...block,
                    items: block.items.map((it, j) =>
                      j === i ? { ...it, term: e.target.value } : it
                    ),
                  })
                }
                className={`${inputClass} max-w-[12rem]`}
              />
              <input
                value={item.definition}
                placeholder="Definizione"
                onChange={(e) =>
                  onChange({
                    ...block,
                    items: block.items.map((it, j) =>
                      j === i ? { ...it, definition: e.target.value } : it
                    ),
                  })
                }
                className={inputClass}
              />
              <button
                type="button"
                onClick={() =>
                  onChange({
                    ...block,
                    items: block.items.filter((_, j) => j !== i),
                  })
                }
                disabled={block.items.length === 1}
                className={`${iconBtn} disabled:opacity-30`}
                aria-label="Rimuovi"
              >
                &times;
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={() =>
              onChange({
                ...block,
                items: [...block.items, { term: "", definition: "" }],
              })
            }
            className={addBtn}
          >
            + Aggiungi campo
          </button>
        </div>
      );
    case "stats":
      return (
        <div className="space-y-2">
          {block.items.map((item, i) => (
            <div key={i} className="flex items-start gap-2">
              <input
                value={item.value}
                placeholder="Valore"
                onChange={(e) =>
                  onChange({
                    ...block,
                    items: block.items.map((it, j) =>
                      j === i ? { ...it, value: e.target.value } : it
                    ),
                  })
                }
                className={`${inputClass} max-w-[8rem]`}
              />
              <input
                value={item.label}
                placeholder="Etichetta"
                onChange={(e) =>
                  onChange({
                    ...block,
                    items: block.items.map((it, j) =>
                      j === i ? { ...it, label: e.target.value } : it
                    ),
                  })
                }
                className={inputClass}
              />
              <button
                type="button"
                onClick={() =>
                  onChange({
                    ...block,
                    items: block.items.filter((_, j) => j !== i),
                  })
                }
                disabled={block.items.length === 1}
                className={`${iconBtn} disabled:opacity-30`}
                aria-label="Rimuovi"
              >
                &times;
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={() =>
              onChange({
                ...block,
                items: [...block.items, { value: "", label: "" }],
              })
            }
            className={addBtn}
          >
            + Aggiungi statistica
          </button>
        </div>
      );
    case "compare":
      return (
        <div className="grid gap-3 sm:grid-cols-2">
          {(["left", "right"] as const).map((side) => (
            <div key={side} className="space-y-2 rounded-xl border border-navy-100 bg-white p-3">
              <input
                value={block[side].heading}
                placeholder="Intestazione colonna"
                onChange={(e) =>
                  onChange({
                    ...block,
                    [side]: { ...block[side], heading: e.target.value },
                  })
                }
                className={`${inputClass} font-semibold`}
              />
              <StringList
                items={block[side].items}
                onChange={(items) =>
                  onChange({ ...block, [side]: { ...block[side], items } })
                }
                placeholder="Voce"
              />
            </div>
          ))}
        </div>
      );
    case "table":
      return (
        <TableEditor
          headers={block.headers}
          rows={block.rows}
          onChange={({ headers, rows }) => onChange({ ...block, headers, rows })}
        />
      );
    case "image":
      return (
        <div className="space-y-2">
          <p className="rounded-lg bg-surface px-3 py-2 text-[0.8rem] text-navy-500">
            Immagine dello store: <code className="break-all">{block.src}</code>
          </p>
          <input
            value={block.alt ?? ""}
            placeholder="Testo alternativo"
            onChange={(e) =>
              onChange({ ...block, alt: e.target.value || undefined })
            }
            className={inputClass}
          />
          <input
            value={block.caption ?? ""}
            placeholder="Didascalia"
            onChange={(e) =>
              onChange({ ...block, caption: e.target.value || undefined })
            }
            className={inputClass}
          />
        </div>
      );
  }
}

/* ── Componente principale ──────────────────────────────────────── */

export function SectionEditButton({
  slug,
  sectionIndex,
  section,
}: {
  slug: string;
  sectionIndex: number;
  section: SectionData;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);

  const [title, setTitle] = useState(section.title);
  const [intro, setIntro] = useState(section.intro ?? "");
  const [blocks, setBlocks] = useState<PageDesignBlock[]>(section.blocks);

  function reset() {
    setTitle(section.title);
    setIntro(section.intro ?? "");
    setBlocks(section.blocks);
    setError(null);
    setAdding(false);
  }

  function close() {
    if (saving) return;
    setOpen(false);
    reset();
  }

  function updateBlock(i: number, next: PageDesignBlock) {
    setBlocks((cur) => cur.map((b, j) => (j === i ? next : b)));
  }
  function deleteBlock(i: number) {
    setBlocks((cur) => cur.filter((_, j) => j !== i));
  }
  function moveBlock(i: number, delta: number) {
    setBlocks((cur) => {
      const target = i + delta;
      if (target < 0 || target >= cur.length) return cur;
      const next = [...cur];
      [next[i], next[target]] = [next[target], next[i]];
      return next;
    });
  }
  function addBlock(type: BlockType) {
    setBlocks((cur) => [...cur, emptyBlock(type)]);
    setAdding(false);
  }

  async function save() {
    if (!title.trim()) {
      setError("Il titolo della sezione non può essere vuoto.");
      return;
    }
    if (blocks.length === 0) {
      setError("La sezione deve contenere almeno un blocco.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/documents/${slug}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sections: [{ index: sectionIndex, title, intro, blocks }],
        }),
      });
      const json = (await res.json().catch(() => null)) as {
        error?: string;
      } | null;
      if (!res.ok) {
        setError(json?.error ?? "Salvataggio non riuscito.");
        return;
      }
      setOpen(false);
      router.refresh();
    } catch {
      setError("Errore di rete. Riprova.");
    } finally {
      setSaving(false);
    }
  }

  const modal =
    open && typeof document !== "undefined"
      ? createPortal(
          <div
            className="fixed inset-0 z-[9999] flex items-start justify-center overflow-y-auto bg-navy-900/65 p-3 backdrop-blur-sm sm:p-6"
            role="dialog"
            aria-modal="true"
            aria-label="Modifica sezione"
            onClick={(e) => {
              if (e.target === e.currentTarget) close();
            }}
          >
            <div className="my-auto flex max-h-[calc(100vh-1.5rem)] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-navy-100 bg-white shadow-2xl sm:max-h-[calc(100vh-3rem)]">
              <div className="flex items-start justify-between gap-4 border-b border-navy-100 px-5 py-5 sm:px-7 sm:py-6">
                <div className="min-w-0">
                  <p className="text-[0.65rem] font-bold uppercase tracking-[0.2em] text-gold-600">
                    Sezione {String(sectionIndex + 1).padStart(2, "0")}
                  </p>
                  <h2 className="mt-1 break-words font-display text-2xl font-bold leading-tight text-navy-900">
                    Modifica contenuti
                  </h2>
                </div>
                {!saving && (
                  <button
                    onClick={close}
                    className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-navy-400 transition hover:bg-navy-100 hover:text-navy-900"
                    aria-label="Chiudi"
                  >
                    &times;
                  </button>
                )}
              </div>

              <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-5 py-5 sm:px-7 sm:py-6">
                <div>
                  <label className={labelClass}>Titolo sezione</label>
                  <input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className={labelClass}>Introduzione (facoltativa)</label>
                  <textarea
                    value={intro}
                    onChange={(e) => setIntro(e.target.value)}
                    rows={2}
                    className={`${inputClass} resize-y leading-6`}
                  />
                </div>

                <div className="space-y-3">
                  <label className={labelClass}>Blocchi</label>
                  {blocks.map((block, i) => (
                    <div
                      key={i}
                      className="rounded-2xl border border-navy-200 bg-surface/50 p-4"
                    >
                      <div className="mb-3 flex items-center justify-between gap-3">
                        <span className="rounded-full bg-navy-900 px-2.5 py-1 text-[0.62rem] font-bold uppercase tracking-wide text-white">
                          {TYPE_LABEL[block.type]}
                        </span>
                        <div className="flex gap-1">
                          <button
                            type="button"
                            onClick={() => moveBlock(i, -1)}
                            disabled={i === 0}
                            className="grid h-8 w-8 place-items-center rounded-lg border border-navy-100 bg-white text-navy-400 transition hover:border-gold-400 hover:text-gold-600 disabled:opacity-30"
                            aria-label="Sposta su"
                          >
                            &uarr;
                          </button>
                          <button
                            type="button"
                            onClick={() => moveBlock(i, 1)}
                            disabled={i === blocks.length - 1}
                            className="grid h-8 w-8 place-items-center rounded-lg border border-navy-100 bg-white text-navy-400 transition hover:border-gold-400 hover:text-gold-600 disabled:opacity-30"
                            aria-label="Sposta giù"
                          >
                            &darr;
                          </button>
                          <button
                            type="button"
                            onClick={() => deleteBlock(i)}
                            className="grid h-8 w-8 place-items-center rounded-lg border border-navy-100 bg-white text-navy-400 transition hover:border-red-300 hover:text-red-500"
                            aria-label="Elimina blocco"
                          >
                            &times;
                          </button>
                        </div>
                      </div>
                      <BlockEditor block={block} onChange={(next) => updateBlock(i, next)} />
                    </div>
                  ))}

                  {adding ? (
                    <div className="rounded-2xl border border-dashed border-navy-300 p-4">
                      <p className={labelClass}>Scegli il tipo di blocco</p>
                      <div className="flex flex-wrap gap-2">
                        {ADDABLE_TYPES.map(({ type, label }) => (
                          <button
                            key={type}
                            type="button"
                            onClick={() => addBlock(type)}
                            className="rounded-full border border-navy-200 bg-white px-3 py-1.5 text-[0.82rem] font-medium text-navy-700 transition hover:border-gold-400 hover:text-gold-600"
                          >
                            {label}
                          </button>
                        ))}
                      </div>
                      <button
                        type="button"
                        onClick={() => setAdding(false)}
                        className="mt-3 text-[0.8rem] font-medium text-navy-400 hover:text-navy-700"
                      >
                        Annulla
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setAdding(true)}
                      className="w-full rounded-2xl border border-dashed border-navy-300 py-3 text-sm font-semibold text-navy-500 transition hover:border-gold-400 hover:text-gold-600"
                    >
                      + Aggiungi blocco
                    </button>
                  )}
                </div>

                <p className="text-[0.78rem] leading-6 text-navy-400">
                  Markup inline: <code>`codice`</code> per i token tecnici,{" "}
                  <code>**grassetto**</code> per il grassetto. Il testo resta
                  verbatim.
                </p>
              </div>

              {error && (
                <div className="mx-5 mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900 sm:mx-7">
                  {error}
                </div>
              )}

              <div className="flex flex-col-reverse gap-3 border-t border-navy-100 px-5 py-4 sm:flex-row sm:justify-end sm:px-7">
                <button
                  onClick={close}
                  disabled={saving}
                  className="rounded-full border border-navy-200 px-4 py-2 text-sm font-medium text-navy-700 transition hover:border-gold-400 hover:text-gold-500 disabled:opacity-50"
                >
                  Annulla
                </button>
                <button
                  onClick={() => void save()}
                  disabled={saving}
                  className="creta-badge-grad rounded-full px-5 py-2 text-sm font-semibold text-white shadow-md shadow-navy-900/20 transition hover:-translate-y-0.5 disabled:opacity-60"
                >
                  {saving ? "Salvataggio..." : "Salva"}
                </button>
              </div>
            </div>
          </div>,
          document.body
        )
      : null;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 rounded-full border border-navy-200 bg-white px-3.5 py-1.5 text-[0.78rem] font-semibold text-navy-600 shadow-sm transition hover:border-gold-400 hover:text-gold-600"
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
          <path d="M12 20h9M16.376 3.622a1 1 0 0 1 3.002 3.002L7.368 18.635a2 2 0 0 1-.855.506l-2.872.838a.5.5 0 0 1-.62-.62l.838-2.872a2 2 0 0 1 .506-.854z" />
        </svg>
        Modifica sezione
      </button>
      {modal}
    </>
  );
}
