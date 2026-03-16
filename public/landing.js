/* ═══════════════════════════════════════════════════════════════
   SYNC BLOGS — LANDING PAGE
   ═══════════════════════════════════════════════════════════════ */

// Signal to CSS that JS is running — content hidden only from this point on
document.documentElement.classList.add("js-ready");

/* ─── Scroll Reveal ─────────────────────────────────────────── */
const revealObserver = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add("visible");
        revealObserver.unobserve(entry.target);
      }
    });
  },
  { threshold: 0.1, rootMargin: "0px 0px -40px 0px" }
);

document.querySelectorAll(".reveal").forEach((el) => revealObserver.observe(el));

/* ─── Nav Scroll ────────────────────────────────────────────── */
const nav = document.getElementById("lp-nav");

function updateNav() {
  nav?.classList.toggle("lp-nav-scrolled", window.scrollY > 30);
}

window.addEventListener("scroll", updateNav, { passive: true });
updateNav();

/* ─── Mobile Nav Toggle ─────────────────────────────────────── */
const mobileToggle = document.getElementById("lp-mobile-toggle");
const mobileMenu = document.getElementById("lp-mobile-menu");

mobileToggle?.addEventListener("click", () => {
  const isOpen = mobileMenu.classList.toggle("lp-mobile-open");
  mobileToggle.textContent = isOpen ? "✕" : "☰";
  mobileToggle.setAttribute("aria-expanded", String(isOpen));
});

mobileMenu?.querySelectorAll("a").forEach((link) => {
  link.addEventListener("click", () => {
    mobileMenu.classList.remove("lp-mobile-open");
    mobileToggle.textContent = "☰";
    mobileToggle.setAttribute("aria-expanded", "false");
  });
});

/* ─── Smooth Scroll ─────────────────────────────────────────── */
document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
  anchor.addEventListener("click", (e) => {
    const href = anchor.getAttribute("href");
    const target = document.querySelector(href);
    if (target) {
      e.preventDefault();
      const navHeight = 72;
      const top = target.getBoundingClientRect().top + window.scrollY - navHeight;
      window.scrollTo({ top, behavior: "smooth" });

      // Close mobile menu if open
      mobileMenu?.classList.remove("lp-mobile-open");
      if (mobileToggle) {
        mobileToggle.textContent = "☰";
        mobileToggle.setAttribute("aria-expanded", "false");
      }
    }
  });
});

/* ─── Hero Mockup Animation ─────────────────────────────────── */
const RAW_TEXT =
  "• need to write something about AI tools\n" +
  "• everyone using chatgpt wrong\n" +
  "• pasting docs hoping for magic\n" +
  "• better way = feed it your thinking first\n" +
  "• something about second brain concept???\n" +
  "• also the prompt matters a LOT\n" +
  "• real example from my workflow";

const DRAFT_HTML =
  "<strong>Why Most People Are Using AI Wrong</strong><br /><br />" +
  "There's a pattern I keep seeing. Someone opens ChatGPT, types " +
  ""write me a blog post about AI tools," and wonders why the output " +
  "feels generic and forgettable.<br /><br />" +
  "Here's what they're missing: the quality of your <em>input</em> " +
  "determines the quality of the output. Feed it your actual thinking " +
  "first. That's it.";

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

let heroAnimationActive = true;

async function animateHero() {
  const typedText = document.getElementById("hero-typed-text");
  const cursor = document.getElementById("hero-cursor");
  const generateBtn = document.getElementById("hero-generate-btn");
  const draftResult = document.getElementById("hero-draft-result");
  const draftTextEl = document.getElementById("hero-draft-text");

  if (!typedText || !generateBtn || !draftResult || !draftTextEl) return;

  while (heroAnimationActive) {
    // ── Reset ──
    typedText.textContent = "";
    draftResult.classList.remove("lp-draft-visible");
    generateBtn.classList.remove("lp-btn-active");
    generateBtn.textContent = "Turn this into a draft →";
    if (cursor) cursor.style.display = "inline-block";

    await sleep(500);
    if (!heroAnimationActive) break;

    // ── Type the raw dump ──
    for (const char of RAW_TEXT) {
      if (!heroAnimationActive) break;
      typedText.textContent += char;
      await sleep(char === "\n" ? 90 : 24);
    }

    await sleep(900);
    if (!heroAnimationActive) break;

    // ── Hide cursor, activate button ──
    if (cursor) cursor.style.display = "none";
    generateBtn.classList.add("lp-btn-active");
    generateBtn.textContent = "Generating…";

    await sleep(1300);
    if (!heroAnimationActive) break;

    // ── Show draft ──
    generateBtn.textContent = "✦ Draft ready";
    draftTextEl.innerHTML = DRAFT_HTML;
    draftResult.classList.add("lp-draft-visible");

    await sleep(4500);
    if (!heroAnimationActive) break;

    // ── Fade out ──
    draftResult.classList.remove("lp-draft-visible");
    await sleep(700);
  }
}

// Start after fonts / layout settle
setTimeout(animateHero, 1000);

// Pause animation when tab is hidden (saves CPU)
document.addEventListener("visibilitychange", () => {
  heroAnimationActive = !document.hidden;
  if (!document.hidden) animateHero();
});

/* ─── Before / After Toggle ─────────────────────────────────── */
const baBeforeBtn = document.getElementById("ba-before-btn");
const baAfterBtn = document.getElementById("ba-after-btn");
const baBeforePanel = document.getElementById("ba-before-panel");
const baAfterPanel = document.getElementById("ba-after-panel");

function showPanel(visible, hidden) {
  hidden.classList.add("lp-ba-panel-hidden");
  hidden.classList.remove("lp-ba-panel-entering");
  visible.classList.remove("lp-ba-panel-hidden");
  // Trigger entrance animation
  visible.classList.remove("lp-ba-panel-entering");
  void visible.offsetWidth; // reflow
  visible.classList.add("lp-ba-panel-entering");
}

baBeforeBtn?.addEventListener("click", () => {
  if (baBeforeBtn.classList.contains("lp-ba-active")) return;
  baBeforeBtn.classList.add("lp-ba-active");
  baAfterBtn.classList.remove("lp-ba-active");
  showPanel(baBeforePanel, baAfterPanel);
});

baAfterBtn?.addEventListener("click", () => {
  if (baAfterBtn.classList.contains("lp-ba-active")) return;
  baAfterBtn.classList.add("lp-ba-active");
  baBeforeBtn.classList.remove("lp-ba-active");
  showPanel(baAfterPanel, baBeforePanel);
});
