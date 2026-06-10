import Link from "next/link";

export default function NotFound() {
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-cream px-5">
      <span className="creta-orb left-[-10%] top-[-8%] h-72 w-72 bg-terracotta-300/35" />
      <span
        className="creta-orb bottom-[-10%] right-[-8%] h-64 w-64 bg-ochre-light/30"
        style={{ animationDelay: "-9s" }}
      />
      <div className="relative space-y-6 text-center">
        <p className="creta-stat-grad font-display text-8xl font-bold leading-none">
          404
        </p>
        <h1 className="font-display text-2xl font-bold text-brown-900">
          Pagina non trovata
        </h1>
        <p className="mx-auto max-w-sm text-brown-600">
          Il documento che cerchi non esiste o è stato eliminato.
        </p>
        <Link
          href="/"
          className="creta-badge-grad inline-block rounded-full px-6 py-3 font-semibold text-cream shadow-md shadow-terracotta-700/25 transition hover:-translate-y-0.5 hover:shadow-lg"
        >
          Torna alla libreria
        </Link>
      </div>
    </div>
  );
}
