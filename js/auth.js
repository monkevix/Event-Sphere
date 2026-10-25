/* EventSphere — Auth module (localStorage demo, no backend) */
(function () {
  const USERS_KEY = "eventsphere_users";
  const SESSION_KEY = "eventsphere_session";

  function _loadUsers() {
    try {
      return JSON.parse(localStorage.getItem(USERS_KEY) || "[]");
    } catch {
      return [];
    }
  }
  function _saveUsers(users) {
    try {
      localStorage.setItem(USERS_KEY, JSON.stringify(users));
      return true;
    } catch {
      return false;
    }
  }

  /* Session write that verifies it really persisted (storage can be blocked
     in private mode / some file:// setups) so we never show a fake "logged in". */
  function _saveSession(user) {
    const val = JSON.stringify({ id: user.id, name: user.name, email: user.email });
    try {
      localStorage.setItem(SESSION_KEY, val);
      return localStorage.getItem(SESSION_KEY) === val;
    } catch {
      return false;
    }
  }
  const STORAGE_MSG =
    "Your browser is blocking storage, so login can't be saved. Open the site from its hosted link (not a local file) in a normal, non-private window.";

  /* Demo accounts: no backend means accounts only exist in one browser, so these
     are re-created on every device/browser automatically. Anyone on the team can sign in. */
  const DEMO_USERS = [
    { id: "demo-student", name: "Demo Student", email: "student@eventsphere.demo", password: "demo123", createdAt: "2026-01-01T00:00:00.000Z" },
    { id: "demo-team", name: "Team Member", email: "team@eventsphere.demo", password: "demo123", createdAt: "2026-01-01T00:00:00.000Z" },
  ];
  function _seedDemoUsers() {
    const users = _loadUsers();
    let changed = false;
    DEMO_USERS.forEach((d) => {
      if (!users.some((u) => u.email.toLowerCase() === d.email)) {
        users.push(d);
        changed = true;
      }
    });
    if (changed) _saveUsers(users);
  }
  _seedDemoUsers();

  function getCurrentUser() {
    try {
      return JSON.parse(localStorage.getItem(SESSION_KEY) || "null");
    } catch {
      return null;
    }
  }

  function isLoggedIn() {
    return !!getCurrentUser();
  }

  function _registerSync({ name, email, password }) {
    if (!name || !email || !password) {
      return { ok: false, message: "Please fill in all fields." };
    }
    if (password.length < 6) {
      return { ok: false, message: "Password must be at least 6 characters." };
    }
    const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRe.test(email)) {
      return { ok: false, message: "Please enter a valid email address." };
    }
    const users = _loadUsers();
    const exists = users.find((u) => u.email.toLowerCase() === email.toLowerCase());
    if (exists) {
      return { ok: false, message: "An account with this email already exists." };
    }
    const user = {
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 7),
      name: name.trim(),
      email: email.trim().toLowerCase(),
      password: password, // demo only — never store plain text in production
      createdAt: new Date().toISOString(),
    };
    users.push(user);
    if (!_saveUsers(users) || !_saveSession(user)) {
      return { ok: false, message: STORAGE_MSG };
    }
    document.body.classList.add("logged-in");
    return { ok: true, message: "Account created successfully!" };
  }

  function _loginSync({ email, password }) {
    if (!email || !password) {
      return { ok: false, message: "Please enter email and password." };
    }
    const users = _loadUsers();
    const user = users.find((u) => u.email.toLowerCase() === email.toLowerCase());
    if (!user) {
      return { ok: false, message: "No account found with this email in this browser. Accounts are stored per browser/device, so sign up here first, or use a demo account (student@eventsphere.demo / demo123)." };
    }
    if (user.password !== password) {
      return { ok: false, message: "Incorrect password. Please try again." };
    }
    if (!_saveSession(user)) return { ok: false, message: STORAGE_MSG };
    document.body.classList.add("logged-in");
    return { ok: true, message: "Welcome back, " + user.name + "!" };
  }

  function logoutUser() {
    localStorage.removeItem(SESSION_KEY);
    document.body.classList.remove("logged-in");
  }

  if (isLoggedIn()) {
    document.addEventListener("DOMContentLoaded", () => document.body.classList.add("logged-in"));
    if (document.readyState !== "loading") document.body.classList.add("logged-in");
  }

  /* ---------- Promise-based API ----------
     wait(ms)  : resolves after ms milliseconds (promise version of setTimeout)
     _simulateRequest : pretends to be a server call - resolves with the result
                        or rejects with an Error, so callers can use async/await. */
  const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
  window.wait = window.wait || wait;

  function _simulateRequest(work, ms) {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        try {
          const result = work();
          result.ok ? resolve(result) : reject(new Error(result.message));
        } catch (err) {
          reject(err);
        }
      }, ms);
    });
  }
  const registerUser = (data) => _simulateRequest(() => _registerSync(data), 600);
  const loginUser = (data) => _simulateRequest(() => _loginSync(data), 500);

  if (location.protocol === "file:") {
    document.addEventListener("DOMContentLoaded", () => {
      const b = document.createElement("div");
      b.setAttribute("role", "alert");
      b.style.cssText = "position:fixed;left:0;right:0;bottom:0;z-index:9999;background:#b45309;color:#fff;padding:10px 16px;font:14px/1.4 system-ui,sans-serif;text-align:center";
      b.textContent = "Opened as a local file: login may reset between pages. Use the hosted link or run a local server (python -m http.server).";
      document.body.appendChild(b);
    });
  }

  /* true only if an account with this email exists (used by registration + newsletter) */
  function isEmailRegistered(email) {
    const e = String(email || "").trim().toLowerCase();
    return !!e && _loadUsers().some((u) => u.email.toLowerCase() === e);
  }
  window.isEmailRegistered = isEmailRegistered;

  window.registerUser = registerUser;
  window.loginUser = loginUser;
  window.logoutUser = logoutUser;
  window.getCurrentUser = getCurrentUser;
  window.isLoggedIn = isLoggedIn;
})();
