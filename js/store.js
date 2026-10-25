/* EventSphere — Shared store & helpers (localStorage only, no backend)
   Load order on every page: icons.js → auth.js → events.js → store.js → main.js
   Exposes window.ES */
(function () {
  "use strict";

  /* Set to false to use the exact dates written in events.js.
     When true, the dataset is shifted so the demo always has some past
     events (for certificates/reviews) and some upcoming ones (for countdowns). */
  const RELATIVE_DATES = true;

  const K = {
    regs: "eventsphere_regs_v2",
    saved: "eventsphere_saved",
    reviews: "eventsphere_reviews",
    custom: "eventsphere_custom_events",
    overrides: "eventsphere_event_overrides",
    hidden: "eventsphere_hidden_events",
    notifs: "eventsphere_notifs",
    legacy: "eventsphere_registrations",
  };

  /* ---------- tiny storage helpers ---------- */
  const read = (k, d) => {
    try {
      const v = JSON.parse(localStorage.getItem(k));
      return v == null ? d : v;
    } catch (e) {
      return d;
    }
  };
  const write = (k, v) => {
    try {
      localStorage.setItem(k, JSON.stringify(v));
    } catch (e) {}
  };
  const esc = (s) =>
    String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const uid = (p) => (p || "") + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  const pad = (n) => String(n).padStart(2, "0");

  /* ---------- date helpers (all local time) ---------- */
  const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  function parseDate(s) {
    const p = String(s).split("-").map(Number);
    return new Date(p[0], p[1] - 1, p[2], 12, 0, 0);
  }
  function toISO(d) {
    return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate());
  }
  function fmtDate(iso) {
    const d = parseDate(iso);
    return MONTHS[d.getMonth()] + " " + d.getDate() + ", " + d.getFullYear();
  }
  function addDays(iso, n) {
    const d = parseDate(iso);
    d.setDate(d.getDate() + n);
    return toISO(d);
  }
  function dayDiff(aIso, bIso) {
    return Math.round((parseDate(bIso) - parseDate(aIso)) / 86400000);
  }
  /* "9:00 AM" -> minutes since midnight */
  function timeToMin(t) {
    const m = String(t || "").match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
    if (!m) return 0;
    let h = Number(m[1]) % 12;
    if (m[3].toUpperCase() === "PM") h += 12;
    return h * 60 + Number(m[2]);
  }
  /* "14:30" (input type=time) -> "2:30 PM" */
  function to12h(hhmm) {
    const p = String(hhmm).split(":").map(Number);
    const h = p[0] % 12 || 12;
    return h + ":" + pad(p[1] || 0) + " " + (p[0] >= 12 ? "PM" : "AM");
  }
  /* "2:30 PM" -> "14:30" */
  function to24h(t) {
    const m = timeToMin(t);
    return pad(Math.floor(m / 60)) + ":" + pad(m % 60);
  }
  function startAt(ev) {
    const d = parseDate(ev.date);
    const m = timeToMin(ev.time);
    d.setHours(Math.floor(m / 60), m % 60, 0, 0);
    return d;
  }
  function endAt(ev) {
    const d = parseDate(ev.date);
    let m = timeToMin(ev.endTime || ev.time);
    if (m <= timeToMin(ev.time)) m = timeToMin(ev.time) + 120;
    d.setHours(Math.floor(m / 60), m % 60, 0, 0);
    return d;
  }
  function status(ev) {
    const now = Date.now();
    if (now < startAt(ev)) return "upcoming";
    if (now <= endAt(ev)) return "live";
    return "ended";
  }

  /* ---------- event list ---------- */
  const LIST = (window.EVENTSPHERE_EVENTS = window.EVENTSPHERE_EVENTS || []);
  const CAT = {
    Technical: { pill: "pill-tech", poster: "poster-blue", icon: "code" },
    Cultural: { pill: "pill-cultural", poster: "poster-purple", icon: "music" },
    Sports: { pill: "pill-sports", poster: "poster-blue", icon: "trophy" },
    Workshops: { pill: "pill-workshop", poster: "poster-blue", icon: "pen" },
    Competitions: { pill: "pill-competition", poster: "poster-purple", icon: "medal" },
  };
  const CATEGORIES = Object.keys(CAT);

  const PRISTINE = LIST.map((e) => Object.assign({}, e, { tags: (e.tags || []).slice() }));
  if (RELATIVE_DATES && PRISTINE.length) {
    const sorted = PRISTINE.slice().sort((a, b) => (a.date < b.date ? -1 : 1));
    const anchor = sorted[Math.min(3, sorted.length - 1)];
    const shift = dayDiff(anchor.date, addDays(toISO(new Date()), 1));
    PRISTINE.forEach((e) => {
      e.date = addDays(e.date, shift);
      e.displayDate = fmtDate(e.date);
    });
  }

  function buildList() {
    const hidden = read(K.hidden, []);
    const ov = read(K.overrides, {});
    const out = PRISTINE.filter((e) => hidden.indexOf(e.id) < 0).map((e) => {
      const c = Object.assign({}, e, { tags: (e.tags || []).slice() }, ov[e.id] || {});
      c.displayDate = fmtDate(c.date);
      return c;
    });
    read(K.custom, []).forEach((e) => {
      const c = Object.assign({ attendees: 0, tags: [], organizer: "Campus Admin", endTime: "", image: "" }, CAT[e.category] || CAT.Technical, e);
      c.displayDate = fmtDate(c.date);
      c.longDescription = c.longDescription || c.description;
      if (!c.endTime) {
        const t = to24h(c.time);
        c.endTime = to12h(pad((Number(t.slice(0, 2)) + 2) % 24) + ":" + t.slice(3));
      }
      out.push(c);
    });
    return out;
  }
  function refreshEvents() {
    const next = buildList();
    LIST.length = 0;
    next.forEach((e) => LIST.push(e));
    return LIST;
  }
  refreshEvents();
  const getEvent = (id) => LIST.find((e) => e.id === id);

  /* ---------- seats ---------- */
  function hash(s) {
    let h = 0;
    for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
    return h;
  }
  /* deterministic demo capacities so the site shows "almost full" and "full" states */
  const DEMO_CAP = { "wellness-workshop": 90, "startup-pitch": 128 };
  function capacity(ev) {
    if (ev.capacity) return Number(ev.capacity);
    if (DEMO_CAP[ev.id]) return DEMO_CAP[ev.id];
    const f = 0.62 + (hash(ev.id) % 30) / 100; // 62%..91% already filled
    return Math.max(10, Math.ceil(((ev.attendees || 0) || 20) / f / 5) * 5);
  }
  const allRegs = () => read(K.regs, []);
  function confirmedCount(eventId) {
    return allRegs().filter((r) => r.eventId === eventId && r.status === "registered").length;
  }
  function filled(ev) {
    return (ev.attendees || 0) + confirmedCount(ev.id);
  }
  function seatsLeft(ev) {
    return Math.max(0, capacity(ev) - filled(ev));
  }
  function seatState(ev) {
    const left = seatsLeft(ev);
    const cap = capacity(ev);
    if (left === 0) return { key: "full", label: "Full — waitlist open", left, cap };
    if (left <= Math.max(5, Math.round(cap * 0.1))) return { key: "almost", label: "Almost full — " + left + " left", left, cap };
    return { key: "open", label: left + " seats left", left, cap };
  }

  /* ---------- user + registrations ---------- */
  const user = () => (window.getCurrentUser ? window.getCurrentUser() : null);

  /* one-time migration of the old "list of ids" format */
  (function migrate() {
    const u = user();
    const old = read(K.legacy, null);
    if (!u || !Array.isArray(old) || !old.length) return;
    const regs = allRegs();
    old.forEach((id) => {
      if (getEvent(id) && !regs.some((r) => r.userId === u.id && r.eventId === id)) regs.push(makeRecord(u, id, "registered", null));
    });
    write(K.regs, regs);
    localStorage.removeItem(K.legacy);
  })();

  function ticketCode() {
    const s = Math.random().toString(36).slice(2, 8).toUpperCase() + Date.now().toString(36).slice(-3).toUpperCase();
    return "ES-" + s;
  }
  function makeRecord(u, eventId, st, extra) {
    const ev = getEvent(eventId) || {};
    return Object.assign(
      { id: uid("r_"), ticketId: ticketCode(), userId: u.id, name: u.name, email: u.email, eventId: eventId, status: st, ts: Date.now(), attended: false, team: null, paid: 0 },
      extra || {}
    );
  }
  function myRecords(userId) {
    const u = userId || (user() && user().id);
    return u ? allRegs().filter((r) => r.userId === u) : [];
  }
  const myRecord = (eventId) => myRecords().find((r) => r.eventId === eventId) || null;
  const isRegistered = (eventId) => {
    const r = myRecord(String(eventId));
    return !!r && r.status === "registered";
  };
  const isWaitlisted = (eventId) => {
    const r = myRecord(String(eventId));
    return !!r && r.status === "waitlist";
  };
  const getRegistrations = () => myRecords().filter((r) => r.status === "registered").map((r) => r.eventId);

  function overlaps(a, b) {
    return a.date === b.date && startAt(a) < endAt(b) && startAt(b) < endAt(a);
  }
  function findClash(ev) {
    const mine = myRecords().filter((r) => r.status === "registered" && r.eventId !== ev.id);
    for (let i = 0; i < mine.length; i++) {
      const other = getEvent(mine[i].eventId);
      if (other && overlaps(ev, other)) return other;
    }
    return null;
  }

  function notify(userId, text, id, href) {
    const list = read(K.notifs, []);
    if (id && list.some((n) => n.id === id)) return;
    list.unshift({ id: id || uid("n_"), userId: userId, text: text, href: href || "", ts: Date.now(), seen: false });
    write(K.notifs, list.slice(0, 80));
  }

  /* register: returns { ok, status, record } or { ok:false, reason, message } */
  function register(eventId, opts) {
    opts = opts || {};
    const u = user();
    const ev = getEvent(eventId);
    if (!u) return { ok: false, reason: "login", message: "Please sign in to register." };
    if (!ev) return { ok: false, reason: "missing", message: "Event not found." };
    if (status(ev) === "ended") return { ok: false, reason: "ended", message: "This event has already ended." };
    if (myRecord(eventId)) return { ok: false, reason: "dup", message: "You are already on the list for this event." };
    const regs = allRegs();
    const full = seatsLeft(ev) === 0;
    const rec = makeRecord(u, eventId, full ? "waitlist" : "registered", { team: opts.team || null, paid: opts.paid || 0, attendee: opts.attendee || null, name: (opts.attendee && opts.attendee.name) || u.name });
    regs.push(rec);
    write(K.regs, regs);
    if (!full) notify(u.id, "You're registered for " + ev.title + ". Your QR ticket is ready.", "reg-" + rec.id, "ticket.html?id=" + rec.ticketId);
    return { ok: true, status: rec.status, record: rec };
  }

  function cancel(eventId) {
    const u = user();
    if (!u) return { ok: false };
    let regs = allRegs();
    const mine = regs.find((r) => r.userId === u.id && r.eventId === eventId);
    if (!mine) return { ok: false };
    regs = regs.filter((r) => r.id !== mine.id);
    let promoted = null;
    if (mine.status === "registered") {
      const next = regs.filter((r) => r.eventId === eventId && r.status === "waitlist").sort((a, b) => a.ts - b.ts)[0];
      const ev = getEvent(eventId);
      if (next && ev && seatsLeft(ev) >= 0) {
        next.status = "registered";
        promoted = next;
        notify(next.userId, "Good news! A seat opened up — you're now registered for " + ev.title + ".", "promo-" + next.id, "ticket.html?id=" + next.ticketId);
      }
    }
    write(K.regs, regs);
    return { ok: true, promoted: promoted, wasStatus: mine.status };
  }

  /* compat shim used by older code: returns true when now registered */
  function toggleRegistration(eventId) {
    if (myRecord(eventId)) {
      cancel(eventId);
      return false;
    }
    const r = register(eventId);
    return !!r.ok;
  }

  function checkIn(code) {
    const raw = String(code || "").trim();
    const m = raw.match(/ES-[A-Z0-9]+/i);
    if (!m) return { ok: false, message: "That doesn't look like an EventSphere ticket code." };
    const id = m[0].toUpperCase();
    const regs = allRegs();
    const r = regs.find((x) => x.ticketId === id);
    if (!r) return { ok: false, message: "Ticket " + id + " not found in this browser's data." };
    if (r.status !== "registered") return { ok: false, message: "Ticket " + id + " is on the waitlist — not valid for entry." };
    if (r.attended) return { ok: false, message: r.name + " is already checked in.", record: r };
    r.attended = true;
    r.attendedAt = Date.now();
    write(K.regs, regs);
    const ev = getEvent(r.eventId);
    notify(r.userId, "Checked in at " + (ev ? ev.title : "the event") + ". Your certificate is ready!", "att-" + r.id, "certificate.html?id=" + r.ticketId);
    return { ok: true, record: r, message: "Checked in: " + r.name + " → " + (ev ? ev.title : r.eventId) };
  }

  /* ---------- saved / bookmarks ---------- */
  function savedIds() {
    const u = user();
    if (!u) return [];
    return (read(K.saved, {})[u.id] || []).slice();
  }
  const isSaved = (id) => savedIds().indexOf(id) >= 0;
  function toggleSaved(id) {
    const u = user();
    if (!u) return null;
    const all = read(K.saved, {});
    const list = all[u.id] || [];
    const i = list.indexOf(id);
    if (i >= 0) list.splice(i, 1);
    else list.push(id);
    all[u.id] = list;
    write(K.saved, all);
    return i < 0;
  }

  /* ---------- reviews ---------- */
  const reviewsFor = (eventId) => read(K.reviews, []).filter((r) => r.eventId === eventId).sort((a, b) => b.ts - a.ts);
  function ratingSummary(eventId) {
    const l = reviewsFor(eventId);
    if (!l.length) return { avg: 0, count: 0 };
    return { avg: l.reduce((s, r) => s + r.rating, 0) / l.length, count: l.length };
  }
  function canReview(ev) {
    const r = myRecord(ev.id);
    return !!r && r.status === "registered" && status(ev) !== "upcoming";
  }
  function saveReview(eventId, rating, text) {
    const u = user();
    if (!u) return false;
    const all = read(K.reviews, []).filter((r) => !(r.eventId === eventId && r.userId === u.id));
    all.push({ id: uid("v_"), eventId: eventId, userId: u.id, name: u.name, rating: Number(rating), text: String(text || "").trim().slice(0, 500), ts: Date.now() });
    write(K.reviews, all);
    return true;
  }

  /* ---------- stats, badges, recommendations ---------- */
  function stats(userId) {
    const u = userId || (user() && user().id);
    const recs = myRecords(u).filter((r) => r.status === "registered");
    const attended = recs.filter((r) => r.attended);
    const reviews = read(K.reviews, []).filter((r) => r.userId === u);
    const saved = (read(K.saved, {})[u] || []).length;
    const cats = {};
    recs.forEach((r) => {
      const e = getEvent(r.eventId);
      if (e) cats[e.category] = (cats[e.category] || 0) + 1;
    });
    const points = recs.length * 10 + attended.length * 25 + reviews.length * 5 + saved * 2;
    const badges = [
      { id: "first", name: "First Step", desc: "Register for your first event", icon: "rocket", earned: recs.length >= 1 },
      { id: "regular", name: "Regular", desc: "Register for 3 events", icon: "zap", earned: recs.length >= 3 },
      { id: "allround", name: "All-rounder", desc: "Join events in 3 categories", icon: "sparkles", earned: Object.keys(cats).length >= 3 },
      { id: "present", name: "Showed Up", desc: "Get checked in at an event", icon: "check", earned: attended.length >= 1 },
      { id: "hero", name: "Hackathon Hero", desc: "Attend a Technical event", icon: "code", earned: attended.some((r) => (getEvent(r.eventId) || {}).category === "Technical") },
      { id: "critic", name: "Critic", desc: "Leave a review", icon: "pen", earned: reviews.length >= 1 },
      { id: "collector", name: "Collector", desc: "Save 3 events", icon: "heart", earned: saved >= 3 },
    ];
    const level = points >= 150 ? "Campus Legend" : points >= 80 ? "Insider" : points >= 30 ? "Explorer" : "Newcomer";
    return { registered: recs.length, attended: attended.length, saved: saved, reviews: reviews.length, points: points, badges: badges, level: level, categories: cats };
  }

  function recommend(n) {
    const u = user();
    const w = {};
    if (u) {
      myRecords().forEach((r) => {
        const e = getEvent(r.eventId);
        if (e) w[e.category] = (w[e.category] || 0) + 2;
      });
      savedIds().forEach((id) => {
        const e = getEvent(id);
        if (e) w[e.category] = (w[e.category] || 0) + 1;
      });
    }
    const mineIds = myRecords().map((r) => r.eventId);
    return LIST.filter((e) => status(e) !== "ended" && mineIds.indexOf(e.id) < 0)
      .map((e) => ({ e: e, s: (w[e.category] || 0) * 1000 + (e.attendees || 0) / 10 - dayDiff(toISO(new Date()), e.date) }))
      .sort((a, b) => b.s - a.s)
      .slice(0, n || 3)
      .map((x) => x.e);
  }

  /* ---------- countdown ---------- */
  function countdown(ev) {
    const st = status(ev);
    if (st === "ended") return { state: "ended", text: "Event ended" };
    if (st === "live") return { state: "live", text: "Live now" };
    let s = Math.floor((startAt(ev) - Date.now()) / 1000);
    const d = Math.floor(s / 86400);
    s -= d * 86400;
    const h = Math.floor(s / 3600);
    s -= h * 3600;
    const m = Math.floor(s / 60);
    s -= m * 60;
    return { state: "upcoming", text: (d ? d + "d " : "") + pad(h) + "h " + pad(m) + "m " + pad(s) + "s", d: d, h: h, m: m, s: s };
  }
  function tick() {
    document.querySelectorAll("[data-cd]").forEach((el) => {
      const ev = getEvent(el.getAttribute("data-cd"));
      if (!ev) return;
      const c = countdown(ev);
      el.textContent = c.text;
      el.setAttribute("data-state", c.state);
    });
    document.querySelectorAll("[data-cd-big]").forEach((el) => {
      const ev = getEvent(el.getAttribute("data-cd-big"));
      if (!ev) return;
      const c = countdown(ev);
      if (c.state !== "upcoming") {
        el.innerHTML = '<span class="es-cd-state">' + c.text + "</span>";
        return;
      }
      const cell = (v, l) => '<div class="es-cd-cell"><strong>' + pad(v) + "</strong><span>" + l + "</span></div>";
      el.innerHTML = cell(c.d, "days") + cell(c.h, "hours") + cell(c.m, "min") + cell(c.s, "sec");
    });
  }
  let tickTimer = null;
  function startCountdowns() {
    tick();
    if (!tickTimer) tickTimer = setInterval(tick, 1000);
  }

  /* ---------- calendar export ---------- */
  function stamp(d) {
    return d.getFullYear() + pad(d.getMonth() + 1) + pad(d.getDate()) + "T" + pad(d.getHours()) + pad(d.getMinutes()) + "00";
  }
  function googleCalUrl(ev) {
    return (
      "https://calendar.google.com/calendar/render?action=TEMPLATE&text=" +
      encodeURIComponent(ev.title) +
      "&dates=" + stamp(startAt(ev)) + "/" + stamp(endAt(ev)) +
      "&details=" + encodeURIComponent(ev.description || "") +
      "&location=" + encodeURIComponent(ev.venue + ", Chitkara University")
    );
  }
  const icsEsc = (s) => String(s || "").replace(/\\/g, "\\\\").replace(/\n/g, "\\n").replace(/,/g, "\\,").replace(/;/g, "\\;");
  function icsFor(events) {
    const lines = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//EventSphere//Campus Events//EN", "CALSCALE:GREGORIAN"];
    events.forEach((ev) => {
      lines.push(
        "BEGIN:VEVENT",
        "UID:" + ev.id + "@eventsphere.local",
        "DTSTAMP:" + new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, ""),
        "DTSTART:" + stamp(startAt(ev)),
        "DTEND:" + stamp(endAt(ev)),
        "SUMMARY:" + icsEsc(ev.title),
        "DESCRIPTION:" + icsEsc(ev.description),
        "LOCATION:" + icsEsc(ev.venue + ", Chitkara University"),
        "BEGIN:VALARM",
        "TRIGGER:-PT1H",
        "ACTION:DISPLAY",
        "DESCRIPTION:" + icsEsc("Starting soon: " + ev.title),
        "END:VALARM",
        "END:VEVENT"
      );
    });
    lines.push("END:VCALENDAR");
    return lines.join("\r\n") + "\r\n";
  }
  function download(name, text, mime) {
    const blob = new Blob([text], { type: (mime || "text/plain") + ";charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = name;
    document.body.appendChild(a);
    a.click();
    wait(500).then(() => {
      URL.revokeObjectURL(a.href);
      a.remove();
    });
  }
  const downloadIcs = (events, name) => download(name || "eventsphere.ics", icsFor(events), "text/calendar");

  /* ---------- team / price helpers ---------- */
  function teamInfo(ev) {
    const tagTxt = (ev.tags || []).join(" ");
    const isTeam = /team/i.test(ev.price || "") || /team/i.test(tagTxt);
    if (!isTeam) return null;
    const m = tagTxt.match(/(\d)\s*[–-]\s*(\d)/);
    return { min: m ? Number(m[1]) : 2, max: m ? Number(m[2]) : 5 };
  }
  function priceAmount(ev) {
    const m = String(ev.price || "").match(/(\d[\d,]*)/);
    return m ? Number(m[1].replace(/,/g, "")) : 0;
  }

  /* ---------- UI: toast fallback + modal ---------- */
  const wait = window.wait || ((ms) => new Promise((resolve) => setTimeout(resolve, ms)));
  const toast = (msg, tone) => (window.showToast ? window.showToast(msg, tone) : void 0);
  function needLogin() {
    toast("Please sign in first.", "error");
    const next = encodeURIComponent((location.pathname.split("/").pop() || "index.html") + location.search);
    wait(700).then(() => (location.href = "signin.html?next=" + next));
  }

  function modal(html, onMount) {
    closeModal();
    const wrap = document.createElement("div");
    wrap.className = "es-modal-backdrop";
    wrap.id = "esModal";
    wrap.innerHTML = '<div class="es-modal" role="dialog" aria-modal="true">' + html + "</div>";
    document.body.appendChild(wrap);
    document.body.classList.add("es-modal-open");
    wrap.addEventListener("click", (e) => {
      if (e.target === wrap || e.target.closest("[data-close]")) closeModal();
    });
    document.addEventListener("keydown", escClose);
    if (onMount) onMount(wrap.firstChild);
    const f = wrap.querySelector("input,select,textarea,button");
    if (f) f.focus();
    return wrap.firstChild;
  }
  function escClose(e) {
    if (e.key === "Escape") closeModal();
  }
  function closeModal() {
    const m = document.getElementById("esModal");
    if (m) m.remove();
    document.body.classList.remove("es-modal-open");
    document.removeEventListener("keydown", escClose);
  }

  /* The whole "Join" flow: login check → clash warning → team form → demo payment → register.
     done(result) is called after a successful change so pages can re-render. */
  function startRegistration(ev, done) {
    if (!user()) return needLogin();
    if (status(ev) === "ended") return toast("This event has already ended.", "error");
    if (myRecord(ev.id)) return;
    const clash = findClash(ev);
    const team = teamInfo(ev);
    const amount = priceAmount(ev);
    const full = seatsLeft(ev) === 0;
    /* Always show the registration form (name, phone, roll no...) before joining. */
    const regUser = user();
    let html = '<button class="es-modal-x" data-close aria-label="Close">✕</button><h3>' + (full ? "Join the waitlist" : "Register") + " — " + esc(ev.title) + "</h3>";
    html += '<p class="es-modal-sub">' + esc(ev.displayDate) + " · " + esc(ev.time) + " · " + esc(ev.venue) + "</p>";
    if (clash) html += '<div class="es-note es-note-warn">⚠ Time clash: you are already registered for <strong>' + esc(clash.title) + "</strong> (" + esc(clash.time) + " – " + esc(clash.endTime) + ") on the same day. You can still continue.</div>";
    if (full) html += '<div class="es-note">This event is full. Join the waitlist and you\'ll get a seat automatically if someone cancels.</div>';
    html += '<form id="esRegForm" novalidate>';
    html +=
      '<div class="form-group"><label for="esName">Full name</label><input id="esName" maxlength="60" autocomplete="name" value="' + esc(regUser.name) + '" /></div>' +
      '<div class="form-group"><label for="esEmail">Registered email</label><input id="esEmail" type="email" value="' + esc(regUser.email) + '" readonly /><small class="es-muted">Your ticket is linked to the email you signed up with.</small></div>' +
      '<div class="form-group"><label for="esPhone">Mobile number</label><input id="esPhone" type="tel" inputmode="numeric" maxlength="10" autocomplete="tel" placeholder="10-digit mobile number" /></div>' +
      '<div class="form-group"><label for="esRoll">Roll number / Student ID</label><input id="esRoll" maxlength="20" placeholder="e.g. 2410990123" /></div>' +
      '<div class="form-group"><label for="esBranch">Course / Department</label><input id="esBranch" maxlength="40" placeholder="e.g. B.E. CSE" /></div>' +
      '<div class="form-group"><label for="esYear">Year of study</label><select id="esYear"><option value="">Select year</option><option>1st year</option><option>2nd year</option><option>3rd year</option><option>4th year</option><option>Other</option></select></div>';
    if (team) {
      html +=
        '<div class="form-group"><label for="esTeamName">Team name</label><input id="esTeamName" maxlength="40" placeholder="e.g. Byte Builders" /></div>' +
        '<div class="form-group"><label for="esTeamMembers">Teammates (one per line, ' + (team.min - 1) + "–" + (team.max - 1) + ' people besides you)</label><textarea id="esTeamMembers" rows="3" placeholder="Name or college email"></textarea></div>';
    }
    if (amount && !full) {
      html +=
        '<div class="es-pay"><div class="es-pay-head"><strong>Pay ₹' + amount + '</strong><span class="es-demo-tag">Demo payment — no real money</span></div>' +
        '<label class="es-radio"><input type="radio" name="esPay" value="UPI" checked /> UPI</label>' +
        '<label class="es-radio"><input type="radio" name="esPay" value="Card" /> Card</label>' +
        '<label class="es-radio"><input type="radio" name="esPay" value="Cash" /> Pay at venue</label></div>';
    }
    html += '<p class="es-form-error" id="esRegErr" role="alert"></p>';
    html += '<div class="es-modal-actions"><button type="button" class="btn btn-ghost" data-close>Cancel</button><button type="submit" class="btn btn-primary">' + (full ? "Join waitlist" : amount ? "Pay ₹" + amount + " & register" : "Confirm registration") + "</button></div></form>";
    modal(html, (box) => {
      box.querySelector("#esRegForm").addEventListener("submit", (e) => {
        e.preventDefault();
        const err = box.querySelector("#esRegErr");
        const val = (id) => box.querySelector(id).value.trim();
        const attendee = { name: val("#esName"), email: regUser.email, phone: val("#esPhone"), roll: val("#esRoll"), branch: val("#esBranch"), year: val("#esYear") };
        if (attendee.name.length < 2) return (err.textContent = "Please enter your full name.");
        if (!window.isEmailRegistered || !window.isEmailRegistered(attendee.email)) return (err.textContent = "This email is not a registered account. Please sign up or sign in again.");
        if (!/^[6-9]\d{9}$/.test(attendee.phone)) return (err.textContent = "Enter a valid 10-digit mobile number.");
        if (attendee.roll.length < 4) return (err.textContent = "Please enter your roll number / student ID.");
        if (attendee.branch.length < 2) return (err.textContent = "Please enter your course / department.");
        if (!attendee.year) return (err.textContent = "Please select your year of study.");
        err.textContent = "";
        let teamData = null;
        if (team) {
          const name = box.querySelector("#esTeamName").value.trim();
          const members = box.querySelector("#esTeamMembers").value.split("\n").map((x) => x.trim()).filter(Boolean);
          if (name.length < 2) return (err.textContent = "Please enter a team name.");
          if (members.length < team.min - 1 || members.length > team.max - 1) return (err.textContent = "Add " + (team.min - 1) + " to " + (team.max - 1) + " teammates (one per line).");
          teamData = { name: name, members: members };
        }
        const method = (box.querySelector('input[name="esPay"]:checked') || {}).value;
        const r = register(ev.id, { attendee: attendee, team: teamData, paid: amount && !full && method !== "Cash" ? amount : 0 });
        closeModal();
        if (!r.ok) toast(r.message, "error");
        else toast(r.status === "waitlist" ? "You're on the waitlist for " + ev.title + "." : "Registered for " + ev.title + "! Your ticket is in your dashboard.");
        if (done) done(r);
      });
    });
  }

  function cancelWithConfirm(ev, done) {
    const rec = myRecord(ev.id);
    if (!rec) return;
    modal(
      '<button class="es-modal-x" data-close aria-label="Close">✕</button><h3>Cancel your ' + (rec.status === "waitlist" ? "waitlist spot" : "registration") + '?</h3><p class="es-modal-sub">' + esc(ev.title) + ' · ' + esc(ev.displayDate) + "</p>" +
        (rec.paid ? '<div class="es-note">Demo payment of ₹' + rec.paid + " would be refunded in a real system.</div>" : "") +
        '<div class="es-modal-actions"><button class="btn btn-ghost" data-close>Keep it</button><button class="btn btn-primary" id="esConfirmCancel">Yes, cancel</button></div>',
      (box) => {
        box.querySelector("#esConfirmCancel").addEventListener("click", () => {
          const r = cancel(ev.id);
          closeModal();
          toast("Registration cancelled.");
          if (done) done(r);
        });
      }
    );
  }

  /* ---------- reminders + unseen notifications ---------- */
  function runReminders() {
    const u = user();
    if (!u) return;
    myRecords()
      .filter((r) => r.status === "registered")
      .forEach((r) => {
        const ev = getEvent(r.eventId);
        if (!ev || status(ev) !== "upcoming") return;
        const hrs = (startAt(ev) - Date.now()) / 3600000;
        if (hrs <= 24) notify(u.id, "Reminder: " + ev.title + " starts in under 24 hours (" + ev.time + ", " + ev.venue + ").", "rem24-" + r.id, "ticket.html?id=" + r.ticketId);
        if (hrs <= 1) notify(u.id, "Starting soon: " + ev.title + " begins within the hour. Keep your QR ticket ready.", "rem1-" + r.id, "ticket.html?id=" + r.ticketId);
      });
  }
  const myNotifs = () => {
    const u = user();
    return u ? read(K.notifs, []).filter((n) => n.userId === u.id) : [];
  };
  function markNotifsSeen() {
    const u = user();
    if (!u) return;
    const all = read(K.notifs, []);
    all.forEach((n) => {
      if (n.userId === u.id) n.seen = true;
    });
    write(K.notifs, all);
  }
  function clearNotifs() {
    const u = user();
    if (!u) return;
    write(K.notifs, read(K.notifs, []).filter((n) => n.userId !== u.id));
  }

  /* ---------- static page helpers ---------- */
  function seatBadge(ev) {
    const st = status(ev);
    if (st === "ended") return '<span class="es-badge es-badge-ended">Ended</span>';
    if (st === "live") return '<span class="es-badge es-badge-live">● Live now</span>';
    const s = seatState(ev);
    return '<span class="es-badge es-badge-' + s.key + '">' + esc(s.label) + "</span>";
  }
  function heartBtn(ev) {
    const on = isSaved(ev.id);
    return '<button type="button" class="es-heart' + (on ? " on" : "") + '" data-save="' + esc(ev.id) + '" aria-pressed="' + on + '" aria-label="' + (on ? "Remove from saved" : "Save event") + '">' + (window.ESIcon ? window.ESIcon("heart") : "♥") + "</button>";
  }
  /* delegated click for any .es-heart button on a page */
  document.addEventListener("click", (e) => {
    const b = e.target.closest && e.target.closest(".es-heart");
    if (!b) return;
    e.preventDefault();
    e.stopPropagation();
    const res = toggleSaved(b.getAttribute("data-save"));
    if (res === null) return needLogin();
    b.classList.toggle("on", res);
    b.setAttribute("aria-pressed", String(res));
    toast(res ? "Saved to your dashboard." : "Removed from saved.");
    document.dispatchEvent(new CustomEvent("es:saved-changed"));
  });

  /* keep the hard-coded home-page cards in sync with the (shifted) dataset */
  function patchStaticCards() {
    document.querySelectorAll(".event-card").forEach((card) => {
      const a = card.querySelector('a[href*="event-details.html?id="]');
      if (!a) return;
      const ev = getEvent(decodeURIComponent((a.getAttribute("href").split("id=")[1] || "").split("&")[0]));
      if (!ev || card.hasAttribute("data-es-patched") || card.querySelector(".es-card-status")) return;
      card.setAttribute("data-es-patched", "1");
      const lis = card.querySelectorAll(".event-meta li");
      if (lis[0]) lis[0].innerHTML = (window.ESIcon ? window.ESIcon("calendar") : "") + " " + esc(ev.displayDate);
      const meta = card.querySelector(".event-meta");
      if (meta) meta.insertAdjacentHTML("afterend", '<div class="es-card-status">' + seatBadge(ev) + "</div>");
    });
  }

  /* ---------- admin (demo passcode, session only) ---------- */
  const ADMIN_PASS = "admin123";
  const admin = {
    pass: ADMIN_PASS,
    isAuthed: () => {
      try {
        return sessionStorage.getItem("eventsphere_admin") === "1";
      } catch (e) {
        return false;
      }
    },
    login: (p) => {
      if (p !== ADMIN_PASS) return false;
      try {
        sessionStorage.setItem("eventsphere_admin", "1");
      } catch (e) {}
      return true;
    },
    logout: () => {
      try {
        sessionStorage.removeItem("eventsphere_admin");
      } catch (e) {}
    },
    saveEvent: (data) => {
      const isBuiltIn = PRISTINE.some((e) => e.id === data.id);
      if (isBuiltIn) {
        const ov = read(K.overrides, {});
        ov[data.id] = Object.assign({}, ov[data.id], data);
        write(K.overrides, ov);
      } else {
        const list = read(K.custom, []);
        const i = list.findIndex((e) => e.id === data.id);
        if (i >= 0) list[i] = Object.assign({}, list[i], data);
        else list.push(data);
        write(K.custom, list);
      }
      refreshEvents();
    },
    deleteEvent: (id) => {
      if (PRISTINE.some((e) => e.id === id)) {
        const h = read(K.hidden, []);
        if (h.indexOf(id) < 0) h.push(id);
        write(K.hidden, h);
      } else write(K.custom, read(K.custom, []).filter((e) => e.id !== id));
      refreshEvents();
    },
    restoreDefaults: () => {
      [K.custom, K.overrides, K.hidden].forEach((k) => localStorage.removeItem(k));
      refreshEvents();
    },
    isBuiltIn: (id) => PRISTINE.some((e) => e.id === id),
    users: () => read("eventsphere_users", []),
    updateRecord: (id, patch) => {
      const regs = allRegs();
      const r = regs.find((x) => x.id === id);
      if (r) Object.assign(r, patch);
      write(K.regs, regs);
    },
  };

  function csvEscape(v) {
    const s = String(v == null ? "" : v);
    return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
  }
  function registrationsCsv(rows) {
    const head = ["Ticket ID", "Name", "Email", "Event", "Date", "Status", "Team", "Teammates", "Phone", "Roll no.", "Course", "Year", "Paid (INR)", "Checked in", "Registered at"];
    const out = [head.join(",")];
    rows.forEach((r) => {
      const ev = getEvent(r.eventId) || { title: r.eventId, displayDate: "" };
      out.push(
        [r.ticketId, r.name, r.email, ev.title, ev.displayDate, r.status, r.team ? r.team.name : "", r.team ? r.team.members.join(" | ") : "", r.attendee ? r.attendee.phone : "", r.attendee ? r.attendee.roll : "", r.attendee ? r.attendee.branch : "", r.attendee ? r.attendee.year : "", r.paid || 0, r.attended ? "Yes" : "No", new Date(r.ts).toLocaleString()]
          .map(csvEscape)
          .join(",")
      );
    });
    return out.join("\n");
  }

  /* ---------- init ---------- */
  document.addEventListener("DOMContentLoaded", () => {
    runReminders();
    patchStaticCards();
    startCountdowns();
    // surface the newest unseen notification once per page load
    const u = user();
    if (u) {
      const unseen = myNotifs().filter((n) => !n.seen);
      if (unseen.length && !/dashboard\.html/.test(location.pathname)) setTimeout(() => toast("🔔 " + unseen[0].text), 900);
    }
  });
  window.addEventListener("storage", () => document.dispatchEvent(new CustomEvent("es:data-changed")));

  /* ---------- public API ---------- */
  window.ES = {
    K: K, read: read, write: write, esc: esc, uid: uid, pad: pad,
    CAT: CAT, CATEGORIES: CATEGORIES,
    parseDate: parseDate, toISO: toISO, fmtDate: fmtDate, addDays: addDays, dayDiff: dayDiff,
    to12h: to12h, to24h: to24h, startAt: startAt, endAt: endAt, status: status,
    events: LIST, getEvent: getEvent, refreshEvents: refreshEvents,
    capacity: capacity, filled: filled, seatsLeft: seatsLeft, seatState: seatState, seatBadge: seatBadge, heartBtn: heartBtn,
    user: user, allRegs: allRegs, myRecords: myRecords, myRecord: myRecord, isRegistered: isRegistered, isWaitlisted: isWaitlisted,
    register: register, cancel: cancel, checkIn: checkIn, findClash: findClash,
    startRegistration: startRegistration, cancelWithConfirm: cancelWithConfirm, modal: modal, closeModal: closeModal, needLogin: needLogin,
    savedIds: savedIds, isSaved: isSaved, toggleSaved: toggleSaved,
    reviewsFor: reviewsFor, ratingSummary: ratingSummary, canReview: canReview, saveReview: saveReview,
    stats: stats, recommend: recommend,
    countdown: countdown, startCountdowns: startCountdowns, tick: tick,
    googleCalUrl: googleCalUrl, icsFor: icsFor, downloadIcs: downloadIcs, download: download,
    teamInfo: teamInfo, priceAmount: priceAmount,
    notify: notify, myNotifs: myNotifs, markNotifsSeen: markNotifsSeen, clearNotifs: clearNotifs,
    admin: admin, registrationsCsv: registrationsCsv, patchStaticCards: patchStaticCards,
  };

  // compat with older page scripts
  window.getRegistrations = getRegistrations;
  window.isRegistered = isRegistered;
  window.toggleRegistration = toggleRegistration;
})();
