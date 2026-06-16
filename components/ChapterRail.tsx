import { ExtractChapterButton } from "./ExtractChapterButton";

/* Riferimento laterale del capitolo principale: etichetta fissa a sinistra
   (numero + titolo + tasto "Rendi indipendente") che accompagna tutte le
   sezioni del capitolo. È indipendente dal flusso — vive in un overlay assoluto
   sticky dentro la banda del capitolo, quindi non occupa spazio e resta
   agganciato verticalmente mentre si scorre. Solo da xl in su, dove c'è margine
   ai lati della colonna centrale. */
export function ChapterRail({
  number,
  chapter,
  slug,
}: {
  number: number;
  chapter: string;
  slug: string;
}) {
  return (
    <div className="pointer-events-none absolute inset-y-0 left-0 z-20 hidden w-64 xl:block">
      <div className="sticky top-[34vh] ml-10 flex w-44 flex-col items-start gap-3">
        <p className="font-mono text-[0.6rem] font-bold uppercase tracking-[0.28em] text-gold-600">
          Capitolo
        </p>
        <span className="creta-stat-grad -mt-1 font-display text-5xl font-black leading-none">
          {String(number).padStart(2, "0")}
        </span>
        <div className="creta-rule h-0.5 w-10 rounded-full" />
        <p className="line-clamp-4 font-display text-base font-bold leading-snug text-navy-900">
          {chapter}
        </p>
        <div className="pointer-events-auto mt-1">
          <ExtractChapterButton slug={slug} chapter={chapter} compact />
        </div>
      </div>
    </div>
  );
}
