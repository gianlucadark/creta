/* Stato di caricamento globale: tutte le pagine sono force-dynamic e sul
   backend Blob ogni lettura è una fetch di rete, quindi la navigazione può
   restare in attesa per qualche istante. Meglio un segnale col tema che
   uno schermo congelato. */
export default function Loading() {
  return (
    <div className="grid min-h-screen place-items-center bg-surface">
      <div className="flex flex-col items-center gap-4">
        <div className="creta-badge-grad h-10 w-10 animate-pulse rounded-xl" />
        <div className="h-1 w-40 overflow-hidden rounded-full bg-navy-100">
          <div className="creta-progress-grad h-full animate-[loading_1.25s_ease-in-out_infinite] rounded-full" />
        </div>
        <p className="font-mono text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-navy-400">
          Caricamento
        </p>
      </div>
    </div>
  );
}
