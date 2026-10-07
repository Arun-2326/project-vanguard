/*
 * Fourier epicycles: a chain of rotating vectors that together trace the
 * outline of π — a nod to 3Blue1Brown's "But what is a Fourier series?".
 * Points are sampled from an SVG path, run through a discrete Fourier
 * transform, and each frequency becomes one spinning circle.
 */
(() => {
  "use strict";

  const canvas = document.getElementById("fourier-canvas");
  if (!canvas || !canvas.getContext) return;

  const ctx = canvas.getContext("2d");
  const toggleBtn = document.getElementById("fourier-toggle");
  const termsLabel = document.getElementById("fourier-terms");
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // A hand-drawn π in a 100×100 box.
  const PI_PATH =
    "M 10 36 C 13 26, 21 20, 33 20 L 89 20 L 89 32 L 70 32 L 70 70 C 70 78, 73 81, 79 81 " +
    "C 83 81, 86 79, 88 76 L 92 79 C 88 88, 82 92, 74 92 C 63 92, 58 85, 58 73 L 58 32 " +
    "L 42 32 L 40 58 C 38 78, 32 90, 22 92 C 17 92, 13 89, 13 85 C 13 80, 18 78, 22 73 " +
    "C 27 65, 29 52, 30 32 C 22 32, 18 35, 14 40 Z";

  const SAMPLES = 240;

  function samplePath() {
    const svgNS = "http://www.w3.org/2000/svg";
    const svg = document.createElementNS(svgNS, "svg");
    const path = document.createElementNS(svgNS, "path");
    path.setAttribute("d", PI_PATH);
    svg.appendChild(path);
    svg.setAttribute("width", "0");
    svg.setAttribute("height", "0");
    svg.setAttribute("aria-hidden", "true");
    svg.style.position = "absolute";
    document.body.appendChild(svg);
    const total = path.getTotalLength();
    const pts = [];
    for (let i = 0; i < SAMPLES; i++) {
      const p = path.getPointAtLength((i / SAMPLES) * total);
      pts.push({ re: p.x - 52, im: p.y - 56 });
    }
    svg.remove();
    return pts;
  }

  function dft(points) {
    const N = points.length;
    const out = [];
    for (let k = 0; k < N; k++) {
      let re = 0;
      let im = 0;
      for (let n = 0; n < N; n++) {
        const phi = (2 * Math.PI * k * n) / N;
        re += points[n].re * Math.cos(phi) + points[n].im * Math.sin(phi);
        im += points[n].im * Math.cos(phi) - points[n].re * Math.sin(phi);
      }
      re /= N;
      im /= N;
      // Map k to a signed frequency so circles spin both ways.
      const freq = k <= N / 2 ? k : k - N;
      out.push({ freq, amp: Math.hypot(re, im), phase: Math.atan2(im, re) });
    }
    return out.sort((a, b) => b.amp - a.amp);
  }

  const coeffs = dft(samplePath());
  const TERMS = 90;
  const active = coeffs.slice(0, TERMS);

  let size = 0;
  let scale = 1;
  let dpr = 1;

  function resize() {
    const rect = canvas.getBoundingClientRect();
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    const next = Math.max(1, Math.round(rect.width));
    if (next === size && canvas.width === size * dpr) return false;
    size = next;
    canvas.width = size * dpr; // also clears the canvas
    canvas.height = size * dpr;
    scale = size / 120;
    return true;
  }

  const trail = [];
  let t = 0;
  let running = !reduceMotion;
  let visible = true;
  let rafId = 0;
  let last = 0;
  const PERIOD_MS = 14000;

  function epicycles(time, draw) {
    let x = size / 2;
    let y = size / 2 - 3 * scale;
    for (let i = 0; i < active.length; i++) {
      const c = active[i];
      if (c.freq === 0) {
        x += c.amp * Math.cos(c.phase) * scale;
        y += c.amp * Math.sin(c.phase) * scale;
        continue;
      }
      const r = c.amp * scale;
      const angle = c.freq * time + c.phase;
      const nx = x + r * Math.cos(angle);
      const ny = y + r * Math.sin(angle);
      if (draw && r > 0.6) {
        const alpha = Math.max(0.08, 0.5 - i * 0.012);
        ctx.strokeStyle = `rgba(88, 196, 221, ${alpha * 0.55})`;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.stroke();
        ctx.strokeStyle = `rgba(232, 237, 242, ${alpha + 0.15})`;
        ctx.lineWidth = 1.25;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(nx, ny);
        ctx.stroke();
      }
      x = nx;
      y = ny;
    }
    return { x, y };
  }

  function drawTrail(points, fade) {
    if (points.length < 2) return;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    for (let i = 1; i < points.length; i++) {
      const a = fade ? i / points.length : 1;
      ctx.strokeStyle = `rgba(244, 211, 94, ${0.15 + 0.85 * a})`;
      ctx.lineWidth = 2.6;
      ctx.beginPath();
      ctx.moveTo(points[i - 1].x, points[i - 1].y);
      ctx.lineTo(points[i].x, points[i].y);
      ctx.stroke();
    }
  }

  function clear() {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, size, size);
  }

  function frame(now) {
    rafId = 0;
    if (!running || !visible) return;
    const dt = last ? Math.min(now - last, 50) : 16;
    last = now;
    t += (dt / PERIOD_MS) * Math.PI * 2;

    clear();
    const tip = epicycles(t, true);
    // Keep just under one full turn of history so the whole π stays visible.
    trail.push({ x: tip.x, y: tip.y, t });
    while (trail.length && t - trail[0].t > Math.PI * 2 * 0.97) trail.shift();
    drawTrail(trail, true);

    ctx.fillStyle = "#f4d35e";
    ctx.beginPath();
    ctx.arc(tip.x, tip.y, 3.5, 0, Math.PI * 2);
    ctx.fill();

    rafId = requestAnimationFrame(frame);
  }

  // Static rendering for reduced motion: the finished drawing, no circles.
  function drawStill() {
    clear();
    const pts = [];
    for (let i = 0; i <= 400; i++) pts.push(epicycles((i / 400) * Math.PI * 2, false));
    drawTrail(pts, false);
    epicycles(Math.PI * 0.35, true);
  }

  function start() {
    if (!rafId && running && visible) {
      last = 0;
      rafId = requestAnimationFrame(frame);
    }
  }

  function stop() {
    if (rafId) cancelAnimationFrame(rafId);
    rafId = 0;
  }

  function syncButton() {
    if (!toggleBtn) return;
    toggleBtn.querySelector("span").textContent = running ? "Pause" : "Play";
    toggleBtn.querySelector("svg").innerHTML = running
      ? '<rect x="1" y="1" width="3" height="8" fill="currentColor"/><rect x="6" y="1" width="3" height="8" fill="currentColor"/>'
      : '<path d="M2 1l7 4-7 4z" fill="currentColor"/>';
  }

  resize();
  if (termsLabel) termsLabel.textContent = `${TERMS} rotating vectors`;
  if (running) start();
  else drawStill();
  syncButton();

  toggleBtn?.addEventListener("click", () => {
    running = !running;
    syncButton();
    if (running) start();
    else stop();
  });

  if ("ResizeObserver" in window) {
    new ResizeObserver(() => {
      if (!resize()) return;
      trail.length = 0;
      if (!running) drawStill();
    }).observe(canvas);
  }

  if ("IntersectionObserver" in window) {
    new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      if (visible) start();
      else stop();
    }).observe(canvas);
  }

  document.addEventListener("visibilitychange", () => {
    if (document.hidden) stop();
    else start();
  });
})();
