interface ProhibitionListProps {
  title?: string;
  items: string[];
}

export function ProhibitionList({ title, items }: ProhibitionListProps) {
  return (
    <div className="mb-6 rounded-xl bg-brown-900 text-cream px-6 py-5">
      {title && (
        <p className="mb-4 font-mono text-xs uppercase tracking-[0.2em] text-terracotta-light">
          {title}
        </p>
      )}
      <ul className="space-y-3">
        {items.map((item, i) => (
          <li key={i} className="flex items-start gap-3">
            <span className="mt-0.5 flex-shrink-0 h-5 w-5 rounded grid place-items-center bg-terracotta text-[10px] font-black text-cream leading-none">
              ✕
            </span>
            <span className="text-cream/85 leading-relaxed text-sm">{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
