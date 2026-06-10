interface Fact {
  value: string;
  label: string;
}

interface KeyFactsProps {
  title?: string;
  facts: Fact[];
}

export function KeyFacts({ title, facts }: KeyFactsProps) {
  return (
    <div className="mb-8">
      {title && (
        <p className="mb-4 font-mono text-xs uppercase tracking-[0.22em] text-brown-400">
          {title}
        </p>
      )}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {facts.map((fact, i) => (
          <div
            key={i}
            className="rounded-xl bg-white border border-brown-200 px-4 py-5 text-center shadow-sm"
          >
            <p className="font-display text-3xl font-bold text-terracotta leading-none">
              {fact.value}
            </p>
            <p className="mt-2 text-xs text-brown-700 leading-tight">{fact.label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
