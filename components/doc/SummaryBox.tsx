interface SummaryBoxProps {
  text: string;
}

export function SummaryBox({ text }: SummaryBoxProps) {
  return (
    <div className="mb-8 rounded-xl border-l-4 border-brown-300 bg-brown-900/5 px-6 py-5">
      <p className="mb-3 font-mono text-xs uppercase tracking-[0.22em] text-brown-400">
        sommario
      </p>
      <p className="font-display text-lg text-brown-800 leading-relaxed italic">{text}</p>
    </div>
  );
}
