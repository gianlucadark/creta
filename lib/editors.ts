import { createHmac, timingSafeEqual } from "crypto";

/* Allowlist degli editor — architettura DORMIENTE.

   Oggi il sito è un portale interno aperto: chiunque lo raggiunge può
   caricare, comporre ed eliminare documenti. Quando servirà limitare le
   modifiche alle (due) persone autorizzate dell'azienda, basterà impostare:

     CRETA_EDITORS="nome@azienda.it,altro@azienda.it"
     CRETA_AUTH_SECRET="<stringa lunga e casuale>"

   Da quel momento ogni route di mutazione (ingest, compose, extract,
   delete, patch) richiede il cookie `creta_editor`, un token HMAC-firmato
   che lega l'email di un editor in allowlist. Le route di sola lettura
   (pagine, ricerca) restano pubbliche.

   Con CRETA_EDITORS non impostata questo modulo è un no-op totale:
   nessun comportamento visibile cambia. Il pezzo mancante — da costruire
   quando si attiverà — è la route di login che, verificata l'identità,
   imposta il cookie con `signEditorToken(email)`. */

export const EDITOR_COOKIE = "creta_editor";

export function editorAllowlist(): string[] {
  return (process.env.CRETA_EDITORS ?? "")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
}

export function isAuthEnabled(): boolean {
  return editorAllowlist().length > 0;
}

function secret(): string | null {
  return process.env.CRETA_AUTH_SECRET || null;
}

function sign(email: string, key: string): string {
  return createHmac("sha256", key).update(email).digest("base64url");
}

/* Per la futura route di login: trasforma l'email di un editor nel valore
   del cookie. Restituisce null se il segreto non è configurato. */
export function signEditorToken(email: string): string | null {
  const key = secret();
  if (!key) return null;
  const normalized = email.trim().toLowerCase();
  return `${Buffer.from(normalized, "utf8").toString("base64url")}.${sign(normalized, key)}`;
}

export function verifyEditorToken(token: string): string | null {
  const key = secret();
  if (!key) return null;
  const [payload, signature] = token.split(".");
  if (!payload || !signature) return null;

  let email: string;
  try {
    email = Buffer.from(payload, "base64url").toString("utf8");
  } catch {
    return null;
  }

  const given = Buffer.from(signature, "utf8");
  const expected = Buffer.from(sign(email, key), "utf8");
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) {
    return null;
  }
  return email;
}

function cookieValue(req: Request, name: string): string | null {
  const header = req.headers.get("cookie");
  if (!header) return null;
  for (const part of header.split(";")) {
    const eq = part.indexOf("=");
    if (eq === -1) continue;
    if (part.slice(0, eq).trim() === name) {
      return decodeURIComponent(part.slice(eq + 1).trim());
    }
  }
  return null;
}

/* Guardia per le route di mutazione. Restituisce null per procedere,
   oppure la Response di rifiuto da ritornare così com'è.

   Uso, come prima riga di ogni handler che scrive su content/pages:

     const denied = authorizeEditor(req);
     if (denied) return denied; */
export function authorizeEditor(req: Request): Response | null {
  if (!isAuthEnabled()) return null;

  if (!secret()) {
    // allowlist attiva ma segreto mancante: meglio bloccare che aprire
    console.error(
      "[creta] CRETA_EDITORS è impostata ma manca CRETA_AUTH_SECRET: modifiche bloccate."
    );
    return Response.json(
      { error: "Modifiche temporaneamente non disponibili." },
      { status: 503 }
    );
  }

  const token = cookieValue(req, EDITOR_COOKIE);
  const email = token ? verifyEditorToken(token) : null;
  if (email && editorAllowlist().includes(email)) return null;

  return Response.json(
    { error: "Operazione riservata agli editor autorizzati." },
    { status: 403 }
  );
}
