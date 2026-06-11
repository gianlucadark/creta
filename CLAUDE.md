@AGENTS.md

# Creta — Generative UI Engine

## Principio fondante (NON NEGOZIABILE)

Il modello LLM **non genera mai contenuto testuale né HTML**. Legge la struttura del documento sorgente e la mappa su blocchi tipizzati pre-approvati. Ogni stringa nei blocchi JSON deve essere copiata verbatim dal documento — mai riscritta, riassunta, né parafrasata. L'unica notazione ammessa è il markup inline leggero (backtick per token tecnici, `**` per grassetto) che marca il testo verbatim senza alterarlo.

## I due momenti separati (non si toccano mai)

### 1. INGEST (authoring — map-reduce: una chiamata LLM per capitolo)
L'utente carica un `.docx` dalla home (`UploadModal` → `POST /api/ingest`). La pipeline è in `lib/ingestDocx.ts` (condivisa con `scripts/reingest.ts`):
1. converte il docx con **mammoth** in HTML semantico; `lib/docxHtml.ts` rimuove sommario e marcatori di nota, poi **divide il documento in un chunk per capitolo `<h1>`** (i capitoli oltre ~18k caratteri sono sotto-divisi ai confini `<h2>`/`<h3>`)
2. **map**: i chunk vanno a Gemini in parallelo (max 4 concorrenti) con il system prompt di `chapterSystemPrompt(n, withMeta)` (`lib/pageDesignPrompt.ts`), che obbliga: ogni `<h2>` → una sezione col titolo verbatim, `<h3>`/`<h4>` visibili come titoli dei blocchi. Per risparmiare chiamate: capitoli interi piccoli e adiacenti condividono una sola chiamata multi-capitolo (`buildCallGroups` in `lib/ingestDocx.ts`), e la **prima chiamata produce anche il `page` header** dalla copertina; `PAGE_META_PROMPT` resta solo come chiamata di fallback se la prima non restituisce un header valido. Sempre `generateText`, mai `generateObject` — vedi sotto
3. ogni risposta passa per `extractJson` (ripara output troncati) + `normalizeDesignSections` (`lib/schema.ts`), poi `lib/coverage.ts` misura la **copertura testuale** per capitolo: sotto 0.8 si ritenta (un capitolo fallito in una chiamata raggruppata viene rifatto con la chiamata singola), poi il chunk è ricostruito deterministicamente dal proprio HTML con `lib/htmlDesign.ts` (cheerio: h2/h3→sezioni, p/ul/table→blocchi) — un capitolo non può mai sparire
4. **reduce**: le sezioni dei chunk sono concatenate in ordine documento (le aperture dei chunk di continuazione senza heading vengono fuse nella sezione precedente); ogni sezione riceve `chapter` = titolo `<h1>` di appartenenza
5. salva come **PageDesign v2** in `content/pages/<slug>.json`; `engine: "fallback"` solo se nessun chunk è passato dall'LLM (es. chiave mancante)

`GOOGLE_GENERATIVE_AI_API_KEY` serve solo qui. Per rigenerare da CLI: `npx tsx scripts/reingest.ts <file.docx>` (stampa il report di copertura per chunk). Esiste anche lo script legacy `npx tsx scripts/ingest.ts <file.docx>` (formato DocumentTree v1, ancora renderizzabile).

**IMPORTANTE — non tornare a `generateObject` con `PageDesignSchema`**: Gemini non rispetta i `responseSchema` con discriminated union (`anyOf`) e il `version: z.literal(2)` numerico fa rifiutare lo schema (400). Entrambi facevano fallire ogni chiamata con caduta silenziosa nel fallback lossy.

**Modalità fai-da-te (`/scrivi`)**: l'utente scrive il documento direttamente nell'app (titolo, sommario, capitoli con markdown leggero). `lib/markdown.ts` converte il markdown in HTML semantico (h1 = capitolo; la notazione inline `` ` `` e `**` passa verbatim, è già quella nativa della pipeline) e `ingestAuthoredDocument` lo spinge nella **stessa pipeline map-reduce** via `designFromHtml` — col page header preimpostato dall'utente, quindi il meta step LLM è saltato. Il sorgente markdown è salvato nel campo opzionale `authoring` del JSON (dichiarato in `PageDesignSchema`, altrimenti il round-trip Zod di PATCH/extract lo cancellerebbe): la sua presenza rende il documento rieditabile da `/scrivi?slug=…` con rigenerazione sullo stesso slug (`PUT /api/author/[slug]`).

### 2. SERVING (ogni visita — deterministico, senza LLM)
Il sito Next.js legge i JSON già salvati e li renderizza. **Zero chiamate a Gemini a runtime.** `app/[slug]/page.tsx` fa branch su `version === 2`: v2 → `PageDesignRenderer`, altrimenti il registry legacy (`components/registry.tsx`). Le pagine usano `dynamic = "force-dynamic"` perché il contenuto cambia a runtime (upload/delete).

## Struttura del progetto

```
creta/
├── content/pages/             — JSON generati dall'ingest, versionati in Git
├── app/
│   ├── api/ingest/route.ts    — upload .docx → Gemini → content/pages/<slug>.json
│   ├── api/author/route.ts    — POST fai-da-te: markdown → stessa pipeline → JSON (+ PUT [slug]/ per rigenerare)
│   ├── api/search/route.ts    — ricerca full-text su content/pages (palette ⌘K), zero LLM e zero DB
│   ├── api/collections/route.ts — GET/PUT config delle rubriche (PUT = full-replace con authorizeEditor)
│   ├── api/documents/[slug]/  — DELETE di un documento
│   ├── [slug]/page.tsx        — renderizza una pagina (v2 o legacy) + generateMetadata
│   ├── scrivi/page.tsx        — editor fai-da-te (crea o modifica via ?slug=…), monta WriterClient
│   ├── page.tsx               — home: libreria documenti con ricerca
│   ├── not-found.tsx          — 404
│   └── layout.tsx
├── lib/
│   ├── config.ts              — costante GEMINI_MODEL (unico posto per cambiare il modello)
│   ├── ingestDocx.ts          — pipeline map-reduce dell'ingest (chunk → LLM paralleli → coverage → merge); designFromHtml è il core condiviso, ingestAuthoredDocument l'entry fai-da-te
│   ├── markdown.ts            — markdown leggero → HTML semantico per il fai-da-te (inline `code`/**bold** passa verbatim)
│   ├── authorBody.ts          — schema Zod del body /api/author (condiviso da POST e PUT)
│   ├── docxHtml.ts            — pulizia HTML mammoth + split in capitoli/chunk + testo piano
│   ├── htmlDesign.ts          — conversione deterministica HTML→sezioni (fallback garantito, cheerio)
│   ├── coverage.ts            — punteggio di copertura testuale per chunk
│   ├── extractJson.ts         — estrazione/riparazione del JSON dall'output LLM
│   ├── schema.ts              — schema Zod (PageDesign v2 + DocumentTree legacy) + normalizzatori tolleranti
│   ├── pageDesignPrompt.ts    — chapterSystemPrompt (singolo/multi-capitolo ± page header) + PAGE_META_PROMPT di fallback
│   ├── pagesStore.ts          — adapter async dello store documenti: filesystem in dev, Vercel Blob quando c'è BLOB_READ_WRITE_TOKEN
│   ├── collections.ts         — schema Zod + normalizzatore delle rubriche (gruppi di documenti in home; ogni documento sta al massimo in una rubrica)
│   ├── collectionsStore.ts    — store della config rubriche: content/collections.json in locale, blob meta/collections.json su Vercel
│   ├── searchIndex.ts         — indice full-text in memoria sullo store (cache su mtime/uploadedAt) + tempo di lettura
│   ├── anchors.ts             — sectionAnchor condiviso tra renderer e indice (deep link coerenti)
│   ├── readingProgress.ts     — progresso di lettura in localStorage (client, adapter useSyncExternalStore)
│   ├── editors.ts             — allowlist editor DORMIENTE: guard authorizeEditor su tutte le route di scrittura
│   └── systemPrompt.ts        — system prompt legacy per scripts/ingest.ts
├── components/
│   ├── PageDesignRenderer.tsx — renderer v2: hero, TOC, sezioni, footer, tutti i blocchi
│   ├── CommandPalette.tsx     — palette ⌘K globale (montata nel layout, cerca via /api/search)
│   ├── InlineText.tsx         — resa inline di `code`, **bold**, URL
│   ├── HomeClient.tsx         — home: hero full-screen, menu rubriche, archivio per rubriche, delete
│   ├── CollectionsManager.tsx — pannello modale rubriche: crea/rinomina/riordina voci e assegna i documenti
│   ├── UploadModal.tsx        — upload con stati di avanzamento e avviso fallback
│   ├── WriterClient.tsx       — editor fai-da-te: form a capitoli, cheat-sheet markdown, stati di avanzamento
│   ├── DocHeader.tsx          — header sticky con progress di lettura (salvato in localStorage)
│   ├── Reveal.tsx             — animazione on-scroll
│   ├── registry.tsx           — registry legacy v1
│   └── doc/                   — componenti legacy v1
├── scripts/reingest.ts        — CLI: rigenera content/pages/<slug>.json con report di copertura
├── scripts/seed-blob.ts       — CLI: carica content/pages/*.json sul Blob store di Vercel (seeding una tantum)
├── scripts/ingest.ts          — CLI legacy
└── .env.local                 — GOOGLE_GENERATIVE_AI_API_KEY (mai nel codice)
```

## Storage dei documenti (lib/pagesStore.ts)

Tutto l'accesso ai documenti passa dall'adapter async `lib/pagesStore.ts` (`listPageFiles`, `readPageRaw`, `readPageDesign`, `writePageDesign`, `deletePage`, `pageExists`, `uniqueSlug`). Lo switch è per chiamata:

- **senza `BLOB_READ_WRITE_TOKEN`** (dev locale): filesystem in `content/pages/` come sempre
- **con `BLOB_READ_WRITE_TOKEN`** (Vercel, dove il filesystem è effimero): Vercel Blob, pathname `pages/<slug>.json`, `access: "public"` (unico modo del Blob; chi ha l'URL del blob legge il JSON grezzo — accettabile, il sito è aperto)

Attenzione: col token in `.env.local` il dev locale legge/scrive lo store di **produzione**. Regola: **mai `fs` diretto su content/pages fuori da pagesStore.ts** (gli script CLI sono l'eccezione, girano solo in locale).

## Deploy su Vercel

1. push su GitHub → import del repo su Vercel (preset Next.js, nessuna config extra)
2. Project → Storage → store **Blob** (`creta-blob`) connesso al progetto → inietta `BLOB_READ_WRITE_TOKEN`
3. env var `GOOGLE_GENERATIVE_AI_API_KEY` (serve solo all'ingest)
4. seeding una tantum dei documenti già in repo: token in `.env.local` (o `vercel env pull .env.local`), poi `npx tsx scripts/seed-blob.ts`

Vincoli piattaforma già gestiti nel codice: upload limitato a **4 MB** (Vercel taglia i body a ~4,5 MB — limite sia client in `UploadModal` sia server in `app/api/ingest/route.ts`, da tenere allineati), `maxDuration = 300` sulla route di ingest, `robots: noindex` nel layout (sito condiviso via URL, fuori dai motori di ricerca).

## Comandi

```bash
npm run dev      # server di sviluppo su http://localhost:3000
npm run build    # build di produzione
npm run start    # serve la build (serve un server Node: ci sono API route)
```

## Aggiungere un blocco al formato v2

1. Aggiungi lo schema Zod in `lib/schema.ts` come membro di `PageDesignBlockSchema`
2. Crea il componente di rendering in `components/PageDesignRenderer.tsx` e registralo in `renderDesignBlock`
3. Descrivi il blocco e quando usarlo in `lib/pageDesignPrompt.ts`
4. (Opzionale) aggiungi alias in `coercePageDesignBlock` per i nomi che Gemini potrebbe inventare

## Sicurezza

- `GOOGLE_GENERATIVE_AI_API_KEY` è usata **solo** lato server in `app/api/ingest/route.ts` (e nello script legacy)
- Mai esporre variabili d'ambiente senza prefisso `NEXT_PUBLIC_` al client
- Gli slug sono validati con regex prima di toccare il filesystem (lettura e delete)
- I blocchi non validi vengono coercizzati o convertiti in `paragraph` dal proprio testo: il contenuto non si perde mai, ma si logga un `console.warn`

### Allowlist editor (architettura dormiente — `lib/editors.ts`)

Tutte le route che scrivono su `content/pages` (ingest, compose, extract, DELETE, PATCH) iniziano con `authorizeEditor(req)`. Oggi è un **no-op**: con `CRETA_EDITORS` non impostata tutto resta aperto come ora. Per limitare le modifiche alle sole persone autorizzate dell'azienda:

1. imposta `CRETA_EDITORS="email1@azienda.it,email2@azienda.it"` e `CRETA_AUTH_SECRET` (stringa lunga e casuale) in `.env.local`
2. da quel momento le mutazioni richiedono il cookie `creta_editor` = token HMAC firmato (`signEditorToken(email)`); lettura e ricerca restano pubbliche
3. pezzo mancante da costruire all'attivazione: la route di login che verifica l'identità e imposta il cookie (e l'UI della home che nasconde upload/delete ai non-editor — oggi i bottoni restano visibili, ma il server rifiuta con 403)

Regola: **ogni nuova route di mutazione deve aprire con `authorizeEditor`**. Allowlist attiva senza segreto → 503 (fail-closed).

## Convenzioni

- `lib/schema.ts` è importato sia dallo script che dal server: non deve contenere segreti né codice server-only
- Il modello (`GEMINI_MODEL` in `lib/config.ts`) si cambia in un unico posto
- Styling: Tailwind v4; i colori del tema (navy, gold, surface) sono in `app/globals.css` `@theme`. I gradienti usano classi esplicite `.creta-*-grad` (v4 ha rinominato le utility gradient)
- I componenti di rendering sono stateless; l'interattività (Reveal, DocHeader, Home, UploadModal) è isolata in client component
