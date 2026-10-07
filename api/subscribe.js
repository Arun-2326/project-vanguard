// POST /api/subscribe — fan newsletter sign-up.
import {
  HttpError, clientIp, hashOf, isBot, rateLimited, readBody, requestMeta, respond, save, validateSubscription,
} from "./_lib/forms.js";

export async function POST(request) {
  try {
    if (rateLimited(`sub:${clientIp(request)}`, 5)) {
      return respond(request, 429, { ok: false, message: "Too many attempts — please wait a minute and try again." });
    }

    const data = await readBody(request);
    const success = { ok: true, message: "You're on the list! Look out for the next digest when a new lesson drops." };

    // Quietly accept bot submissions without storing them.
    if (isBot(data)) return respond(request, 200, success, "/?subscribed=1#newsletter");

    const { errors, value } = validateSubscription(data);
    if (Object.keys(errors).length) {
      return respond(request, 422, { ok: false, message: "Please check your email address.", errors });
    }

    // Keyed by email hash: subscribing twice simply updates the same record.
    await save("newsletter", hashOf(value.email), {
      type: "newsletter",
      ...value,
      source: "home",
      ...requestMeta(request),
    });

    return respond(request, 201, success, "/?subscribed=1#newsletter");
  } catch (error) {
    if (error instanceof HttpError) return respond(request, error.status, { ok: false, message: error.message });
    console.error("subscribe failed", error);
    return respond(request, 500, { ok: false, message: "We couldn't save that just now. Please try again shortly." });
  }
}
