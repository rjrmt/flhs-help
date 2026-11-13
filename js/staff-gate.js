/* Replaces a staff-key form with a BCPS email code. */
(() => {
  const staff = window.flhsStaff;
  const form = document.getElementById("unlock-form");
  if (!staff || !form) return;

  const gate = document.getElementById("lock-gate") || form.closest("section");
  const app = document.getElementById("app");
  const apps = document.getElementById("coupon-apps");
  const lead = gate?.querySelector(".lead");
  if (lead && /key/i.test(lead.textContent || "")) {
    lead.textContent = "Sign in with your @browardschools.com email. A one-time code will be sent to that inbox.";
  }

  form.innerHTML = `
    <label class="field">
      <span>BCPS email</span>
      <input id="staff-email" type="email" autocomplete="username" required placeholder="name@browardschools.com" />
    </label>
    <button class="btn btn-primary" type="button" id="staff-send" style="margin-top:0.85rem">Send code</button>
    <label class="field" id="staff-code-wrap" hidden style="margin-top:0.85rem">
      <span>6-digit code</span>
      <input id="staff-code" type="text" inputmode="numeric" autocomplete="one-time-code" maxlength="6" placeholder="000000" />
    </label>
    <button class="btn btn-primary" type="button" id="staff-verify" hidden style="margin-top:0.85rem">Sign in</button>
    <p class="status" id="gate-status" role="status"></p>
  `;

  const emailInput = document.getElementById("staff-email");
  const codeWrap = document.getElementById("staff-code-wrap");
  const codeInput = document.getElementById("staff-code");
  const sendBtn = document.getElementById("staff-send");
  const verifyBtn = document.getElementById("staff-verify");
  const statusEl = document.getElementById("gate-status");

  function setStatus(message) {
    if (statusEl) statusEl.textContent = message || "";
  }

  function openApp() {
    if (gate && app) gate.hidden = true;
    if (app) app.hidden = false;
    if (apps) {
      form.hidden = true;
      apps.hidden = false;
    }
    document.dispatchEvent(new CustomEvent("flhs-staff-unlocked"));
  }

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    event.stopImmediatePropagation();
  }, true);

  sendBtn?.addEventListener("click", async () => {
    const email = emailInput.value.trim().toLowerCase();
    if (!staff.isDistrictEmail(email)) {
      setStatus("Only @browardschools.com emails can sign in");
      return;
    }
    sendBtn.disabled = true;
    setStatus("Sending code…");
    try {
      await staff.sendCode(email);
      codeWrap.hidden = false;
      verifyBtn.hidden = false;
      codeInput.focus();
      setStatus("Code sent. Check your inbox.");
    } catch (err) {
      setStatus(err.message || "Could not send the code");
    } finally {
      sendBtn.disabled = false;
    }
  });

  verifyBtn?.addEventListener("click", async () => {
    const email = emailInput.value.trim().toLowerCase();
    const code = codeInput.value.trim();
    if (code.length !== 6) {
      setStatus("Enter the 6-digit code from your email");
      return;
    }
    verifyBtn.disabled = true;
    setStatus("Checking code…");
    try {
      await staff.verifyCode(email, code);
      setStatus("");
      openApp();
    } catch (err) {
      setStatus(err.message || "That code did not work");
    } finally {
      verifyBtn.disabled = false;
    }
  });

  staff.user().then((signedIn) => {
    if (signedIn) openApp();
  }).catch(() => {});
})();
