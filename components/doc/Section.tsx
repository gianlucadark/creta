interface SectionProps {
  heading: string;
  body: string;
}

export function Section({ heading, body }: SectionProps) {
  return (
    <div className="mb-8">
      <div className="flex items-start gap-3 mb-4">
        <div className="mt-2 h-5 w-1 flex-shrink-0 rounded-full bg-terracotta" />
        <h2 className="font-display text-2xl font-bold text-brown-900 leading-tight">{heading}</h2>
      </div>
      <div className="ml-4 rounded-xl bg-white border border-brown-200 px-6 py-5 shadow-sm">
        <p className="text-brown-700 leading-8 whitespace-pre-wrap">{body}</p>
      </div>
    </div>
  );
}
