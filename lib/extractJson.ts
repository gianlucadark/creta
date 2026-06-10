/* Extracts the JSON object from an LLM text response, recovering from
   markdown fences and truncated output (max-token cuts). */

/* Close whatever strings/objects/arrays are still open at the end of a
   truncated JSON prefix so it becomes parseable again. */
function closeOpenStructures(prefix: string): string {
  const stack: string[] = [];
  let inString = false;
  let escaped = false;

  for (const ch of prefix) {
    if (escaped) {
      escaped = false;
      continue;
    }
    if (inString) {
      if (ch === "\\") escaped = true;
      else if (ch === '"') inString = false;
      continue;
    }
    if (ch === '"') inString = true;
    else if (ch === "{" || ch === "[") stack.push(ch);
    else if (ch === "}" || ch === "]") stack.pop();
  }

  let repaired = prefix;
  if (inString) repaired += '"';
  repaired = repaired.replace(/[\s,:]+$/, "");
  for (let i = stack.length - 1; i >= 0; i -= 1) {
    repaired += stack[i] === "{" ? "}" : "]";
  }
  return repaired;
}

export function extractJson(raw: string): unknown {
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fenced ? fenced[1] : raw;
  const start = candidate.indexOf("{");
  if (start === -1) {
    throw new Error("Nessun oggetto JSON nell'output del modello.");
  }

  // complete object, possibly surrounded by prose
  const end = candidate.lastIndexOf("}");
  if (end > start) {
    try {
      return JSON.parse(candidate.slice(start, end + 1));
    } catch {
      // fall through to the truncation repair below
    }
  }

  const slice = candidate.slice(start).trim();
  try {
    return JSON.parse(slice);
  } catch {
    // The model output was likely truncated mid-document: walk backwards to
    // the longest prefix that can be closed into valid JSON, so the blocks
    // produced before the cut are still recovered instead of discarded.
    let work = slice;
    for (let attempt = 0; attempt < 400 && work.length > 2; attempt += 1) {
      try {
        return JSON.parse(closeOpenStructures(work));
      } catch {
        const cut = Math.max(
          work.lastIndexOf(","),
          work.lastIndexOf("{"),
          work.lastIndexOf("[")
        );
        if (cut <= 0) break;
        work = work.slice(0, cut);
      }
    }
    throw new Error("Output del modello non interpretabile come JSON.");
  }
}
