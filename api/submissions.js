// POST /api/submissions — fan mailbag submissions.
import {
  HttpError, clientIp, hashOf, isBot, newId, rateLimited, readBody, requestMeta, respond, save, saveIfAbsent, validateSubmission,
} from "./_lib/forms.js";

const SUCCESS_MESSAGE =
  "We read every message. If we feature yours or have a question, we'll reply by email.";

export async function POST(request) {
  try {
    if (rateLimited(`mail:${clientIp(request)}`, 4)) {
      return respond(request, 429, { ok: false, message: "Too many submissions — please wait a minute and try again." });
    }

    const data = await readBody(request);
    const id = newId("EPI");

    if (isBot(data)) return respond(request, 200, { ok: true, id, message: SUCCESS_MESSAGE }, "/community?sent=1");

    const { errors, value } = validateSubmission(data);
    if (Object.keys(errors).length) {
      return respond(request, 422, { ok: false, message: "A few fields need another look.", errors });
    }

    const meta = requestMeta(request);
    const day = meta.receivedAt.slice(0, 10);
    await save(`submissions/${day}`, id, { type: "submission", id, ...value, ...meta });

    if (value.newsletter) {
      // Don't clobber an existing subscription (and its chosen interests).
      await saveIfAbsent("newsletter", hashOf(value.email), {
        type: "newsletter",
        email: value.email,
        interests: [],
        source: "mailbag",
        ...meta,
      });
    }

    return respond(request, 201, { ok: true, id, message: SUCCESS_MESSAGE }, "/community?sent=1");
  } catch (error) {
    if (error instanceof HttpError) return respond(request, error.status, { ok: false, message: error.message });
    console.error("submission failed", error);
    return respond(request, 500, { ok: false, message: "We couldn't save that just now. Please try again shortly." });
  }
}
