interface SubSectionProps {
  heading: string;
  body: string;
}

export function SubSection({ heading, body }: SubSectionProps) {
  return (
    <div className="mb-5 ml-5 border-l border-brown-200 pl-5">
      <h3 className="font-display text-lg font-semibold text-brown-800 mb-2 flex items-center gap-2">
        <span className="h-2 w-2 flex-shrink-0 rounded-sm bg-terracotta/50" />
        {heading}
      </h3>
      <p className="text-brown-600 text-sm leading-7 whitespace-pre-wrap">{body}</p>
    </div>
  );
}
