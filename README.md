# Creta — Generative UI Engine

Creta è un motore che trasforma documenti Word (`.docx`) in pagine web visivamente ricche, senza che il designer debba toccare codice HTML. Carichi un file, l'intelligenza artificiale legge la struttura, e in pochi secondi ottieni una pagina navigabile con sommario, sezioni, callout, tabelle, step guidati e altro.

---

## Come funziona in due parole

Il sistema ha due fasi completamente separate che non si toccano mai:

```
[File .docx] ──INGEST──► [JSON strutturato] ──SERVING──► [Pagina web]
                (una volta,         (content/pages/        (ogni visita,
                 con AI)             slug.json)              senza AI)
```

- **INGEST**: avviene una sola volta quando carichi il file. L'AI legge il documento e lo converte in un file JSON con blocchi tipizzati.
- **SERVING**: ogni volta che qualcuno apre la pagina, il server legge il JSON e lo renderizza. Zero chiamate all'AI, risposta immediata.

---

## Fase 1 — INGEST: da Word a JSON

### Il problema

Un documento Word da 50 pagine ha troppo testo per essere inviato tutto insieme a un modello AI (che ha un limite di token in input e soprattutto in output). Inoltre, se il modello "si perde" a metà, perdi metà documento.

### La soluzione: map-reduce per capitoli

Il flusso è in [lib/ingestDocx.ts](lib/ingestDocx.ts):

```
.docx
  │
  ▼
mammoth.convertToHtml()          ← converte il binario Word in HTML semantico
  │
  ▼
cleanDocumentHtml() + splitChapters()   ← rimuove note, TOC, divide per <h1>
  │
  ├── Capitolo 1 (HTML)
  ├── Capitolo 2 (HTML)
  ├── Capitolo 3 (HTML)   ← chunks: un chunk per capitolo principale
  └── ...
        │
        ▼ (max 4 chiamate in parallelo)
  Gemini API ──► JSON grezzo per ogni capitolo
        │
        ▼
  coverageRatio()   ← misura quante parole del sorgente sono nel JSON (soglia: 80%)
        │
        ├── ≥ 0.8 → OK, chunk accettato
        └──  < 0.8 → ritenta, poi ricostruzione deterministica (htmlDesign.ts)
                      (un capitolo NON sparisce mai)
        │
        ▼
  merge delle sezioni in ordine documento
        │
        ▼
  content/pages/<slug>.json   ← PageDesign v2 salvato
```

### I chunk: capitoli grandi e capitoli piccoli

Capitoli oltre ~18.000 caratteri vengono ulteriormente divisi ai confini `<h2>`/`<h3>` per restare nel budget di output del modello. Capitoli piccoli adiacenti vengono invece **raggruppati** in una sola chiamata per risparmiare costi API.

```typescript
// lib/ingestDocx.ts
const MAX_CHUNK_CHARS = 18_000;
const MIN_COVERAGE   = 0.8;      // 80% di copertura testuale minima
const MAX_OUTPUT_TOKENS = 32_000;
const CONCURRENCY    = 4;        // chiamate Gemini in parallelo
```

### La copertura testuale

Il modello non deve mai riassumere o perdere testo. Dopo ogni risposta, `lib/coverage.ts` calcola quante parole del sorgente compaiono nel JSON generato. Se è sotto l'80%, il chunk viene ritentato. Se continua a fallire, `lib/htmlDesign.ts` ricostruisce le sezioni direttamente dall'HTML con cheerio (puro parsing deterministico, nessuna AI) — il capitolo finisce sempre nella pagina.

```
copertura = parole_presenti_nel_JSON / parole_totali_nel_sorgente
```

### Cosa produce: il formato PageDesign v2

Il risultato è un file JSON in `content/pages/<slug>.json`:

```json
{
  "version": 2,
  "page": {
    "title": "Manuale Operativo 2026",
    "eyebrow": "Documento Ufficiale",
    "summary": "Questo manuale descrive le procedure operative standard...",
    "audience": "Operatori e responsabili di reparto"
  },
  "sections": [
    {
      "title": "Premessa",
      "chapter": "Introduzione",
      "intro": "Il presente documento ha lo scopo di...",
      "blocks": [
        {
          "type": "paragraph",
          "text": "Il sistema è attivo dal 2020 e conta oltre 500 utenti."
        },
        {
          "type": "stats",
          "items": [
            { "value": "500", "label": "utenti attivi" },
            { "value": "2020", "label": "anno di avvio" }
          ]
        }
      ]
    },
    {
      "title": "Procedura di accesso",
      "chapter": "Capitolo 2",
      "blocks": [
        {
          "type": "steps",
          "title": "Come accedere al sistema",
          "items": [
            { "title": "Aprire il browser", "text": "Navigare su https://portale.example.it" },
            { "title": "Inserire le credenziali", "text": "Usare le credenziali fornite dall'amministratore" },
            { "title": "Selezionare il profilo", "text": "Scegliere il ruolo appropriato dal menu a tendina" }
          ]
        },
        {
          "type": "callout",
          "tone": "warning",
          "title": "Attenzione",
          "text": "Non condividere mai le proprie credenziali con altri utenti."
        }
      ]
    }
  ]
}
```

### Il principio fondamentale: il testo viene COPIATO, mai riscritto

Il modello AI si comporta come un **tipografo**, non come un editor. Il prompt (`lib/pageDesignPrompt.ts`) gli impone:

> *"You are an ARRANGER, not an editor or a writer. Copy every sentence, phrase, value, number, label, command, URL, API key, file path verbatim into the block fields, character for character."*

L'unica libertà del modello è decidere in quale **tipo di blocco** mettere ogni pezzo di contenuto. Il testo rimane identico a quello del documento originale.

---

## I tipi di blocco

Ogni sezione contiene un array di blocchi. I tipi disponibili (definiti in [lib/schema.ts](lib/schema.ts)):

| Tipo | Quando usarlo | Esempio |
|------|--------------|---------|
| `paragraph` | Testo narrativo connettivo | Spiegazioni generali |
| `callout` | Avvisi, requisiti, note critiche | "Non fare mai X", "Risultato atteso: True" |
| `steps` | Procedura ordinata da eseguire | "Prima fai A, poi B, poi C" |
| `timeline` | Fasi cronologiche o milestone | "Q1: avvio, Q2: test, Q3: go-live" |
| `checklist` | Prerequisiti, requisiti da verificare | Lista di cose che devono essere vere |
| `list` | Elenco puntato generico | Opzioni, esempi, note |
| `cards` | Concetti correlati non sequenziali | Funzionalità del sistema, glossario |
| `feature` | Capacità o benefici da evidenziare | "3–6 punti di forza in griglia" |
| `stats` | Numeri e metriche chiave | "500 utenti · 3 GB · 99,9% uptime" |
| `quote` | Principio o definizione da enfatizzare | Citazione da mettere in evidenza |
| `table` | Dati tabulari | Tabelle del documento originale |
| `code` | Comandi, script, JSON, configurazioni | `npm install`, file `.env`, template |
| `accordion` | FAQ, coppie domanda/risposta collassabili | "Cosa succede se...?" |

Il modello sceglie il blocco più espressivo per ogni contenuto. I testi narrativi (`paragraph`) devono essere la minoranza.

### Il normalizzatore tollerante

Gemini a volte inventa nomi di tipo non previsti (`"warning"` invece di `"callout"` con `tone: "warning"`). `lib/schema.ts` contiene `coercePageDesignBlock()` che mappa gli alias noti sul tipo canonico. Se nemmeno quello funziona, il blocco viene convertito in `paragraph` usando il suo testo grezzo — il contenuto non si perde mai.

```typescript
// Esempi di alias gestiti:
"warning"  → callout { tone: "warning" }
"alert"    → callout { tone: "warning" }
"bullets"  → list
"checklist"→ checklist
"snippet"  → code
"blockquote"→ quote
```

---

## Fase 2 — SERVING: da JSON a pagina web

Ogni visita a `/<slug>` fa questo:

```
GET /<slug>
  │
  ▼
app/[slug]/page.tsx
  │
  ├── readPageDesign(slug)    ← legge content/pages/<slug>.json
  │
  └── design.version === 2
        │
        ▼
  <PageDesignRenderer design={design} />   ← componente React
        │
        ├── Hero: titolo, sommario, pill audience
        ├── TOC: indice capitoli generato dalle sections
        ├── Per ogni section:
        │     ├── Titolo sezione
        │     ├── Intro (se presente)
        │     └── Per ogni block: renderDesignBlock(block)
        └── Footer
```

**Zero chiamate a Gemini** durante il serving. La pagina si genera come qualsiasi React server component che legge un file JSON.

### Il markup inline

Dentro i campi testo, il modello può usare due sole notazioni:

- `` `backtick` `` → testo monospaziato (comandi, valori tecnici)
- `**grassetto**` → enfasi

Il componente [components/InlineText.tsx](components/InlineText.tsx) trasforma questi token in `<code>` e `<strong>` HTML. Nessun altro Markdown è supportato.

---

## Modalità fai-da-te: `/scrivi`

Oltre all'upload di un `.docx`, l'utente può scrivere il documento direttamente nell'app. Il flusso è in [app/scrivi/page.tsx](app/scrivi/page.tsx):

```
Utente scrive → form con capitoli in Markdown leggero
  │
  ▼
lib/markdown.ts   ← markdown → HTML semantico (stesso formato del docx)
  │
  ▼
ingestAuthoredDocument()   ← stessa pipeline map-reduce, ma:
  │                            - page header preimpostato dall'utente (salta LLM meta)
  │                            - sorgente markdown salvato in design.authoring
  ▼
content/pages/<slug>.json
```

Il campo `authoring` nel JSON permette di rieditare il documento: aprendo `/scrivi?slug=...` il form si ripopola con il markdown originale, e `PUT /api/author/[slug]` rigenera il JSON sullo stesso slug.

---

## Storage dei documenti

[lib/pagesStore.ts](lib/pagesStore.ts) è l'unico punto che tocca i file JSON. Espone un'API identica per due backend:

| Condizione | Backend | Dove stanno i file |
|-----------|---------|-------------------|
| Nessun `BLOB_READ_WRITE_TOKEN` | Filesystem locale | `content/pages/*.json` |
| `BLOB_READ_WRITE_TOKEN` presente | Vercel Blob | Bucket privato `pages/<slug>.json` |

**Attenzione**: se hai `BLOB_READ_WRITE_TOKEN` nel tuo `.env.local`, le operazioni locali scrivono/leggono direttamente lo store di **produzione**. Per sviluppare in sicurezza, lavora senza token o usa un progetto Vercel separato.

```typescript
// Tutte le operazioni passano da qui:
listPageFiles()          // elenca documenti
readPageDesign(slug)     // legge e valida con Zod
writePageDesign(slug, d) // scrive (crea o sovrascrive)
deletePage(slug)         // elimina
pageExists(slug)         // controlla esistenza
uniqueSlug(base)         // calcola slug libero (base, base-2, base-3...)
```

---

## Struttura delle API route

| Route | Metodo | Cosa fa |
|-------|--------|---------|
| `POST /api/ingest` | POST | Upload .docx → pipeline → JSON |
| `POST /api/author` | POST | Documento scritto nell'app → JSON |
| `PUT /api/author/[slug]` | PUT | Rigenera un documento fai-da-te |
| `DELETE /api/documents/[slug]` | DELETE | Elimina un documento |
| `GET /api/search` | GET | Ricerca full-text (nessuna AI, nessun DB) |
| `GET/PUT /api/collections` | GET/PUT | Gestione rubriche (gruppi documenti) |

Tutte le route di scrittura iniziano con `authorizeEditor(req)` — oggi è un no-op (accesso aperto), ma è pronta per aggiungere un allowlist email senza toccare la logica.

---

## Avvio locale

```bash
# 1. Clona e installa
git clone <repo>
cd creta
npm install

# 2. Crea il file delle variabili d'ambiente
cp .env.local.example .env.local
# Aggiungi la tua chiave Gemini:
# GOOGLE_GENERATIVE_AI_API_KEY=AIza...

# 3. Avvia il server di sviluppo
npm run dev
# → http://localhost:3000
```

Senza `GOOGLE_GENERATIVE_AI_API_KEY` il sistema funziona ugualmente: l'ingest usa il percorso deterministico (cheerio, nessuna AI). Le pagine escono meno "disegnate" ma complete.

### Script CLI utili

```bash
# Rigenera un documento già caricato (utile dopo aver modificato il prompt)
npx tsx scripts/reingest.ts content/pages/nome-documento.docx

# Carica tutti i JSON locali su Vercel Blob (seeding una tantum)
npx tsx scripts/seed-blob.ts
```

---

## Deploy su Vercel

1. Push del repo su GitHub
2. Importa su Vercel (preset: Next.js, nessuna config extra)
3. In **Project → Storage**: crea/collega uno store Blob (`creta-blob`)
4. Aggiungi le env var:
   - `GOOGLE_GENERATIVE_AI_API_KEY` (obbligatoria per l'ingest con AI)
   - `BLOB_READ_WRITE_TOKEN` (iniettata automaticamente dallo store collegato)
5. Seeding iniziale dei documenti già presenti in repo:
   ```bash
   vercel env pull .env.local   # scarica il token di produzione
   npx tsx scripts/seed-blob.ts  # carica i JSON sul Blob
   ```

Il timeout della route di ingest è configurato a 300 secondi (`maxDuration = 300`) perché documenti lunghi possono richiedere diversi minuti di elaborazione parallela con Gemini.

---

## Aggiungere un nuovo tipo di blocco

1. **Schema Zod** — aggiungi in [lib/schema.ts](lib/schema.ts) un nuovo membro di `PageDesignBlockSchema`:
   ```typescript
   const BannerBlock = z.object({
     type: z.literal("banner"),
     title: z.string(),
     cta: z.string().optional(),
   });
   // poi aggiungilo al discriminatedUnion PageDesignBlockSchema
   ```

2. **Renderer** — aggiungi il case in `renderDesignBlock()` in [components/PageDesignRenderer.tsx](components/PageDesignRenderer.tsx):
   ```typescript
   case "banner":
     return <BannerComponent key={i} title={block.title} cta={block.cta} />;
   ```

3. **Prompt** — descrivi il blocco nel catalogo in [lib/pageDesignPrompt.ts](lib/pageDesignPrompt.ts):
   ```
   - { "type": "banner", "title": string, "cta"?: string }
                           — un annuncio prominente con titolo e call-to-action opzionale.
   ```

4. **Alias** (opzionale) — aggiungi eventuali nomi che Gemini potrebbe usare in `coercePageDesignBlock()`.

---

## Decisioni architetturali rilevanti

### Perché `generateText` e non `generateObject`?

Gemini non rispetta correttamente i `responseSchema` con discriminated union (`anyOf`) — il campo `version: z.literal(2)` (un numero letterale) causa un errore 400. Il sistema usa `generateText` e poi `extractJson()` + validazione Zod manuale. Questo è il comportamento corretto e testato — **non tornare a `generateObject` con `PageDesignSchema`**.

### Perché non c'è un database?

I documenti sono file JSON statici. La ricerca full-text (`/api/search`) legge i JSON in memoria con un indice ricostruito a caldo (cache su mtime). Per la scala attuale questo è più veloce, economico e mantenibile di qualsiasi database.

### Perché `force-dynamic` sulle pagine?

```typescript
export const dynamic = "force-dynamic";
```

Il contenuto cambia a runtime (upload, delete). Senza questo, Next.js cacherebbe la pagina al momento del build e non vedrebbe i nuovi documenti.

### Perché Tailwind v4?

La versione 4 ha cambiato le utility per i gradienti (non più `from-/to-` direttamente nelle classi ma classi esplicite `.creta-*-grad`). I colori del tema (navy, gold, surface) sono definiti in `app/globals.css` con `@theme`. Se aggiungi componenti con gradienti, usa le classi `.creta-*-grad` definite lì, non le utility standard di v3.

---

## Struttura del progetto (riferimento rapido)

```
creta/
├── app/
│   ├── [slug]/page.tsx        ← rendering di ogni documento
│   ├── scrivi/page.tsx        ← editor fai-da-te
│   ├── page.tsx               ← home con libreria documenti
│   └── api/                   ← route handler (ingest, author, search, ...)
├── lib/
│   ├── ingestDocx.ts          ← pipeline map-reduce (core del sistema)
│   ├── schema.ts              ← tipi Zod + normalizzatori tolleranti
│   ├── pageDesignPrompt.ts    ← prompt Gemini (TEXT_FIDELITY, BLOCK_CATALOG, ...)
│   ├── pagesStore.ts          ← adapter filesystem / Vercel Blob
│   ├── coverage.ts            ← misura copertura testuale post-LLM
│   ├── htmlDesign.ts          ← fallback deterministico HTML → sezioni
│   ├── extractJson.ts         ← parser JSON tollerante per output LLM troncati
│   └── config.ts              ← GEMINI_MODEL (unico posto per cambiare modello)
├── components/
│   ├── PageDesignRenderer.tsx ← renderizza tutti i blocchi v2
│   ├── InlineText.tsx         ← parsing `code` e **bold** inline
│   ├── HomeClient.tsx         ← home interattiva con rubriche e upload
│   └── UploadModal.tsx        ← upload con stati di avanzamento
├── content/pages/             ← JSON dei documenti (versionati in Git)
└── scripts/
    ├── reingest.ts            ← CLI: rigenera un documento da file .docx
    └── seed-blob.ts           ← CLI: carica i JSON locali su Vercel Blob
```
