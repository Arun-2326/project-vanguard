// Minimal local server that mirrors the Vercel setup: static files with clean
// URLs, plus the /api functions. Submissions are kept in memory unless
// BLOB_READ_WRITE_TOKEN is set.   Usage: npm run dev  (PORT=3000 by default)
import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../public/", import.meta.url));
const port = Number(process.env.PORT || 3000);

const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".svg": "image/svg+xml",
  ".json": "application/json",
  ".txt": "text/plain; charset=utf-8",
  ".xml": "application/xml",
  ".woff2": "font/woff2",
};

const API = {
  "/api/subscribe": () => import("../api/subscribe.js"),
  "/api/submissions": () => import("../api/submissions.js"),
};

async function toRequest(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const body = chunks.length ? Buffer.concat(chunks) : undefined;
  return new Request(`http://localhost:${port}${req.url}`, {
    method: req.method,
    headers: { ...req.headers, "x-forwarded-for": req.socket.remoteAddress || "" },
    body: ["GET", "HEAD"].includes(req.method) ? undefined : body,
  });
}

async function resolveFile(pathname) {
  const clean = normalize(decodeURIComponent(pathname)).replace(/^(\.\.[/\\])+/, "");
  if (clean.split(/[/\\]/).some((part) => part.startsWith("."))) {
    return null;
  }
  const candidates = clean.endsWith("/") ? [join(clean, "index.html")] : [clean, `${clean}.html`];
  for (const candidate of candidates) {
    const full = join(root, candidate);
    try {
      if ((await stat(full)).isFile()) return full;
    } catch {
      /* try next */
    }
  }
  return null;
}

createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://localhost:${port}`);
    const load = API[url.pathname];
    if (load) {
      const mod = await load();
      const handler = mod[req.method];
      const response = handler
        ? await handler(await toRequest(req))
        : new Response(JSON.stringify({ ok: false, message: "Method not allowed" }), { status: 405 });
      res.writeHead(response.status, Object.fromEntries(response.headers));
      res.end(Buffer.from(await response.arrayBuffer()));
      return;
    }

    const file = await resolveFile(url.pathname);
    if (!file) {
      res.writeHead(404, { "Content-Type": TYPES[".html"] });
      res.end(await readFile(join(root, "404.html")));
      return;
    }
    res.writeHead(200, { "Content-Type": TYPES[extname(file)] || "application/octet-stream" });
    res.end(await readFile(file));
  } catch (error) {
    console.error(error);
    res.writeHead(500);
    res.end("Internal error");
  }
}).listen(port, () => console.log(`Epicycles running at http://localhost:${port}`));
