"use client";

import { useEffect, useRef, useState } from "react";

export type SectionNavItem = {
  anchor: string;
  title: string;
  chapter?: string;
};

/**
 * Rail flottante delle sezioni nella pagina documento. Da chiusa mostra tick
 * sottili sul bordo destro; al passaggio del mouse diventa un indice con
 * deep link. Resta nascosta finche' il lettore non supera la hero e sugli
 * schermi sotto xl.
 */
export function SectionNav({
  items,
  showChapters,
}: {
  items: SectionNavItem[];
  showChapters: boolean;
}) {
  const [active, setActive] = useState(-1);
  const ticking = useRef(false);

  useEffect(() => {
    function measure() {
      ticking.current = false;
      const offset = window.innerHeight * 0.32;
      let current = -1;
      for (let i = 0; i < items.length; i++) {
        const el = document.getElementById(items[i].anchor);
        if (el && el.getBoundingClientRect().top <= offset) current = i;
      }
      /* In fondo alla pagina l'ultima sezione puo' non superare mai la linea di offset. */
      if (
        items.length > 0 &&
        window.innerHeight + window.scrollY >=
          document.documentElement.scrollHeight - 4
      ) {
        current = items.length - 1;
      }
      setActive(current);
    }
    function onScroll() {
      if (ticking.current) return;
      ticking.current = true;
      requestAnimationFrame(measure);
    }
    measure();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [items]);

  if (items.length < 2) return null;

  const groups: { chapter?: string; items: { item: SectionNavItem; index: number }[] }[] = [];
  items.forEach((item, index) => {
    const last = groups[groups.length - 1];
    if (!last || last.chapter !== item.chapter) {
      groups.push({ chapter: item.chapter, items: [] });
    }
    groups[groups.length - 1].items.push({ item, index });
  });

  const revealed = active >= 0;

  return (
    <nav
      aria-label="Sezioni della pagina"
      className={`group fixed right-4 top-1/2 z-20 hidden -translate-y-1/2 transition-opacity duration-500 xl:block ${
        revealed ? "opacity-100" : "pointer-events-none opacity-0"
      }`}
    >
      {/* Rail collassata: un tick per sezione */}
      <div className="flex flex-col items-end gap-[7px] py-2 pl-6 transition-opacity duration-200 group-hover:opacity-0">
        {items.map((item, index) => (
          <span
            key={index}
            className={`block h-[3px] rounded-full transition-all duration-300 ${
              index === active
                ? "w-7 bg-gold-500"
                : "w-4 bg-navy-300/80"
            }`}
          />
        ))}
      </div>

      {/* Pannello espanso */}
      <div className="pointer-events-none absolute right-0 top-1/2 max-h-[72vh] w-72 -translate-y-1/2 translate-x-1.5 overflow-y-auto rounded-2xl border border-navy-200/70 bg-white/95 p-4 opacity-0 shadow-xl shadow-navy-900/10 backdrop-blur-md transition-all duration-300 group-hover:pointer-events-auto group-hover:translate-x-0 group-hover:opacity-100">
        <p className="mb-3 text-[0.65rem] font-bold uppercase tracking-[0.2em] text-navy-400">
          In questa pagina
        </p>
        <div className="space-y-3">
          {groups.map((group, groupIndex) => (
            <div key={groupIndex}>
              {showChapters && group.chapter && (
                <p className="mb-1.5 truncate text-[0.7rem] font-bold uppercase tracking-[0.14em] text-gold-600">
                  {group.chapter}
                </p>
              )}
              <ul className="space-y-0.5">
                {group.items.map(({ item, index }) => (
                  <li key={index}>
                    <a
                      href={`#${item.anchor}`}
                      className={`block truncate rounded-lg px-2.5 py-1.5 text-sm transition ${
                        index === active
                          ? "bg-gold-50 font-semibold text-navy-900"
                          : "text-navy-600 hover:bg-navy-50 hover:text-navy-900"
                      }`}
                    >
                      <span className="mr-2 font-mono text-[0.7rem] font-semibold text-navy-300">
                        {String(index + 1).padStart(2, "0")}
                      </span>
                      {item.title}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </nav>
  );
}
