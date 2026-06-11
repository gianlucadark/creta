"use client";

import { useEffect, useRef } from "react";

const WORD = "Creta";
const MAX_PARTICLES = 3400;
const POINTER_RADIUS = 118;
const TERRACOTTA = "208, 126, 82";
const CLAY = "244, 190, 135";
const GOLD = "236, 201, 60";
const WHITE = "255, 255, 255";

type Particle = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  tx: number;
  ty: number;
  size: number;
  color: string;
  alpha: number;
  seed: number;
};

export function CretaParticleTitle({ className = "" }: { className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    const stage = canvas;
    const context = ctx;
    const particles: Particle[] = [];
    const pointer = { x: 0, y: 0, active: false };
    let width = 0;
    let height = 0;
    let raf = 0;
    let visible = true;
    let disposed = false;
    let birth = performance.now();

    function resize() {
      const rect = stage.getBoundingClientRect();
      width = Math.round(rect.width);
      height = Math.round(rect.height);
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      stage.width = width * dpr;
      stage.height = height * dpr;
      context.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    function sampleTargets() {
      const points: Array<{ x: number; y: number; color: string }> = [];
      if (width < 80 || height < 80) return points;

      const off = document.createElement("canvas");
      off.width = width;
      off.height = height;
      const octx = off.getContext("2d");
      if (!octx) return points;

      const family =
        getComputedStyle(document.documentElement)
          .getPropertyValue("--font-display")
          .trim() ||
        getComputedStyle(document.body).fontFamily ||
        "serif";

      const fontSize = Math.min(height * 0.84, (width / WORD.length) * 1.72);
      octx.font = `800 ${fontSize}px ${family}`;
      octx.textAlign = "center";
      octx.textBaseline = "middle";
      octx.fillStyle = "#fff";
      octx.fillText(WORD, width * 0.5, height * 0.52);

      const data = octx.getImageData(0, 0, width, height).data;
      const gap = Math.max(3, Math.round(fontSize / 50));
      for (let y = 0; y < height; y += gap) {
        for (let x = 0; x < width; x += gap) {
          if (data[(y * width + x) * 4 + 3] > 128) {
            const rel = x / Math.max(width, 1);
            const color = rel < 0.24 ? WHITE : rel < 0.58 ? CLAY : rel < 0.78 ? GOLD : TERRACOTTA;
            points.push({ x, y, color });
          }
        }
      }
      return points;
    }

    function spawn(): Particle {
      const side = Math.floor(Math.random() * 4);
      const x = side === 0 ? -30 : side === 1 ? width + 30 : Math.random() * width;
      const y = side === 2 ? -30 : side === 3 ? height + 30 : Math.random() * height;

      return {
        x,
        y,
        vx: (Math.random() - 0.5) * 0.9,
        vy: (Math.random() - 0.5) * 0.9,
        tx: width / 2,
        ty: height / 2,
        size: 1.05 + Math.random() * 2.15,
        color: WHITE,
        alpha: 0.46 + Math.random() * 0.48,
        seed: Math.random() * Math.PI * 2,
      };
    }

    function composeWord() {
      const targets = sampleTargets();
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
        particle.color = targets[i].color;
        particles.push(particle);
      }
      birth = performance.now();
    }

    function drawStatic() {
      resize();
      context.clearRect(0, 0, width, height);
      for (const point of sampleTargets().slice(0, MAX_PARTICLES)) {
        context.fillStyle = `rgba(${point.color}, 0.82)`;
        context.fillRect(point.x, point.y, 1.8, 1.8);
      }
    }

    function tick(now: number) {
      if (disposed) return;

      context.clearRect(0, 0, width, height);
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
            fx += nx * force * 2.75 + -ny * force * 0.8;
            fy += ny * force * 2.75 + nx * force * 0.8;
          }
        }

        p.vx = (p.vx + fx) * damping;
        p.vy = (p.vy + fy) * damping;
        p.x += p.vx + Math.sin(now * 0.0012 + p.seed) * 0.04;
        p.y += p.vy + Math.cos(now * 0.001 + p.seed) * 0.04;

        context.fillStyle = `rgba(${p.color}, ${p.alpha})`;
        context.fillRect(p.x, p.y, p.size, p.size);
      }

      raf = requestAnimationFrame(tick);
    }

    if (reduceMotion) {
      drawStatic();
      document.fonts?.ready.then(() => !disposed && drawStatic());
    } else {
      resize();
      composeWord();
      raf = requestAnimationFrame(tick);
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
    resizeObserver.observe(stage);

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
    intersectionObserver.observe(stage);

    function movePointer(event: PointerEvent) {
      const rect = stage.getBoundingClientRect();
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
