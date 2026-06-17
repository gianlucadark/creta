"use client";

import { useEffect, useRef, useState } from "react";

/* Un SOLO IntersectionObserver condiviso da tutte le istanze di Reveal: una
   pagina lunga ne monta decine/centinaia e un observer per istanza generava
   jank in scroll su mobile. Qui ogni Reveal registra il proprio nodo con una
   callback "rivelami"; alla prima intersezione la callback parte e il nodo
   viene smesso di osservare. */
const callbacks = new Map<Element, () => void>();
let observer: IntersectionObserver | null = null;

function getObserver(): IntersectionObserver | null {
  if (typeof IntersectionObserver === "undefined") return null;
  if (!observer) {
    observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          const cb = callbacks.get(entry.target);
          if (cb) {
            cb();
            callbacks.delete(entry.target);
            observer?.unobserve(entry.target);
          }
        }
      },
      { threshold: 0.12, rootMargin: "0px 0px -8% 0px" }
    );
  }
  return observer;
}

function observe(el: Element, reveal: () => void): () => void {
  const io = getObserver();
  if (!io) {
    reveal();
    return () => {};
  }
  callbacks.set(el, reveal);
  io.observe(el);
  return () => {
    callbacks.delete(el);
    io.unobserve(el);
  };
}

/**
 * Mostra i figli con fade e sollevamento al primo ingresso nel viewport.
 * Transizione CSS guidata da un IntersectionObserver condiviso, senza librerie.
 */
export function Reveal({
  children,
  delay = 0,
  className = "",
  as: Tag = "div",
}: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
  as?: React.ElementType;
}) {
  const ref = useRef<HTMLElement | null>(null);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    return observe(el, () => setShown(true));
  }, []);

  return (
    <Tag
      ref={ref}
      style={{ transitionDelay: `${delay}ms` }}
      className={`transition-all duration-700 ease-out will-change-transform ${
        shown ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
      } ${className}`}
    >
      {children}
    </Tag>
  );
}
