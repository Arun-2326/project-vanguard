// Run with: npm test   (uses the in-memory store — no Blob token needed)
import { test } from "node:test";
import assert from "node:assert/strict";

delete process.env.BLOB_READ_WRITE_TOKEN;
const { POST: subscribe } = await import("../api/subscribe.js");
const { POST: submit } = await import("../api/submissions.js");
const { memoryStore } = await import("../api/_lib/forms.js");

let ip = 0;
function req(path, body, { type = "application/json", accept = "application/json" } = {}) {
  ip += 1; // fresh IP per request so the rate limiter stays out of the way
  return new Request(`http://localhost${path}`, {
    method: "POST",
    headers: { "content-type": type, accept, "x-forwarded-for": `10.0.0.${ip}` },
    body: type === "application/json" ? JSON.stringify(body) : new URLSearchParams(body).toString(),
  });
}

const goodSubmission = {
  name: "Ada",
  email: "ada@example.com",
  kind: "lesson-story",
  title: "Eigenvectors clicked",
  message: "Watching the grid shear while two arrows stayed on their span made it click.",
  link: "https://example.com/notes",
  favourite: "linear-algebra",
  agree: true,
  newsletter: true,
};

test("subscribe stores a valid email, keyed by hash", async () => {
  const before = memoryStore.length;
  const res = await subscribe(req("/api/subscribe", { email: "Fan@Example.com ", interests: ["calculus", "bogus"] }));
  assert.equal(res.status, 201);
  const body = await res.json();
  assert.equal(body.ok, true);
  const saved = memoryStore.at(-1);
  assert.equal(memoryStore.length, before + 1);
  assert.match(saved.pathname, /^newsletter\/[0-9a-f]{64}\.json$/);
  assert.equal(saved.record.email, "fan@example.com");
  assert.deepEqual(saved.record.interests, ["calculus"]);
});

test("subscribe rejects an invalid email with a field error", async () => {
  const res = await subscribe(req("/api/subscribe", { email: "not-an-email" }));
  assert.equal(res.status, 422);
  const body = await res.json();
  assert.equal(body.ok, false);
  assert.ok(body.errors.email);
});

test("honeypot submissions are accepted but not stored", async () => {
  const before = memoryStore.length;
  const res = await subscribe(req("/api/subscribe", { email: "bot@example.com", website: "spam.biz" }));
  assert.equal(res.status, 200);
  assert.equal(memoryStore.length, before);
});

test("submission stores the record and opts into the newsletter", async () => {
  const before = memoryStore.length;
  const res = await submit(req("/api/submissions", goodSubmission));
  assert.equal(res.status, 201);
  const body = await res.json();
  assert.match(body.id, /^EPI-[0-9A-F]{8}$/);
  const added = memoryStore.slice(before).map((e) => e.pathname);
  assert.ok(added.some((p) => p.startsWith("submissions/") && p.endsWith(`${body.id}.json`)));
  assert.ok(added.some((p) => p.startsWith("newsletter/")));
});

test("newsletter opt-in does not overwrite an existing subscription", async () => {
  await subscribe(req("/api/subscribe", { email: "keep@example.com", interests: ["puzzles"] }));
  const before = memoryStore.length;
  await submit(req("/api/submissions", { ...goodSubmission, email: "keep@example.com" }));
  assert.equal(memoryStore.length, before + 1); // only the submission itself
});

test("submission validation reports every bad field", async () => {
  const res = await submit(req("/api/submissions", { name: "A", email: "x", kind: "nope", title: "", message: "short", link: "javascript:alert(1)" }));
  assert.equal(res.status, 422);
  const { errors } = await res.json();
  for (const field of ["name", "email", "kind", "title", "message", "link", "agree"]) {
    assert.ok(errors[field], `expected an error for ${field}`);
  }
});

test("non-JS form posts redirect on success", async () => {
  const res = await submit(req("/api/submissions", { ...goodSubmission, agree: "on", newsletter: "" }, {
    type: "application/x-www-form-urlencoded",
    accept: "text/html,application/xhtml+xml",
  }));
  assert.equal(res.status, 303);
  assert.equal(res.headers.get("location"), "/community?sent=1");
});

test("rejects unsupported content types and oversized bodies", async () => {
  const bad = new Request("http://localhost/api/subscribe", {
    method: "POST",
    headers: { "content-type": "text/plain", "x-forwarded-for": "10.9.9.9" },
    body: "hello",
  });
  assert.equal((await subscribe(bad)).status, 415);
  const big = await subscribe(req("/api/subscribe", { email: "a@b.co", pad: "x".repeat(20000) }));
  assert.equal(big.status, 413);
});

test("rate limits bursts from one address", async () => {
  const make = () => new Request("http://localhost/api/subscribe", {
    method: "POST",
    headers: { "content-type": "application/json", "x-forwarded-for": "10.1.1.1" },
    body: JSON.stringify({ email: "burst@example.com" }),
  });
  const statuses = [];
  for (let i = 0; i < 7; i++) statuses.push((await subscribe(make())).status);
  assert.ok(statuses.includes(429));
});
