/* ═══════════════════════════════════════════════════════════════
   SYNC BLOGS — LANDING PAGE
   ═══════════════════════════════════════════════════════════════ */

// Signal to CSS that JS is running
document.documentElement.classList.add("js-ready");

/* ─── Scroll Reveal ─────────────────────────────────────────── */
var revealObserver = new IntersectionObserver(
  function (entries) {
    entries.forEach(function (entry) {
      if (entry.isIntersecting) {
        entry.target.classList.add("visible");
        revealObserver.unobserve(entry.target);
      }
    });
  },
  { threshold: 0.1, rootMargin: "0px 0px -40px 0px" }
);

document.querySelectorAll(".reveal").forEach(function (el) {
  revealObserver.observe(el);
});

/* ─── Nav Scroll ────────────────────────────────────────────── */
var nav = document.getElementById("lp-nav");

function updateNav() {
  if (nav) nav.classList.toggle("lp-nav-scrolled", window.scrollY > 30);
}

window.addEventListener("scroll", updateNav, { passive: true });
updateNav();

/* ─── Mobile Nav Toggle ─────────────────────────────────────── */
var mobileToggle = document.getElementById("lp-mobile-toggle");
var mobileMenu = document.getElementById("lp-mobile-menu");

if (mobileToggle && mobileMenu) {
  mobileToggle.addEventListener("click", function () {
    var isOpen = mobileMenu.classList.toggle("lp-mobile-open");
    mobileToggle.textContent = isOpen ? "\u2715" : "\u2630";
    mobileToggle.setAttribute("aria-expanded", String(isOpen));
  });

  mobileMenu.querySelectorAll("a").forEach(function (link) {
    link.addEventListener("click", function () {
      mobileMenu.classList.remove("lp-mobile-open");
      mobileToggle.textContent = "\u2630";
      mobileToggle.setAttribute("aria-expanded", "false");
    });
  });
}

/* ─── Smooth Scroll ─────────────────────────────────────────── */
document.querySelectorAll('a[href^="#"]').forEach(function (anchor) {
  anchor.addEventListener("click", function (e) {
    var href = anchor.getAttribute("href");
    var target = document.querySelector(href);
    if (target) {
      e.preventDefault();
      var navHeight = 72;
      var top = target.getBoundingClientRect().top + window.scrollY - navHeight;
      window.scrollTo({ top: top, behavior: "smooth" });

      if (mobileMenu) mobileMenu.classList.remove("lp-mobile-open");
      if (mobileToggle) {
        mobileToggle.textContent = "\u2630";
        mobileToggle.setAttribute("aria-expanded", "false");
      }
    }
  });
});

/* ═════════════════════════════════════════════════════════════
   INTERACTIVE HERO WIDGET
   ═════════════════════════════════════════════════════════════ */
var DEMO_TEXT =
  "\u2022 need to write something about AI tools\n" +
  "\u2022 everyone using chatgpt wrong\n" +
  "\u2022 pasting docs hoping for magic\n" +
  "\u2022 better way = feed it your thinking first\n" +
  "\u2022 something about second brain concept???\n" +
  "\u2022 also the prompt matters a LOT\n" +
  "\u2022 real example from my workflow";

var DRAFT_HTML =
  "<strong>Why Most People Are Using AI Wrong</strong><br /><br />" +
  "There\u2019s a pattern I keep seeing. Someone opens ChatGPT, types " +
  "\u201Cwrite me a blog post about AI tools,\u201D and wonders why the output " +
  "feels generic and forgettable.<br /><br />" +
  "Here\u2019s what they\u2019re missing: the quality of your <em>input</em> " +
  "determines the quality of the output. Feed it your actual thinking " +
  "first. That\u2019s it.";

function sleep(ms) {
  return new Promise(function (resolve) { setTimeout(resolve, ms); });
}

var heroAnimationActive = true;
var userHasInteracted = false;

(function initHeroWidget() {
  var textarea = document.getElementById("hero-textarea");
  var generateBtn = document.getElementById("hero-generate-btn");
  var draftResult = document.getElementById("hero-draft-result");
  var draftTextEl = document.getElementById("hero-draft-text");
  var draftWaiting = document.getElementById("hero-draft-waiting");

  if (!textarea || !generateBtn || !draftResult || !draftTextEl) return;

  // Stop auto-animation when user interacts with textarea
  textarea.addEventListener("focus", function () {
    userHasInteracted = true;
    heroAnimationActive = false;
  });

  textarea.addEventListener("input", function () {
    userHasInteracted = true;
    heroAnimationActive = false;
  });

  // Generate button click
  generateBtn.addEventListener("click", function () {
    var text = textarea.value.trim();
    if (!text) return;

    generateBtn.textContent = "Generating\u2026";
    generateBtn.classList.add("lp-btn-active");
    generateBtn.disabled = true;

    setTimeout(function () {
      generateBtn.textContent = "\u2726 Draft ready";
      generateBtn.classList.add("lp-btn-shimmer");
      generateBtn.classList.remove("lp-btn-active");
      draftTextEl.innerHTML = DRAFT_HTML;
      if (draftWaiting) draftWaiting.style.display = "none";
      draftResult.classList.add("lp-draft-visible");
      generateBtn.disabled = false;
    }, 1500);
  });

  // Auto-typing animation
  async function autoType() {
    await sleep(1200);
    if (userHasInteracted) return;

    for (var i = 0; i < DEMO_TEXT.length; i++) {
      if (userHasInteracted || !heroAnimationActive) return;
      textarea.value += DEMO_TEXT[i];
      await sleep(DEMO_TEXT[i] === "\n" ? 80 : 22);
    }

    await sleep(900);
    if (userHasInteracted || !heroAnimationActive) return;

    generateBtn.textContent = "Generating\u2026";
    generateBtn.classList.add("lp-btn-active");

    await sleep(1500);
    if (userHasInteracted) return;

    generateBtn.textContent = "\u2726 Draft ready";
    generateBtn.classList.add("lp-btn-shimmer");
    generateBtn.classList.remove("lp-btn-active");
    draftTextEl.innerHTML = DRAFT_HTML;
    if (draftWaiting) draftWaiting.style.display = "none";
    draftResult.classList.add("lp-draft-visible");
  }

  autoType();
})();

// Pause animation when tab is hidden
document.addEventListener("visibilitychange", function () {
  if (document.hidden) {
    heroAnimationActive = false;
  }
});

/* ═════════════════════════════════════════════════════════════
   SIDEBAR VIEW SWITCHING
   ═════════════════════════════════════════════════════════════ */
(function initSidebarViews() {
  var sidebarItems = document.querySelectorAll(".lp-mockup-sidebar-item[data-view]");
  var views = document.querySelectorAll(".lp-mockup-view");

  if (!sidebarItems.length || !views.length) return;

  sidebarItems.forEach(function (item) {
    item.addEventListener("click", function () {
      var viewId = "view-" + item.getAttribute("data-view");

      // Update active sidebar item
      document.querySelectorAll(".lp-mockup-sidebar-item").forEach(function (el) {
        el.classList.remove("lp-mockup-sidebar-active");
      });
      item.classList.add("lp-mockup-sidebar-active");

      // Switch views
      views.forEach(function (view) {
        if (view.id === viewId) {
          view.style.display = "";
          view.classList.add("lp-mockup-view-active");
        } else {
          view.style.display = "none";
          view.classList.remove("lp-mockup-view-active");
        }
      });
    });
  });
})();

/* ═════════════════════════════════════════════════════════════
   INTERACTIVE WINDOW DOTS
   ═════════════════════════════════════════════════════════════ */
(function initWindowDots() {
  var mockupWindow = document.querySelector(".lp-mockup-window");
  if (!mockupWindow) return;

  var dots = mockupWindow.querySelectorAll(".lp-dot");
  var redDot = dots[0];
  var yellowDot = dots[1];
  var greenDot = dots[2];

  if (!redDot || !yellowDot || !greenDot) return;

  var isMinimized = false;
  var isFullscreen = false;

  // Red dot — minimize/restore toggle
  redDot.addEventListener("click", function () {
    if (isMinimized) {
      mockupWindow.classList.remove("lp-mockup-minimized");
      isMinimized = false;
    } else {
      mockupWindow.classList.add("lp-mockup-minimized");
      isMinimized = true;
      if (isFullscreen) {
        mockupWindow.style.maxWidth = "";
        mockupWindow.style.borderRadius = "";
        isFullscreen = false;
      }
    }
  });

  // Yellow dot — bounce animation (fun easter egg)
  yellowDot.addEventListener("click", function () {
    mockupWindow.style.transition = "transform 0.15s ease";
    mockupWindow.style.transform = "scale(0.98)";
    setTimeout(function () {
      mockupWindow.style.transform = "scale(1.01)";
      setTimeout(function () {
        mockupWindow.style.transform = "";
        mockupWindow.style.transition = "";
      }, 150);
    }, 150);
  });

  // Green dot — fullscreen toggle
  greenDot.addEventListener("click", function () {
    if (isMinimized) {
      mockupWindow.classList.remove("lp-mockup-minimized");
      isMinimized = false;
    }

    if (isFullscreen) {
      mockupWindow.style.maxWidth = "";
      mockupWindow.style.borderRadius = "";
      isFullscreen = false;
    } else {
      mockupWindow.style.maxWidth = "100%";
      mockupWindow.style.borderRadius = "0";
      isFullscreen = true;
    }
  });
})();

/* ═════════════════════════════════════════════════════════════
   BEFORE / AFTER TOGGLE
   ═════════════════════════════════════════════════════════════ */
(function initBeforeAfter() {
  var beforeBtn = document.getElementById("ba-before-btn");
  var afterBtn = document.getElementById("ba-after-btn");
  var beforePanel = document.getElementById("ba-before-panel");
  var afterPanel = document.getElementById("ba-after-panel");

  if (!beforeBtn || !afterBtn || !beforePanel || !afterPanel) return;

  beforeBtn.addEventListener("click", function () {
    beforePanel.style.display = "";
    afterPanel.style.display = "none";
    beforeBtn.classList.add("lp-ba-active");
    afterBtn.classList.remove("lp-ba-active");
  });

  afterBtn.addEventListener("click", function () {
    afterPanel.style.display = "";
    beforePanel.style.display = "none";
    afterBtn.classList.add("lp-ba-active");
    beforeBtn.classList.remove("lp-ba-active");
  });
})();

/* ─── Nav Active State on Scroll ────────────────────────────── */
var navLinks = document.querySelectorAll(".lp-nav-link[href^='#']");
var sections = document.querySelectorAll("section[id]");

var sectionObserver = new IntersectionObserver(
  function (entries) {
    entries.forEach(function (entry) {
      if (entry.isIntersecting) {
        var id = entry.target.id;
        navLinks.forEach(function (link) {
          link.classList.toggle(
            "lp-nav-active",
            link.getAttribute("href") === "#" + id
          );
        });
      }
    });
  },
  { rootMargin: "-20% 0px -70% 0px" }
);

sections.forEach(function (section) {
  sectionObserver.observe(section);
});
