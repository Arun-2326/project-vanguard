// Shared helpers for the form endpoints: parsing, validation, rate limiting and storage.
// Files under api/_lib are not deployed as functions (leading underscore).
import { createHash, randomUUID } from "node:crypto";
import { BlobNotFoundError, head, put } from "@vercel/blob";

const MAX_BODY_BYTES = 16 * 1024;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/* ---------- Responses ---------- */

const SECURITY_HEADERS = {
  "Cache-Control": "no-store",
  "X-Content-Type-Options": "nosniff",
};

export function json(status, body) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8", ...SECURITY_HEADERS },
  });
}

function wantsHtml(request) {
  const accept = request.headers.get("accept") || "";
  return accept.includes("text/html") && !accept.includes("application/json");
}

// Non-JS form posts get a redirect (success) or a minimal HTML page (error).
export function respond(request, status, body, successRedirect) {
  if (!wantsHtml(request)) return json(status, body);
  if (body.ok && successRedirect) {
    return new Response(null, { status: 303, headers: { Location: successRedirect, ...SECURITY_HEADERS } });
  }
  const details = body.errors ? Object.values(body.errors).map((m) => `<li>${escapeHtml(m)}</li>`).join("") : "";
  const html = `<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Please check your submission</title>
<body style="font-family:system-ui,sans-serif;background:#0b0f14;color:#e8edf2;padding:2rem;line-height:1.6">
<h1>Please check your submission</h1><p>${escapeHtml(body.message || "Something went wrong.")}</p><ul>${details}</ul>
<p><a style="color:#58c4dd" href="${escapeHtml(backLink(request))}">Go back and try again</a></p></body>`;
  return new Response(html, { status, headers: { "Content-Type": "text/html; charset=utf-8", ...SECURITY_HEADERS } });
}

// Same-origin path of the page that posted the form, for the "go back" link.
function backLink(request) {
  try {
    const referer = new URL(request.headers.get("referer") || "");
    if (referer.host === new URL(request.url).host) return referer.pathname;
  } catch {
    /* no or invalid referer */
  }
  return "/";
}

function escapeHtml(text) {
  return String(text).replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  })[c]);
}

/* ---------- Request parsing ---------- */

export class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

export async function readBody(request) {
  const declared = Number(request.headers.get("content-length") || 0);
  if (declared > MAX_BODY_BYTES) throw new HttpError(413, "That submission is too large.");

  const raw = await request.text();
  if (raw.length > MAX_BODY_BYTES) throw new HttpError(413, "That submission is too large.");

  const type = (request.headers.get("content-type") || "").split(";")[0].trim();
  if (type === "application/json") {
    try {
      const data = JSON.parse(raw || "{}");
      if (!data || typeof data !== "object" || Array.isArray(data)) throw new Error("not an object");
      return data;
    } catch {
      throw new HttpError(400, "Request body must be a JSON object.");
    }
  }
  if (type === "application/x-www-form-urlencoded") {
    const params = new URLSearchParams(raw);
    const data = {};
    for (const key of new Set(params.keys())) {
      const values = params.getAll(key);
      data[key] = values.length > 1 ? values : values[0];
    }
    return data;
  }
  throw new HttpError(415, "Unsupported content type.");
}

/* ---------- Validation ---------- */

const str = (v) => (typeof v === "string" ? v.trim() : "");

const bool = (v) => v === true || v === "true" || v === "on" || v === "1";

const list = (v) => (Array.isArray(v) ? v : v == null || v === "" ? [] : [v]).filter((x) => typeof x === "string");

export function isBot(data) {
  return str(data.website) !== "";
}

export function validateEmail(value, errors, field = "email") {
  const email = str(value).toLowerCase();
  if (!email) errors[field] = "Please enter your email address.";
  else if (email.length > 254 || !EMAIL_RE.test(email)) errors[field] = "That doesn't look like a valid email address.";
  return email;
}

const INTERESTS = new Set(["linear-algebra", "calculus", "machine-learning", "probability", "puzzles"]);

export function validateSubscription(data) {
  const errors = {};
  const email = validateEmail(data.email, errors);
  const interests = [...new Set(list(data.interests))].filter((i) => INTERESTS.has(i));
  return { errors, value: { email, interests } };
}

const KINDS = new Set(["lesson-story", "video-idea", "my-explainer", "thank-you"]);
const FAVOURITES = new Set(["linear-algebra", "calculus", "neural-networks", "differential-equations", "lockdown-math"]);

function lengthCheck(errors, field, value, min, max, label) {
  if (!value) errors[field] = `Please fill in ${label}.`;
  else if (value.length < min) errors[field] = `${label[0].toUpperCase()}${label.slice(1)} needs at least ${min} characters.`;
  else if (value.length > max) errors[field] = `${label[0].toUpperCase()}${label.slice(1)} must be under ${max} characters.`;
}

export function validateSubmission(data) {
  const errors = {};
  const name = str(data.name);
  const title = str(data.title);
  const message = str(data.message);
  const kind = str(data.kind);
  const link = str(data.link);
  const favourite = str(data.favourite);

  lengthCheck(errors, "name", name, 2, 60, "your name");
  const email = validateEmail(data.email, errors);
  if (!KINDS.has(kind)) errors.kind = "Please choose what you're sending.";
  lengthCheck(errors, "title", title, 4, 100, "a headline");
  lengthCheck(errors, "message", message, 30, 1500, "your story");

  if (link) {
    let ok = false;
    try {
      const url = new URL(link);
      ok = (url.protocol === "https:" || url.protocol === "http:") && link.length <= 300;
    } catch {
      ok = false;
    }
    if (!ok) errors.link = "Please enter a full web address starting with https://";
  }

  if (favourite && !FAVOURITES.has(favourite)) errors.favourite = "Please pick one of the listed series.";
  if (!bool(data.agree)) errors.agree = "Please confirm you understand how your submission is used.";

  return {
    errors,
    value: {
      name,
      email,
      kind,
      title,
      message,
      link: link || null,
      favourite: favourite || null,
      mayFeature: bool(data.mayFeature),
      newsletter: bool(data.newsletter),
    },
  };
}

/* ---------- Rate limiting (best effort, per warm instance) ---------- */

const hits = new Map();

export function clientIp(request) {
  return (request.headers.get("x-forwarded-for") || "").split(",")[0].trim() || "unknown";
}

export function rateLimited(key, limit = 5, windowMs = 60_000) {
  const now = Date.now();
  const recent = (hits.get(key) || []).filter((t) => now - t < windowMs);
  recent.push(now);
  hits.set(key, recent);
  if (hits.size > 5000) hits.clear();
  return recent.length > limit;
}

/* ---------- Storage ---------- */

// Local development without a Blob token keeps records in memory.
export const memoryStore = [];

export function hashOf(value) {
  return createHash("sha256").update(value).digest("hex");
}

export function newId(prefix) {
  return `${prefix}-${randomUUID().slice(0, 8).toUpperCase()}`;
}

/**
 * Persist a record as a private JSON blob at `${collection}/${key}.json`.
 * Using a deterministic key makes repeat writes (e.g. re-subscribing) idempotent.
 */
export async function save(collection, key, record) {
  const pathname = `${collection}/${key}.json`;
  if (process.env.BLOB_READ_WRITE_TOKEN) {
    await put(pathname, JSON.stringify(record, null, 2), {
      access: "private",
      contentType: "application/json",
      addRandomSuffix: false,
      allowOverwrite: true,
    });
    return pathname;
  }
  if (process.env.VERCEL_ENV === "production") {
    throw new Error("BLOB_READ_WRITE_TOKEN is not configured");
  }
  memoryStore.push({ pathname, record });
  console.info(`[dev-store] ${pathname}`);
  return pathname;
}

/** Like save(), but leaves an existing record untouched. Returns false if one existed. */
export async function saveIfAbsent(collection, key, record) {
  const pathname = `${collection}/${key}.json`;
  if (process.env.BLOB_READ_WRITE_TOKEN) {
    try {
      await head(pathname);
      return false;
    } catch (error) {
      if (!(error instanceof BlobNotFoundError)) throw error;
    }
  } else if (memoryStore.some((entry) => entry.pathname === pathname)) {
    return false;
  }
  await save(collection, key, record);
  return true;
}

export function requestMeta(request) {
  return {
    receivedAt: new Date().toISOString(),
    userAgent: (request.headers.get("user-agent") || "").slice(0, 200),
    ipHash: hashOf(`${clientIp(request)}:${process.env.IP_SALT || "epicycles"}`).slice(0, 16),
    country: request.headers.get("x-vercel-ip-country") || null,
  };
}
