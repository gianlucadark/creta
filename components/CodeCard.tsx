"use client";

import { useRef, useState } from "react";
import { copyText } from "@/lib/clipboard";
import { tryFormatJson } from "@/lib/jsonText";

/* ── Language detection ─────────────────────────────────────── */

type Lang = "JSON" | "PowerShell" | "Shell" | "Codice";

function detectLanguage(code: string): Lang {
  if (
    /^\s*(?:New-Item|Set-Content|Get-Content|Test-Path|Copy-Item|Remove-Item|Invoke-\w+|powershell(?:\.exe)?)\b/im.test(code) ||
    /\$env:|-ExecutionPolicy|-ItemType|-NoProfile|-NoNewline/.test(code)
  ) {
    return "PowerShell";
  }
  if (/^\s*(?:claude|npm|npx|pnpm|node|git|curl|cd|ls|mkdir|echo|cat)\b/im.test(code)) {
    return "Shell";
  }
  return "Codice";
}

/* ── Syntax highlighting (tiny, dependency-free) ────────────── */

const TOKEN_STYLE = {
  key: "text-gold-300",
  string: "text-gold-200",
  number: "text-emerald-300",
  literal: "text-emerald-300 italic",
  command: "text-gold-300 font-semibold",
  variable: "text-emerald-300",
  flag: "text-navy-300",
  comment: "text-white/40 italic",
};

function pushPlain(nodes: React.ReactNode[], text: string) {
  if (text) nodes.push(text);
}

function highlightJsonLine(line: string, key: number): React.ReactNode {
  const re =
    /("(?:[^"\\]|\\.)*")(\s*:)?|(-?\b\d+(?:\.\d+)?(?:[eE][+-]?\d+)?\b)|\b(true|false|null)\b/g;
  const nodes: React.ReactNode[] = [];
  let last = 0;
  let match: RegExpExecArray | null;
  while ((match = re.exec(line)) !== null) {
    pushPlain(nodes, line.slice(last, match.index));
    if (match[1] !== undefined) {
      nodes.push(
        <span key={nodes.length} className={match[2] ? TOKEN_STYLE.key : TOKEN_STYLE.string}>
          {match[1]}
        </span>
      );
      if (match[2]) pushPlain(nodes, match[2]);
    } else if (match[3] !== undefined) {
      nodes.push(
        <span key={nodes.length} className={TOKEN_STYLE.number}>{match[3]}</span>
      );
    } else if (match[4] !== undefined) {
      nodes.push(
        <span key={nodes.length} className={TOKEN_STYLE.literal}>{match[4]}</span>
      );
    }
    last = re.lastIndex;
  }
  pushPlain(nodes, line.slice(last));
  return <span key={key}>{nodes}</span>;
}

function highlightShellLine(line: string, key: number): React.ReactNode {
  if (/^\s*#/.test(line)) {
    return (
      <span key={key} className={TOKEN_STYLE.comment}>{line}</span>
    );
  }

  const nodes: React.ReactNode[] = [];
  let rest = line;

  const head = rest.match(/^(\s*)([A-Za-z][\w.\\:-]*)/);
  if (head) {
    pushPlain(nodes, head[1]);
    nodes.push(
      <span key={nodes.length} className={TOKEN_STYLE.command}>{head[2]}</span>
    );
    rest = rest.slice(head[0].length);
  }

  const re =
    /("(?:[^"\\]|\\.)*"|'[^']*')|(\$(?:env:)?\w+|\$\{[^}]*\})|((?:^|\s)-{1,2}[A-Za-z][\w-]*)/g;
  let last = 0;
  let match: RegExpExecArray | null;
  while ((match = re.exec(rest)) !== null) {
    pushPlain(nodes, rest.slice(last, match.index));
    const cls = match[1]
      ? TOKEN_STYLE.string
      : match[2]
        ? TOKEN_STYLE.variable
        : TOKEN_STYLE.flag;
    nodes.push(
      <span key={nodes.length} className={cls}>{match[0]}</span>
    );
    last = re.lastIndex;
  }
  pushPlain(nodes, rest.slice(last));
  return <span key={key}>{nodes}</span>;
}

function highlightLine(line: string, lang: Lang, key: number): React.ReactNode {
  if (lang === "JSON") return highlightJsonLine(line, key);
  if (lang === "PowerShell" || lang === "Shell") return highlightShellLine(line, key);
  return <span key={key}>{line}</span>;
}

/* ── Component ──────────────────────────────────────────────── */

export function CodeCard({ title, code }: { title?: string; code: string }) {
  const formattedJson = tryFormatJson(code);
  const display = (formattedJson ?? code).replace(/\s+$/, "");
  const lang: Lang = formattedJson ? "JSON" : detectLanguage(display);
  const lines = display.split("\n");
  const showNumbers = lines.length >= 4;

  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  async function onCopy() {
    if (!(await copyText(display))) return;
    setCopied(true);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="creta-code-bg overflow-hidden rounded-2xl border border-navy-700/60 shadow-lg shadow-navy-950/30">
      <div className="flex items-center gap-3 border-b border-white/10 px-4 py-2.5">
        <span className="flex gap-1.5">
          <span className="h-3 w-3 rounded-full bg-gold-500" />
          <span className="h-3 w-3 rounded-full bg-gold-300" />
          <span className="h-3 w-3 rounded-full bg-navy-400" />
        </span>
        {title && (
          <p className="ml-1 min-w-0 truncate text-xs font-semibold uppercase tracking-wide text-gold-300">
            {title}
          </p>
        )}
        <span className="ml-auto hidden shrink-0 text-[0.65rem] font-bold uppercase tracking-[0.18em] text-white/35 sm:block">
          {lang}
        </span>
        <button
          type="button"
          onClick={() => void onCopy()}
          aria-label={copied ? "Copiato" : "Copia il codice"}
          className={`flex shrink-0 items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-semibold transition ${
            copied
              ? "border-emerald-400/40 bg-emerald-400/10 text-emerald-300"
              : "border-white/15 text-white/70 hover:border-white/30 hover:bg-white/10 hover:text-white"
          }`}
        >
          {copied ? (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5">
              <path d="m5 12.5 4 4 10-10" />
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5">
              <rect x="9" y="9" width="11" height="11" rx="2" />
              <path d="M5 15V5a2 2 0 0 1 2-2h10" />
            </svg>
          )}
          {copied ? "Copiato" : "Copia"}
        </button>
      </div>

      <div className="overflow-x-auto">
        <pre className="px-5 py-4 font-mono text-[0.85rem] leading-7 text-white/90">
          <code>
            {lines.map((line, index) => (
              <span key={index} className="block whitespace-pre">
                {showNumbers && (
                  <span
                    aria-hidden
                    className="mr-4 inline-block w-6 select-none text-right text-white/25"
                  >
                    {index + 1}
                  </span>
                )}
                {highlightLine(line, lang, index)}
              </span>
            ))}
          </code>
        </pre>
      </div>
    </div>
  );
}
