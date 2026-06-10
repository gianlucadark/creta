interface Step {
  label: string;
  description: string;
}

interface StepFlowProps {
  title?: string;
  steps: Step[];
}

export function StepFlow({ title, steps }: StepFlowProps) {
  return (
    <div className="mb-8">
      {title && (
        <h3 className="font-display text-2xl font-bold text-brown-900 mb-6">{title}</h3>
      )}
      <ol className="relative space-y-4">
        {steps.length > 1 && (
          <div className="absolute left-5 top-10 bottom-10 w-px bg-terracotta/20" />
        )}
        {steps.map((step, i) => (
          <li key={i} className="flex gap-5 relative">
            <span className="relative z-10 flex-shrink-0 h-10 w-10 rounded-full bg-terracotta text-cream font-bold text-sm grid place-items-center shadow-sm">
              {i + 1}
            </span>
            <div className="flex-1 rounded-xl bg-white border border-brown-200 px-5 py-4 shadow-sm">
              <p className="font-bold text-brown-900">{step.label}</p>
              <p className="mt-1 text-sm text-brown-600 leading-relaxed">{step.description}</p>
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}
