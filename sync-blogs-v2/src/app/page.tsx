"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import Link from "next/link";
import "./landing.css";

const DEMO_TEXT =
  "\u2022 need to write something about AI tools\n" +
  "\u2022 everyone using chatgpt wrong\n" +
  "\u2022 pasting docs hoping for magic\n" +
  "\u2022 better way = feed it your thinking first\n" +
  "\u2022 something about second brain concept???\n" +
  "\u2022 also the prompt matters a LOT\n" +
  "\u2022 real example from my workflow";

const DRAFT_HTML =
  "<strong>Why Most People Are Using AI Wrong</strong><br /><br />" +
  "There\u2019s a pattern I keep seeing. Someone opens ChatGPT, types " +
  "\u201Cwrite me a blog post about AI tools,\u201D and wonders why the output " +
  "feels generic and forgettable.<br /><br />" +
  "Here\u2019s what they\u2019re missing: the quality of your <em>input</em> " +
  "determines the quality of the output. Feed it your actual thinking " +
  "first. That\u2019s it.";

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export default function LandingPage() {
  // ─── Refs ──────────────────────────────────────────────────────
  const navRef = useRef<HTMLElement>(null);
  const mobileMenuRef = useRef<HTMLDivElement>(null);
  const mobileToggleRef = useRef<HTMLButtonElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const generateBtnRef = useRef<HTMLButtonElement>(null);
  const draftResultRef = useRef<HTMLDivElement>(null);
  const draftTextRef = useRef<HTMLDivElement>(null);
  const draftWaitingRef = useRef<HTMLDivElement>(null);
  const mockupWindowRef = useRef<HTMLDivElement>(null);

  // ─── State ─────────────────────────────────────────────────────
  const [mobileOpen, setMobileOpen] = useState(false);
  const [activeView, setActiveView] = useState("new-draft");
  const [baPanel, setBaPanel] = useState<"before" | "after">("before");

  // Hero animation tracking
  const heroAnimationActive = useRef(true);
  const userHasInteracted = useRef(false);

  // Window dot state
  const isMinimized = useRef(false);
  const isFullscreen = useRef(false);

  // ─── JS-ready class on html element ───────────────────────────
  useEffect(() => {
    document.documentElement.classList.add("js-ready");
    return () => {
      document.documentElement.classList.remove("js-ready");
    };
  }, []);

  // ─── Scroll Reveal (IntersectionObserver) ─────────────────────
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("visible");
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.1, rootMargin: "0px 0px -40px 0px" }
    );

    document.querySelectorAll(".reveal").forEach((el) => {
      observer.observe(el);
    });

    return () => observer.disconnect();
  }, []);

  // ─── Nav Scroll ───────────────────────────────────────────────
  useEffect(() => {
    const nav = navRef.current;
    function updateNav() {
      if (nav) nav.classList.toggle("lp-nav-scrolled", window.scrollY > 30);
    }
    window.addEventListener("scroll", updateNav, { passive: true });
    updateNav();
    return () => window.removeEventListener("scroll", updateNav);
  }, []);

  // ─── Smooth Scroll for anchor links ───────────────────────────
  const handleAnchorClick = useCallback(
    (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
      const target = document.querySelector(href);
      if (target) {
        e.preventDefault();
        const navHeight = 72;
        const top =
          target.getBoundingClientRect().top + window.scrollY - navHeight;
        window.scrollTo({ top, behavior: "smooth" });
        setMobileOpen(false);
      }
    },
    []
  );

  // ─── Section scroll observer for active nav state ─────────────
  useEffect(() => {
    const navLinks = document.querySelectorAll(".lp-nav-link[href^='#']");
    const sections = document.querySelectorAll("section[id]");

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const id = entry.target.id;
            navLinks.forEach((link) => {
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

    sections.forEach((section) => observer.observe(section));
    return () => observer.disconnect();
  }, []);

  // ─── Auto-typing animation ────────────────────────────────────
  useEffect(() => {
    let cancelled = false;

    async function autoType() {
      await sleep(1200);
      const textarea = textareaRef.current;
      const generateBtn = generateBtnRef.current;
      const draftResult = draftResultRef.current;
      const draftText = draftTextRef.current;
      const draftWaiting = draftWaitingRef.current;

      if (!textarea || !generateBtn || !draftResult || !draftText) return;
      if (userHasInteracted.current || cancelled) return;

      for (let i = 0; i < DEMO_TEXT.length; i++) {
        if (userHasInteracted.current || !heroAnimationActive.current || cancelled) return;
        textarea.value += DEMO_TEXT[i];
        await sleep(DEMO_TEXT[i] === "\n" ? 80 : 22);
      }

      await sleep(900);
      if (userHasInteracted.current || !heroAnimationActive.current || cancelled) return;

      generateBtn.textContent = "Generating\u2026";
      generateBtn.classList.add("lp-btn-active");

      await sleep(1500);
      if (userHasInteracted.current || cancelled) return;

      generateBtn.textContent = "\u2726 Draft ready";
      generateBtn.classList.add("lp-btn-shimmer");
      generateBtn.classList.remove("lp-btn-active");
      draftText.innerHTML = DRAFT_HTML;
      if (draftWaiting) draftWaiting.style.display = "none";
      draftResult.classList.add("lp-draft-visible");
    }

    autoType();

    const handleVisibility = () => {
      if (document.hidden) heroAnimationActive.current = false;
    };
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, []);

  // ─── Generate button click ────────────────────────────────────
  const handleGenerate = useCallback(() => {
    const textarea = textareaRef.current;
    const generateBtn = generateBtnRef.current;
    const draftResult = draftResultRef.current;
    const draftText = draftTextRef.current;
    const draftWaiting = draftWaitingRef.current;

    if (!textarea || !generateBtn || !draftResult || !draftText) return;
    const text = textarea.value.trim();
    if (!text) return;

    generateBtn.textContent = "Generating\u2026";
    generateBtn.classList.add("lp-btn-active");
    generateBtn.disabled = true;

    setTimeout(() => {
      generateBtn.textContent = "\u2726 Draft ready";
      generateBtn.classList.add("lp-btn-shimmer");
      generateBtn.classList.remove("lp-btn-active");
      draftText.innerHTML = DRAFT_HTML;
      if (draftWaiting) draftWaiting.style.display = "none";
      draftResult.classList.add("lp-draft-visible");
      generateBtn.disabled = false;
    }, 1500);
  }, []);

  // ─── Textarea interaction stops auto-type ─────────────────────
  const handleTextareaInteraction = useCallback(() => {
    userHasInteracted.current = true;
    heroAnimationActive.current = false;
  }, []);

  // ─── Sidebar view switching ───────────────────────────────────
  const handleSidebarClick = useCallback((view: string) => {
    setActiveView(view);
  }, []);

  // ─── Window dot interactions ──────────────────────────────────
  const handleRedDot = useCallback(() => {
    const w = mockupWindowRef.current;
    if (!w) return;
    if (isMinimized.current) {
      w.classList.remove("lp-mockup-minimized");
      isMinimized.current = false;
    } else {
      w.classList.add("lp-mockup-minimized");
      isMinimized.current = true;
      if (isFullscreen.current) {
        w.style.maxWidth = "";
        w.style.borderRadius = "";
        isFullscreen.current = false;
      }
    }
  }, []);

  const handleYellowDot = useCallback(() => {
    const w = mockupWindowRef.current;
    if (!w) return;
    w.style.transition = "transform 0.15s ease";
    w.style.transform = "scale(0.98)";
    setTimeout(() => {
      w.style.transform = "scale(1.01)";
      setTimeout(() => {
        w.style.transform = "";
        w.style.transition = "";
      }, 150);
    }, 150);
  }, []);

  const handleGreenDot = useCallback(() => {
    const w = mockupWindowRef.current;
    if (!w) return;
    if (isMinimized.current) {
      w.classList.remove("lp-mockup-minimized");
      isMinimized.current = false;
    }
    if (isFullscreen.current) {
      w.style.maxWidth = "";
      w.style.borderRadius = "";
      isFullscreen.current = false;
    } else {
      w.style.maxWidth = "100%";
      w.style.borderRadius = "0";
      isFullscreen.current = true;
    }
  }, []);

  // ─── Mobile menu toggle ───────────────────────────────────────
  const toggleMobile = useCallback(() => {
    setMobileOpen((prev) => !prev);
  }, []);

  return (
    <div className="lp-body">
      {/* ═══════════════════════ NAV ═══════════════════════ */}
      <nav className="lp-nav" id="lp-nav" ref={navRef}>
        <div className="lp-nav-inner">
          <Link href="/" className="lp-nav-logo">
            Sync
          </Link>
          <div className="lp-nav-links">
            <a
              href="#how-it-works"
              className="lp-nav-link"
              onClick={(e) => handleAnchorClick(e, "#how-it-works")}
            >
              How it works
            </a>
            <a
              href="#pricing"
              className="lp-nav-link"
              onClick={(e) => handleAnchorClick(e, "#pricing")}
            >
              Pricing
            </a>
            <Link href="/sign-in" className="lp-nav-link">
              Sign in
            </Link>
          </div>
          <Link href="/sign-up" className="lp-btn lp-btn-primary lp-nav-cta">
            Start writing free
          </Link>
          <button
            className="lp-nav-mobile-toggle"
            id="lp-mobile-toggle"
            ref={mobileToggleRef}
            aria-label="Toggle menu"
            aria-expanded={mobileOpen}
            onClick={toggleMobile}
          >
            {mobileOpen ? "\u2715" : "\u2630"}
          </button>
        </div>
        <div
          className={`lp-nav-mobile-menu${mobileOpen ? " lp-mobile-open" : ""}`}
          id="lp-mobile-menu"
          ref={mobileMenuRef}
        >
          <a
            href="#how-it-works"
            className="lp-nav-mobile-link"
            onClick={(e) => {
              handleAnchorClick(e, "#how-it-works");
            }}
          >
            How it works
          </a>
          <a
            href="#pricing"
            className="lp-nav-mobile-link"
            onClick={(e) => {
              handleAnchorClick(e, "#pricing");
            }}
          >
            Pricing
          </a>
          <Link
            href="/sign-in"
            className="lp-nav-mobile-link"
            onClick={() => setMobileOpen(false)}
          >
            Sign in
          </Link>
          <Link
            href="/sign-up"
            className="lp-btn lp-btn-primary"
            style={{ marginTop: 8 }}
            onClick={() => setMobileOpen(false)}
          >
            Start writing free &rarr;
          </Link>
        </div>
      </nav>

      {/* ═══════════════════════ HERO ═══════════════════════ */}
      <section className="lp-hero">
        <div className="lp-container lp-hero-container">
          <div className="lp-hero-content">
            <a
              href="#how-it-works"
              className="lp-hero-announce reveal"
              onClick={(e) => handleAnchorClick(e, "#how-it-works")}
            >
              <span className="lp-hero-announce-badge">New</span>
              Introducing writing profiles — your voice, every draft &rarr;
            </a>
            <h1 className="lp-hero-headline reveal reveal-delay-1">
              Dump everything here.
              <br />
              <em>Don&apos;t edit yourself.</em>
            </h1>
            <p className="lp-hero-sub reveal reveal-delay-2">
              Paste your messy thoughts. Sync turns them into articles that
              actually sound like you.
            </p>
            <div className="lp-hero-ctas reveal reveal-delay-3">
              <Link href="/sign-up" className="lp-btn lp-btn-primary lp-btn-lg">
                Start writing free &rarr;
              </Link>
              <a
                href="#how-it-works"
                className="lp-btn lp-btn-ghost lp-btn-lg"
                onClick={(e) => handleAnchorClick(e, "#how-it-works")}
              >
                See how it works
              </a>
            </div>
          </div>

          <div className="lp-hero-mockup reveal reveal-delay-3">
            <div className="lp-mockup-window" ref={mockupWindowRef}>
              <div className="lp-mockup-titlebar">
                <div className="lp-mockup-dots">
                  <span
                    className="lp-dot lp-dot-red"
                    data-tooltip="Minimize"
                    onClick={handleRedDot}
                  />
                  <span
                    className="lp-dot lp-dot-yellow"
                    data-tooltip="Bounce"
                    onClick={handleYellowDot}
                  />
                  <span
                    className="lp-dot lp-dot-green"
                    data-tooltip="Fullscreen"
                    onClick={handleGreenDot}
                  />
                </div>
                <span className="lp-mockup-url">syncblogs.app</span>
              </div>
              <div className="lp-mockup-app" id="mockup-app">
                {/* Sidebar */}
                <aside className="lp-mockup-sidebar">
                  <div className="lp-mockup-sidebar-logo">Sync</div>
                  <nav className="lp-mockup-sidebar-nav">
                    <a
                      className={`lp-mockup-sidebar-item${activeView === "new-draft" ? " lp-mockup-sidebar-active" : ""}`}
                      data-view="new-draft"
                      onClick={() => handleSidebarClick("new-draft")}
                    >
                      <span className="lp-mockup-sidebar-icon">&#10022;</span>{" "}
                      New draft
                    </a>
                    <a
                      className={`lp-mockup-sidebar-item${activeView === "my-drafts" ? " lp-mockup-sidebar-active" : ""}`}
                      data-view="my-drafts"
                      onClick={() => handleSidebarClick("my-drafts")}
                    >
                      <span className="lp-mockup-sidebar-icon">&#128196;</span>{" "}
                      My drafts
                    </a>
                    <a
                      className={`lp-mockup-sidebar-item${activeView === "profile" ? " lp-mockup-sidebar-active" : ""}`}
                      data-view="profile"
                      onClick={() => handleSidebarClick("profile")}
                    >
                      <span className="lp-mockup-sidebar-icon">&#128100;</span>{" "}
                      Writing profile
                    </a>
                    <a
                      className={`lp-mockup-sidebar-item${activeView === "freshness" ? " lp-mockup-sidebar-active" : ""}`}
                      data-view="freshness"
                      onClick={() => handleSidebarClick("freshness")}
                    >
                      <span className="lp-mockup-sidebar-icon">&#128225;</span>{" "}
                      Freshness
                    </a>
                  </nav>
                  <div className="lp-mockup-sidebar-divider" />
                  <div className="lp-mockup-sidebar-section-label">Recent</div>
                  <nav className="lp-mockup-sidebar-nav">
                    <a
                      className="lp-mockup-sidebar-item lp-mockup-sidebar-dim"
                      onClick={() => handleSidebarClick("new-draft")}
                    >
                      Using AI the Right Way
                    </a>
                    <a
                      className="lp-mockup-sidebar-item lp-mockup-sidebar-dim"
                      onClick={() => handleSidebarClick("new-draft")}
                    >
                      The New API Deep Dive
                    </a>
                    <a
                      className="lp-mockup-sidebar-item lp-mockup-sidebar-dim"
                      onClick={() => handleSidebarClick("new-draft")}
                    >
                      Stop Switching Apps
                    </a>
                  </nav>
                </aside>

                {/* View: New Draft (default) */}
                <div
                  className={`lp-mockup-view${activeView === "new-draft" ? " lp-mockup-view-active" : ""}`}
                  id="view-new-draft"
                  style={activeView !== "new-draft" ? { display: "none" } : undefined}
                >
                  <div className="lp-mockup-main">
                    <div className="lp-mockup-main-header">
                      <div className="lp-mockup-side-label">
                        Your rough thoughts
                      </div>
                      <div className="lp-mockup-main-status">
                        <span className="lp-mockup-status-dot" /> Auto-saved
                      </div>
                    </div>
                    <textarea
                      className="lp-mockup-editable"
                      id="hero-textarea"
                      ref={textareaRef}
                      placeholder="Start typing your rough thoughts here... bullet points, fragments, anything."
                      onFocus={handleTextareaInteraction}
                      onInput={handleTextareaInteraction}
                    />
                    <button
                      className="lp-mockup-generate-btn"
                      id="hero-generate-btn"
                      ref={generateBtnRef}
                      onClick={handleGenerate}
                    >
                      Turn this into a draft &rarr;
                    </button>
                  </div>
                  <div className="lp-mockup-output">
                    <div className="lp-mockup-output-header">
                      <div className="lp-mockup-side-label lp-mockup-side-label-accent">
                        &#10022; Generated draft
                      </div>
                    </div>
                    <div className="lp-mockup-output-body">
                      <div
                        className="lp-mockup-output-waiting"
                        id="hero-draft-waiting"
                        ref={draftWaitingRef}
                      >
                        <div className="lp-mockup-waiting-icon">&#10022;</div>
                        <div className="lp-mockup-waiting-text">
                          Paste your rough thoughts on the left, then hit
                          generate.
                        </div>
                      </div>
                      <div
                        className="lp-mockup-draft-result"
                        id="hero-draft-result"
                        ref={draftResultRef}
                      >
                        <div
                          className="lp-mockup-draft-text"
                          id="hero-draft-text"
                          ref={draftTextRef}
                        />
                      </div>
                    </div>
                    <div className="lp-mockup-output-footer">
                      <span className="lp-mockup-output-badge">
                        In your voice
                      </span>
                      <span className="lp-mockup-output-badge">Structured</span>
                      <span className="lp-mockup-output-badge">
                        Ready to publish
                      </span>
                    </div>
                  </div>
                </div>

                {/* View: My Drafts */}
                <div
                  className={`lp-mockup-view${activeView === "my-drafts" ? " lp-mockup-view-active" : ""}`}
                  id="view-my-drafts"
                  style={activeView !== "my-drafts" ? { display: "none" } : undefined}
                >
                  <div className="lp-mockup-fullpanel">
                    <div
                      className="lp-mockup-side-label"
                      style={{ marginBottom: 16 }}
                    >
                      My drafts
                    </div>
                    <div className="lp-mockup-draft-list">
                      <div className="lp-mockup-draft-row">
                        <div className="lp-mockup-draft-row-title">
                          Why Most People Are Using AI Wrong
                        </div>
                        <div className="lp-mockup-draft-row-meta">
                          <span className="lp-mockup-draft-row-status lp-status-published">
                            Published
                          </span>
                          <span className="lp-mockup-draft-row-date">
                            2 days ago
                          </span>
                        </div>
                      </div>
                      <div className="lp-mockup-draft-row">
                        <div className="lp-mockup-draft-row-title">
                          The New API Changes Everything for Developers
                        </div>
                        <div className="lp-mockup-draft-row-meta">
                          <span className="lp-mockup-draft-row-status lp-status-draft">
                            Draft
                          </span>
                          <span className="lp-mockup-draft-row-date">
                            5 days ago
                          </span>
                        </div>
                      </div>
                      <div className="lp-mockup-draft-row">
                        <div className="lp-mockup-draft-row-title">
                          Stop Shopping for Productivity Systems
                        </div>
                        <div className="lp-mockup-draft-row-meta">
                          <span className="lp-mockup-draft-row-status lp-status-review">
                            In review
                          </span>
                          <span className="lp-mockup-draft-row-date">
                            1 week ago
                          </span>
                        </div>
                      </div>
                      <div className="lp-mockup-draft-row">
                        <div className="lp-mockup-draft-row-title">
                          How I Rebuilt My Writing Habit in 30 Days
                        </div>
                        <div className="lp-mockup-draft-row-meta">
                          <span className="lp-mockup-draft-row-status lp-status-published">
                            Published
                          </span>
                          <span className="lp-mockup-draft-row-date">
                            2 weeks ago
                          </span>
                        </div>
                      </div>
                      <div className="lp-mockup-draft-row">
                        <div className="lp-mockup-draft-row-title">
                          Developer Experience Is the New Moat
                        </div>
                        <div className="lp-mockup-draft-row-meta">
                          <span className="lp-mockup-draft-row-status lp-status-draft">
                            Draft
                          </span>
                          <span className="lp-mockup-draft-row-date">
                            3 weeks ago
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* View: Writing Profile */}
                <div
                  className={`lp-mockup-view${activeView === "profile" ? " lp-mockup-view-active" : ""}`}
                  id="view-profile"
                  style={activeView !== "profile" ? { display: "none" } : undefined}
                >
                  <div className="lp-mockup-fullpanel">
                    <div
                      className="lp-mockup-side-label"
                      style={{ marginBottom: 16 }}
                    >
                      Writing profile
                    </div>
                    <div className="lp-mockup-profile-mini">
                      <div className="lp-mockup-profile-row">
                        <span className="lp-mockup-profile-label">Tone</span>
                        <span className="lp-mockup-profile-value lp-mockup-profile-selected">
                          Direct &amp; confident
                        </span>
                      </div>
                      <div className="lp-mockup-profile-row">
                        <span className="lp-mockup-profile-label">
                          Hook style
                        </span>
                        <span className="lp-mockup-profile-value lp-mockup-profile-selected">
                          Bold statement
                        </span>
                      </div>
                      <div className="lp-mockup-profile-row">
                        <span className="lp-mockup-profile-label">
                          Sentence length
                        </span>
                        <span className="lp-mockup-profile-value lp-mockup-profile-selected">
                          Short &amp; punchy
                        </span>
                      </div>
                      <div className="lp-mockup-profile-row">
                        <span className="lp-mockup-profile-label">
                          Formatting
                        </span>
                        <span className="lp-mockup-profile-value lp-mockup-profile-selected">
                          Headers + short paragraphs
                        </span>
                      </div>
                      <div className="lp-mockup-profile-row">
                        <span className="lp-mockup-profile-label">
                          Voice match
                        </span>
                        <span
                          className="lp-mockup-profile-value"
                          style={{
                            color: "var(--lp-accent)",
                            fontWeight: 600,
                          }}
                        >
                          94% accuracy
                        </span>
                      </div>
                    </div>
                    <div className="lp-mockup-profile-footer-note">
                      Profile saved &middot; Applied to all drafts
                    </div>
                  </div>
                </div>

                {/* View: Freshness */}
                <div
                  className={`lp-mockup-view${activeView === "freshness" ? " lp-mockup-view-active" : ""}`}
                  id="view-freshness"
                  style={activeView !== "freshness" ? { display: "none" } : undefined}
                >
                  <div className="lp-mockup-fullpanel">
                    <div
                      className="lp-mockup-side-label"
                      style={{ marginBottom: 16 }}
                    >
                      Freshness monitor
                    </div>
                    <div className="lp-mockup-freshness-list">
                      <div className="lp-mockup-freshness-row">
                        <span className="lp-mockup-freshness-dot lp-fresh-green" />
                        <span className="lp-mockup-freshness-title">
                          Why Most People Are Using AI Wrong
                        </span>
                        <span className="lp-mockup-freshness-status">
                          Fresh
                        </span>
                      </div>
                      <div className="lp-mockup-freshness-row">
                        <span className="lp-mockup-freshness-dot lp-fresh-yellow" />
                        <span className="lp-mockup-freshness-title">
                          The New API Changes Everything
                        </span>
                        <span className="lp-mockup-freshness-status">
                          Needs update
                        </span>
                      </div>
                      <div className="lp-mockup-freshness-row">
                        <span className="lp-mockup-freshness-dot lp-fresh-red" />
                        <span className="lp-mockup-freshness-title">
                          Our Q4 Product Roadmap
                        </span>
                        <span className="lp-mockup-freshness-status">
                          Stale
                        </span>
                      </div>
                      <div className="lp-mockup-freshness-row">
                        <span className="lp-mockup-freshness-dot lp-fresh-green" />
                        <span className="lp-mockup-freshness-title">
                          Developer Experience Is the New Moat
                        </span>
                        <span className="lp-mockup-freshness-status">
                          Fresh
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════════════ SOCIAL PROOF ═══════════════════════ */}
      <div className="lp-social-proof">
        <div className="lp-container">
          <div className="lp-social-proof-inner">
            <span className="lp-social-label">Trusted by writers at</span>
            <div className="lp-social-logos">
              <span className="lp-social-icon-wrap" data-label="The Verge">
                <svg
                  className="lp-social-icon"
                  viewBox="0 0 40 22"
                  fill="currentColor"
                  aria-label="The Verge"
                >
                  <polygon points="0,0 8,0 20,16 32,0 40,0 20,22" />
                </svg>
              </span>
              <span className="lp-social-icon-wrap" data-label="Substack">
                <svg
                  className="lp-social-icon"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  aria-label="Substack"
                >
                  <path d="M22.539 8.242H1.46V5.406h21.08v2.836zM1.46 10.812V24L12 17.11 22.54 24V10.812H1.46zM22.54 0H1.46v2.836h21.08V0z" />
                </svg>
              </span>
              <span className="lp-social-icon-wrap" data-label="Product Hunt">
                <svg
                  className="lp-social-icon"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  aria-label="Product Hunt"
                >
                  <path d="M13.604 8.4H9.6V12h3.954a1.8 1.8 0 000-3.6zM12 0C5.373 0 0 5.372 0 12c0 6.627 5.373 12 12 12 6.628 0 12-5.373 12-12 0-6.628-5.372-12-12-12zm1.604 15.6H9.6V18H7.2V6h6.404a4.2 4.2 0 010 8.4z" />
                </svg>
              </span>
              <span className="lp-social-icon-wrap" data-label="Medium">
                <svg
                  className="lp-social-icon"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  aria-label="Medium"
                >
                  <path d="M13.54 12a6.8 6.8 0 01-6.77 6.82A6.8 6.8 0 010 12a6.8 6.8 0 016.77-6.82A6.8 6.8 0 0113.54 12zm7.42 0c0 3.54-1.51 6.42-3.38 6.42-1.87 0-3.39-2.88-3.39-6.42s1.52-6.42 3.39-6.42 3.38 2.88 3.38 6.42M24 12c0 3.17-.53 5.75-1.19 5.75-.66 0-1.19-2.58-1.19-5.75s.53-5.75 1.19-5.75C23.47 6.25 24 8.83 24 12z" />
                </svg>
              </span>
              <span className="lp-social-icon-wrap" data-label="Dev.to">
                <svg
                  className="lp-social-icon"
                  viewBox="0 0 52 28"
                  aria-label="Dev.to"
                >
                  <rect
                    width="52"
                    height="28"
                    rx="5"
                    fill="currentColor"
                  />
                  <text
                    x="26"
                    y="19"
                    textAnchor="middle"
                    fill="#f4f2ed"
                    fontFamily="system-ui,sans-serif"
                    fontSize="13"
                    fontWeight="800"
                    letterSpacing="0.5"
                  >
                    DEV
                  </text>
                </svg>
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ═══════════════════════ HOW IT WORKS ═══════════════════════ */}
      <section id="how-it-works" className="lp-how">
        <div className="lp-container">
          <p className="lp-section-eyebrow lp-centered reveal">
            How it works
          </p>
          <h2 className="lp-section-headline lp-centered reveal reveal-delay-1">
            Three steps. One draft.
          </h2>

          {/* Step 01 — Dump */}
          <div className="lp-step">
            <div className="lp-step-meta">
              <span className="lp-step-number reveal">01</span>
              <div className="lp-step-text reveal reveal-delay-1">
                <h3 className="lp-step-headline">
                  Brain dump. No judgment.
                </h3>
                <p className="lp-step-body">
                  Paste bullets, fragments, voice note transcripts, rough ideas
                  — anything. No pressure to be coherent. That&apos;s our job.
                </p>
              </div>
            </div>
            <div className="lp-step-visual reveal reveal-delay-3">
              <div className="lp-step-mockup">
                <div className="lp-sm-label">Start from thoughts</div>
                <div className="lp-sm-textarea">
                  <div className="lp-sm-text">
                    &bull; need to write about our Q1 product launch
                    <br />
                    &bull; users keep asking about the new api
                    <br />
                    &bull; maybe compare to old way?? idk
                    <br />
                    &bull; something about developer experience
                    <br />
                    &bull; IMPORTANT: mention the migration guide
                    <br />
                    &bull; also the slack integration is huge
                    <br />
                    &bull; talk to the founders angle
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Step 02 — Clarify */}
          <div className="lp-step lp-step-alt">
            <div className="lp-step-meta">
              <span className="lp-step-number reveal">02</span>
              <div className="lp-step-text reveal reveal-delay-1">
                <h3 className="lp-step-headline">
                  Two questions. Then we draft.
                </h3>
                <p className="lp-step-body">
                  Before writing, Sync asks targeted follow-up questions —
                  who&apos;s this for, what angle, how long? Less guessing,
                  better output.
                </p>
              </div>
            </div>
            <div className="lp-step-visual reveal reveal-delay-3">
              <div className="lp-step-mockup">
                <div className="lp-sm-question-card">
                  <div className="lp-sm-question-header">
                    &#10022; Two quick questions
                  </div>
                  <div className="lp-sm-question">
                    <label className="lp-sm-q-label">
                      Who&apos;s the primary reader?
                    </label>
                    <div className="lp-sm-q-options">
                      <span className="lp-sm-q-option lp-sm-q-selected">
                        Developers
                      </span>
                      <span className="lp-sm-q-option">General audience</span>
                      <span className="lp-sm-q-option">Executives</span>
                    </div>
                  </div>
                  <div className="lp-sm-question">
                    <label className="lp-sm-q-label">
                      What&apos;s the core angle?
                    </label>
                    <div className="lp-sm-q-options">
                      <span className="lp-sm-q-option">Announcement</span>
                      <span className="lp-sm-q-option lp-sm-q-selected">
                        How-to guide
                      </span>
                      <span className="lp-sm-q-option">Opinion piece</span>
                    </div>
                  </div>
                  <button
                    className="lp-sm-q-btn"
                    style={{ cursor: "default" }}
                  >
                    Generate draft &rarr;
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Step 03 — Publish */}
          <div className="lp-step">
            <div className="lp-step-meta">
              <span className="lp-step-number reveal">03</span>
              <div className="lp-step-text reveal reveal-delay-1">
                <h3 className="lp-step-headline">
                  An article that sounds like you.
                </h3>
                <p className="lp-step-body">
                  Sync generates a structured, formatted draft that matches your
                  voice, your tone, and your publishing destination.
                </p>
              </div>
            </div>
            <div className="lp-step-visual reveal reveal-delay-3">
              <div className="lp-step-mockup">
                <div className="lp-sm-draft-title">
                  How the New API Changes Everything for Developers
                </div>
                <div className="lp-sm-draft-body">
                  We&apos;ve been quietly building toward this moment. The new
                  API isn&apos;t just a version bump — it&apos;s a fundamentally
                  different way to integrate with our platform. Here&apos;s what
                  that means for your workflow.
                  <br />
                  <br />
                  <strong>The old way was painful.</strong> You&apos;d spend more
                  time managing state than shipping features. The new API inverts
                  that&hellip;
                </div>
                <div className="lp-sm-draft-actions">
                  <span className="lp-sm-badge">&#10003; Structured</span>
                  <span className="lp-sm-badge">&#10003; In your voice</span>
                  <span className="lp-sm-badge">
                    &#10003; Ready to publish
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════════════ PERSONALIZATION (dark) ═══════════════════════ */}
      <section className="lp-personalization">
        <div className="lp-container">
          <div className="lp-personalization-inner">
            <div className="lp-personalization-text reveal">
              <h2 className="lp-personalization-headline">
                It learns how you write.
              </h2>
              <p className="lp-personalization-body">
                Answer a few questions during onboarding. Sync builds your
                writing profile — tone, sentence style, hook preference,
                formatting habits — and applies it to every draft it generates.
              </p>
              <div style={{ height: 32 }} />
              <Link
                href="/sign-up"
                className="lp-btn lp-btn-outline-light lp-btn-lg"
              >
                Set up your writing profile &rarr;
              </Link>
            </div>
            <div className="lp-personalization-visual reveal reveal-delay-2">
              <div className="lp-profile-card">
                <div className="lp-profile-header">
                  <span className="lp-profile-badge">
                    Your writing profile
                  </span>
                </div>
                <div className="lp-profile-question">
                  <div className="lp-profile-q">
                    How would you describe your writing tone?
                  </div>
                  <div className="lp-profile-options">
                    <div className="lp-profile-option lp-profile-selected">
                      Direct &amp; confident
                    </div>
                    <div className="lp-profile-option">
                      Warm &amp; conversational
                    </div>
                    <div className="lp-profile-option">
                      Academic &amp; precise
                    </div>
                  </div>
                </div>
                <div className="lp-profile-question">
                  <div className="lp-profile-q">
                    How do you open an article?
                  </div>
                  <div className="lp-profile-options">
                    <div className="lp-profile-option lp-profile-selected">
                      Bold statement
                    </div>
                    <div className="lp-profile-option">Story or anecdote</div>
                    <div className="lp-profile-option">Data or stat</div>
                  </div>
                </div>
                <div className="lp-profile-question">
                  <div className="lp-profile-q">
                    Preferred sentence length?
                  </div>
                  <div className="lp-profile-options">
                    <div className="lp-profile-option lp-profile-selected">
                      Short &amp; punchy
                    </div>
                    <div className="lp-profile-option">Balanced variety</div>
                    <div className="lp-profile-option">
                      Longer, thoughtful
                    </div>
                  </div>
                </div>
                <div className="lp-profile-footer">
                  Profile saved &middot; Applied to all drafts
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════════════ BEFORE / AFTER ═══════════════════════ */}
      <section className="lp-before-after">
        <div className="lp-container">
          <p className="lp-section-eyebrow lp-centered reveal">
            See the difference
          </p>
          <h2 className="lp-section-headline lp-centered reveal reveal-delay-1">
            From brain dump to byline.
          </h2>
          <p className="lp-section-sub lp-centered reveal reveal-delay-2">
            Same ideas. Completely different result.
          </p>
          <div className="lp-ba-toggle reveal reveal-delay-3">
            <button
              className={`lp-ba-btn${baPanel === "before" ? " lp-ba-active" : ""}`}
              id="ba-before-btn"
              onClick={() => setBaPanel("before")}
            >
              Before
            </button>
            <button
              className={`lp-ba-btn${baPanel === "after" ? " lp-ba-active" : ""}`}
              id="ba-after-btn"
              onClick={() => setBaPanel("after")}
            >
              After
            </button>
          </div>
          <div className="lp-ba-panels reveal reveal-delay-4">
            <div
              className="lp-ba-panel"
              id="ba-before-panel"
              style={baPanel !== "before" ? { display: "none" } : undefined}
            >
              <div className="lp-ba-panel-label">
                <span className="lp-ba-pill">Raw dump</span>
              </div>
              <div className="lp-ba-content lp-ba-before-content">
                &bull; productivity system needs article
                <br />
                &bull; tried like 4 different apps lol
                <br />
                &bull; notion is overrated imo
                <br />
                &bull; but also i use it every day?? contradiction
                <br />
                &bull; the real system is the habits not the app
                <br />
                &bull; something about analog vs digital
                <br />
                &bull; my friend jake does paper index cards - works for him
                <br />
                &bull; point: tool doesnt matter, execution does
                <br />
                &bull; also attention spans, distractions, notifs
                <br />
                &bull; maybe mention deep work?? and cal newport
                <br />
                &bull; end with: find what works, stop switching apps
                <br />
                &bull; needs to be opinionated not listicle
              </div>
            </div>
            <div
              className="lp-ba-panel"
              id="ba-after-panel"
              style={baPanel !== "after" ? { display: "none" } : undefined}
            >
              <div className="lp-ba-panel-label">
                <span className="lp-ba-pill lp-ba-pill-after">
                  &#10022; Synced draft
                </span>
              </div>
              <div className="lp-ba-content lp-ba-after-content">
                <strong>
                  Stop Shopping for Productivity Systems. Start Using One.
                </strong>
                <br />
                <br />
                I&apos;ve tried them all — Notion, Roam, Obsidian, Logseq,
                plain text files. I&apos;ve built elaborate second brains and
                abandoned them within a week. And somewhere between my third
                &ldquo;fresh start&rdquo; and my fourth app migration, I
                realized the obvious thing nobody wants to hear:
                <br />
                <br />
                <em>The app doesn&apos;t matter. The habit does.</em>
                <br />
                <br />A friend of mine uses index cards. Paper ones, from the
                dollar store. His output is three times mine on a bad week. He
                doesn&apos;t think about his system — he just uses it.
                That&apos;s the entire lesson, and no productivity app can teach
                it for you.
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════════════ TESTIMONIALS ═══════════════════════ */}
      <section className="lp-testimonials">
        <div className="lp-container">
          <div className="lp-testimonials-grid">
            <div className="lp-quote-card reveal">
              <div className="lp-quote-mark">&ldquo;</div>
              <blockquote className="lp-quote-text">
                I went from staring at a blank page to publishing in 20 minutes.
                The draft actually sounded like me — not like a robot wrote it.
              </blockquote>
              <div className="lp-quote-author">
                <div className="lp-quote-name">Jamie Nwosu</div>
                <div className="lp-quote-role">
                  Staff Engineer &middot; &ldquo;From the Stack&rdquo;
                  newsletter
                </div>
              </div>
            </div>
            <div className="lp-quote-card reveal reveal-delay-1">
              <div className="lp-quote-mark">&ldquo;</div>
              <blockquote className="lp-quote-text">
                I used to have 47 unfinished drafts sitting in Notion. Now I
                actually finish things. The clarifying questions are the secret
                weapon.
              </blockquote>
              <div className="lp-quote-author">
                <div className="lp-quote-name">Ravi Shankar</div>
                <div className="lp-quote-role">
                  Senior SWE at Figma &middot; dev blog, 8k readers
                </div>
              </div>
            </div>
            <div className="lp-quote-card reveal reveal-delay-2">
              <div className="lp-quote-mark">&ldquo;</div>
              <blockquote className="lp-quote-text">
                Other AI tools give me generic slop. Sync actually produces
                posts that fit my style. My audience hasn&apos;t noticed the
                change — that&apos;s the whole point.
              </blockquote>
              <div className="lp-quote-author">
                <div className="lp-quote-name">Tess Okafor</div>
                <div className="lp-quote-role">
                  PM at Notion &middot; dev newsletter, 5k subscribers
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════════════ PRICING ═══════════════════════ */}
      <section id="pricing" className="lp-pricing">
        <div className="lp-container">
          <p className="lp-section-eyebrow lp-centered reveal">
            Simple pricing
          </p>
          <h2 className="lp-section-headline lp-centered reveal reveal-delay-1">
            No surprises.
          </h2>
          <div className="lp-pricing-grid reveal reveal-delay-2">
            <div className="lp-pricing-card">
              <div className="lp-pricing-tier">Free</div>
              <div className="lp-pricing-price">
                $0<span className="lp-pricing-period">/month</span>
              </div>
              <div className="lp-pricing-desc">Good for getting started.</div>
              <ul className="lp-pricing-features">
                <li className="lp-pricing-feature">5 drafts per month</li>
                <li className="lp-pricing-feature">Basic writing profile</li>
                <li className="lp-pricing-feature">3 persona review modes</li>
                <li className="lp-pricing-feature">Freshness monitoring</li>
              </ul>
              <Link
                href="/sign-up"
                className="lp-btn lp-btn-outline lp-btn-lg lp-full-width"
              >
                Start for free
              </Link>
            </div>
            <div className="lp-pricing-card lp-pricing-card-pro">
              <div className="lp-pricing-tier-wrap">
                <div className="lp-pricing-tier">Pro</div>
                <div className="lp-pricing-badge">Most popular</div>
              </div>
              <div className="lp-pricing-price">
                $12<span className="lp-pricing-period">/month</span>
              </div>
              <div className="lp-pricing-desc">
                For writers who publish regularly.
              </div>
              <ul className="lp-pricing-features">
                <li className="lp-pricing-feature lp-feature-check">
                  Unlimited drafts
                </li>
                <li className="lp-pricing-feature lp-feature-check">
                  Full writing profile personalization
                </li>
                <li className="lp-pricing-feature lp-feature-check">
                  Multiple writing profiles
                </li>
                <li className="lp-pricing-feature lp-feature-check">
                  Priority generation
                </li>
                <li className="lp-pricing-feature lp-feature-check">
                  All 5 persona reviewers
                </li>
                <li className="lp-pricing-feature lp-feature-check">
                  Advanced freshness monitoring
                </li>
              </ul>
              <Link
                href="/sign-up"
                className="lp-btn lp-btn-primary lp-btn-lg lp-full-width"
              >
                Start with Pro
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════════════ FINAL CTA ═══════════════════════ */}
      <section className="lp-final-cta">
        <div className="lp-container">
          <h2 className="lp-final-headline reveal">
            Your ideas deserve better
            <br />
            <em>than a blank page.</em>
          </h2>
          <Link
            href="/sign-up"
            className="lp-btn lp-btn-light lp-btn-xl reveal reveal-delay-1"
          >
            Start writing free — no credit card needed
          </Link>
        </div>
      </section>

      {/* ═══════════════════════ FOOTER ═══════════════════════ */}
      <footer className="lp-footer">
        <div className="lp-container">
          <div className="lp-footer-inner">
            <div className="lp-footer-brand">
              <Link href="/" className="lp-footer-logo">
                Sync
              </Link>
              <p className="lp-footer-tagline">
                Built with love for writers who think faster than they type.
              </p>
            </div>
            <div className="lp-footer-links">
              <a href="#" className="lp-footer-link">
                Privacy
              </a>
              <a href="#" className="lp-footer-link">
                Terms
              </a>
              <a href="#" className="lp-footer-link">
                Twitter / X
              </a>
              <a href="#" className="lp-footer-link">
                GitHub
              </a>
            </div>
          </div>
          <div className="lp-footer-copyright">
            &copy; 2026 Sync Blogs
          </div>
        </div>
      </footer>
    </div>
  );
}
