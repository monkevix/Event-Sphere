/* EventSphere — Global UI: nav toggle, header scroll, active links, auth UI, toast, newsletter */
(function () {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];

  document.addEventListener("DOMContentLoaded", () => {
    // ----- Header scroll effect -----
    const header = document.getElementById("site-header") || $(".site-header");
    const onScroll = () => {
      if (window.scrollY > 10) document.body.classList.add("scrolled");
      else document.body.classList.remove("scrolled");
      if (header) {
        if (window.scrollY > 10) header.classList.add("scrolled");
        else header.classList.remove("scrolled");
      }
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();

    // ----- Mobile nav toggle -----
    const toggle = document.getElementById("navToggle") || document.getElementById("nav-toggle");
    const menu = document.getElementById("primaryMenu") || document.getElementById("nav-links");
    if (toggle && menu) {
      toggle.addEventListener("click", () => {
        const open = menu.classList.toggle("open");
        toggle.setAttribute("aria-expanded", String(open));
        toggle.setAttribute("aria-label", open ? "Close navigation menu" : "Open navigation menu");
      });
      $$("a", menu).forEach((a) =>
        a.addEventListener("click", () => {
          menu.classList.remove("open");
          toggle.setAttribute("aria-expanded", "false");
        })
      );
      document.addEventListener("click", (e) => {
        if (!menu.classList.contains("open")) return;
        if (menu.contains(e.target) || toggle.contains(e.target)) return;
        menu.classList.remove("open");
        toggle.setAttribute("aria-expanded", "false");
      });
      document.addEventListener("keydown", (e) => {
        if (e.key === "Escape" && menu.classList.contains("open")) {
          menu.classList.remove("open");
          toggle.setAttribute("aria-expanded", "false");
          toggle.focus();
        }
      });
    }

    // ----- Active nav link -----
    const currentPage = (location.pathname.split("/").pop() || "index.html").toLowerCase();
    $$(".nav-link").forEach((link) => {
      const href = (link.getAttribute("href") || "").split("#")[0].split("?")[0].split("/").pop().toLowerCase();
      if (href === currentPage || (currentPage === "" && href === "index.html")) {
        link.classList.add("active");
        link.setAttribute("aria-current", "page");
      } else {
        link.classList.remove("active");
        link.removeAttribute("aria-current");
      }
    });

    // ----- Auth UI -----
    function renderAuthUI() {
      const user = window.getCurrentUser ? window.getCurrentUser() : null;
      const navActions = $(".nav-actions") || $("#nav-auth-slot");
      const logoutBtn = document.getElementById("logoutBtn");

      if (user) {
        document.body.classList.add("logged-in");
        if (navActions && !document.getElementById("navUserChip")) {
          const chip = document.createElement("a");
          chip.href = "dashboard.html";
          chip.title = "Open my dashboard";
          chip.style.textDecoration = "none";
          chip.id = "navUserChip";
          chip.className = "auth-only";
          chip.style.display = "inline-flex";
          chip.style.alignItems = "center";
          chip.style.gap = "8px";
          chip.innerHTML = `<span class="avatar" style="width:32px;height:32px;font-size:0.75rem;">${escapeHtml(
            user.name
              .split(" ")
              .map((w) => w[0])
              .join("")
              .slice(0, 2)
              .toUpperCase()
          )}</span><span style="font-size:0.875rem;font-weight:600;color:var(--color-text);">${escapeHtml(user.name)}</span>`;
          if (logoutBtn) navActions.insertBefore(chip, logoutBtn);
          else navActions.appendChild(chip);
        }
        const legacySlot = document.getElementById("nav-auth-slot");
        if (legacySlot && user) {
          legacySlot.innerHTML = `<span style="font-size:0.875rem;color:var(--color-text-secondary);">Hi, <strong style="color:var(--color-text);">${escapeHtml(
            user.name
          )}</strong></span><button class="btn btn-ghost btn-small" id="legacyLogout" type="button">Logout</button>`;
          const b = document.getElementById("legacyLogout");
          if (b) b.addEventListener("click", handleLogout);
        }
      } else {
        document.body.classList.remove("logged-in");
        const chip = document.getElementById("navUserChip");
        if (chip) chip.remove();
        const legacySlot = document.getElementById("nav-auth-slot");
        if (legacySlot && !legacySlot.querySelector("a")) {
          legacySlot.innerHTML = `<a href="signin.html" class="btn btn-ghost btn-small">Sign In</a><a href="signup.html" class="btn btn-primary btn-small">Sign Up</a>`;
        }
      }
    }

    function escapeHtml(s) {
      return String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
    }

    function handleLogout() {
      if (window.logoutUser) window.logoutUser();
      renderAuthUI();
      showToast("You’ve been logged out.");
    }

    const logoutBtn = document.getElementById("logoutBtn");
    if (logoutBtn) logoutBtn.addEventListener("click", handleLogout);

    renderAuthUI();
    window.addEventListener("storage", renderAuthUI);
    setTimeout(renderAuthUI, 50);

    // ----- Toast helper (global) -----
    window.showToast = function showToast(message, tone = "success") {
      let toast = document.getElementById("globalToast");
      if (!toast) {
        toast = document.createElement("div");
        toast.id = "globalToast";
        toast.className = "toast";
        toast.setAttribute("role", "status");
        toast.setAttribute("aria-live", "polite");
        document.body.appendChild(toast);
      }
      toast.textContent = message;
      if (tone === "error") {
        toast.style.background = "var(--color-error-bg)";
        toast.style.color = "var(--color-danger)";
        toast.style.borderColor = "rgba(251,113,133,0.35)";
      } else {
        toast.style.background = "var(--color-success-bg)";
        toast.style.color = "var(--color-success)";
        toast.style.borderColor = "rgba(52,211,153,0.35)";
      }
      toast.classList.add("show");
      clearTimeout(toast._hideTimer);
      toast._hideTimer = setTimeout(() => toast.classList.remove("show"), 3200);
    };

    // ----- Newsletter (index + any page) -----
    const wait = window.wait || ((ms) => new Promise((resolve) => setTimeout(resolve, ms)));
    $$(".newsletter-form").forEach((form) => {
      form.addEventListener("submit", async (e) => {
        e.preventDefault();
        const input = form.querySelector('input[type="email"]');
        const val = (input?.value || "").trim();
        const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRe.test(val)) {
          showToast("Please enter a valid email address.", "error");
          input?.focus();
          input?.setAttribute("aria-invalid", "true");
          return;
        }
        if (!window.isEmailRegistered || !window.isEmailRegistered(val)) {
          showToast("This email isn't registered. Use the email you signed up with, or create an account first.", "error");
          input?.focus();
          input?.setAttribute("aria-invalid", "true");
          return;
        }
        const NL_KEY = "eventsphere_newsletter";
        let subs = [];
        try { subs = JSON.parse(localStorage.getItem(NL_KEY)) || []; } catch (err) { subs = []; }
        if (subs.indexOf(val.toLowerCase()) >= 0) {
          showToast("You're already subscribed with this email.");
          return;
        }
        input.removeAttribute("aria-invalid");
        const btn = form.querySelector('button[type="submit"]');
        const origText = btn ? btn.textContent : "";
        if (btn) {
          btn.textContent = "Subscribing…";
          btn.disabled = true;
        }
        await wait(700);
        try { subs.push(val.toLowerCase()); localStorage.setItem(NL_KEY, JSON.stringify(subs)); } catch (err) {}
        if (btn) btn.textContent = "Subscribed ✓";
        showToast("You're subscribed! Weekly digests coming soon.");
        form.reset();
        await wait(2500);
        if (btn) {
          btn.textContent = origText || "Subscribe";
          btn.disabled = false;
        }
      });
    });

    // Registration helpers now live in js/store.js (per-user, seats, waitlist).

    // ----- Theme toggle (light / dark) -----
    const THEME_KEY = "eventsphere_theme";
    function getStoredTheme() {
      try {
        const v = localStorage.getItem(THEME_KEY);
        if (v === "light" || v === "dark") return v;
      } catch (e) {}
      try {
        const m = window.name.match(/(?:^|;)eventsphere_theme=([^;]+)/);
        if (m && (m[1] === "light" || m[1] === "dark")) return m[1];
      } catch (e2) {}
      return null;
    }
    function setStoredTheme(mode) {
      try {
        localStorage.setItem(THEME_KEY, mode);
      } catch (e) {}
      try {
        let n = window.name || "";
        n = n.replace(/(?:^|;)eventsphere_theme=[^;]*/g, "");
        n = n.replace(/^;|;$/g, "");
        n = n.replace(/;;/g, ";");
        window.name = (n ? n + ";" : "") + THEME_KEY + "=" + mode;
      } catch (e2) {}
    }
    function getPreferredTheme() {
      return getStoredTheme() || "dark";
    }
    function setTheme(mode) {
      document.documentElement.classList.toggle("light-mode", mode === "light");
      setStoredTheme(mode);
    }
    setTheme(getPreferredTheme());

    const navbar = $(".navbar");
    const navToggleEl = document.getElementById("navToggle");
    if (navbar) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.id = "themeToggle";
      btn.className = "theme-toggle";
      btn.innerHTML =
        '<svg class="tt-sun" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true">' +
        '<circle cx="12" cy="12" r="4.2"></circle>' +
        '<path d="M12 2v2.5M12 19.5V22M4.2 4.2l1.8 1.8M18 18l1.8 1.8M2 12h2.5M19.5 12H22M4.2 19.8l1.8-1.8M18 6l1.8-1.8"></path>' +
        "</svg>" +
        '<svg class="tt-moon" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"></path></svg>';

      const end = document.createElement("div");
      end.className = "nav-end";
      if (navToggleEl) end.appendChild(navToggleEl); // group hamburger + toggle
      end.appendChild(btn);
      navbar.appendChild(end);

      function updateThemeBtn() {
        const isLight = document.documentElement.classList.contains("light-mode");
        const label = isLight ? "Switch to dark mode" : "Switch to light mode";
        btn.setAttribute("aria-label", label);
        btn.title = label;
      }
      updateThemeBtn();
      btn.addEventListener("click", () => {
        const next = document.documentElement.classList.contains("light-mode") ? "dark" : "light";
        setTheme(next);
        updateThemeBtn();
        showToast(next === "light" ? "Light mode on" : "Dark mode on");
      });
      window.addEventListener("storage", updateThemeBtn);
    }
  });
})();
