/* EventSphere — Simple math CAPTCHA (demo, no backend) */
function initCaptcha(containerId) {
  const container = document.getElementById(containerId);
  if (!container) {
    return { validate: () => true, clearError: () => {}, showError: () => {} };
  }

  const a = Math.floor(Math.random() * 9) + 1;
  const b = Math.floor(Math.random() * 9) + 1;
  const answer = a + b;

  container.innerHTML = `
    <div class="captcha-box" role="group" aria-label="Security check">
      <span class="captcha-challenge" aria-hidden="true">${a} + ${b} = ?</span>
      <span class="visually-hidden">What is ${a} plus ${b}?</span>
      <input type="number" inputmode="numeric" autocomplete="off" placeholder="?" aria-label="CAPTCHA answer" required />
      <button type="button" class="btn btn-ghost btn-small captcha-refresh" aria-label="Refresh CAPTCHA" title="Refresh">↻</button>
    </div>
    <p class="error-text captcha-error" style="display:none; color: var(--color-danger); font-size:0.82rem; margin-top:6px;">Incorrect answer. Try again.</p>
  `;

  const input = container.querySelector("input");
  const errorEl = container.querySelector(".captcha-error");
  const box = container.querySelector(".captcha-box");
  const refreshBtn = container.querySelector(".captcha-refresh");

  let currentAnswer = answer;
  let currentA = a, currentB = b;

  function regenerate() {
    currentA = Math.floor(Math.random() * 9) + 1;
    currentB = Math.floor(Math.random() * 9) + 1;
    currentAnswer = currentA + currentB;
    container.querySelector(".captcha-challenge").textContent = `${currentA} + ${currentB} = ?`;
    const hidden = container.querySelector(".visually-hidden");
    if (hidden) hidden.textContent = `What is ${currentA} plus ${currentB}?`;
    input.value = "";
    clearError();
  }

  if (refreshBtn) refreshBtn.addEventListener("click", regenerate);

  function validate() {
    const val = (input.value || "").trim();
    if (val === "" || Number(val) !== currentAnswer) return false;
    return true;
  }
  function showError() {
    errorEl.style.display = "block";
    box.style.borderColor = "var(--color-danger)";
    input.setAttribute("aria-invalid", "true");
    box.style.animation = "shake 0.35s ease";
    setTimeout(() => (box.style.animation = ""), 400);
  }
  function clearError() {
    errorEl.style.display = "none";
    box.style.borderColor = "";
    input.removeAttribute("aria-invalid");
  }

  input.addEventListener("input", clearError);

  return { validate, showError, clearError, regenerate };
}
window.initCaptcha = initCaptcha;
