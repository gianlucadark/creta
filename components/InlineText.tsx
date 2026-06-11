/* Renderizza la notazione inline leggera ammessa dal prompt di ingest:
   `backticks` -> chip monospace copiabile, **asterisks** -> grassetto,
   URL nudi -> link. Tutto il resto viene stampato verbatim. */

import { CopyChip } from "./CopyChip";

const TOKEN =
  /(`[^`\n]+`|\*\*[^*\n]+\*\*|https?:\/\/[^\s<>"')\]]+)/g;

export function InlineText({
  text,
  onDark = false,
}: {
  text: string;
  onDark?: boolean;
}) {
  const parts = text.split(TOKEN);

  return (
    <>
      {parts.map((part, index) => {
        if (!part) return null;

        if (part.startsWith("`") && part.endsWith("`") && part.length > 2) {
          return <CopyChip key={index} code={part.slice(1, -1)} onDark={onDark} />;
        }

        if (part.startsWith("**") && part.endsWith("**") && part.length > 4) {
          return (
            <strong
              key={index}
              className={`font-semibold ${onDark ? "text-white" : "text-navy-900"}`}
            >
              {part.slice(2, -2)}
            </strong>
          );
        }

        if (/^https?:\/\//.test(part)) {
          return (
            <a
              key={index}
              href={part}
              target="_blank"
              rel="noreferrer"
              className={`break-all font-medium underline underline-offset-2 ${
                onDark
                  ? "text-gold-300 decoration-gold-300/50 hover:text-white"
                  : "text-navy-600 decoration-gold-400/70 hover:text-gold-600"
              }`}
            >
              {part}
            </a>
          );
        }

        return <span key={index}>{part}</span>;
      })}
    </>
  );
}
