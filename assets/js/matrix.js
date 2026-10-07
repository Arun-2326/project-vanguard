/*
 * Linear transformation playground, after "Essence of Linear Algebra".
 * The matrix columns are where î (green) and ĵ (red) land; the grid
 * follows, and the yellow unit square shows the determinant as area.
 */
(() => {
  "use strict";

  const root = document.getElementById("playground");
  if (!root) return;

  const svg = root.querySelector("svg");
  const gridGroup = svg.querySelector("[data-grid]");
  const square = svg.querySelector("[data-square]");
  const iHat = svg.querySelector("[data-ihat]");
  const jHat = svg.querySelector("[data-jhat]");
  const detOut = root.querySelector("[data-det]");
  const detNote = root.querySelector("[data-det-note]");
  const cells = {
    a: root.querySelector('[data-cell="a"]'),
    b: root.querySelector('[data-cell="b"]'),
    c: root.querySelector('[data-cell="c"]'),
    d: root.querySelector('[data-cell="d"]'),
  };
  const sliders = Array.from(root.querySelectorAll('input[type="range"]'));
  const presetBtns = Array.from(root.querySelectorAll("[data-preset]"));
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const UNIT = 40; // px per unit in the 400×400 viewBox
  const RANGE = 12;

  const PRESETS = {
    identity: [1, 0, 0, 1],
    rotate: [0, -1, 1, 0],
    shear: [1, 1, 0, 1],
    scale: [1.5, 0, 0, 1.5],
    flip: [-1, 0, 0, 1],
    squish: [1, 2, 0.5, 1],
  };

  // m = [a, b, c, d] for the matrix [[a, b], [c, d]]
  let m = [1, 0, 0, 1];
  let anim = 0;

  const toScreen = (x, y) => [x * UNIT, -y * UNIT];
  const apply = (x, y) => [m[0] * x + m[1] * y, m[2] * x + m[3] * y];
  const fmt = (n) => (Math.abs(n) < 0.005 ? "0.00" : n.toFixed(2)).replace("-0.00", "0.00");

  // Pre-build the grid lines once; render() only moves them.
  const lines = [];
  for (let k = -RANGE; k <= RANGE; k++) {
    for (const dir of ["v", "h"]) {
      const el = document.createElementNS("http://www.w3.org/2000/svg", "line");
      el.setAttribute("class", k === 0 ? "pg-axis" : "pg-line");
      gridGroup.appendChild(el);
      lines.push({ el, k, dir });
    }
  }

  function setArrow(el, x, y) {
    const [sx, sy] = toScreen(x, y);
    el.setAttribute("x2", sx.toFixed(2));
    el.setAttribute("y2", sy.toFixed(2));
  }

  function render() {
    for (const { el, k, dir } of lines) {
      const [x1, y1] = dir === "v" ? apply(k, -RANGE) : apply(-RANGE, k);
      const [x2, y2] = dir === "v" ? apply(k, RANGE) : apply(RANGE, k);
      const [sx1, sy1] = toScreen(x1, y1);
      const [sx2, sy2] = toScreen(x2, y2);
      el.setAttribute("x1", sx1.toFixed(2));
      el.setAttribute("y1", sy1.toFixed(2));
      el.setAttribute("x2", sx2.toFixed(2));
      el.setAttribute("y2", sy2.toFixed(2));
    }

    const corners = [[0, 0], [1, 0], [1, 1], [0, 1]].map(([x, y]) => toScreen(...apply(x, y)));
    square.setAttribute("points", corners.map((p) => p.map((v) => v.toFixed(2)).join(",")).join(" "));

    setArrow(iHat, m[0], m[2]);
    setArrow(jHat, m[1], m[3]);

    cells.a.textContent = fmt(m[0]);
    cells.b.textContent = fmt(m[1]);
    cells.c.textContent = fmt(m[2]);
    cells.d.textContent = fmt(m[3]);

    const det = m[0] * m[3] - m[1] * m[2];
    detOut.textContent = fmt(det);
    if (Math.abs(det) < 0.01) {
      detNote.textContent = "Determinant is zero: the whole plane is squished onto a line (or a point).";
    } else if (det < 0) {
      detNote.textContent = `Orientation flips, and every area is scaled by ${fmt(Math.abs(det))}.`;
    } else {
      detNote.textContent = `Every area in the plane is scaled by ${fmt(det)}.`;
    }

    sliders.forEach((s) => {
      const idx = Number(s.dataset.index);
      if (document.activeElement !== s) s.value = String(m[idx]);
      const out = s.closest(".slider").querySelector("output");
      if (out) out.textContent = fmt(m[idx]);
    });

    presetBtns.forEach((btn) => {
      const p = PRESETS[btn.dataset.preset];
      const match = p.every((v, i) => Math.abs(v - m[i]) < 0.001);
      btn.setAttribute("aria-pressed", String(match));
    });
  }

  function animateTo(target) {
    cancelAnimationFrame(anim);
    if (reduceMotion) {
      m = target.slice();
      render();
      return;
    }
    const from = m.slice();
    const startTime = performance.now();
    const duration = 650;
    const ease = (x) => 1 - Math.pow(1 - x, 3);
    const step = (now) => {
      const p = Math.min(1, (now - startTime) / duration);
      const e = ease(p);
      m = from.map((v, i) => v + (target[i] - v) * e);
      render();
      if (p < 1) anim = requestAnimationFrame(step);
    };
    anim = requestAnimationFrame(step);
  }

  sliders.forEach((s) => {
    s.addEventListener("input", () => {
      cancelAnimationFrame(anim);
      m[Number(s.dataset.index)] = Number(s.value);
      render();
    });
  });

  presetBtns.forEach((btn) => {
    btn.addEventListener("click", () => animateTo(PRESETS[btn.dataset.preset]));
  });

  render();

  // Open with a gentle shear so the idea is visible before anyone touches it.
  if (!reduceMotion && "IntersectionObserver" in window) {
    const io = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        io.disconnect();
        setTimeout(() => animateTo([1, 1, 0, 1]), 400);
      }
    }, { threshold: 0.4 });
    io.observe(svg);
  }
})();
