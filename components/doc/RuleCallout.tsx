interface RuleCalloutProps {
  rule: string;
  description?: string;
}

export function RuleCallout({ rule, description }: RuleCalloutProps) {
  return (
    <div className="mb-6 rounded-xl bg-terracotta px-6 py-5 text-cream shadow-md">
      <div className="flex items-start gap-4">
        <span className="flex-shrink-0 grid h-8 w-8 place-items-center rounded-full bg-cream/20 text-sm font-black leading-none">
          !
        </span>
        <div>
          <p className="font-bold text-lg leading-tight">{rule}</p>
          {description && (
            <p className="mt-2 text-cream/80 text-sm leading-relaxed">{description}</p>
          )}
        </div>
      </div>
    </div>
  );
}
