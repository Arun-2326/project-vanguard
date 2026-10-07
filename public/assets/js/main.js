/* Shared behaviour for every page: nav, scroll reveals and API-backed forms. */
(() => {
  "use strict";

  document.documentElement.classList.add("js");

  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------- Mobile navigation ---------- */
  const toggle = document.querySelector(".nav-toggle");
  const links = document.getElementById("nav-links");

  if (toggle && links) {
    const setOpen = (open) => {
      toggle.setAttribute("aria-expanded", String(open));
      toggle.setAttribute("aria-label", open ? "Close menu" : "Open menu");
      links.classList.toggle("is-open", open);
    };

    toggle.addEventListener("click", () => {
      setOpen(toggle.getAttribute("aria-expanded") !== "true");
    });

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && links.classList.contains("is-open")) {
        setOpen(false);
        toggle.focus();
      }
    });

    window.matchMedia("(min-width: 761px)").addEventListener("change", (e) => {
      if (e.matches) setOpen(false);
    });
  }

  /* ---------- Footer year ---------- */
  document.querySelectorAll("[data-year]").forEach((el) => {
    el.textContent = String(new Date().getFullYear());
  });

  /* ---------- Reveal on scroll ---------- */
  const revealables = document.querySelectorAll(".reveal");
  if (reduceMotion || !("IntersectionObserver" in window)) {
    revealables.forEach((el) => el.classList.add("is-visible"));
  } else {
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            io.unobserve(entry.target);
          }
        });
      },
      { rootMargin: "0px 0px -6% 0px", threshold: 0.01 }
    );
    revealables.forEach((el) => io.observe(el));
  }

  /* ---------- API forms ---------- */
  const MESSAGES = {
    valueMissing: (label) => `Please fill in ${label}.`,
    typeMismatch: () => "That doesn't look like a valid address.",
    tooShort: (label, el) => `${capitalise(label)} needs at least ${el.minLength} characters.`,
    tooLong: (label, el) => `${capitalise(label)} must be under ${el.maxLength} characters.`,
    patternMismatch: (label, el) => el.dataset.patternMessage || `Please check ${label}.`,
  };

  function capitalise(text) {
    return text.charAt(0).toUpperCase() + text.slice(1);
  }

  function fieldLabel(el) {
    return el.dataset.label || el.name;
  }

  function errorFor(el) {
    const v = el.validity;
    if (v.valid) return "";
    for (const key of Object.keys(MESSAGES)) {
      if (v[key]) return MESSAGES[key](fieldLabel(el), el);
    }
    return el.validationMessage;
  }

  function fieldWrap(el) {
    return el.closest(".field");
  }

  function showError(el, message) {
    const wrap = fieldWrap(el);
    if (!wrap) return;
    const slot = wrap.querySelector(".field-error");
    if (message) {
      wrap.setAttribute("data-invalid", "");
      el.setAttribute("aria-invalid", "true");
    } else {
      wrap.removeAttribute("data-invalid");
      el.removeAttribute("aria-invalid");
    }
    if (slot) slot.textContent = message;
  }

  function validateField(el) {
    // Treat whitespace-only input as empty.
    if (el.required && typeof el.value === "string" && el.type !== "checkbox" && !el.value.trim()) {
      el.setCustomValidity(MESSAGES.valueMissing(fieldLabel(el)));
    } else {
      el.setCustomValidity("");
    }
    const message = el.validity.customError ? el.validationMessage : errorFor(el);
    showError(el, message);
    return !message;
  }

  function serialise(form) {
    const data = {};
    for (const el of form.elements) {
      if (!el.name || el.disabled || el.type === "submit" || el.type === "button") continue;
      if (el.type === "checkbox") {
        if ("multi" in el.dataset) {
          data[el.name] ||= [];
          if (el.checked) data[el.name].push(el.value);
        } else {
          data[el.name] = el.checked;
        }
      } else if (el.type === "radio") {
        if (el.checked) data[el.name] = el.value;
      } else {
        data[el.name] = el.value.trim();
      }
    }
    return data;
  }

  function setStatus(form, tone, html) {
    const status = form.querySelector(".form-status");
    if (!status) return;
    status.dataset.tone = tone;
    status.innerHTML = html;
  }

  function escapeHtml(text) {
    return String(text).replace(/[&<>"']/g, (c) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
    })[c]);
  }

  function initForm(form) {
    form.setAttribute("novalidate", "");
    const submit = form.querySelector('[type="submit"]');
    const submitLabel = submit ? submit.innerHTML : "";
    const fields = Array.from(form.querySelectorAll("input, select, textarea")).filter(
      (el) => el.name && el.type !== "hidden" && !el.closest(".hp")
    );

    fields.forEach((el) => {
      const evt = el.type === "checkbox" || el.type === "radio" || el.tagName === "SELECT" ? "change" : "blur";
      el.addEventListener(evt, () => validateField(el));
      el.addEventListener("input", () => {
        if (fieldWrap(el)?.hasAttribute("data-invalid")) validateField(el);
      });
    });

    // Live character counters.
    form.querySelectorAll("[data-counter-for]").forEach((counter) => {
      const target = form.elements[counter.dataset.counterFor];
      if (!target) return;
      const max = target.maxLength;
      const update = () => {
        const len = target.value.length;
        counter.textContent = `${len} / ${max}`;
        counter.toggleAttribute("data-over", len > max * 0.95);
      };
      target.addEventListener("input", update);
      update();
    });

    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      if (form.dataset.busy) return;

      const results = fields.map((el) => validateField(el));
      if (results.includes(false)) {
        const firstBad = fields[results.indexOf(false)];
        firstBad.focus();
        setStatus(form, "error", "Please fix the highlighted fields and try again.");
        return;
      }

      form.dataset.busy = "1";
      if (submit) {
        submit.disabled = true;
        submit.innerHTML = '<span class="spinner" aria-hidden="true"></span> Sending…';
      }
      setStatus(form, "", "");

      try {
        const res = await fetch(form.action, {
          method: "POST",
          headers: { "Content-Type": "application/json", Accept: "application/json" },
          body: JSON.stringify(serialise(form)),
        });
        let body = {};
        try {
          body = await res.json();
        } catch {
          /* non-JSON error page */
        }

        if (!res.ok || !body.ok) {
          if (body.errors) {
            Object.entries(body.errors).forEach(([name, message]) => {
              const el = form.elements[name];
              const node = el instanceof RadioNodeList ? el[0] : el;
              if (node) showError(node, message);
            });
          }
          const message = body.message || (res.status === 429
            ? "You're sending a lot of requests — give it a minute and try again."
            : "Something went wrong on our side. Please try again in a moment.");
          setStatus(form, "error", escapeHtml(message));
          return;
        }

        onSuccess(form, body);
      } catch {
        setStatus(form, "error", "Couldn't reach the server. Check your connection and try again.");
      } finally {
        delete form.dataset.busy;
        if (submit && form.isConnected) {
          submit.disabled = false;
          submit.innerHTML = submitLabel;
        }
      }
    });
  }

  function onSuccess(form, body) {
    const templateId = form.dataset.successTemplate;
    const template = templateId && document.getElementById(templateId);
    if (template) {
      const node = template.content.cloneNode(true);
      node.querySelectorAll("[data-slot]").forEach((slot) => {
        const value = body[slot.dataset.slot];
        if (value) slot.textContent = value;
      });
      const host = form.closest("[data-form-host]") || form;
      host.replaceChildren(node);
      const heading = host.querySelector("h2, h3");
      // The card just got much shorter — bring it back into view before focusing.
      host.scrollIntoView({ block: "start", behavior: reduceMotion ? "auto" : "smooth" });
      if (heading) {
        heading.setAttribute("tabindex", "-1");
        heading.focus({ preventScroll: true });
      }
      host.querySelector("[data-reset]")?.addEventListener("click", () => window.location.reload());
      return;
    }
    form.reset();
    setStatus(form, "success", escapeHtml(body.message || "Thanks — you're in!"));
  }

  document.querySelectorAll("form[data-api]").forEach(initForm);
})();
