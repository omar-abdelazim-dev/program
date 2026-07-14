// auth.js

let currentStep = 1;
const TOTAL_STEPS = 3;

const EYE_OPEN = `<svg class="eye-open" xmlns="http://www.w3.org/2000/svg" width="17" height="17" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>`;
const EYE_SHUT = `<svg class="eye-shut" xmlns="http://www.w3.org/2000/svg" width="17" height="17" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>`;

// ─── Theme ─────────────────────────────────────────────────────────────────
function initTheme() {
  const saved = localStorage.getItem("program-theme");
  if (saved === "light") document.body.classList.add("light-mode");
}

function toggleTheme() {
  document.body.classList.toggle("light-mode");
  localStorage.setItem(
    "program-theme",
    document.body.classList.contains("light-mode") ? "light" : "dark",
  );
}

// ─── Tab switching ─────────────────────────────────────────────────────────
function switchTab(tab) {
  const loginForm = document.getElementById("loginForm");
  const signupForm = document.getElementById("signupForm");
  const loginTab = document.getElementById("loginTab");
  const signupTab = document.getElementById("signupTab");
  const slider = document.getElementById("tabSlider");
  const title = document.getElementById("authTitle");
  const subtitle = document.getElementById("authSubtitle");

  if (tab === "login") {
    loginForm.classList.remove("hidden");
    signupForm.classList.add("hidden");
    loginTab.classList.add("active");
    signupTab.classList.remove("active");
    slider.classList.remove("right");
    title.textContent = "Welcome back";
    subtitle.textContent = "Sign in to continue your learning journey";
  } else {
    loginForm.classList.add("hidden");
    signupForm.classList.remove("hidden");
    signupTab.classList.add("active");
    loginTab.classList.remove("active");
    slider.classList.add("right");
    title.textContent = "Create your account";
    subtitle.textContent = "Join Program and start your journey today";
  }
}

// ─── Step: next ────────────────────────────────────────────────────────────
function nextStep() {
  if (!validateStep(currentStep)) return;

  if (currentStep < TOTAL_STEPS) {
    document
      .querySelector(`.step[data-step="${currentStep}"]`)
      .classList.replace("active", "done");
    const line = document.getElementById(`line${currentStep}`);
    if (line) line.classList.add("done");
    document.getElementById(`step${currentStep}`).classList.remove("active");

    currentStep++;
    document
      .querySelector(`.step[data-step="${currentStep}"]`)
      .classList.add("active");
    document.getElementById(`step${currentStep}`).classList.add("active");
    updateNavButtons();
  }
}

// ─── Step: prev ────────────────────────────────────────────────────────────
function prevStep() {
  if (currentStep <= 1) return;

  document
    .querySelector(`.step[data-step="${currentStep}"]`)
    .classList.remove("active");
  document.getElementById(`step${currentStep}`).classList.remove("active");

  currentStep--;

  const prevEl = document.querySelector(`.step[data-step="${currentStep}"]`);
  prevEl.classList.remove("done");
  prevEl.classList.add("active");

  const line = document.getElementById(`line${currentStep}`);
  if (line) line.classList.remove("done");

  document.getElementById(`step${currentStep}`).classList.add("active");
  updateNavButtons();
}

// ─── Update nav buttons ────────────────────────────────────────────────────
function updateNavButtons() {
  document.getElementById("prevBtn").style.display =
    currentStep > 1 ? "flex" : "none";
  document.getElementById("nextBtn").style.display =
    currentStep < TOTAL_STEPS ? "flex" : "none";
  document.getElementById("submitBtn").style.display =
    currentStep === TOTAL_STEPS ? "flex" : "none";
}

// ─── Validation ────────────────────────────────────────────────────────────
function validateStep(step) {
  let valid = true;

  if (step === 1) {
    valid &= checkField("fullName", "fullNameErr", "Full name is required");
    valid &= checkField("phone", "phoneErr", "Phone number is required");
    valid &= checkField(
      "signupEmail",
      "signupEmailErr",
      "Valid university email required",
      isValidEmail,
    );
    valid &= checkField(
      "signupPassword",
      "signupPwErr",
      "Minimum 8 characters",
      (v) => v.length >= 8,
    );
  }

  if (step === 2) {
    valid &= checkField("university", "uniErr", "University name is required");
    valid &= checkField(
      "college",
      "collegeErr",
      "College / Faculty is required",
    );
    valid &= checkField(
      "track",
      "trackErr",
      "Track or specialization is required",
    );
  }

  return !!valid;
}

// Helper to validate fields
function checkField(id, errId, msg, validator = (v) => v.trim() !== "") {
  const input = document.getElementById(id);
  const errEl = document.getElementById(errId);
  const wrap = input ? input.closest(".input-wrap") : null;
  const ok = input && validator(input.value);

  if (!ok) {
    if (wrap) {
      wrap.classList.add("error");
      wrap.classList.remove("valid");
    }
    if (errEl) {
      errEl.textContent = msg;
      errEl.style.display = "block";
    }
    if (input) input.focus();
    return false;
  }

  if (wrap) {
    wrap.classList.remove("error");
    wrap.classList.add("valid");
  }
  if (errEl) errEl.style.display = "none";
  return true;
}

function isValidEmail(v) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());
}

// ─── Password toggle ───────────────────────────────────────────────────────
function togglePassword(id, btn) {
  const input = document.getElementById(id);
  const hide = input.type === "password";
  input.type = hide ? "text" : "password";
  btn.innerHTML = hide ? EYE_SHUT : EYE_OPEN;
}

// ─── Password strength ─────────────────────────────────────────────────────
function checkPasswordStrength(pw) {
  const bars = ["bar1", "bar2", "bar3", "bar4"].map((id) =>
    document.getElementById(id),
  );
  bars.forEach((b) => {
    if (b) b.className = "pw-bar";
  });
  if (!pw) return;

  let score = 0;
  if (pw.length >= 8) score++;
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) score++;
  if (/[0-9]/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;

  const level = score <= 1 ? "weak" : score <= 2 ? "medium" : "strong";
  for (let i = 0; i < score && i < 4; i++) {
    if (bars[i]) bars[i].classList.add(level);
  }
}

// ─── University email badge ────────────────────────────────────────────────
function checkUniversityEmail(email) {
  const el = document.getElementById("emailStatus");
  if (!el) return;
  if (!email.includes("@") || email.length < 6) {
    el.style.display = "none";
    return;
  }

  const patterns = [
    ".edu",
    ".ac.",
    "university",
    "uni.",
    "cairo",
    "alex",
    "ain",
    "helwan",
    "mansoura",
    "assiut",
  ];
  const isUni = patterns.some((p) => email.toLowerCase().includes(p));
  el.style.display = "inline-block";
  el.textContent = isUni ? "✓ University" : "⚠ Verify";
  el.className = `email-status ${isUni ? "student" : "unknown"}`;
}

// ─── Vision chips ──────────────────────────────────────────────────────────
function selectChip(btn) {
  btn.classList.toggle("active");
  const active = document.querySelectorAll(".chip.active");
  const goals = Array.from(active).map((c) =>
    c.textContent.trim().replace(/^\S+\s/, ""),
  );
  const ta = document.getElementById("vision");
  ta.value = goals.join(", ");
  updateCharCount(ta);
}

function updateCharCount(ta) {
  const el = document.getElementById("charCount");
  if (el) {
    el.textContent = `${ta.value.length} / 400`;
    el.style.color = ta.value.length > 380 ? "#ef4444" : "";
  }
}

// ─── Path resolver helper ──────────────────────────────────────────────────
function getRedirectPath() {
  return "../Main Page/index.html";
}

// ─── Login submit ──────────────────────────────────────────────────────────
function handleLogin(e) {
  e.preventDefault();

  // Validate required fields
  let valid = true;
  valid &= checkField(
    "loginEmail",
    "loginEmailErr",
    "Please enter a valid email",
    isValidEmail,
  );
  valid &= checkField(
    "loginPassword",
    "loginPwErr",
    "Password is required",
    (v) => v.length >= 1,
  );
  if (!valid) return;

  const btn = document.getElementById("loginSubmitBtn");
  btn.disabled = true;
  btn.innerHTML = `<span class="spinner"></span> Signing in…`;

  setTimeout(() => {
    btn.innerHTML = `✓ Signed in! Redirecting…`;
    btn.style.background = "linear-gradient(135deg, #22c55e, #16a34a)";
    btn.style.boxShadow = "0 4px 20px rgba(34,197,94,.35)";
    setTimeout(() => {
      window.location.href = getRedirectPath();
    }, 700);
  }, 1400);
}

// ─── Signup submit ─────────────────────────────────────────────────────────
function handleSignup(e) {
  e.preventDefault();

  const btn = document.getElementById("submitBtn");
  btn.disabled = true;
  btn.innerHTML = `<span class="spinner"></span> Creating account…`;

  setTimeout(() => {
    btn.innerHTML = `✓ Account created! Redirecting…`;
    btn.style.background = "linear-gradient(135deg, #22c55e, #16a34a)";
    btn.style.boxShadow = "0 4px 20px rgba(34,197,94,.35)";
    setTimeout(() => {
      window.location.href = getRedirectPath();
    }, 700);
  }, 1400);
}

// ─── Init ──────────────────────────────────────────────────────────────────
document.addEventListener("DOMContentLoaded", () => {
  initTheme();
  updateNavButtons();

  const themeToggleBtn = document.getElementById("authThemeToggle");
  if (themeToggleBtn) {
    themeToggleBtn.addEventListener("click", toggleTheme);
  }

  // Clear validation state on input
  document.querySelectorAll("input, select, textarea").forEach((el) => {
    el.addEventListener("input", () => {
      const wrap = el.closest(".input-wrap");
      const err = document.getElementById(el.id + "Err");
      if (wrap) wrap.classList.remove("error", "valid");
      if (err) err.style.display = "none";
    });
  });
});
