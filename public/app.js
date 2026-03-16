/* ===== STATE ===== */
const state = {
  posts: [],
  selectedPostId: null,
  currentView: "empty", // empty | thoughts | drafts | editor
  panelOpen: false,
  panelMode: null, // review | freshness
  roughInput: "",
  generatedRevisions: [],
  reviewItems: [],
  freshnessUpdates: [],
  latestReviewRunId: null,
  reviewCompleted: false,
  autoSaveTimer: null,
  voiceProfile: {},
  voiceProfileCompleted: false,
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

/* ===== DOM REFS ===== */
const el = {
  shell: document.querySelector(".app-shell"),
  // Sidebar
  newDraftBtn: document.querySelector("#new-draft-btn"),
  draftList: document.querySelector("#draft-list"),
  settingsBtn: document.querySelector("#settings-btn"),
  // Center states
  emptyState: document.querySelector("#empty-state"),
  thoughtsState: document.querySelector("#thoughts-state"),
  draftsState: document.querySelector("#drafts-state"),
  editorState: document.querySelector("#editor-state"),
  emptyNewDraftBtn: document.querySelector("#empty-new-draft-btn"),
  roughInput: document.querySelector("#rough-input"),
  thoughtsActionBtn: document.querySelector("#thoughts-action-btn"),
  draftOptions: document.querySelector("#draft-options"),
  backToThoughts: document.querySelector("#back-to-thoughts"),
  titleInput: document.querySelector("#title-input"),
  contentInput: document.querySelector("#content-input"),
  primaryActionBtn: document.querySelector("#primary-action-btn"),
  seeOtherApproaches: document.querySelector("#see-other-approaches"),
  saveStatus: document.querySelector("#save-status"),
  freshnessBadge: document.querySelector("#freshness-badge"),
  // Right panel
  rightPanel: document.querySelector("#right-panel"),
  panelTitle: document.querySelector("#panel-title"),
  panelSummary: document.querySelector("#panel-summary"),
  personaCards: document.querySelector("#persona-cards"),
  freshnessResults: document.querySelector("#freshness-results"),
  panelLoading: document.querySelector("#panel-loading"),
  closePanelBtn: document.querySelector("#close-panel-btn"),
  // Voice profile modal
  voiceModal: document.querySelector("#voice-modal"),
  closeVoiceBtn: document.querySelector("#close-voice-btn"),
  voiceTone: document.querySelector("#voice-tone"),
  voiceGenre: document.querySelector("#voice-genre"),
  voiceAudience: document.querySelector("#voice-audience"),
  voiceAvoid: document.querySelector("#voice-avoid"),
  voiceSample: document.querySelector("#voice-sample"),
  skipVoiceBtn: document.querySelector("#skip-voice-btn"),
  saveVoiceBtn: document.querySelector("#save-voice-btn"),
  // Settings modal
  settingsModal: document.querySelector("#settings-modal"),
  closeSettingsBtn: document.querySelector("#close-settings-btn"),
  settingsRuntime: document.querySelector("#settings-runtime"),
  editVoiceBtn: document.querySelector("#edit-voice-btn"),
  voiceSummaryEl: document.querySelector("#voice-summary"),
  intensitySelect: document.querySelector("#intensity-select"),
  watchlistInput: document.querySelector("#watchlist-input"),
  saveWatchlistBtn: document.querySelector("#save-watchlist-btn"),
  // Toast
  toast: document.querySelector("#toast"),
};

/* ===== API HELPER ===== */
async function api(path, options = {}) {
  const res = await fetch(path, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Request failed: ${res.status}`);
  }
  return res.json();
}

/* ===== TOAST ===== */
function showToast(message) {
  el.toast.textContent = message;
  el.toast.classList.remove("hidden");
  setTimeout(() => el.toast.classList.add("hidden"), 2400);
}

/* ===== VIEW MANAGEMENT ===== */
function showView(view) {
  state.currentView = view;
  el.emptyState.classList.toggle("hidden", view !== "empty");
  el.thoughtsState.classList.toggle("hidden", view !== "thoughts");
  el.draftsState.classList.toggle("hidden", view !== "drafts");
  el.editorState.classList.toggle("hidden", view !== "editor");
}

function openPanel(mode) {
  state.panelOpen = true;
  state.panelMode = mode;
  el.shell.classList.add("panel-open");

  // Reset panel sections
  el.panelSummary.classList.add("hidden");
  el.personaCards.classList.add("hidden");
  el.freshnessResults.classList.add("hidden");
  el.panelLoading.classList.add("hidden");

  if (mode === "review") {
    el.panelTitle.textContent = "Your editors";
  } else if (mode === "freshness") {
    el.panelTitle.textContent = "Freshness check";
  }
}

function closePanel() {
  state.panelOpen = false;
  state.panelMode = null;
  el.shell.classList.remove("panel-open");
}

function showPanelLoading(text) {
  el.panelLoading.classList.remove("hidden");
  el.panelLoading.querySelector(".loading-text").textContent = text || "Your editors are reading...";
}

function hidePanelLoading() {
  el.panelLoading.classList.add("hidden");
}

/* ===== CURRENT POST HELPER ===== */
function currentPost() {
  return state.posts.find((p) => p.id === state.selectedPostId) ?? null;
}

/* ===== SIDEBAR: DRAFT LIST ===== */
function renderDraftList() {
  el.draftList.innerHTML = "";

  if (state.posts.length === 0) {
    el.draftList.innerHTML = `<div class="draft-empty">No drafts yet</div>`;
    return;
  }

  for (const post of state.posts) {
    const btn = document.createElement("button");
    btn.className = `draft-item${post.id === state.selectedPostId ? " active" : ""}`;

    const statusClass = post.status === "published" ? "published" : "draft";
    const timeAgo = formatTimeAgo(post.updatedAt);

    btn.innerHTML = `
      <span class="draft-item-status ${statusClass}"></span>
      <span class="draft-item-title">${escapeHtml(post.title)}</span>
      <span class="draft-item-meta">${timeAgo}</span>
    `;
    btn.addEventListener("click", () => selectPost(post.id));
    el.draftList.appendChild(btn);
  }
}

/* ===== POST OPERATIONS ===== */
async function loadPosts() {
  state.posts = await api("/v1/posts");
  renderDraftList();
}

async function createPost() {
  const created = await api("/v1/posts", {
    method: "POST",
    body: JSON.stringify({ title: "Untitled" }),
  });
  state.selectedPostId = created.id;
  await loadPosts();
  // Show thoughts entry for new drafts
  el.roughInput.value = "";
  showView("thoughts");
  closePanel();
  el.roughInput.focus();
}

async function selectPost(postId) {
  state.selectedPostId = postId;
  state.reviewCompleted = false;
  const row = await api(`/v1/posts/${postId}`);
  const post = row.post;
  let content = row.latestRevision?.content ?? "";

  // Fix title duplication: if the content starts with the title, strip it
  const titleLine = post.title.trim();
  if (titleLine && content.startsWith(titleLine)) {
    content = content.slice(titleLine.length).replace(/^\n+/, "");
  }

  el.titleInput.value = post.title;
  el.contentInput.value = content;

  // Auto-grow title after setting value
  requestAnimationFrame(autoGrowTitle);

  renderDraftList();
  closePanel();

  if (!content.trim()) {
    // No content yet — show thoughts entry
    el.roughInput.value = "";
    showView("thoughts");
  } else {
    showView("editor");
    updatePrimaryButton();
    updateFreshnessBadge(post);
  }
}

/* ===== PRIMARY BUTTON LOGIC ===== */
function updatePrimaryButton() {
  const post = currentPost();
  if (!post) return;

  const btn = el.primaryActionBtn;

  // Reset click handler
  btn.replaceWith(btn.cloneNode(true));
  const newBtn = document.querySelector("#primary-action-btn");
  el.primaryActionBtn = newBtn;

  if (post.status === "published") {
    newBtn.textContent = "Check freshness";
    newBtn.addEventListener("click", handlePrimaryAction);
  } else if (state.reviewCompleted) {
    newBtn.textContent = "Publish";
    newBtn.addEventListener("click", publishPost);
  } else {
    newBtn.textContent = "Review this draft";
    newBtn.addEventListener("click", handlePrimaryAction);
  }

  // Show "See other approaches" if we have generated revisions
  if (state.generatedRevisions.length > 1) {
    el.seeOtherApproaches.classList.remove("hidden");
  } else {
    el.seeOtherApproaches.classList.add("hidden");
  }
}

async function handlePrimaryAction() {
  const post = currentPost();
  if (!post) return;

  if (post.status === "published") {
    await runFreshnessScan();
  } else {
    await runReview();
  }
}

/* ===== PROGRESS MESSAGES ===== */
const PROGRESS_MESSAGES = [
  "Reading your thoughts...",
  "Finding the shape of your ideas...",
  "Shaping your draft...",
  "Almost there...",
];

function startProgressAnimation(btn) {
  let step = 0;
  btn.textContent = PROGRESS_MESSAGES[0];
  btn.classList.add("loading");
  const interval = setInterval(() => {
    step++;
    if (step < PROGRESS_MESSAGES.length) {
      btn.textContent = PROGRESS_MESSAGES[step];
    }
  }, 8000); // Change message every 8 seconds
  return interval;
}

function stopProgressAnimation(btn, interval, originalText) {
  clearInterval(interval);
  btn.textContent = originalText;
  btn.classList.remove("loading");
}

/* ===== THOUGHTS → DRAFT GENERATION ===== */
async function generateFromThoughts() {
  const post = currentPost();
  if (!post) {
    showToast("Create a draft first.");
    return;
  }

  const rough = el.roughInput.value.trim();
  if (!rough) {
    showToast("Write something first — even fragments are fine.");
    return;
  }

  const progressInterval = startProgressAnimation(el.thoughtsActionBtn);

  try {
    const revisions = await api(`/v1/posts/${post.id}/compose`, {
      method: "POST",
      body: JSON.stringify({ roughInput: rough }),
    });

    state.generatedRevisions = revisions;
    renderDraftOptions(revisions);
    showView("drafts");
    await loadPosts();
  } catch (err) {
    showToast(err.message || "Failed to generate drafts.");
  } finally {
    stopProgressAnimation(el.thoughtsActionBtn, progressInterval, "Turn this into a draft");
  }
}

function renderDraftOptions(revisions) {
  el.draftOptions.innerHTML = "";

  const labels = ["Argument", "Narrative", "Brief"];

  revisions.forEach((revision, i) => {
    const card = document.createElement("div");
    card.className = "draft-option-card";

    const label = labels[i] || `Option ${i + 1}`;

    // Strip title from content if it starts with the post title
    let content = revision.content;
    const post = currentPost();
    const titleLine = (revision.titleSuggestion || post?.title || "").trim();
    if (titleLine && content.startsWith(titleLine)) {
      content = content.slice(titleLine.length).replace(/^\n+/, "");
    }

    const lines = content.split("\n").filter((l) => l.trim());
    const preview = lines.slice(0, 3).join("\n");

    card.innerHTML = `
      <div class="draft-option-label">${label}</div>
      ${titleLine ? `<div class="draft-option-title">${escapeHtml(titleLine)}</div>` : ""}
      <div class="draft-option-preview">${escapeHtml(preview)}</div>
    `;

    card.addEventListener("click", async () => {
      // Use the title suggestion if available
      const newTitle = revision.titleSuggestion || titleLine || post?.title || "Untitled";
      el.titleInput.value = newTitle;
      el.contentInput.value = content;
      requestAnimationFrame(autoGrowTitle);
      showView("editor");
      await saveRevision("generated");
      updatePrimaryButton();
      showToast("Draft loaded. Start editing.");
    });

    el.draftOptions.appendChild(card);
  });
}

/* ===== SAVE / AUTOSAVE ===== */
async function saveRevision(source = "manual") {
  const post = currentPost();
  if (!post) return;

  const title = el.titleInput.value.trim() || "Untitled";
  const content = el.contentInput.value;

  try {
    await api(`/v1/posts/${post.id}`, {
      method: "PATCH",
      body: JSON.stringify({ title }),
    });

    if (content.trim()) {
      await api(`/v1/posts/${post.id}/revisions`, {
        method: "POST",
        body: JSON.stringify({ content, source }),
      });
    }

    el.saveStatus.textContent = "Saved";
    setTimeout(() => {
      el.saveStatus.textContent = "";
    }, 2000);

    await loadPosts();
  } catch (err) {
    el.saveStatus.textContent = "Save failed";
  }
}

function setupAutoSave() {
  const inputs = [el.contentInput, el.titleInput];
  inputs.forEach((input) => {
    input.addEventListener("input", () => {
      clearTimeout(state.autoSaveTimer);
      el.saveStatus.textContent = "Editing...";
      state.autoSaveTimer = setTimeout(() => {
        if (currentPost() && el.contentInput.value.trim()) {
          saveRevision("manual");
        }
      }, 3000);
    });
  });

  // Auto-grow title on input
  el.titleInput.addEventListener("input", autoGrowTitle);

  // Prevent Enter in title — move focus to content instead
  el.titleInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      el.contentInput.focus();
    }
  });
}

/* ===== REVIEW (AI PERSONAS) ===== */
async function runReview() {
  const post = currentPost();
  if (!post) return showToast("Select a draft first.");

  // Save first
  await saveRevision("manual");

  // Open panel with loading
  openPanel("review");
  showPanelLoading("Your editors are reading...");

  try {
    const intensity = el.intensitySelect.value;
    const result = await api(`/v1/posts/${post.id}/review-runs`, {
      method: "POST",
      body: JSON.stringify({ intensity }),
    });

    state.latestReviewRunId = result.run.id;
    state.reviewItems = result.ranked;

    hidePanelLoading();

    // Show summary
    if (result.run.summary) {
      el.panelSummary.textContent = result.run.summary;
      el.panelSummary.classList.remove("hidden");
    }

    // Render persona cards
    renderPersonaCards(result.ranked, result.personaOutputs);
    showToast("Review complete.");
  } catch (err) {
    hidePanelLoading();
    showToast(err.message || "Review failed.");
    closePanel();
  }
}

function renderPersonaCards(rankedItems, personaOutputs) {
  el.personaCards.innerHTML = "";
  el.personaCards.classList.remove("hidden");

  // Group items by persona
  const grouped = {};
  for (const item of rankedItems) {
    const key = item.persona.toLowerCase();
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(item);
  }

  // Also include personas from raw outputs that may have had no ranked items
  if (personaOutputs) {
    for (const output of personaOutputs) {
      const key = (output.persona || "").toLowerCase();
      if (key && !grouped[key]) grouped[key] = [];
    }
  }

  // Render in persona order
  const order = ["editor", "skeptic", "empath", "philosopher", "coach"];

  for (const personaKey of order) {
    const items = grouped[personaKey];
    if (!items || items.length === 0) continue;

    const persona = PERSONAS[personaKey] || {
      name: personaKey,
      role: "",
      color: "editor",
    };

    const card = document.createElement("div");
    card.className = "persona-card";
    card.dataset.persona = personaKey;

    // Combine all feedback from this persona into prose
    const feedbackParts = items.map((item) => {
      let text = item.suggestion || item.issue;
      if (item.issue && item.suggestion && item.issue !== item.suggestion) {
        text = `${item.issue} — ${item.suggestion}`;
      }
      return text;
    });
    const feedbackText = feedbackParts.join("\n\n");

    // Store item IDs for bulk actions
    const itemIds = items.map((item) => item.id);

    card.innerHTML = `
      <div class="persona-card-header">
        <div class="persona-identity">
          <span class="persona-name">${persona.name}</span>
          <span class="persona-role">${persona.role}</span>
        </div>
        <span class="persona-toggle">▼</span>
      </div>
      <div class="persona-card-body">
        <div class="persona-feedback">${escapeHtml(feedbackText).replace(/\n/g, "<br>")}</div>
        <div class="persona-actions">
          <button class="btn-accept" data-decision="accepted">Accept</button>
          <button class="btn-dismiss" data-decision="dismissed">Dismiss</button>
        </div>
      </div>
    `;

    // Collapse/expand
    card.querySelector(".persona-card-header").addEventListener("click", () => {
      card.classList.toggle("collapsed");
    });

    // Decision buttons — apply to all items from this persona
    card.querySelectorAll("[data-decision]").forEach((btn) => {
      btn.addEventListener("click", async (e) => {
        e.stopPropagation();
        const decision = btn.dataset.decision;
        try {
          for (const itemId of itemIds) {
            await api(`/v1/review-items/${itemId}/decision`, {
              method: "POST",
              body: JSON.stringify({ decision }),
            });
          }
          const actionsEl = card.querySelector(".persona-actions");
          actionsEl.innerHTML = `<span style="font-size: 0.8rem; color: var(--ink-tertiary);">${decision === "accepted" ? "✓ Accepted" : "Dismissed"}</span>`;
          showToast(`${persona.name}'s feedback ${decision}.`);
          checkAllReviewsDecided();
        } catch (err) {
          showToast("Failed to save decision.");
        }
      });
    });

    el.personaCards.appendChild(card);
  }
}

/* ===== CHECK REVIEW COMPLETION ===== */
function checkAllReviewsDecided() {
  const cards = el.personaCards.querySelectorAll(".persona-card");
  let allDecided = true;
  cards.forEach((card) => {
    const actions = card.querySelector(".persona-actions");
    if (actions && actions.querySelector("button")) {
      allDecided = false;
    }
  });

  if (allDecided && cards.length > 0) {
    state.reviewCompleted = true;
    updatePrimaryButton();
    showToast("All feedback reviewed. Ready to publish when you are.");
  }
}

/* ===== PUBLISH ===== */
async function publishPost() {
  const post = currentPost();
  if (!post) return showToast("Select a draft first.");

  await saveRevision("manual");

  try {
    await api(`/v1/posts/${post.id}/publish`, {
      method: "POST",
      body: JSON.stringify({ visibility: "private", monitorFreshness: true }),
    });
    state.reviewCompleted = false;
    await loadPosts();
    updatePrimaryButton();
    updateFreshnessBadge({ ...post, status: "published" });
    showToast("Published. Your post is now being monitored for freshness.");
  } catch (err) {
    showToast(err.message || "Publish failed.");
  }
}

/* ===== FRESHNESS ===== */
function updateFreshnessBadge(post) {
  if (post.status !== "published") {
    el.freshnessBadge.classList.add("hidden");
    return;
  }

  // Check if there are pending freshness updates for this post
  const pending = state.freshnessUpdates.filter(
    (u) => u.postId === post.id && u.status === "needs_review"
  );

  el.freshnessBadge.classList.remove("hidden");

  if (pending.length > 0) {
    el.freshnessBadge.innerHTML = `<span class="freshness-dot stale"></span> May need a check`;
  } else {
    el.freshnessBadge.innerHTML = `<span class="freshness-dot fresh"></span> Fresh`;
  }
}

async function runFreshnessScan() {
  const post = currentPost();
  if (!post) return;

  openPanel("freshness");
  showPanelLoading("Checking for outdated claims...");

  try {
    const results = await api(`/v1/posts/${post.id}/freshness-scan`, {
      method: "POST",
      body: "{}",
    });

    // Also load all pending updates
    const allUpdates = await api("/v1/freshness/updates?status=needs_review");
    state.freshnessUpdates = allUpdates;

    hidePanelLoading();
    renderFreshnessResults(results, allUpdates.filter((u) => u.postId === post.id));
    updateFreshnessBadge(post);
    showToast("Freshness scan complete.");
  } catch (err) {
    hidePanelLoading();
    showToast(err.message || "Freshness scan failed.");
    closePanel();
  }
}

function renderFreshnessResults(newResults, allPending) {
  el.freshnessResults.innerHTML = "";
  el.freshnessResults.classList.remove("hidden");

  const items = allPending.length > 0 ? allPending : newResults;

  if (items.length === 0) {
    el.freshnessResults.innerHTML = `
      <div style="padding: 20px; text-align: center; color: var(--ink-secondary); font-size: 0.875rem;">
        Everything looks fresh. No outdated claims detected.
      </div>
    `;
    return;
  }

  for (const update of items) {
    const card = document.createElement("div");
    card.className = "freshness-card";

    card.innerHTML = `
      <div class="freshness-card-severity ${update.severity}">${update.severity} priority</div>
      <div class="freshness-card-summary">${escapeHtml(update.summary)}</div>
      <div class="freshness-card-action">
        <button class="btn-apply-update" data-update-id="${update.id}" data-decision="approve_notice">Apply update</button>
        <button class="btn-dismiss" data-update-id="${update.id}" data-decision="dismiss">Dismiss</button>
      </div>
    `;

    card.querySelectorAll("[data-update-id]").forEach((btn) => {
      btn.addEventListener("click", async () => {
        try {
          await api(`/v1/freshness/updates/${btn.dataset.updateId}/decision`, {
            method: "POST",
            body: JSON.stringify({ decision: btn.dataset.decision }),
          });
          card.style.opacity = "0.4";
          card.style.pointerEvents = "none";
          showToast(btn.dataset.decision === "dismiss" ? "Dismissed." : "Update applied.");

          // Refresh freshness data
          const allUpdates = await api("/v1/freshness/updates?status=needs_review");
          state.freshnessUpdates = allUpdates;
          const post = currentPost();
          if (post) updateFreshnessBadge(post);
        } catch (err) {
          showToast("Failed to save decision.");
        }
      });
    });

    el.freshnessResults.appendChild(card);
  }
}

/* ===== SETTINGS ===== */
function openSettings() {
  el.settingsModal.classList.remove("hidden");
}

function closeSettings() {
  el.settingsModal.classList.add("hidden");
}

async function loadSettings() {
  try {
    const settings = await api("/v1/settings");
    const lines = Object.entries(settings.versionWatchlist || {}).map(
      ([k, v]) => `${k}: ${v}`
    );
    el.watchlistInput.value = lines.join("\n");

    // Load voice profile
    if (settings.voiceProfile && Object.keys(settings.voiceProfile).length > 0) {
      state.voiceProfile = settings.voiceProfile;
      state.voiceProfileCompleted = true;
    }
    updateVoiceSummary();
  } catch {
    // Settings load is non-critical
  }
}

async function loadRuntime() {
  try {
    const runtime = await api("/v1/runtime");
    const configured = Boolean(runtime?.anthropicConfigured);
    el.settingsRuntime.textContent = configured
      ? "Connected and ready"
      : "Not configured — add API key to .env";
    el.settingsRuntime.className = `setting-status ${configured ? "connected" : "disconnected"}`;
  } catch {
    el.settingsRuntime.textContent = "Unable to check connection";
    el.settingsRuntime.className = "setting-status disconnected";
  }
}

async function saveWatchlist() {
  const raw = el.watchlistInput.value;
  const lines = raw
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
  const result = {};
  for (const line of lines) {
    const [key, ...rest] = line.split(":");
    const value = rest.join(":").trim();
    if (key?.trim() && value) result[key.trim()] = value;
  }

  try {
    await api("/v1/settings", {
      method: "PATCH",
      body: JSON.stringify({ versionWatchlist: result }),
    });
    showToast("Watchlist saved.");
  } catch {
    showToast("Failed to save watchlist.");
  }
}

/* ===== VOICE PROFILE ===== */
function openVoiceModal() {
  // Populate fields from current state
  el.voiceTone.value = state.voiceProfile.tone || "";
  el.voiceGenre.value = state.voiceProfile.genre || "";
  el.voiceAudience.value = state.voiceProfile.audience || "";
  el.voiceAvoid.value = state.voiceProfile.avoid || "";
  el.voiceSample.value = state.voiceProfile.sample || "";
  el.voiceModal.classList.remove("hidden");
}

function closeVoiceModal() {
  el.voiceModal.classList.add("hidden");
}

async function saveVoiceProfile() {
  const profile = {
    tone: el.voiceTone.value.trim(),
    genre: el.voiceGenre.value.trim(),
    audience: el.voiceAudience.value.trim(),
    avoid: el.voiceAvoid.value.trim(),
    sample: el.voiceSample.value.trim(),
  };

  // Remove empty fields
  const cleaned = {};
  for (const [k, v] of Object.entries(profile)) {
    if (v) cleaned[k] = v;
  }

  try {
    await api("/v1/settings", {
      method: "PATCH",
      body: JSON.stringify({ voiceProfile: cleaned }),
    });
    state.voiceProfile = cleaned;
    state.voiceProfileCompleted = true;
    closeVoiceModal();
    updateVoiceSummary();
    showToast("Voice profile saved. Your drafts will sound more like you.");
  } catch {
    showToast("Failed to save voice profile.");
  }
}

function updateVoiceSummary() {
  if (!el.voiceSummaryEl) return;
  const p = state.voiceProfile;
  const parts = [];
  if (p.tone) parts.push(`Tone: ${p.tone}`);
  if (p.genre) parts.push(`Genre: ${p.genre}`);
  if (p.audience) parts.push(`Audience: ${p.audience}`);
  if (p.avoid) parts.push(`Avoids: ${p.avoid}`);
  if (p.sample) parts.push(`Sample provided ✓`);

  if (parts.length > 0) {
    el.voiceSummaryEl.textContent = parts.join(" · ");
  } else {
    el.voiceSummaryEl.textContent = "No voice profile set yet.";
  }
}

/* ===== TITLE AUTO-GROW ===== */
function autoGrowTitle() {
  const titleEl = el.titleInput;
  titleEl.style.height = "auto";
  titleEl.style.height = titleEl.scrollHeight + "px";
}

/* ===== UTILITIES ===== */
function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

function formatTimeAgo(iso) {
  try {
    const date = new Date(iso);
    const now = new Date();
    const diffMs = now - date;
    const diffMin = Math.floor(diffMs / 60000);
    const diffHr = Math.floor(diffMs / 3600000);
    const diffDay = Math.floor(diffMs / 86400000);

    if (diffMin < 1) return "just now";
    if (diffMin < 60) return `${diffMin}m ago`;
    if (diffHr < 24) return `${diffHr}h ago`;
    if (diffDay < 7) return `${diffDay}d ago`;
    return date.toLocaleDateString();
  } catch {
    return "";
  }
}

/* ===== EVENT LISTENERS ===== */
// Sidebar
el.newDraftBtn.addEventListener("click", createPost);
el.emptyNewDraftBtn.addEventListener("click", createPost);
el.settingsBtn.addEventListener("click", openSettings);

// Thoughts state
el.thoughtsActionBtn.addEventListener("click", generateFromThoughts);

// Drafts state
el.backToThoughts.addEventListener("click", () => {
  showView("thoughts");
});

// Editor state
el.seeOtherApproaches.addEventListener("click", () => {
  if (state.generatedRevisions.length > 0) {
    renderDraftOptions(state.generatedRevisions);
    showView("drafts");
  }
});

// Freshness badge click
el.freshnessBadge.addEventListener("click", () => {
  const post = currentPost();
  if (post && post.status === "published") {
    runFreshnessScan();
  }
});

// Right panel
el.closePanelBtn.addEventListener("click", closePanel);

// Voice profile modal
el.closeVoiceBtn.addEventListener("click", closeVoiceModal);
el.skipVoiceBtn.addEventListener("click", closeVoiceModal);
el.saveVoiceBtn.addEventListener("click", saveVoiceProfile);
el.voiceModal.addEventListener("click", (e) => {
  if (e.target === el.voiceModal) closeVoiceModal();
});

// Settings modal
el.closeSettingsBtn.addEventListener("click", closeSettings);
el.saveWatchlistBtn.addEventListener("click", saveWatchlist);
el.editVoiceBtn.addEventListener("click", () => {
  closeSettings();
  openVoiceModal();
});

// Close settings on overlay click
el.settingsModal.addEventListener("click", (e) => {
  if (e.target === el.settingsModal) closeSettings();
});

// Keyboard shortcuts
document.addEventListener("keydown", (e) => {
  // Escape closes panel, voice modal, or settings
  if (e.key === "Escape") {
    if (!el.voiceModal.classList.contains("hidden")) {
      closeVoiceModal();
    } else if (!el.settingsModal.classList.contains("hidden")) {
      closeSettings();
    } else if (state.panelOpen) {
      closePanel();
    }
  }

  // Cmd/Ctrl+S to save
  if ((e.metaKey || e.ctrlKey) && e.key === "s") {
    e.preventDefault();
    if (currentPost() && state.currentView === "editor") {
      saveRevision("manual");
    }
  }
});

/* ===== BOOT ===== */
async function boot() {
  try {
    await loadRuntime();
    await loadPosts();
    await loadSettings();

    // Load freshness updates for badge display
    try {
      const updates = await api("/v1/freshness/updates?status=needs_review");
      state.freshnessUpdates = updates;
    } catch {
      // Non-critical
    }

    // If there are posts, select the first one
    if (state.posts.length > 0 && !state.selectedPostId) {
      await selectPost(state.posts[0].id);
    } else {
      showView("empty");
    }

    setupAutoSave();

    // Show voice profile onboarding if not completed
    if (!state.voiceProfileCompleted) {
      setTimeout(() => openVoiceModal(), 800);
    }
  } catch (err) {
    showToast(err.message || "Failed to initialize.");
  }
}

boot();
