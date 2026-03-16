/* ===== STATE ===== */
const state = {
  // Auth
  token: localStorage.getItem("sync_token") || null,
  user: null,

  // Onboarding
  onboardingStep: 0,
  onboardingAnswers: {},

  // App
  posts: [],
  selectedPostId: null,
  currentView: "empty", // empty | thoughts | clarify | drafts | editor
  draftOptions: [],
  roughInput: "",
  clarifyingQuestions: [],
  clarifyingAnswers: {},
  latestReviewRunId: null,
  panelOpen: false,
  panelMode: null, // "review" | "freshness"
};

/* ===== PERSONA DEFINITIONS ===== */
const PERSONAS = {
  editor: {
    name: "Editor",
    role: "I look for clarity and structure.",
    color: "editor",
  },
  skeptic: {
    name: "Skeptic",
    role: "I push back on weak claims.",
    color: "skeptic",
  },
  empath: {
    name: "Empath",
    role: "I read this as your reader would feel it.",
    color: "empath",
  },
  philosopher: {
    name: "Philosopher",
    role: "I ask what this is really about.",
    color: "philosopher",
  },
  coach: {
    name: "Coach",
    role: "I tell you what to do next.",
    color: "coach",
  },
};

/* ===== ONBOARDING QUESTIONS (adaptive) ===== */
function getOnboardingQuestions(answers) {
  const name = answers.name || "there";
  const destinations = answers.destination || [];
  const destination = Array.isArray(destinations) ? destinations : [destinations];
  const tones = answers.tone || [];
  const tone = Array.isArray(tones) ? tones : [tones];

  return [
    // Step 0: Name
    {
      key: "name",
      type: "text",
      question: "Hey! Before we start writing together, let me learn how you write.",
      subtitle: "What should I call you?",
      placeholder: "Your first name",
    },
    // Step 1: Destination (multi-select — writers often publish to multiple platforms)
    {
      key: "destination",
      type: "multi",
      question: `Nice to meet you, ${name}. Where does your writing usually end up?`,
      subtitle: "Pick all that apply — most writers publish in more than one place.",
      options: [
        { value: "personal-blog", label: "Personal blog", desc: "Long-form, your own space" },
        { value: "newsletter", label: "Newsletter", desc: "Regular sends to subscribers" },
        { value: "linkedin", label: "LinkedIn", desc: "Professional audience, feed-friendly" },
        { value: "twitter", label: "Twitter / X", desc: "Short-form, punchy threads" },
        { value: "medium", label: "Medium", desc: "Public essays and explainers" },
        { value: "internal", label: "Internal docs", desc: "Team memos, RFCs, updates" },
        { value: "just-me", label: "Just for me", desc: "Thinking on paper, no audience" },
      ],
    },
    // Step 2: Tone (multi-select — writers often blend voices)
    {
      key: "tone",
      type: "multi",
      question: `How would people describe your writing voice, ${name}?`,
      subtitle: "Pick all that feel like you — most writers blend a few of these.",
      options: destination.includes("linkedin") && destination.length === 1
        ? [
            { value: "thought-leader", label: "Thought-leader but human", desc: "Authoritative without being stiff" },
            { value: "professional-warm", label: "Professional but warm", desc: "Polished, approachable" },
            { value: "direct", label: "Direct and no-BS", desc: "Say it straight, skip the fluff" },
            { value: "analytical", label: "Analytical and measured", desc: "Data-driven, careful claims" },
          ]
        : destination.includes("twitter") && destination.length === 1
        ? [
            { value: "witty", label: "Witty and sharp", desc: "Quick takes, clever phrasing" },
            { value: "direct", label: "Direct and punchy", desc: "No wasted words" },
            { value: "conversational", label: "Conversational", desc: "Like talking to a friend" },
            { value: "provocative", label: "Provocative", desc: "Hot takes, strong opinions" },
          ]
        : [
            { value: "conversational", label: "Conversational & casual", desc: "Like talking to a smart friend" },
            { value: "opinionated", label: "Opinionated & direct", desc: "Takes a stance, doesn't hedge" },
            { value: "formal", label: "Formal & professional", desc: "Polished, measured, authoritative" },
            { value: "analytical", label: "Analytical & measured", desc: "Evidence-first, careful reasoning" },
            { value: "playful", label: "Playful & humorous", desc: "Wit, personality, lightness" },
          ],
    },
    // Step 3: Sentence style (multi-select)
    {
      key: "sentenceStyle",
      type: "multi",
      question: "What kind of sentences feel most like you?",
      subtitle: "Pick all that apply — your style might shift depending on the piece.",
      options: [
        { value: "short", label: "Short and punchy.", desc: "Like this. Gets to the point." },
        { value: "long", label: "Longer sentences that breathe", desc: "Ideas that build on each other naturally, with room to develop." },
        { value: "mixed", label: "A mix of both", desc: "Short for impact. Longer when the idea needs space." },
      ],
    },
    // Step 4: Structure (multi-select)
    {
      key: "structure",
      type: "multi",
      question: "How do you like to organize your pieces?",
      subtitle: tone.includes("analytical") || tone.includes("formal")
        ? "Analytical writers often prefer clear sections — but pick all that fit."
        : "Pick all that apply. Most writers mix these depending on the piece.",
      options: [
        { value: "headers", label: "Headers and sections", desc: "Clear signposts, scannable" },
        { value: "flowing", label: "Flowing prose", desc: "One thought leading to the next" },
        { value: "bullets", label: "Bullet points and lists", desc: "Structured, easy to skim" },
        { value: "narrative", label: "Essay-style narrative", desc: "Story arc, beginning to end" },
      ],
    },
    // Step 5: Length (multi-select — writers often work at different lengths)
    {
      key: "lengthPreference",
      type: "multi",
      question: "How long are your typical pieces?",
      subtitle: destination.includes("twitter")
        ? "Even for threads — pick all the lengths you work with."
        : "Pick all that apply. Most writers work at different lengths.",
      options: [
        { value: "short", label: "Quick takes", desc: "300–600 words" },
        { value: "medium", label: "Standard", desc: "600–1,200 words" },
        { value: "long", label: "Long-form", desc: "1,200–2,500 words" },
        { value: "deep", label: "Deep dives", desc: "2,500+ words" },
      ],
    },
    // Step 6: Perspective (multi-select)
    {
      key: "perspective",
      type: "multi",
      question: `Do you write as "I" or keep it third person?`,
      subtitle: "Pick all that apply — many writers switch depending on context.",
      options: [
        { value: "first", label: "First person", desc: "I, we — personal and direct" },
        { value: "third", label: "Third person", desc: "Objective, observational" },
        { value: "depends", label: "Depends on the piece", desc: "I switch based on context" },
      ],
    },
    // Step 7: Personal stories (multi-select)
    {
      key: "personalStories",
      type: "multi",
      question: "Do you weave personal experiences into your writing?",
      subtitle: tone.includes("analytical") || tone.includes("formal")
        ? "Even analytical writers sometimes open with a story. Pick all that fit."
        : "Pick all that describe your approach — it might vary by piece.",
      options: [
        { value: "often", label: "Yes, often", desc: "It's how I connect with readers" },
        { value: "sometimes", label: "Sometimes", desc: "When it serves the point" },
        { value: "rarely", label: "Rarely", desc: "I prefer ideas over anecdotes" },
      ],
    },
    // Step 8: Opening style (multi-select — writers use different hooks)
    {
      key: "hookPreference",
      type: "multi",
      question: "How do you like to open a piece?",
      subtitle: "Pick all that you use — most writers rotate between a few of these.",
      options: [
        { value: "bold-claim", label: "Bold claim or hot take", desc: "Grab attention immediately" },
        { value: "story", label: "A personal story", desc: "Draw them in with narrative" },
        { value: "question", label: "A question to the reader", desc: "Make them think first" },
        { value: "fact", label: "A surprising fact or stat", desc: "Lead with evidence" },
        { value: "straight-in", label: "Jump straight in", desc: "No preamble, just start" },
      ],
    },
    // Step 9: Formatting habits you USE (multi-select)
    {
      key: "formattingHabits",
      type: "multi",
      question: `Almost done, ${name}. Which of these feel like you?`,
      subtitle: "Pick all that apply. These are the little things that make writing feel like yours.",
      options: [
        { value: "em-dashes", label: "Em-dashes (—)" },
        { value: "oxford-comma", label: "Oxford comma" },
        { value: "parentheticals", label: "Parenthetical asides (like this)" },
        { value: "references", label: "References to other thinkers" },
        { value: "open-questions", label: "Ends with open questions" },
        { value: "italics", label: "Italics for emphasis" },
        { value: "bold-terms", label: "Bold for key terms" },
        { value: "short-paragraphs", label: "Short paragraphs" },
        { value: "contractions", label: "Contractions (don't, can't)" },
        { value: "minimal-caps", label: "Minimal capitalization" },
        { value: "lowercase-titles", label: "Lowercase titles and headings" },
        { value: "ellipses", label: "Ellipses (…)" },
        { value: "exclamations", label: "Exclamation marks!" },
        { value: "rhetorical-questions", label: "Rhetorical questions" },
        { value: "sentence-fragments", label: "Sentence fragments. On purpose." },
      ],
    },
    // Step 10: Formatting habits you AVOID (multi-select)
    {
      key: "formattingAvoid",
      type: "multi",
      question: `Last one, ${name}. Which of these do you avoid?`,
      subtitle: "Pick anything that makes you cringe when you see it in writing.",
      options: [
        { value: "em-dashes", label: "Em-dashes (—)" },
        { value: "oxford-comma", label: "Oxford comma" },
        { value: "excessive-caps", label: "Capitalizing Every Word In Titles" },
        { value: "exclamations", label: "Exclamation marks!" },
        { value: "ellipses", label: "Ellipses (…)" },
        { value: "bold-terms", label: "Bold for emphasis" },
        { value: "parentheticals", label: "Parenthetical asides" },
        { value: "passive-voice", label: "Passive voice" },
        { value: "hedging", label: "Hedging (maybe, perhaps, arguably)" },
        { value: "filler-words", label: "Filler words (very, really, just)" },
        { value: "cliches", label: "Clichés and buzzwords" },
        { value: "bullet-lists", label: "Bullet point lists" },
        { value: "long-intros", label: "Long introductions before the point" },
        { value: "formal-transitions", label: "Formal transitions (furthermore, moreover)" },
        { value: "smiley-faces", label: "Emojis and smiley faces" },
      ],
    },
  ];
}

/* ===== DOM REFS ===== */
const el = {
  // Screens
  authScreen: document.getElementById("auth-screen"),
  onboardingScreen: document.getElementById("onboarding-screen"),
  appShell: document.getElementById("app-shell"),

  // Auth
  loginForm: document.getElementById("login-form"),
  registerForm: document.getElementById("register-form"),
  loginEmail: document.getElementById("login-email"),
  loginPassword: document.getElementById("login-password"),
  loginError: document.getElementById("login-error"),
  registerName: document.getElementById("register-name"),
  registerEmail: document.getElementById("register-email"),
  registerPassword: document.getElementById("register-password"),
  registerError: document.getElementById("register-error"),
  showRegister: document.getElementById("show-register"),
  showLogin: document.getElementById("show-login"),

  // Onboarding
  onboardingContent: document.getElementById("onboarding-content"),
  onboardingProgressBar: document.getElementById("onboarding-progress-bar"),
  onboardingBack: document.getElementById("onboarding-back"),
  onboardingStepText: document.getElementById("onboarding-step-text"),

  // Sidebar
  postList: document.getElementById("post-list"),
  newPostBtn: document.getElementById("new-post-btn"),
  settingsBtn: document.getElementById("settings-btn"),
  logoutBtn: document.getElementById("logout-btn"),

  // Center states
  emptyState: document.getElementById("empty-state"),
  thoughtsState: document.getElementById("thoughts-state"),
  clarifyState: document.getElementById("clarify-state"),
  draftsState: document.getElementById("drafts-state"),
  editorState: document.getElementById("editor-state"),

  // Thoughts
  roughInput: document.getElementById("rough-input"),
  thoughtsActionBtn: document.getElementById("thoughts-action-btn"),

  // Clarify
  clarifyQuestions: document.getElementById("clarify-questions"),
  clarifySkipBtn: document.getElementById("clarify-skip-btn"),
  clarifySubmitBtn: document.getElementById("clarify-submit-btn"),

  // Drafts
  draftOptions: document.getElementById("draft-options"),

  // Editor
  titleInput: document.getElementById("title-input"),
  contentInput: document.getElementById("content-input"),
  saveStatus: document.getElementById("save-status"),
  editorActionBtn: document.getElementById("editor-action-btn"),
  seeOtherApproaches: document.getElementById("see-other-approaches"),
  emptyNewDraftBtn: document.getElementById("empty-new-draft-btn"),

  // Right panel
  rightPanel: document.getElementById("right-panel"),
  rightPanelTitle: document.getElementById("right-panel-title"),
  rightPanelContent: document.getElementById("right-panel-content"),
  closePanelBtn: document.getElementById("close-panel-btn"),

  // Settings modal
  settingsModal: document.getElementById("settings-modal"),
  closeSettingsBtn: document.getElementById("close-settings-btn"),
  settingsProfileSummary: document.getElementById("settings-profile-summary"),
  watchlistInput: document.getElementById("watchlist-input"),
  saveWatchlistBtn: document.getElementById("save-watchlist-btn"),
  runtimeStatus: document.getElementById("runtime-status"),
  redoOnboarding: document.getElementById("redo-onboarding"),

  // Publish modal
  publishModal: document.getElementById("publish-modal"),
  closePublishBtn: document.getElementById("close-publish-btn"),
  publishPrivateBtn: document.getElementById("publish-private-btn"),
  publishPublicBtn: document.getElementById("publish-public-btn"),

  // Toast
  toast: document.getElementById("toast"),
};

/* ===== API HELPER ===== */
async function api(path, options = {}) {
  const headers = { "Content-Type": "application/json" };
  if (state.token) {
    headers["Authorization"] = `Bearer ${state.token}`;
  }
  const res = await fetch(path, { headers, ...options });
  if (res.status === 401) {
    // Session expired
    state.token = null;
    state.user = null;
    localStorage.removeItem("sync_token");
    showScreen("auth");
    throw new Error("Session expired. Please sign in again.");
  }
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Request failed: ${res.status}`);
  }
  return res.json();
}

/* ===== TOAST ===== */
let toastTimer = null;
function showToast(message) {
  el.toast.textContent = message;
  el.toast.classList.remove("hidden");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.toast.classList.add("hidden"), 2500);
}

/* ===== SCREEN MANAGEMENT ===== */
function showScreen(screen) {
  el.authScreen.classList.toggle("hidden", screen !== "auth");
  el.onboardingScreen.classList.toggle("hidden", screen !== "onboarding");
  el.appShell.classList.toggle("hidden", screen !== "app");
}

/* ===== AUTH ===== */
el.showRegister.addEventListener("click", (e) => {
  e.preventDefault();
  el.loginForm.classList.add("hidden");
  el.registerForm.classList.remove("hidden");
});

el.showLogin.addEventListener("click", (e) => {
  e.preventDefault();
  el.registerForm.classList.add("hidden");
  el.loginForm.classList.remove("hidden");
});

el.loginForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  el.loginError.classList.add("hidden");
  try {
    const result = await api("/v1/auth/login", {
      method: "POST",
      body: JSON.stringify({
        email: el.loginEmail.value,
        password: el.loginPassword.value,
      }),
    });
    state.token = result.token;
    state.user = result.user;
    localStorage.setItem("sync_token", result.token);
    afterAuth();
  } catch (err) {
    el.loginError.textContent = err.message;
    el.loginError.classList.remove("hidden");
  }
});

el.registerForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  el.registerError.classList.add("hidden");
  try {
    const result = await api("/v1/auth/register", {
      method: "POST",
      body: JSON.stringify({
        name: el.registerName.value,
        email: el.registerEmail.value,
        password: el.registerPassword.value,
      }),
    });
    state.token = result.token;
    state.user = result.user;
    localStorage.setItem("sync_token", result.token);
    afterAuth();
  } catch (err) {
    el.registerError.textContent = err.message;
    el.registerError.classList.remove("hidden");
  }
});

/* ===== ONBOARDING PERSISTENCE ===== */
function saveOnboardingProgress() {
  localStorage.setItem("sync_onboarding_step", String(state.onboardingStep));
  localStorage.setItem("sync_onboarding_answers", JSON.stringify(state.onboardingAnswers));
}

function restoreOnboardingProgress() {
  const savedStep = localStorage.getItem("sync_onboarding_step");
  const savedAnswers = localStorage.getItem("sync_onboarding_answers");
  if (savedStep !== null && savedAnswers !== null) {
    state.onboardingStep = parseInt(savedStep, 10) || 0;
    try {
      state.onboardingAnswers = JSON.parse(savedAnswers) || {};
    } catch {
      state.onboardingAnswers = {};
    }
  } else {
    state.onboardingStep = 0;
    state.onboardingAnswers = {};
  }
}

function clearOnboardingProgress() {
  localStorage.removeItem("sync_onboarding_step");
  localStorage.removeItem("sync_onboarding_answers");
}

function afterAuth() {
  if (!state.user.onboardingCompleted) {
    restoreOnboardingProgress();
    showScreen("onboarding");
    renderOnboardingStep();
  } else {
    clearOnboardingProgress();
    showScreen("app");
    bootApp();
  }
}

/* ===== ONBOARDING ===== */
function renderOnboardingStep() {
  const questions = getOnboardingQuestions(state.onboardingAnswers);
  const step = state.onboardingStep;
  const q = questions[step];
  const total = questions.length;

  // Progress
  el.onboardingProgressBar.style.width = `${((step + 1) / total) * 100}%`;
  el.onboardingStepText.textContent = `${step + 1} of ${total}`;
  el.onboardingBack.classList.toggle("hidden", step === 0);

  let html = `<div class="onboarding-question">`;
  html += `<h2>${q.question}</h2>`;
  if (q.subtitle) html += `<p class="onboarding-subtitle">${q.subtitle}</p>`;

  if (q.type === "text") {
    const val = state.onboardingAnswers[q.key] || "";
    html += `<div class="form-field">
      <input type="text" id="onboarding-text-input" class="onboarding-custom-input"
        placeholder="${q.placeholder || ""}" value="${escapeHtml(val)}" autofocus />
    </div>`;
  } else if (q.type === "multi") {
    const current = state.onboardingAnswers[q.key] || [];
    const hasDescs = q.options.some((opt) => opt.desc);

    if (hasDescs) {
      // Full option cards with descriptions (for destination, etc.)
      html += `<div class="onboarding-options">`;
      for (const opt of q.options) {
        const selected = current.includes(opt.value) ? "selected" : "";
        html += `<button type="button" class="onboarding-option multi-option ${selected}" data-value="${opt.value}">
          <div>
            <div class="option-label">${opt.label}</div>
            ${opt.desc ? `<div class="option-desc">${opt.desc}</div>` : ""}
          </div>
          <span class="multi-check">${current.includes(opt.value) ? "✓" : ""}</span>
        </button>`;
      }
      html += `</div>`;
    } else {
      // Compact chips (for formatting habits, etc.)
      html += `<div class="onboarding-chips">`;
      for (const opt of q.options) {
        const selected = current.includes(opt.value) ? "selected" : "";
        html += `<button type="button" class="onboarding-chip ${selected}" data-value="${opt.value}">${opt.label}</button>`;
      }
      html += `</div>`;
    }
    // Done button for multi-select
    html += `<div style="margin-top: 20px; text-align: right;">
      <button type="button" id="onboarding-multi-done" class="btn btn-primary">
        ${step === total - 1 ? "Finish setup" : "Continue"}
      </button>
    </div>`;
  }

  html += `</div>`;
  el.onboardingContent.innerHTML = html;

  // Bind events
  if (q.type === "text") {
    const input = document.getElementById("onboarding-text-input");
    input.focus();
    input.addEventListener("input", () => {
      if (input.value.trim()) {
        state.onboardingAnswers[q.key] = input.value.trim();
        saveOnboardingProgress();
      }
    });
    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter" && input.value.trim()) {
        state.onboardingAnswers[q.key] = input.value.trim();
        advanceOnboarding();
      }
    });
  } else if (q.type === "multi") {
    // Handle both card-style (.multi-option) and chip-style (.onboarding-chip) multi-selects
    const multiElements = el.onboardingContent.querySelectorAll(".multi-option, .onboarding-chip");
    multiElements.forEach((elem) => {
      elem.addEventListener("click", () => {
        const arr = state.onboardingAnswers[q.key] || [];
        const val = elem.dataset.value;
        if (arr.includes(val)) {
          state.onboardingAnswers[q.key] = arr.filter((v) => v !== val);
          elem.classList.remove("selected");
          const check = elem.querySelector(".multi-check");
          if (check) check.textContent = "";
        } else {
          state.onboardingAnswers[q.key] = [...arr, val];
          elem.classList.add("selected");
          const check = elem.querySelector(".multi-check");
          if (check) check.textContent = "✓";
        }
        saveOnboardingProgress();
      });
    });
    const doneBtn = document.getElementById("onboarding-multi-done");
    if (doneBtn) {
      doneBtn.addEventListener("click", () => advanceOnboarding());
    }
  }
}

async function advanceOnboarding() {
  saveOnboardingProgress();
  const questions = getOnboardingQuestions(state.onboardingAnswers);
  if (state.onboardingStep < questions.length - 1) {
    state.onboardingStep++;
    saveOnboardingProgress();
    renderOnboardingStep();
  } else {
    // Complete onboarding
    try {
      const result = await api("/v1/auth/onboarding", {
        method: "POST",
        body: JSON.stringify({ writingProfile: state.onboardingAnswers }),
      });
      state.user = result.user;
      clearOnboardingProgress();
      showScreen("app");
      bootApp();
      showToast(`Welcome, ${state.onboardingAnswers.name || "writer"}! Your profile is set.`);
    } catch (err) {
      showToast(err.message);
    }
  }
}

el.onboardingBack.addEventListener("click", () => {
  if (state.onboardingStep > 0) {
    state.onboardingStep--;
    saveOnboardingProgress();
    renderOnboardingStep();
  }
});

/* ===== APP BOOT ===== */
async function bootApp() {
  await loadPosts();
  loadSettings();
  loadRuntime();

  // Show empty state or select first post
  if (state.posts.length === 0) {
    setCenterView("empty");
  } else {
    selectPost(state.posts[0].id);
  }
}

/* ===== CENTER VIEW MANAGEMENT ===== */
function setCenterView(view) {
  state.currentView = view;
  el.emptyState.classList.toggle("hidden", view !== "empty");
  el.thoughtsState.classList.toggle("hidden", view !== "thoughts");
  el.clarifyState.classList.toggle("hidden", view !== "clarify");
  el.draftsState.classList.toggle("hidden", view !== "drafts");
  el.editorState.classList.toggle("hidden", view !== "editor");
}

/* ===== POST LIST ===== */
async function loadPosts() {
  state.posts = await api("/v1/posts");
  renderPostList();
}

function renderPostList() {
  if (state.posts.length === 0) {
    el.postList.innerHTML = "";
    return;
  }

  el.postList.innerHTML = state.posts
    .map((p) => {
      const active = p.id === state.selectedPostId ? "active" : "";
      let badgeClass = "draft-badge";
      if (p.status === "published") {
        badgeClass = p.monitorFreshness ? "fresh" : "fresh";
      }
      return `<button class="post-item ${active}" data-id="${p.id}">
        <span class="post-item-badge ${badgeClass}"></span>
        <span class="post-item-title">${escapeHtml(p.title || "Untitled")}</span>
      </button>`;
    })
    .join("");

  el.postList.querySelectorAll(".post-item").forEach((btn) => {
    btn.addEventListener("click", () => selectPost(btn.dataset.id));
  });
}

async function selectPost(postId) {
  state.selectedPostId = postId;
  renderPostList();

  try {
    const data = await api(`/v1/posts/${postId}`);
    const post = data.post;
    const revision = data.latestRevision;

    if (revision && revision.content) {
      // Has content — show editor
      el.titleInput.value = post.title || "";
      el.contentInput.value = revision.content || "";
      autoGrowTitle();
      setCenterView("editor");
      updateEditorButton(post);
      el.seeOtherApproaches.classList.add("hidden");
    } else {
      // No content — check for saved draft progress (cross-device restore)
      const progress = restoreDraftProgress(postId, post.draftProgress);

      if (progress.clarifyingQuestions && progress.clarifyingQuestions.length > 0 && progress.clarifyingAnswers) {
        // Had clarifying questions in progress — restore to clarify view
        state.roughInput = progress.roughInput || "";
        state.clarifyingQuestions = progress.clarifyingQuestions;
        state.clarifyingAnswers = progress.clarifyingAnswers || {};
        el.roughInput.value = state.roughInput;
        renderClarifyingQuestions();
        setCenterView("clarify");
      } else if (progress.roughInput) {
        // Had rough input saved — restore to thoughts view
        state.roughInput = progress.roughInput;
        el.roughInput.value = progress.roughInput;
        setCenterView("thoughts");
      } else {
        // Fresh — show empty thoughts input
        el.roughInput.value = "";
        setCenterView("thoughts");
      }
    }

    closePanel();
  } catch (err) {
    showToast(err.message);
  }
}

function updateEditorButton(post) {
  const btn = el.editorActionBtn;
  const label = btn.querySelector(".btn-label");

  if (post.status === "published") {
    label.textContent = "Check freshness";
    btn.onclick = () => scanFreshness(post.id);
  } else {
    label.textContent = "Review this draft";
    btn.onclick = () => runReview(post.id);
  }
}

/* ===== CREATE POST ===== */
async function createPost() {
  try {
    const post = await api("/v1/posts", {
      method: "POST",
      body: JSON.stringify({ title: "Untitled" }),
    });
    state.posts.unshift(post);
    state.selectedPostId = post.id;
    renderPostList();
    el.roughInput.value = "";
    setCenterView("thoughts");
    closePanel();
    el.roughInput.focus();
  } catch (err) {
    showToast(err.message);
  }
}

el.newPostBtn.addEventListener("click", createPost);
el.emptyNewDraftBtn.addEventListener("click", createPost);

/* ===== THOUGHTS → CLARIFY → GENERATE ===== */
// Save rough input as user types (debounced)
let roughInputSaveTimer = null;
el.roughInput.addEventListener("input", () => {
  clearTimeout(roughInputSaveTimer);
  roughInputSaveTimer = setTimeout(() => {
    if (state.selectedPostId && el.roughInput.value.trim()) {
      saveDraftProgress(state.selectedPostId, {
        roughInput: el.roughInput.value.trim(),
      });
    }
  }, 800);
});

el.thoughtsActionBtn.addEventListener("click", async () => {
  const rough = el.roughInput.value.trim();
  if (!rough) return showToast("Write something first — even messy notes work.");

  // Check onboarding
  if (!state.user?.onboardingCompleted) {
    restoreOnboardingProgress();
    showScreen("onboarding");
    renderOnboardingStep();
    return;
  }

  state.roughInput = rough;

  // Save rough input immediately before API call
  saveDraftProgress(state.selectedPostId, { roughInput: rough });

  setButtonLoading(el.thoughtsActionBtn, true);

  try {
    // Get clarifying questions from AI
    const result = await api(`/v1/posts/${state.selectedPostId}/clarify`, {
      method: "POST",
      body: JSON.stringify({ roughInput: rough }),
    });

    if (result.questions && result.questions.length > 0) {
      state.clarifyingQuestions = result.questions;
      state.clarifyingAnswers = {};

      // Save clarifying questions to progress (server already saved via /clarify endpoint)
      saveDraftProgressLocal(state.selectedPostId, {
        roughInput: rough,
        clarifyingQuestions: result.questions,
        clarifyingAnswers: {},
      });

      renderClarifyingQuestions();
      setCenterView("clarify");
    } else {
      // No questions — go straight to generation
      await generateDrafts();
    }
  } catch (err) {
    showToast(err.message);
    // Fallback: generate without clarifying
    await generateDrafts();
  } finally {
    setButtonLoading(el.thoughtsActionBtn, false);
  }
});

/* ===== CLARIFYING QUESTIONS ===== */
function renderClarifyingQuestions() {
  el.clarifyQuestions.innerHTML = state.clarifyingQuestions
    .map((q, i) => {
      const optionsHtml = q.options
        .map(
          (opt) =>
            `<button type="button" class="clarify-option" data-qid="${q.id}" data-value="${escapeHtml(opt)}">${escapeHtml(opt)}</button>`
        )
        .join("");

      return `<div class="clarify-question-card">
        <h3>${escapeHtml(q.question)}</h3>
        <p class="clarify-hint">Pick one or more</p>
        <div class="clarify-options" data-qid="${q.id}">
          ${optionsHtml}
        </div>
        ${q.allowCustom ? `<input type="text" class="clarify-custom-input" data-qid="${q.id}" placeholder="Or type your own..." />` : ""}
      </div>`;
    })
    .join("");

  // Bind option clicks — multi-select (toggle on/off, store array)
  el.clarifyQuestions.querySelectorAll(".clarify-option").forEach((btn) => {
    btn.addEventListener("click", () => {
      const qid = btn.dataset.qid;
      const val = btn.dataset.value;
      const current = state.clarifyingAnswers[qid] || [];
      const arr = Array.isArray(current) ? current : [current];

      if (arr.includes(val)) {
        // Deselect
        state.clarifyingAnswers[qid] = arr.filter((v) => v !== val);
        btn.classList.remove("selected");
      } else {
        // Select
        state.clarifyingAnswers[qid] = [...arr, val];
        btn.classList.add("selected");
      }

      // Clear custom input when selecting options
      const customInput = el.clarifyQuestions.querySelector(`.clarify-custom-input[data-qid="${qid}"]`);
      if (customInput) customInput.value = "";

      // Persist clarifying answers
      saveDraftProgress(state.selectedPostId, {
        clarifyingAnswers: { ...state.clarifyingAnswers },
      });
    });
  });

  // Bind custom inputs — adds to the selection (doesn't replace)
  el.clarifyQuestions.querySelectorAll(".clarify-custom-input").forEach((input) => {
    input.addEventListener("input", () => {
      const qid = input.dataset.qid;
      if (input.value.trim()) {
        // Store custom text alongside any selected options
        const current = state.clarifyingAnswers[qid] || [];
        const arr = Array.isArray(current) ? current : [current];
        // Remove any previous custom entry (last item if it doesn't match an option)
        const optionValues = [...el.clarifyQuestions.querySelectorAll(`.clarify-option[data-qid="${qid}"]`)].map((b) => b.dataset.value);
        const filtered = arr.filter((v) => optionValues.includes(v));
        state.clarifyingAnswers[qid] = [...filtered, input.value.trim()];

        // Persist clarifying answers
        saveDraftProgress(state.selectedPostId, {
          clarifyingAnswers: { ...state.clarifyingAnswers },
        });
      }
    });
  });
}

el.clarifySkipBtn.addEventListener("click", async () => {
  state.clarifyingAnswers = {};
  setButtonLoading(el.clarifySubmitBtn, true);
  await generateDrafts();
  setButtonLoading(el.clarifySubmitBtn, false);
});

el.clarifySubmitBtn.addEventListener("click", async () => {
  // Map question IDs to question text for the API
  // Answers may be arrays (multi-select) — join them for the prompt
  const answersWithText = {};
  for (const q of state.clarifyingQuestions) {
    const answer = state.clarifyingAnswers[q.id];
    if (answer) {
      if (Array.isArray(answer) && answer.length > 0) {
        answersWithText[q.question] = answer.join(", ");
      } else if (typeof answer === "string" && answer.trim()) {
        answersWithText[q.question] = answer;
      }
    }
  }
  setButtonLoading(el.clarifySubmitBtn, true);
  await generateDrafts(answersWithText);
  setButtonLoading(el.clarifySubmitBtn, false);
});

/* ===== GENERATE DRAFTS ===== */
async function generateDrafts(clarifyingAnswers) {
  try {
    const revisions = await api(`/v1/posts/${state.selectedPostId}/compose`, {
      method: "POST",
      body: JSON.stringify({
        roughInput: state.roughInput,
        clarifyingAnswers: clarifyingAnswers || undefined,
      }),
    });

    state.draftOptions = revisions;
    renderDraftOptions(revisions);
    setCenterView("drafts");

    // Clear draft progress — draft is now created (server clears via /compose endpoint too)
    clearDraftProgressLocal(state.selectedPostId);
    state.clarifyingQuestions = [];
    state.clarifyingAnswers = {};
  } catch (err) {
    showToast(err.message);
  }
}

function renderDraftOptions(revisions) {
  el.draftOptions.innerHTML = revisions
    .map((rev, i) => {
      const mode = rev.source === "generated" ? guessMode(i) : "Draft";
      const content = rev.content || "";
      const lines = content.split("\n").filter((l) => l.trim());
      const preview = lines.slice(0, 3).join(" ").substring(0, 200);
      const title = rev.titleSuggestion || extractTitle(content) || "Untitled";

      return `<div class="draft-option-card" data-revision-id="${rev.id}" data-index="${i}">
        <div class="draft-option-mode">${escapeHtml(mode)}</div>
        <div class="draft-option-title">${escapeHtml(title)}</div>
        <div class="draft-option-preview">${escapeHtml(preview)}...</div>
      </div>`;
    })
    .join("");

  el.draftOptions.querySelectorAll(".draft-option-card").forEach((card) => {
    card.addEventListener("click", () => {
      const idx = parseInt(card.dataset.index);
      const rev = state.draftOptions[idx];
      if (rev) {
        loadRevisionIntoEditor(rev);
      }
    });
  });
}

function guessMode(index) {
  const modes = ["Argument", "Narrative", "Brief"];
  return modes[index] || "Draft";
}

function extractTitle(content) {
  const firstLine = content.split("\n").find((l) => l.trim());
  if (firstLine && firstLine.startsWith("#")) {
    return firstLine.replace(/^#+\s*/, "").trim();
  }
  return null;
}

async function loadRevisionIntoEditor(revision) {
  const content = revision.content || "";
  const title = revision.titleSuggestion || extractTitle(content) || "";

  // Update title on the post
  if (title && state.selectedPostId) {
    try {
      await api(`/v1/posts/${state.selectedPostId}`, {
        method: "PATCH",
        body: JSON.stringify({ title }),
      });
      // Update local state
      const post = state.posts.find((p) => p.id === state.selectedPostId);
      if (post) post.title = title;
      renderPostList();
    } catch (e) {
      // Non-critical
    }
  }

  el.titleInput.value = title;
  el.contentInput.value = content;
  autoGrowTitle();
  setCenterView("editor");

  // Show "see other approaches" if there were multiple options
  if (state.draftOptions.length > 1) {
    el.seeOtherApproaches.classList.remove("hidden");
  }

  const post = state.posts.find((p) => p.id === state.selectedPostId);
  if (post) updateEditorButton(post);
}

/* ===== SEE OTHER APPROACHES ===== */
el.seeOtherApproaches.addEventListener("click", () => {
  if (state.draftOptions.length > 0) {
    renderDraftOptions(state.draftOptions);
    setCenterView("drafts");
  }
});

/* ===== EDITOR ===== */
function autoGrowTitle() {
  el.titleInput.style.height = "auto";
  el.titleInput.style.height = el.titleInput.scrollHeight + "px";
}

el.titleInput.addEventListener("input", () => {
  autoGrowTitle();
  debouncedSave();
});

el.contentInput.addEventListener("input", () => {
  debouncedSave();
});

let saveTimer = null;
function debouncedSave() {
  el.saveStatus.textContent = "Unsaved";
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => saveRevision(), 1500);
}

async function saveRevision() {
  if (!state.selectedPostId) return;
  const content = el.contentInput.value;
  if (!content.trim()) return;

  try {
    // Save title
    const title = el.titleInput.value.trim();
    if (title) {
      await api(`/v1/posts/${state.selectedPostId}`, {
        method: "PATCH",
        body: JSON.stringify({ title }),
      });
      const post = state.posts.find((p) => p.id === state.selectedPostId);
      if (post) post.title = title;
      renderPostList();
    }

    // Save content
    await api(`/v1/posts/${state.selectedPostId}/revisions`, {
      method: "POST",
      body: JSON.stringify({ content, source: "manual" }),
    });

    el.saveStatus.textContent = "Saved";
  } catch (err) {
    el.saveStatus.textContent = "Save failed";
  }
}

/* ===== REVIEW (AI PERSONAS) ===== */
async function runReview(postId) {
  // Save first
  await saveRevision();

  setButtonLoading(el.editorActionBtn, true);
  openPanel("review");

  // Show skeleton loading
  el.rightPanelTitle.textContent = "Your editors are reading...";
  el.rightPanelContent.innerHTML = Array(5)
    .fill('<div class="skeleton skeleton-card"></div>')
    .join("");

  try {
    const result = await api(`/v1/posts/${postId}/review-runs`, {
      method: "POST",
      body: JSON.stringify({ intensity: "balanced" }),
    });

    state.latestReviewRunId = result.run.id;
    renderPersonaCards(result.items);
    el.rightPanelTitle.textContent = "Your editors";
  } catch (err) {
    showToast(err.message);
    el.rightPanelContent.innerHTML = `<p style="color: var(--muted); padding: 20px;">Review failed. Try again.</p>`;
  } finally {
    setButtonLoading(el.editorActionBtn, false);
  }
}

function renderPersonaCards(items) {
  // Group by persona
  const grouped = {};
  for (const item of items) {
    const key = item.persona.toLowerCase();
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(item);
  }

  const order = ["editor", "skeptic", "empath", "philosopher", "coach"];
  let html = "";

  for (const personaKey of order) {
    const persona = PERSONAS[personaKey];
    if (!persona) continue;
    const personaItems = grouped[personaKey] || [];
    if (personaItems.length === 0) continue;

    // Combine feedback into prose
    const feedbackProse = personaItems
      .map((item) => {
        let text = item.issue;
        if (item.suggestion) text += " " + item.suggestion;
        return text;
      })
      .join("\n\n");

    html += `<div class="persona-card ${personaKey}">
      <div class="persona-card-header" data-persona="${personaKey}">
        <div>
          <div class="persona-name">${persona.name}</div>
          <div class="persona-role">${persona.role}</div>
        </div>
        <div class="persona-toggle">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"/></svg>
        </div>
      </div>
      <div class="persona-card-body">
        <div class="persona-feedback">${escapeHtml(feedbackProse).replace(/\n\n/g, "<br><br>")}</div>
        <div class="persona-actions">
          ${personaItems.map((item) => `
            <button class="btn" data-action="accept" data-item-id="${item.id}">Accept</button>
            <button class="btn" data-action="dismiss" data-item-id="${item.id}">Dismiss</button>
          `).join("")}
        </div>
      </div>
    </div>`;
  }

  el.rightPanelContent.innerHTML = html;

  // Bind collapse toggles
  el.rightPanelContent.querySelectorAll(".persona-card-header").forEach((header) => {
    header.addEventListener("click", () => {
      header.closest(".persona-card").classList.toggle("collapsed");
    });
  });

  // Bind accept/dismiss
  el.rightPanelContent.querySelectorAll("[data-action]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const action = btn.dataset.action;
      const itemId = btn.dataset.itemId;
      try {
        await api(`/v1/review-items/${itemId}/decision`, {
          method: "POST",
          body: JSON.stringify({ decision: action === "accept" ? "accepted" : "dismissed" }),
        });
        btn.textContent = action === "accept" ? "Accepted ✓" : "Dismissed";
        btn.disabled = true;
        btn.style.opacity = "0.5";
      } catch (err) {
        showToast(err.message);
      }
    });
  });
}

/* ===== PUBLISH ===== */
el.editorActionBtn.addEventListener("click", async () => {
  // Default behavior — will be overridden by updateEditorButton
});

function showPublishModal() {
  el.publishModal.classList.remove("hidden");
}

el.closePublishBtn.addEventListener("click", () => {
  el.publishModal.classList.add("hidden");
});

el.publishPrivateBtn.addEventListener("click", async () => {
  await publish("private");
});

el.publishPublicBtn.addEventListener("click", async () => {
  await publish("public");
});

async function publish(visibility) {
  if (!state.selectedPostId) return;
  try {
    await api(`/v1/posts/${state.selectedPostId}/publish`, {
      method: "POST",
      body: JSON.stringify({ visibility, monitorFreshness: true }),
    });
    await loadPosts();
    el.publishModal.classList.add("hidden");
    showToast(`Published (${visibility}).`);

    const post = state.posts.find((p) => p.id === state.selectedPostId);
    if (post) updateEditorButton(post);
  } catch (err) {
    showToast(err.message);
  }
}

/* ===== FRESHNESS SCAN ===== */
async function scanFreshness(postId) {
  setButtonLoading(el.editorActionBtn, true);
  openPanel("freshness");

  el.rightPanelTitle.textContent = "Checking freshness...";
  el.rightPanelContent.innerHTML = '<div class="skeleton skeleton-card"></div>';

  try {
    const updates = await api(`/v1/posts/${postId}/freshness-scan`, {
      method: "POST",
      body: "{}",
    });

    if (updates.length === 0) {
      el.rightPanelTitle.textContent = "All fresh";
      el.rightPanelContent.innerHTML = `<p style="color: var(--muted); padding: 20px;">No outdated claims found. Your post looks good.</p>`;
    } else {
      el.rightPanelTitle.textContent = "Freshness results";
      renderFreshnessCards(updates);
    }
  } catch (err) {
    showToast(err.message);
    el.rightPanelContent.innerHTML = `<p style="color: var(--muted); padding: 20px;">Scan failed. Try again.</p>`;
  } finally {
    setButtonLoading(el.editorActionBtn, false);
  }
}

function renderFreshnessCards(updates) {
  el.rightPanelContent.innerHTML = updates
    .map(
      (u) => `<div class="freshness-card">
      <div class="freshness-card-severity ${u.severity}">
        <span class="dot"></span>
        ${u.severity} severity
      </div>
      <div class="freshness-card-summary">${escapeHtml(u.summary)}</div>
      <div class="freshness-card-actions">
        <button class="btn btn-primary" data-update-id="${u.id}" data-decision="approve_notice">Apply update</button>
        <button class="btn" data-update-id="${u.id}" data-decision="dismiss">Dismiss</button>
      </div>
    </div>`
    )
    .join("");

  el.rightPanelContent.querySelectorAll("[data-decision]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      try {
        await api(`/v1/freshness/updates/${btn.dataset.updateId}/decision`, {
          method: "POST",
          body: JSON.stringify({ decision: btn.dataset.decision }),
        });
        btn.textContent = "Done ✓";
        btn.disabled = true;
        btn.style.opacity = "0.5";
      } catch (err) {
        showToast(err.message);
      }
    });
  });
}

/* ===== RIGHT PANEL ===== */
function openPanel(mode) {
  state.panelOpen = true;
  state.panelMode = mode;
  el.rightPanel.classList.add("open");
  el.appShell.classList.add("panel-open");
}

function closePanel() {
  state.panelOpen = false;
  state.panelMode = null;
  el.rightPanel.classList.remove("open");
  el.appShell.classList.remove("panel-open");
}

el.closePanelBtn.addEventListener("click", closePanel);

/* ===== SETTINGS ===== */
el.settingsBtn.addEventListener("click", () => {
  el.settingsModal.classList.remove("hidden");
  renderSettingsProfile();
});

el.closeSettingsBtn.addEventListener("click", () => {
  el.settingsModal.classList.add("hidden");
});

el.settingsModal.addEventListener("click", (e) => {
  if (e.target === el.settingsModal) {
    el.settingsModal.classList.add("hidden");
  }
});

el.publishModal.addEventListener("click", (e) => {
  if (e.target === el.publishModal) {
    el.publishModal.classList.add("hidden");
  }
});

function renderSettingsProfile() {
  const profile = state.user?.writingProfile || {};
  if (Object.keys(profile).length === 0) {
    el.settingsProfileSummary.innerHTML = '<p style="color: var(--muted);">No profile set. Complete onboarding first.</p>';
    return;
  }

  const labels = {
    name: "Name",
    destination: "Publishes to",
    tone: "Tone",
    sentenceStyle: "Sentences",
    structure: "Structure",
    lengthPreference: "Length",
    perspective: "Perspective",
    personalStories: "Personal stories",
    hookPreference: "Opening style",
    formattingHabits: "Formatting",
  };

  el.settingsProfileSummary.innerHTML = Object.entries(profile)
    .filter(([_, v]) => v && (typeof v === "string" ? v.trim() : true))
    .map(([key, value]) => {
      const label = labels[key] || key;
      const display = Array.isArray(value) ? value.join(", ") : value;
      return `<div class="settings-profile-row">
        <span class="label">${escapeHtml(label)}</span>
        <span class="value">${escapeHtml(String(display))}</span>
      </div>`;
    })
    .join("");
}

el.redoOnboarding.addEventListener("click", (e) => {
  e.preventDefault();
  el.settingsModal.classList.add("hidden");
  state.onboardingStep = 0;
  state.onboardingAnswers = state.user?.writingProfile || {};
  clearOnboardingProgress();
  saveOnboardingProgress();
  showScreen("onboarding");
  renderOnboardingStep();
});

async function loadSettings() {
  try {
    const settings = await api("/v1/settings");
    const lines = Object.entries(settings.versionWatchlist || {}).map(([k, v]) => `${k}: ${v}`);
    el.watchlistInput.value = lines.join("\n");
  } catch (e) {
    // Non-critical
  }
}

el.saveWatchlistBtn.addEventListener("click", async () => {
  const lines = el.watchlistInput.value.split("\n").map((l) => l.trim()).filter(Boolean);
  const watchlist = {};
  for (const line of lines) {
    const [key, ...rest] = line.split(":");
    if (key && rest.length) watchlist[key.trim()] = rest.join(":").trim();
  }
  try {
    await api("/v1/settings", {
      method: "PATCH",
      body: JSON.stringify({ versionWatchlist: watchlist }),
    });
    showToast("Watchlist saved.");
  } catch (err) {
    showToast(err.message);
  }
});

async function loadRuntime() {
  try {
    const runtime = await api("/v1/runtime");
    const configured = Boolean(runtime?.anthropicConfigured);
    el.runtimeStatus.classList.remove("ready", "error");
    el.runtimeStatus.classList.add(configured ? "ready" : "error");
    el.runtimeStatus.textContent = configured
      ? `AI connected · ${runtime.model}`
      : "AI not configured · add API key to .env";
  } catch (e) {
    el.runtimeStatus.textContent = "Could not check connection.";
  }
}

/* ===== LOGOUT ===== */
el.logoutBtn.addEventListener("click", async () => {
  try {
    await api("/v1/auth/logout", { method: "POST" });
  } catch (e) {
    // Ignore
  }
  state.token = null;
  state.user = null;
  localStorage.removeItem("sync_token");
  showScreen("auth");
});

/* ===== DRAFT PROGRESS PERSISTENCE ===== */

// localStorage keys per post
function draftProgressKey(postId) {
  return `sync_draft_progress_${postId}`;
}

function saveDraftProgressLocal(postId, progress) {
  try {
    const existing = JSON.parse(localStorage.getItem(draftProgressKey(postId)) || "{}");
    const merged = { ...existing, ...progress, lastSavedAt: new Date().toISOString() };
    localStorage.setItem(draftProgressKey(postId), JSON.stringify(merged));
  } catch (e) {
    // Non-critical
  }
}

function loadDraftProgressLocal(postId) {
  try {
    const raw = localStorage.getItem(draftProgressKey(postId));
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    return null;
  }
}

function clearDraftProgressLocal(postId) {
  localStorage.removeItem(draftProgressKey(postId));
}

// Server-side persistence (debounced)
let progressSaveTimer = null;
function saveDraftProgressServer(postId, progress) {
  clearTimeout(progressSaveTimer);
  progressSaveTimer = setTimeout(async () => {
    try {
      await api(`/v1/posts/${postId}/progress`, {
        method: "PATCH",
        body: JSON.stringify(progress),
      });
    } catch (e) {
      // Non-critical — localStorage is the fast fallback
    }
  }, 1000);
}

// Save to both localStorage and server
function saveDraftProgress(postId, progress) {
  saveDraftProgressLocal(postId, progress);
  saveDraftProgressServer(postId, progress);
}

// Restore: prefer server (cross-device), fall back to localStorage
function restoreDraftProgress(postId, serverProgress) {
  const local = loadDraftProgressLocal(postId);
  const server = serverProgress || {};

  // Use whichever is more recent
  const localTime = local?.lastSavedAt ? new Date(local.lastSavedAt).getTime() : 0;
  const serverTime = server?.lastSavedAt ? new Date(server.lastSavedAt).getTime() : 0;

  return serverTime >= localTime ? server : (local || server);
}

/* ===== UTILITY ===== */
function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

function setButtonLoading(btn, loading) {
  const label = btn.querySelector(".btn-label");
  const spinner = btn.querySelector(".btn-spinner");
  if (loading) {
    if (label) label.style.opacity = "0.6";
    if (spinner) spinner.classList.remove("hidden");
    btn.disabled = true;
  } else {
    if (label) label.style.opacity = "1";
    if (spinner) spinner.classList.add("hidden");
    btn.disabled = false;
  }
}

/* ===== BOOT ===== */
async function init() {
  if (state.token) {
    try {
      const result = await api("/v1/auth/me");
      state.user = result.user;
      afterAuth();
    } catch (err) {
      // Token invalid
      state.token = null;
      localStorage.removeItem("sync_token");
      showScreen("auth");
    }
  } else {
    showScreen("auth");
  }
}

init();
