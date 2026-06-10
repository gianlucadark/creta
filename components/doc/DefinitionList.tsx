interface DefinitionItem {
  term: string;
  definition: string;
}

interface DefinitionListProps {
  title?: string;
  items: DefinitionItem[];
}

export function DefinitionList({ title, items }: DefinitionListProps) {
  return (
    <div className="mb-8 rounded-xl bg-white border border-brown-200 shadow-sm overflow-hidden">
      {title && (
        <div className="border-b border-brown-200 bg-cream-dark px-6 py-3">
          <p className="font-mono text-xs uppercase tracking-[0.22em] text-brown-900">{title}</p>
        </div>
      )}
      <dl className="divide-y divide-brown-100">
        {items.map((item, i) => (
          <div key={i} className="flex flex-col gap-1 px-6 py-4 sm:flex-row sm:gap-8">
            <dt className="shrink-0 font-bold text-brown-900 text-sm sm:w-44">{item.term}</dt>
            <dd className="text-brown-600 text-sm leading-relaxed">{item.definition}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
