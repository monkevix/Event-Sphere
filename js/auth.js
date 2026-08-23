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
    localStorage.setItem(USERS_KEY, JSON.stringify(users));
  }

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

  function registerUser({ name, email, password }) {
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
    _saveUsers(users);
    localStorage.setItem(SESSION_KEY, JSON.stringify({ id: user.id, name: user.name, email: user.email }));
    document.body.classList.add("logged-in");
    return { ok: true, message: "Account created successfully!" };
  }

  function loginUser({ email, password }) {
    if (!email || !password) {
      return { ok: false, message: "Please enter email and password." };
    }
    const users = _loadUsers();
    const user = users.find((u) => u.email.toLowerCase() === email.toLowerCase());
    if (!user) {
      return { ok: false, message: "No account found with this email. Please sign up." };
    }
    if (user.password !== password) {
      return { ok: false, message: "Incorrect password. Please try again." };
    }
    localStorage.setItem(SESSION_KEY, JSON.stringify({ id: user.id, name: user.name, email: user.email }));
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

  window.registerUser = registerUser;
  window.loginUser = loginUser;
  window.logoutUser = logoutUser;
  window.getCurrentUser = getCurrentUser;
  window.isLoggedIn = isLoggedIn;
})();
