/* Library page: searchable, filterable catalogue of favourite 3Blue1Brown lessons. */
(() => {
  "use strict";

  const grid = document.getElementById("library");
  if (!grid) return;

  const TOPICS = {
    linalg: { label: "Linear algebra", color: "#58c4dd" },
    calc: { label: "Calculus", color: "#83c167" },
    ml: { label: "Machine learning", color: "#c79363" },
    prob: { label: "Probability", color: "#f4d35e" },
    geo: { label: "Geometry & topology", color: "#9a72ac" },
    num: { label: "Puzzles & number theory", color: "#fc6255" },
    phys: { label: "Physics & computing", color: "#5cd0b3" },
  };

  // Years are when each lesson or series began; links search YouTube for the title.
  const ITEMS = [
    { title: "Essence of Linear Algebra", year: 2016, topic: "linalg", series: true, mins: 190,
      blurb: "Vectors, matrices and determinants seen as what they really are: transformations of space." },
    { title: "Essence of Calculus", year: 2017, topic: "calc", series: true, mins: 200,
      blurb: "Derivatives, integrals and limits rebuilt from geometric intuition, as if you had invented them." },
    { title: "Neural Networks", year: 2017, topic: "ml", series: true, mins: 240,
      blurb: "From a digit-recognising network and backpropagation all the way to transformers and attention." },
    { title: "Differential Equations", year: 2019, topic: "calc", series: true, mins: 120,
      blurb: "Pendulums, phase space and the heat equation: studying what you can't solve exactly." },
    { title: "Lockdown Math", year: 2020, topic: "num", series: true, mins: 600,
      blurb: "Live lessons for students stuck at home: trigonometry, complex numbers, logarithms and more." },
    { title: "But what is the Fourier Transform? A visual introduction", year: 2018, topic: "phys",
      blurb: "Wrapping a signal around a circle to pull out the frequencies hiding inside it." },
    { title: "But what is a Fourier series? From heat flow to drawing with circles", year: 2019, topic: "phys",
      blurb: "Spinning vectors added tip to tail can draw anything — the idea behind this site's hero." },
    { title: "But how does bitcoin actually work?", year: 2017, topic: "phys",
      blurb: "Digital signatures, hashing and proof of work, built up one problem at a time." },
    { title: "Why colliding blocks compute pi", year: 2019, topic: "num",
      blurb: "Count the clacks between two sliding blocks and the digits of π appear. Then find out why." },
    { title: "Bayes theorem, the geometry of changing beliefs", year: 2019, topic: "prob",
      blurb: "Updating beliefs with evidence, drawn as areas you can actually reason about." },
    { title: "But what is the Central Limit Theorem?", year: 2023, topic: "prob",
      blurb: "Why sums of random things tend toward the same bell curve, again and again." },
    { title: "Solving Wordle using information theory", year: 2022, topic: "prob",
      blurb: "Entropy, expected information and a bot that guesses well — with a famous correction afterwards." },
    { title: "But what is a convolution?", year: 2022, topic: "prob",
      blurb: "One operation hiding behind probability, image blurring and fast polynomial multiplication." },
    { title: "Group theory, abstraction, and the 196,883-dimensional monster", year: 2020, topic: "num",
      blurb: "Symmetry as a mathematical object, and the strangest finite group of them all." },
    { title: "Visualizing quaternions with stereographic projection", year: 2018, topic: "geo",
      blurb: "Four-dimensional numbers made visible by projecting them down, one dimension at a time." },
    { title: "Who cares about topology? The inscribed rectangle problem", year: 2016, topic: "geo",
      blurb: "A clever detour through Möbius strips to prove every closed loop hides a rectangle." },
    { title: "Why is a sphere's surface area four times its shadow?", year: 2018, topic: "geo",
      blurb: "Two geometric arguments for 4πr², and what they teach about problem solving." },
    { title: "Why is pi here? And why is it squared? The Basel problem", year: 2018, topic: "geo",
      blurb: "Lighthouses around a lake turn an infinite sum into π²/6." },
    { title: "Hilbert's curve: Is infinite math useful?", year: 2017, topic: "geo",
      blurb: "A space-filling curve, and why limits of finite things can matter in the real world." },
    { title: "The hardest problem on the hardest test", year: 2017, topic: "prob",
      blurb: "A Putnam probability puzzle about tetrahedra, solved by asking a simpler question first." },
    { title: "How (and why) to raise e to the power of a matrix", year: 2021, topic: "linalg",
      blurb: "Matrix exponents make sense — and they describe how systems evolve through time." },
    { title: "Eigenvectors and eigenvalues", year: 2016, topic: "linalg",
      blurb: "The vectors that only get stretched by a transformation, and why they make life easy." },
    { title: "But what is a GPT? Visual intro to transformers", year: 2024, topic: "ml",
      blurb: "Embeddings, tokens and the structure of a large language model, step by step." },
    { title: "Attention in transformers, visually explained", year: 2024, topic: "ml",
      blurb: "How words in a context update each other's meaning through queries, keys and values." },
  ];

  const search = document.getElementById("library-search");
  const sort = document.getElementById("library-sort");
  const chips = Array.from(document.querySelectorAll("[data-topic-filter]"));
  const meta = document.getElementById("library-meta");
  const empty = document.getElementById("library-empty");
  const resetBtn = document.getElementById("library-reset");

  const params = new URLSearchParams(window.location.search);
  const state = {
    topic: TOPICS[params.get("topic")] ? params.get("topic") : "all",
    query: params.get("q") || "",
    sort: ["newest", "oldest", "title"].includes(params.get("sort")) ? params.get("sort") : "newest",
  };

  /* ---------- Generative card art ---------- */
  function isPrimeNumber(n) {
    if (n < 2) return false;
    for (let k = 2; k * k <= n; k++) if (n % k === 0) return false;
    return true;
  }

  function art(item, index) {
    const c = TOPICS[item.topic].color;
    const seed = (index * 37) % 11;
    let body = "";

    switch (item.topic) {
      case "linalg": {
        const shear = 0.25 + seed * 0.04;
        let lines = "";
        for (let k = -6; k <= 6; k++) {
          lines += `<line x1="${160 + k * 26 - 200 * shear}" y1="-20" x2="${160 + k * 26 + 200 * shear}" y2="200" />`;
          lines += `<line x1="-20" y1="${90 + k * 26}" x2="340" y2="${90 + k * 26}" />`;
        }
        body = `<g stroke="${c}" stroke-opacity=".28" stroke-width="1">${lines}</g>
          <line x1="160" y1="90" x2="${212 + seed * 3}" y2="90" stroke="#83c167" stroke-width="4" stroke-linecap="round"/>
          <line x1="160" y1="90" x2="${160 + 26 * shear * 2}" y2="38" stroke="#fc6255" stroke-width="4" stroke-linecap="round"/>`;
        break;
      }
      case "calc": {
        let rects = "";
        const f = (x) => 140 - 70 * Math.sin((x - 40) / (70 + seed * 3)) - (x - 40) * 0.08;
        for (let x = 50; x < 280; x += 18) {
          const y = f(x + 9);
          rects += `<rect x="${x}" y="${y.toFixed(1)}" width="16" height="${(150 - y).toFixed(1)}" rx="2" />`;
        }
        let d = "M 40 " + f(40).toFixed(1);
        for (let x = 44; x <= 290; x += 4) d += ` L ${x} ${f(x).toFixed(1)}`;
        body = `<g fill="${c}" fill-opacity=".22">${rects}</g>
          <path d="${d}" fill="none" stroke="${c}" stroke-width="3" stroke-linecap="round"/>
          <line x1="30" y1="150" x2="300" y2="150" stroke="#e8edf2" stroke-opacity=".35"/>`;
        break;
      }
      case "ml": {
        const layers = [4, 6, 6, 3];
        const nodes = layers.map((n, li) =>
          Array.from({ length: n }, (_, ni) => [70 + li * 60, 90 + (ni - (n - 1) / 2) * 24])
        );
        let edges = "";
        for (let li = 0; li < nodes.length - 1; li++) {
          for (const [x1, y1] of nodes[li]) {
            for (const [x2, y2] of nodes[li + 1]) {
              const op = (((x1 * 7 + y2 * 3 + seed * 13) % 10) / 10) * 0.45 + 0.05;
              edges += `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke-opacity="${op.toFixed(2)}"/>`;
            }
          }
        }
        const dots = nodes.flat().map(([x, y], i) =>
          `<circle cx="${x}" cy="${y}" r="7" fill-opacity="${(((i + seed) % 5) / 5 * 0.8 + 0.15).toFixed(2)}"/>`
        ).join("");
        body = `<g stroke="${c}" stroke-width="1">${edges}</g>
          <g fill="#e8edf2" stroke="${c}" stroke-width="1.5">${dots}</g>`;
        break;
      }
      case "prob": {
        let bars = "";
        const mu = 160 + (seed - 5) * 8;
        const sd = 32 + seed * 3;
        for (let x = 40; x < 280; x += 14) {
          const h = 115 * Math.exp(-((x + 7 - mu) ** 2) / (2 * sd ** 2));
          bars += `<rect x="${x}" y="${(150 - h).toFixed(1)}" width="12" height="${h.toFixed(1)}" rx="2"/>`;
        }
        let d = "";
        for (let x = 34; x <= 290; x += 4) {
          const y = 150 - 115 * Math.exp(-((x - mu) ** 2) / (2 * sd ** 2));
          d += `${d ? " L" : "M"} ${x} ${y.toFixed(1)}`;
        }
        body = `<g fill="${c}" fill-opacity=".28">${bars}</g>
          <path d="${d}" fill="none" stroke="${c}" stroke-width="3"/>
          <line x1="30" y1="150" x2="300" y2="150" stroke="#e8edf2" stroke-opacity=".35"/>`;
        break;
      }
      case "geo": {
        let rings = "";
        for (let i = 1; i <= 6; i++) {
          rings += `<ellipse cx="160" cy="90" rx="${66}" ry="${(i * 11).toFixed(1)}" />`;
        }
        body = `<circle cx="160" cy="90" r="66" fill="${c}" fill-opacity=".12" stroke="${c}" stroke-width="2.5"/>
          <g fill="none" stroke="${c}" stroke-opacity=".45" transform="rotate(${seed * 16 - 80} 160 90)">${rings}</g>
          <ellipse cx="160" cy="166" rx="66" ry="8" fill="#000" fill-opacity=".35"/>
          <line x1="${94 + seed * 4}" y1="40" x2="${226 - seed * 3}" y2="140" stroke="#f4d35e" stroke-width="2" stroke-dasharray="4 5"/>`;
        break;
      }
      case "num": {
        let dots = "";
        for (let n = 1; n < 260; n++) {
          const r = Math.sqrt(n) * 4.6;
          const a = n * (2.399963 + seed * 0.0007);
          const x = 160 + r * Math.cos(a);
          const y = 90 + r * Math.sin(a);
          if (y < 4 || y > 176) continue;
          const isPrime = isPrimeNumber(n);
          dots += `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${isPrime ? 2.6 : 1.4}" fill="${isPrime ? c : "#e8edf2"}" fill-opacity="${isPrime ? 1 : 0.3}"/>`;
        }
        body = dots;
        break;
      }
      default: {
        let waves = "";
        for (let w = 0; w < 3; w++) {
          let d = "";
          for (let x = 20; x <= 300; x += 4) {
            const y = 90 + (28 - w * 8) * Math.sin((x / (18 + w * 9)) + seed + w);
            d += `${d ? " L" : "M"} ${x} ${y.toFixed(1)}`;
          }
          waves += `<path d="${d}" stroke-opacity="${(1 - w * 0.3).toFixed(2)}"/>`;
        }
        body = `<g fill="none" stroke="${c}" stroke-width="2.5" stroke-linecap="round">${waves}</g>`;
      }
    }

    return `<svg viewBox="0 0 320 180" preserveAspectRatio="xMidYMid slice" aria-hidden="true" focusable="false">${body}</svg>`;
  }

  /* ---------- Rendering ---------- */
  const escapeHtml = (s) => s.replace(/[&<>"']/g, (ch) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  })[ch]);

  const arrow = '<svg viewBox="0 0 16 16" aria-hidden="true" focusable="false"><path d="M3 8h9M8.5 4l4 4-4 4" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/></svg>';

  // Render every card once, then filter by toggling `hidden` — cheap and keeps art stable.
  const cards = ITEMS.map((item, index) => {
    const li = document.createElement("li");
    const url = `https://www.youtube.com/results?search_query=${encodeURIComponent(`3Blue1Brown ${item.title}`)}`;
    const kind = item.series ? "Series" : "Lesson";
    li.innerHTML = `
      <article class="card">
        <div class="card-art">${art(item, index)}</div>
        <div class="card-body">
          <div class="tag-row">
            ${item.series ? '<span class="tag tag--series">Series</span>' : ""}
            <span class="tag">${TOPICS[item.topic].label}</span>
          </div>
          <h3><a href="${url}" target="_blank" rel="noopener noreferrer">${escapeHtml(item.title)}<span class="visually-hidden"> (${kind}, opens YouTube in a new tab)</span></a></h3>
          <p>${escapeHtml(item.blurb)}</p>
          <div class="card-foot"><span class="card-kicker">${item.year}</span><span aria-hidden="true">·</span> Watch on YouTube ${arrow}</div>
        </div>
      </article>`;
    grid.appendChild(li);
    return { li, item, haystack: `${item.title} ${item.blurb} ${TOPICS[item.topic].label}`.toLowerCase() };
  });

  function apply() {
    const q = state.query.trim().toLowerCase();
    const terms = q.split(/\s+/).filter(Boolean);
    const matches = cards.filter(({ item, haystack }) =>
      (state.topic === "all" || item.topic === state.topic) &&
      terms.every((t) => haystack.includes(t))
    );

    const sorted = matches.slice().sort((a, b) => {
      if (state.sort === "title") return a.item.title.localeCompare(b.item.title);
      if (state.sort === "oldest") return a.item.year - b.item.year || a.item.title.localeCompare(b.item.title);
      return b.item.year - a.item.year || a.item.title.localeCompare(b.item.title);
    });

    cards.forEach(({ li }) => { li.hidden = true; });
    sorted.forEach(({ li }) => {
      li.hidden = false;
      grid.appendChild(li);
    });

    const topicLabel = state.topic === "all" ? "all topics" : TOPICS[state.topic].label;
    meta.textContent = `${sorted.length} ${sorted.length === 1 ? "lesson" : "lessons"} · ${topicLabel}${q ? ` · matching “${state.query.trim()}”` : ""}`;
    empty.hidden = sorted.length > 0;

    chips.forEach((chip) => chip.setAttribute("aria-pressed", String(chip.dataset.topicFilter === state.topic)));

    const next = new URLSearchParams();
    if (state.topic !== "all") next.set("topic", state.topic);
    if (q) next.set("q", state.query.trim());
    if (state.sort !== "newest") next.set("sort", state.sort);
    const qs = next.toString();
    history.replaceState(null, "", qs ? `?${qs}` : window.location.pathname);
  }

  search.value = state.query;
  sort.value = state.sort;

  let debounce = 0;
  search.addEventListener("input", () => {
    clearTimeout(debounce);
    debounce = setTimeout(() => {
      state.query = search.value;
      apply();
    }, 120);
  });

  sort.addEventListener("change", () => {
    state.sort = sort.value;
    apply();
  });

  chips.forEach((chip) => {
    chip.addEventListener("click", () => {
      state.topic = chip.dataset.topicFilter;
      apply();
    });
  });

  resetBtn?.addEventListener("click", () => {
    state.topic = "all";
    state.query = "";
    search.value = "";
    apply();
    search.focus();
  });

  apply();
})();
