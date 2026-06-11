"use client";

import { useEffect, useRef } from "react";

/* Particelle che arrivano da tutta l'area del canvas e compongono lentamente
   MICE. Il puntatore crea interferenza solo nel punto attraversato. */

const WORD = "MICE";
const MAX_PARTICLES = 1900;
const POINTER_RADIUS = 88;
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
  seed: number;
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
    let birth = performance.now();
    const particles: Particle[] = [];
    const pointer = { x: 0, y: 0, active: false };

    function resize() {
      const rect = canvas!.getBoundingClientRect();
      width = Math.round(rect.width);
      height = Math.round(rect.height);
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas!.width = width * dpr;
      canvas!.height = height * dpr;
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    function sampleTargets(word: string) {
      const points: Array<{ x: number; y: number }> = [];
      if (width < 60 || height < 60) return points;

      const off = document.createElement("canvas");
      off.width = width;
      off.height = height;
      const octx = off.getContext("2d");
      if (!octx) return points;

      const fontSize = Math.min(height * 0.43, (width / word.length) * 1.48);
      const family =
        getComputedStyle(document.documentElement)
          .getPropertyValue("--font-display")
          .trim() ||
        getComputedStyle(document.body).fontFamily ||
        "serif";

      octx.font = `700 ${fontSize}px ${family}`;
      octx.textAlign = "center";
      octx.textBaseline = "middle";
      octx.fillStyle = "#fff";
      octx.fillText(word, width * 0.53, height * 0.36);

      const data = octx.getImageData(0, 0, width, height).data;
      const gap = Math.max(4, Math.round(fontSize / 32));
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
        vx: (Math.random() - 0.5) * 0.8,
        vy: (Math.random() - 0.5) * 0.8,
        tx: width / 2,
        ty: height / 2,
        size: 0.95 + Math.random() * 1.55,
        gold: Math.random() < 0.78,
        alpha: 0.42 + Math.random() * 0.5,
        seed: Math.random() * Math.PI * 2,
      };
    }

    function composeWord() {
      const targets = sampleTargets(WORD);
      if (targets.length === 0) return;

      for (let i = targets.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [targets[i], targets[j]] = [targets[j], targets[i]];
      }

      const count = Math.min(targets.length, MAX_PARTICLES);
      particles.length = 0;
      for (let i = 0; i < count; i++) {
        const particle = spawn();
        particle.tx = targets[i].x;
        particle.ty = targets[i].y;
        particles.push(particle);
      }
      birth = performance.now();
    }

    function drawStatic() {
      resize();
      ctx!.clearRect(0, 0, width, height);
      for (const point of sampleTargets(WORD).slice(0, MAX_PARTICLES)) {
        const gold = Math.random() < 0.78;
        ctx!.fillStyle = `rgba(${gold ? GOLD : BLUE}, 0.8)`;
        ctx!.fillRect(point.x, point.y, 1.6, 1.6);
      }
    }

    function tick(now: number) {
      if (disposed) return;

      ctx!.clearRect(0, 0, width, height);
      const compose = Math.min(1, (now - birth) / 10500);
      const spring = 0.0022 + compose * 0.014;
      const damping = 0.93 - compose * 0.045;

      for (const p of particles) {
        let fx = (p.tx - p.x) * spring;
        let fy = (p.ty - p.y) * spring;

        if (pointer.active) {
          const dx = p.x - pointer.x;
          const dy = p.y - pointer.y;
          const distSq = dx * dx + dy * dy;
          const radiusSq = POINTER_RADIUS * POINTER_RADIUS;

          if (distSq < radiusSq && distSq > 0.01) {
            const dist = Math.sqrt(distSq);
            const force = (1 - dist / POINTER_RADIUS) ** 2;
            const nx = dx / dist;
            const ny = dy / dist;
            fx += nx * force * 2.9 + -ny * force * 0.85;
            fy += ny * force * 2.9 + nx * force * 0.85;
          }
        }

        p.vx = (p.vx + fx) * damping;
        p.vy = (p.vy + fy) * damping;
        p.x += p.vx + Math.sin(now * 0.0012 + p.seed) * 0.04;
        p.y += p.vy + Math.cos(now * 0.001 + p.seed) * 0.04;

        ctx!.fillStyle = `rgba(${p.gold ? GOLD : BLUE}, ${p.alpha})`;
        ctx!.fillRect(p.x, p.y, p.size, p.size);
      }

      raf = requestAnimationFrame(tick);
    }

    function start() {
      resize();
      composeWord();
      raf = requestAnimationFrame(tick);
    }

    if (reduceMotion) {
      drawStatic();
      document.fonts?.ready.then(() => !disposed && drawStatic());
    } else {
      start();
      document.fonts?.ready.then(() => !disposed && composeWord());
    }

    const resizeObserver = new ResizeObserver(() => {
      if (disposed) return;
      if (reduceMotion) {
        drawStatic();
      } else {
        resize();
        composeWord();
      }
    });
    resizeObserver.observe(canvas);

    const intersectionObserver = new IntersectionObserver(([entry]) => {
      if (reduceMotion || disposed) return;
      if (entry.isIntersecting && !visible) {
        visible = true;
        raf = requestAnimationFrame(tick);
      } else if (!entry.isIntersecting && visible) {
        visible = false;
        cancelAnimationFrame(raf);
      }
    });
    intersectionObserver.observe(canvas);

    function movePointer(event: PointerEvent) {
      const rect = canvas!.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;
      pointer.x = x;
      pointer.y = y;
      pointer.active = x >= 0 && x <= rect.width && y >= 0 && y <= rect.height;
    }

    function clearPointer() {
      pointer.active = false;
    }

    window.addEventListener("pointermove", movePointer, { passive: true });
    window.addEventListener("pointerleave", clearPointer);

    return () => {
      disposed = true;
      cancelAnimationFrame(raf);
      window.removeEventListener("pointermove", movePointer);
      window.removeEventListener("pointerleave", clearPointer);
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
