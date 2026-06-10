"use client";

import { useEffect, useRef } from "react";

/* Sciame di particelle che si ricompone ciclicamente nelle parole del brand.
   È la metafora visiva del motore: le particelle (la materia) non vengono
   mai create né distrutte tra una parola e l'altra — cambia solo la forma
   che assumono. Canvas puro, zero dipendenze; con prefers-reduced-motion
   disegna la prima parola statica e non anima nulla. */

const WORDS = ["MICE", "CRETA"];
const HOLD_MS = 6000;
const MAX_PARTICLES = 1500;
const GOLD = "236, 201, 60";
const BLUE = "123, 175, 217";

type Particle = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  tx: number;
  ty: number;
  size: number;
  gold: boolean;
  alpha: number;
};

export function ParticleWordmark({ className = "" }: { className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    let width = 0;
    let height = 0;
    let raf = 0;
    let visible = true;
    let disposed = false;
    let particles: Particle[] = [];
    let wordIndex = 0;
    let lastSwap = performance.now();

    function resize() {
      const rect = canvas!.getBoundingClientRect();
      width = Math.round(rect.width);
      height = Math.round(rect.height);
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas!.width = width * dpr;
      canvas!.height = height * dpr;
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    /* Rasterizza la parola su un canvas fuori schermo e campiona i pixel
       coperti: ogni punto campionato è la destinazione di una particella. */
    function sampleTargets(word: string) {
      const points: Array<{ x: number; y: number }> = [];
      if (width < 60 || height < 60) return points;

      const off = document.createElement("canvas");
      off.width = width;
      off.height = height;
      const octx = off.getContext("2d");
      if (!octx) return points;

      /* la parola vive nel quadrante alto-destro della hero, dove non
         si sovrappone al titolo */
      const fontSize = Math.min(height * 0.42, (width / word.length) * 1.4);
      const family =
        getComputedStyle(document.body).fontFamily || "sans-serif";
      octx.font = `900 ${fontSize}px ${family}`;
      octx.textAlign = "center";
      octx.textBaseline = "middle";
      octx.fillStyle = "#fff";
      octx.fillText(word, width * 0.54, height * 0.32);

      const data = octx.getImageData(0, 0, width, height).data;
      const gap = Math.max(4, Math.round(fontSize / 30));
      for (let y = 0; y < height; y += gap) {
        for (let x = 0; x < width; x += gap) {
          if (data[(y * width + x) * 4 + 3] > 128) points.push({ x, y });
        }
      }
      return points;
    }

    function spawn(): Particle {
      return {
        x: Math.random() * width,
        y: Math.random() * height,
        vx: 0,
        vy: 0,
        tx: width / 2,
        ty: height / 2,
        size: 1 + Math.random() * 1.4,
        gold: Math.random() < 0.8,
        alpha: 0.45 + Math.random() * 0.5,
      };
    }

    function retarget(word: string) {
      const targets = sampleTargets(word);
      if (targets.length === 0) return;
      // shuffle: le traiettorie si incrociano e la transizione "fluisce"
      for (let i = targets.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [targets[i], targets[j]] = [targets[j], targets[i]];
      }
      const count = Math.min(targets.length, MAX_PARTICLES);
      while (particles.length < count) particles.push(spawn());
      particles.length = count;
      for (let i = 0; i < count; i++) {
        particles[i].tx = targets[i].x;
        particles[i].ty = targets[i].y;
      }
    }

    function drawStatic(word: string) {
      resize();
      ctx!.clearRect(0, 0, width, height);
      for (const point of sampleTargets(word)) {
        const gold = Math.random() < 0.8;
        ctx!.fillStyle = `rgba(${gold ? GOLD : BLUE}, 0.8)`;
        ctx!.fillRect(point.x, point.y, 1.6, 1.6);
      }
    }

    function tick(now: number) {
      if (disposed) return;
      if (now - lastSwap > HOLD_MS) {
        wordIndex = (wordIndex + 1) % WORDS.length;
        retarget(WORDS[wordIndex]);
        lastSwap = now;
      }

      ctx!.clearRect(0, 0, width, height);
      for (const p of particles) {
        p.vx = (p.vx + (p.tx - p.x) * 0.024) * 0.84;
        p.vy = (p.vy + (p.ty - p.y) * 0.024) * 0.84;
        p.x += p.vx + (Math.random() - 0.5) * 0.4;
        p.y += p.vy + (Math.random() - 0.5) * 0.4;
        ctx!.fillStyle = `rgba(${p.gold ? GOLD : BLUE}, ${p.alpha})`;
        ctx!.fillRect(p.x, p.y, p.size, p.size);
      }
      raf = requestAnimationFrame(tick);
    }

    function start() {
      resize();
      retarget(WORDS[wordIndex]);
      lastSwap = performance.now();
      raf = requestAnimationFrame(tick);
    }

    if (reduceMotion) {
      drawStatic(WORDS[0]);
      // il font display può caricare dopo il primo paint
      document.fonts?.ready.then(() => !disposed && drawStatic(WORDS[0]));
    } else {
      start();
      document.fonts?.ready.then(() => {
        if (!disposed) retarget(WORDS[wordIndex]);
      });
    }

    const resizeObserver = new ResizeObserver(() => {
      if (disposed) return;
      if (reduceMotion) {
        drawStatic(WORDS[0]);
      } else {
        resize();
        retarget(WORDS[wordIndex]);
      }
    });
    resizeObserver.observe(canvas);

    // fuori viewport (hero scrollata via) l'animazione si ferma
    const intersectionObserver = new IntersectionObserver(([entry]) => {
      if (reduceMotion || disposed) return;
      if (entry.isIntersecting && !visible) {
        visible = true;
        lastSwap = performance.now();
        raf = requestAnimationFrame(tick);
      } else if (!entry.isIntersecting && visible) {
        visible = false;
        cancelAnimationFrame(raf);
      }
    });
    intersectionObserver.observe(canvas);

    return () => {
      disposed = true;
      cancelAnimationFrame(raf);
      resizeObserver.disconnect();
      intersectionObserver.disconnect();
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden
      className={`pointer-events-none ${className}`}
    />
  );
}
