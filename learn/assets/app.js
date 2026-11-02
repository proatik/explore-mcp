// Shared data + seamless page navigation for the whole journey.
//
// Every page is a real HTML file (index.html, chapters/*.html) and works on its own.
// Clicking a link fetches the next file and swaps its content in place, while
// the address bar changes to that file. No full reload, no flash.
//
// Page-specific code lives in <script type="text/page-script"> and page-specific
// CSS in <style data-page>, so both can be swapped in and out cleanly.

const CHAPTERS = [
  { id: 0,  emoji: "🧭", title: "Foundations",               tag: "Why MCP, host, client, server", file: "chapters/00-foundations.html", ready: true },
  { id: 1,  emoji: "🔌", title: "Transports & Lifecycle",    tag: "stdio, Streamable HTTP, initialize", file: "chapters/01-transports-lifecycle.html", ready: true },
  { id: 2,  emoji: "📨", title: "The Protocol",              tag: "JSON-RPC requests and notifications", file: "chapters/02-protocol.html", ready: true },
  { id: 3,  emoji: "🛠️", title: "Tools",                     tag: "Schemas, results, errors", file: "chapters/03-tools.html", ready: true },
  { id: 4,  emoji: "📚", title: "Resources",                 tag: "Templates, completion, subscriptions", file: "chapters/04-resources.html", ready: true },
  { id: 5,  emoji: "💬", title: "Prompts",                   tag: "Reusable, data-grounded templates", file: "chapters/05-prompts.html", ready: true },
  { id: 6,  emoji: "⏳", title: "Long-running Work",         tag: "Progress, cancellation, idempotency", file: "chapters/06-long-running-work.html", ready: true },
  { id: 7,  emoji: "🧩", title: "Building a Client",         tag: "Discovery, registry, reconnects", file: "chapters/07-client.html", ready: true },
  { id: 8,  emoji: "🤖", title: "The Agent Loop",            tag: "MCP tools as LLM function calls", file: "chapters/08-agent-loop.html", ready: true },
  { id: 9,  emoji: "✋", title: "Human in the Loop",         tag: "Read, write, destructive approval", file: "chapters/09-human-approval.html", ready: true },
  { id: 10, emoji: "🔐", title: "Auth & Scopes",             tag: "Bearer tokens, OAuth, scope guards", file: "chapters/10-auth-scopes.html", ready: true },
  { id: 11, emoji: "🛡️", title: "Security & Privacy",        tag: "Injection, poisoning, PII, limits", file: "chapters/11-security-privacy.html", ready: true },
  { id: 12, emoji: "🧪", title: "Testing & Shipping",        tag: "Specs, Inspector, logging, Docker", file: "chapters/12-testing-shipping.html", ready: true },
  { id: 13, emoji: "🏆", title: "Capstone",                  tag: "Add a new tool end to end", file: "chapters/13-capstone.html", ready: true },
];

// Author info for the shared footer on every page. Leave a field empty to hide it.
const AUTHOR = {
  name: "Atik Ullah Khan",
  role: "Full-Stack Software Engineer",
  linkedin: "https://www.linkedin.com/in/proatik/",
};

// Project root, worked out from where this script lives (…/assets/app.js)
const ROOT = new URL("..", document.currentScript.src);
const urlFor = (path) => new URL(path, ROOT).href;
const chapterUrl = (c) => urlFor(c.ready ? c.file : "index.html");

/* ===================== Progress ===================== */

const STORE_KEY = "mcp-journey-done";

function getDone() {
  try { return JSON.parse(localStorage.getItem(STORE_KEY)) || []; }
  catch { return []; }
}
function setDone(id) {
  const done = new Set(getDone());
  done.add(id);
  try { localStorage.setItem(STORE_KEY, JSON.stringify([...done])); } catch {}
}
function unsetDone(id) {
  try { localStorage.setItem(STORE_KEY, JSON.stringify(getDone().filter((d) => d !== id))); } catch {}
}
function resetDone() {
  try { localStorage.removeItem(STORE_KEY); } catch {}
}
function refreshProgress() {
  const pill = document.querySelector(".progress-pill");
  if (pill) pill.textContent = `${getDone().length} / ${CHAPTERS.length} completed`;
}

/* ===================== Chapter helpers ===================== */

// Called by each chapter's page script: builds prev / map / next + "mark complete"
function initChapter(id) {
  const prev = CHAPTERS[id - 1];
  const next = CHAPTERS[id + 1];
  const nav = document.querySelector(".chapter-nav");
  // Preview card for the previous / next chapter.
  // At either end of the journey, a start / finish card keeps both sides filled.
  const preview = (c, dir) => {
    const label = dir === "prev" ? "← Previous" : "Next →";
    const card = (emoji, num, title, tag) => `
      <span class="pv-dir">${label}</span>
      <span class="pv-main"><span class="pv-emoji">${emoji}</span>
        <span><span class="pv-num">${num}</span>
        <span class="pv-title">${title}</span>
        <span class="pv-tag">${tag}</span></span></span>`;
    if (!c) {
      const end = dir === "prev"
        ? card("🚩", "JOURNEY START", "Overview", `All ${CHAPTERS.length} chapters at a glance`)
        : card("🎉", "FINISH LINE", "Journey complete", "Back to the map");
      return `<a class="pv ${dir}" href="${urlFor("index.html")}">${end}</a>`;
    }
    const inner = card(c.emoji, `CHAPTER ${String(c.id).padStart(2, "0")}`, c.title, c.ready ? c.tag : "Coming soon");
    return c.ready
      ? `<a class="pv ${dir}" href="${chapterUrl(c)}">${inner}</a>`
      : `<div class="pv ${dir} locked">${inner}</div>`;
  };
  if (nav) {
    nav.innerHTML = `
      ${preview(prev, "prev")}
      <a class="pv-map" href="${urlFor("index.html")}" title="Journey map">🗺️<span>Map</span></a>
      ${preview(next, "next")}
    `;
  }

  const doneBtn = document.getElementById("mark-done");
  if (doneBtn) {
    const refresh = () => {
      const isDone = getDone().includes(id);
      doneBtn.textContent = isDone ? "✅ Completed · tap to undo" : "Mark chapter as complete";
      doneBtn.classList.toggle("is-done", isDone);
    };
    doneBtn.addEventListener("click", () => {
      if (getDone().includes(id)) unsetDone(id); else setDone(id);
      refresh();
      refreshProgress();
    });
    refresh();
  }
}

/* ===================== Page swapping ===================== */

// Each page script runs in its own function scope, so revisiting a page is safe
function runPageScripts(root) {
  root.querySelectorAll('script[type="text/page-script"]').forEach((s) => new Function(s.textContent)());
  refreshProgress();
}

// Clean URLs only on the live site; Netlify maps them back to files via _redirects
const CLEAN_URLS = !["localhost", "127.0.0.1", ""].includes(location.hostname)
  && !/^(10|192\.168|172\.(1[6-9]|2\d|3[01]))\./.test(location.hostname);
const slugOf = (c) => c.file.replace(/^chapters\/\d+-/, "").replace(/\.html$/, "");

function displayUrl(href) {
  if (!CLEAN_URLS) return href;
  const u = new URL(href);
  const rel = u.pathname.slice(new URL(ROOT).pathname.length);
  const c = CHAPTERS.find((ch) => ch.ready && ch.file === rel);
  if (rel === "index.html") u.pathname = new URL(ROOT).pathname;
  else if (c) u.pathname = new URL(ROOT).pathname + "chapters/" + slugOf(c);
  return u.href;
}

function fileUrl(href) {
  const u = new URL(href);
  const rel = u.pathname.slice(new URL(ROOT).pathname.length);
  const c = CHAPTERS.find((ch) => ch.ready && "chapters/" + slugOf(ch) === rel);
  if (rel === "") u.pathname = new URL(ROOT).pathname + "index.html";
  else if (c) u.pathname = new URL(ROOT).pathname + c.file;
  return u.href;
}

async function navigate(url, push = true) {
  let doc;
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(res.status);
    doc = new DOMParser().parseFromString(await res.text(), "text/html");
  } catch {
    location.href = url; // fall back to a normal page load
    return;
  }

  const swap = () => {
    if (push) history.pushState({}, "", displayUrl(url));
    document.title = doc.title;
    document.querySelectorAll("style[data-page]").forEach((s) => s.remove());
    doc.querySelectorAll("style[data-page]").forEach((s) => document.head.appendChild(s));
    // Header is swapped too, because its relative links depend on the current file
    document.querySelector(".topbar").replaceWith(doc.querySelector(".topbar"));
    document.getElementById("app").replaceWith(doc.getElementById("app"));
    runPageScripts(doc);

    const hash = new URL(url).hash;
    if (hash) document.querySelector(hash)?.scrollIntoView();
    else window.scrollTo(0, 0);
  };

  if (document.startViewTransition) document.startViewTransition(swap);
  else {
    swap();
    document.getElementById("app").classList.add("enter");
  }
}

document.addEventListener("click", (e) => {
  // Flip cards: click to toggle
  const flip = e.target.closest(".flip");
  if (flip) {
    const toBack = flip.classList.toggle("flipped");
    // Grow at once when showing the longer back; shrink once the back has turned away
    if (flip.closest("#lens-cards")) setTimeout(() => sizeLensCard(flip), toBack ? 0 : 260);
  }

  const a = e.target.closest("a[href]");
  if (!a || a.target || e.ctrlKey || e.metaKey || e.shiftKey || e.button !== 0) return;
  const url = new URL(a.href, location.href);
  if (url.origin !== location.origin) return;

  // Same page + #section: smooth scroll
  if (url.pathname === location.pathname && url.hash) {
    e.preventDefault();
    document.querySelector(url.hash)?.scrollIntoView({ behavior: "smooth" });
    return;
  }
  if (url.pathname.endsWith(".html") || url.pathname.endsWith("/")) {
    e.preventDefault();
    if (displayUrl(url.href) !== location.href) navigate(url.href);
  }
});

/* ===================== Confirm dialog ===================== */

// Styled replacement for window.confirm; resolves true only on the confirm button
function confirmDialog({ title, body, confirmLabel = "Confirm", cancelLabel = "Cancel" }) {
  return new Promise((resolve) => {
    const prevFocus = document.activeElement;
    const wrap = document.createElement("div");
    wrap.className = "dlg-backdrop";
    wrap.innerHTML = `
      <div class="dlg" role="alertdialog" aria-modal="true" aria-labelledby="dlg-title" aria-describedby="dlg-body">
        <h3 id="dlg-title">${title}</h3>
        <p id="dlg-body">${body}</p>
        <div class="dlg-actions">
          <button class="btn" data-dlg="cancel">${cancelLabel}</button>
          <button class="btn dlg-danger" data-dlg="ok">${confirmLabel}</button>
        </div>
      </div>`;
    const close = (ok) => {
      document.removeEventListener("keydown", onKey);
      wrap.classList.remove("open");
      setTimeout(() => wrap.remove(), 150);
      prevFocus?.focus?.();
      resolve(ok);
    };
    const onKey = (e) => {
      if (e.key === "Escape") close(false);
      if (e.key === "Tab") {
        const btns = [...wrap.querySelectorAll("button")];
        const i = btns.indexOf(document.activeElement);
        e.preventDefault();
        btns[(i + (e.shiftKey ? btns.length - 1 : 1)) % btns.length].focus();
      }
    };
    wrap.addEventListener("click", (e) => {
      if (e.target === wrap) close(false);
      const b = e.target.closest("[data-dlg]");
      if (b) close(b.dataset.dlg === "ok");
    });
    document.addEventListener("keydown", onKey);
    document.body.appendChild(wrap);
    requestAnimationFrame(() => wrap.classList.add("open"));
    wrap.querySelector('[data-dlg="cancel"]').focus();
  });
}

/* ===================== Footer ===================== */

// One footer for every page, built from AUTHOR. It's outside #app, so page swaps keep it.
function renderFooter() {
  let footer = document.querySelector("body > footer.footer");
  if (!footer) {
    footer = document.createElement("footer");
    footer.className = "footer";
    document.body.insertBefore(footer, document.querySelector("body > script"));
  }
  // First + last name initials, e.g. "Atik Ullah Khan" → "AK"
  const words = AUTHOR.name.split(/\s+/).filter(Boolean);
  const initials = (words[0]?.[0] + (words.length > 1 ? words.at(-1)[0] : "")).toUpperCase();
  footer.innerHTML = `
    <div class="wrap"><div class="site-footer">
      ${AUTHOR.name ? `
      <div class="author">
        <span class="avatar" aria-hidden="true">${initials}</span>
        <span><span class="author-name">${AUTHOR.name}</span>
        ${AUTHOR.role ? `<span class="author-role">${AUTHOR.role}</span>` : ""}</span>
      </div>` : `<div class="author-role">Built step by step</div>`}
      ${AUTHOR.linkedin ? `
      <span class="footer-divider" aria-hidden="true"></span>
      <a class="linkedin" href="${AUTHOR.linkedin}" target="_blank" rel="noopener">
        <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path fill="currentColor" d="M20.45 20.45h-3.56v-5.57c0-1.33-.02-3.04-1.85-3.04-1.85 0-2.14 1.45-2.14 2.94v5.67H9.35V9h3.41v1.56h.05c.48-.9 1.64-1.85 3.37-1.85 3.6 0 4.27 2.37 4.27 5.46v6.28zM5.34 7.43a2.06 2.06 0 1 1 0-4.13 2.06 2.06 0 0 1 0 4.13zM7.12 20.45H3.56V9h3.56v11.45zM22.22 0H1.77C.79 0 0 .77 0 1.73v20.54C0 23.23.79 24 1.77 24h20.45c.98 0 1.78-.77 1.78-1.73V1.73C24 .77 23.2 0 22.22 0z"/></svg>
        Connect on LinkedIn
      </a>` : ""}
    </div></div>`;
}
renderFooter();

/* ===================== Code highlighting ===================== */

// Plain-text <pre> blocks get highlight.js colours; blocks with their own markup are left alone
const guessLang = (t) =>
  /^\s*[{[]/.test(t) ? "json"
  : /^\s*(HTTP\/|GET |POST |WWW-)/.test(t) ? "http"
  : /^\s*(npx |curl |npm |node |docker |git |cd |export |\$ |# )/m.test(t) ? "bash"
  : "typescript";

function highlightCode() {
  if (!window.hljs) return;
  document.querySelectorAll("#app pre:not([data-hl])").forEach((pre) => {
    const only = pre.children.length === 0 || (pre.children.length === 1 && pre.firstElementChild.tagName === "CODE" && !pre.firstElementChild.children.length);
    if (!only) { pre.dataset.hl = "skip"; return; }
    const text = pre.textContent.replace(/^\n+|\s+$/g, "");
    const cls = (pre.querySelector("code") || pre).className.match(/language-(\w+)/);
    const guess = cls && hljs.getLanguage(cls[1]) ? cls[1] : guessLang(text);
    const lang = hljs.getLanguage(guess) ? guess : "plaintext";
    pre.innerHTML = `<code class="hljs language-${lang}">${hljs.highlight(text, { language: lang }).value}</code>`;
    pre.dataset.hl = lang;
  });
}

// Each lens card is as tall as the face you're looking at
function sizeLensCard(flip) {
  const face = flip.querySelector(flip.classList.contains("flipped") ? ".flip-back" : ".flip-face:not(.flip-back)");
  if (face) flip.querySelector(".flip-inner").style.height = Math.max(180, face.offsetHeight) + "px";
}
const sizeLensCards = () => document.querySelectorAll("#lens-cards .flip").forEach(sizeLensCard);
addEventListener("resize", sizeLensCards);

let hlQueued = false;
new MutationObserver(() => {
  if (hlQueued) return;
  hlQueued = true;
  requestAnimationFrame(() => { hlQueued = false; highlightCode(); sizeLensCards(); });
}).observe(document.body, { childList: true, subtree: true });

// Browser back / forward
window.addEventListener("popstate", () => navigate(fileUrl(location.href), false));

if (displayUrl(location.href) !== location.href) history.replaceState({}, "", displayUrl(location.href));

runPageScripts(document);
highlightCode();
sizeLensCards();
