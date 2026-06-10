interface AlertBannerProps {
  message: string;
  detail?: string;
}

export function AlertBanner({ message, detail }: AlertBannerProps) {
  return (
    <div className="mb-6 rounded-xl border-2 border-terracotta/40 bg-terracotta-pale px-6 py-4">
      <p className="mb-1 font-mono text-xs uppercase tracking-[0.22em] text-terracotta">
        attenzione
      </p>
      <p className="font-bold text-brown-900 text-lg leading-snug">{message}</p>
      {detail && (
        <p className="mt-2 text-sm text-brown-700 leading-relaxed">{detail}</p>
      )}
    </div>
  );
}
