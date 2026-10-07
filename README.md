# Epicycles — a fan hub for 3Blue1Brown

An unofficial, multi-page fan site celebrating **3Blue1Brown**, Grant Sanderson's
animated math channel. It's built as a thank-you: a map of the lessons, an
interactive toy borrowed from *Essence of Linear Algebra*, and a fan mailbag.

> Not affiliated with or endorsed by 3Blue1Brown or Grant Sanderson.

## Pages

| Route        | What's there |
|--------------|--------------|
| `/`          | Hero with a live **Fourier-epicycle drawing of π** (DFT computed in the browser), why the channel matters, featured series, an interactive **matrix transformation playground**, a short history, Manim, and the **newsletter sign-up form**. |
| `/explore`   | The library: searchable, filterable, sortable catalogue of series and lessons with generative card art. Filters are kept in the URL (`/explore?topic=ml&q=attention`). |
| `/community` | The mailbag: a validated **fan submission form** with inline errors, a success state with a reference ID, and an FAQ. |
| `/404`       | Custom not-found page. |

## Backend

Two Vercel Functions (Web-standard `POST(request)` handlers) receive the forms:

- `POST /api/subscribe` — newsletter sign-up `{ email, interests[] }`
- `POST /api/submissions` — mailbag entry `{ name, email, kind, title, message, link?, favourite?, mayFeature, newsletter, agree }`

Both validate on the server (mirroring the client rules), reject oversized or
wrongly-typed bodies, trap bots with a honeypot field, and rate-limit bursts per IP.
Records are written as **private JSON blobs in Vercel Blob**:

```
newsletter/<sha256(email)>.json              # idempotent: re-subscribing updates in place
submissions/<YYYY-MM-DD>/<EPI-XXXXXXXX>.json
```

Forms are progressively enhanced: with JavaScript they post JSON and show inline
feedback; without it they post `application/x-www-form-urlencoded` and the API
answers with a redirect or a plain error page.

### Configuration

| Variable | Purpose |
|----------|---------|
| `BLOB_READ_WRITE_TOKEN` | Set automatically when a Vercel Blob store is connected to the project. Without it, local dev keeps records in memory; production refuses to pretend it saved. |
| `IP_SALT` *(optional)* | Salt for the hashed IP stored with each record. |

## Develop

```bash
npm install
npm run dev      # http://localhost:3000 — static pages + API, in-memory storage
npm test         # API tests (node:test)
```

After changing the header or footer in `index.html`, run `python3 scripts/partials.py`
to copy them into the other pages.

## Quality

- No framework, no build step: hand-written HTML, one stylesheet, small vanilla JS modules.
- Self-hosted fonts (Inter, Source Serif 4 — SIL OFL, see `assets/fonts/LICENSE.txt`), preloaded; strict CSP with no third-party origins.
- Respects `prefers-reduced-motion` (the epicycles render a still drawing, reveals are disabled), pauses the canvas off-screen and in background tabs.
- Keyboard and screen-reader friendly: skip link, labelled controls, live regions for results and form status, visible focus rings.
- Lighthouse (mobile, local server without compression): Performance 96–99, Accessibility 100, Best Practices 100, SEO 100 on every page.
