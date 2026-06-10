interface PageHeroProps {
  title: string;
  intro: string;
}

export function PageHero({ title, intro }: PageHeroProps) {
  return (
    <div className="relative overflow-hidden rounded-2xl bg-brown-900 text-cream px-8 py-16 mb-10">
      <div className="absolute -right-20 -top-20 h-72 w-72 rounded-full bg-terracotta/15 pointer-events-none" />
      <div className="absolute -bottom-12 right-36 h-40 w-40 rounded-full bg-terracotta/10 pointer-events-none" />
      <div className="absolute top-8 -left-8 h-24 w-24 rounded-full bg-cream/5 pointer-events-none" />
      <div className="relative z-10 max-w-3xl">
        <p className="font-mono text-xs uppercase tracking-[0.22em] text-terracotta-light mb-5">documento</p>
        <h1 className="font-display text-5xl font-bold leading-[1.05] tracking-tight md:text-6xl">{title}</h1>
        <p className="mt-6 text-lg text-cream/75 leading-relaxed">{intro}</p>
      </div>
    </div>
  );
}
