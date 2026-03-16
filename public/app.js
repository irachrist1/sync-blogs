const state = {
  posts: [],
  selectedPostId: null,
  latestReviewRunId: null,
};

const el = {
  postList: document.querySelector("#post-list"),
  titleInput: document.querySelector("#title-input"),
  contentInput: document.querySelector("#content-input"),
  roughInput: document.querySelector("#rough-input"),
  composeMode: document.querySelector("#compose-mode"),
  composeResults: document.querySelector("#compose-results"),
  feedbackItems: document.querySelector("#feedback-items"),
  reviewSummary: document.querySelector("#review-summary"),
  runtimeStatus: document.querySelector("#runtime-status"),
  updatesList: document.querySelector("#updates-list"),
  intensity: document.querySelector("#intensity-select"),
  watchlistInput: document.querySelector("#watchlist-input"),
  writeView: document.querySelector("#write-view"),
  updatesView: document.querySelector("#updates-view"),
  tabWrite: document.querySelector("#tab-write"),
  tabUpdates: document.querySelector("#tab-updates"),
  toast: document.querySelector("#toast"),
};

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

function setRuntimeStatus(runtime) {
  const configured = Boolean(runtime?.anthropicConfigured);
  el.runtimeStatus.classList.remove("ready", "error");
  el.runtimeStatus.classList.add(configured ? "ready" : "error");
  el.runtimeStatus.textContent = configured
    ? `Anthropic connected · model ${runtime.model}`
    : `Anthropic not configured · add ANTHROPIC_API_KEY to .env`;
}

function showToast(message) {
  el.toast.textContent = message;
  el.toast.classList.remove("hidden");
  setTimeout(() => el.toast.classList.add("hidden"), 2200);
}

function setTab(tab) {
  const isWrite = tab === "write";
  el.writeView.classList.toggle("hidden", !isWrite);
  el.updatesView.classList.toggle("hidden", isWrite);
  el.tabWrite.classList.toggle("active", isWrite);
  el.tabUpdates.classList.toggle("active", !isWrite);
}

function formatDate(iso) {
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

function currentPost() {
  return state.posts.find((p) => p.id === state.selectedPostId) ?? null;
}

function renderPostList() {
  el.postList.innerHTML = "";
  if (state.posts.length === 0) {
    el.postList.innerHTML = `<div class="post-meta">No drafts yet.</div>`;
    return;
  }

  for (const post of state.posts) {
    const btn = document.createElement("button");
    btn.className = `post-item ${post.id === state.selectedPostId ? "active" : ""}`;
    btn.innerHTML = `
      <div class="post-title">${post.title}</div>
      <div class="post-meta">${post.status} · ${formatDate(post.updatedAt)}</div>
    `;
    btn.addEventListener("click", () => selectPost(post.id));
    el.postList.appendChild(btn);
  }
}

async function loadPosts() {
  state.posts = await api("/v1/posts");
  if (!state.selectedPostId && state.posts[0]) state.selectedPostId = state.posts[0].id;
  renderPostList();
  if (state.selectedPostId) await loadPostDetail(state.selectedPostId);
}

async function loadPostDetail(postId) {
  const row = await api(`/v1/posts/${postId}`);
  state.selectedPostId = row.post.id;
  el.titleInput.value = row.post.title;
  el.contentInput.value = row.latestRevision?.content ?? "";
  renderPostList();
}

async function selectPost(postId) {
  await loadPostDetail(postId);
}

function renderComposeResults(revisions) {
  el.composeResults.innerHTML = "";
  if (!revisions.length) return;
  for (const revision of revisions) {
    const div = document.createElement("div");
    div.className = "compose-result";
    const title = revision.content.split("\n")[0] ?? "Draft option";
    div.innerHTML = `
      <h4>${title}</h4>
      <div class="post-meta">Revision #${revision.revisionNumber}</div>
      <div class="item-actions">
        <button class="btn use-draft-btn">Use this draft</button>
      </div>
    `;
    div.querySelector(".use-draft-btn").addEventListener("click", async () => {
      el.contentInput.value = revision.content;
      await saveRevision("generated");
      showToast("Draft applied.");
    });
    el.composeResults.appendChild(div);
  }
}

function renderFeedback(items) {
  el.feedbackItems.innerHTML = "";
  if (!items || items.length === 0) {
    el.feedbackItems.innerHTML = `<div class="post-meta">No feedback items yet.</div>`;
    return;
  }

  for (const item of items) {
    const card = document.createElement("div");
    card.className = "feedback-item";
    card.innerHTML = `
      <div>
        <span class="badge ${item.priority}">${item.priority}</span>
        <span class="badge">${item.persona}</span>
        <span class="post-meta">${Math.round(item.confidence * 100)}%</span>
      </div>
      <h3>${item.issue}</h3>
      <p>${item.suggestion}</p>
      ${item.evidence ? `<p class="post-meta">${item.evidence}</p>` : ""}
      <div class="item-actions">
        <button class="btn decide-btn" data-decision="accepted">Accept</button>
        <button class="btn decide-btn" data-decision="dismissed">Dismiss</button>
        <button class="btn decide-btn" data-decision="pinned">Pin</button>
      </div>
    `;
    card.querySelectorAll(".decide-btn").forEach((btn) => {
      btn.addEventListener("click", async () => {
        await api(`/v1/review-items/${item.id}/decision`, {
          method: "POST",
          body: JSON.stringify({ decision: btn.dataset.decision }),
        });
        showToast(`Feedback marked ${btn.dataset.decision}.`);
      });
    });
    el.feedbackItems.appendChild(card);
  }
}

function renderUpdates(list) {
  el.updatesList.innerHTML = "";
  if (!list.length) {
    el.updatesList.innerHTML = `<div class="post-meta">No pending update suggestions.</div>`;
    return;
  }

  for (const update of list) {
    const post = state.posts.find((p) => p.id === update.postId);
    const card = document.createElement("div");
    card.className = "update-item";
    card.innerHTML = `
      <div>
        <span class="badge ${update.severity}">${update.severity}</span>
        <span class="badge">${update.status}</span>
      </div>
      <h3>${post?.title || "Untitled post"}</h3>
      <p>${update.summary}</p>
      <p class="post-meta">confidence ${Math.round(update.confidence * 100)}% · ${formatDate(update.createdAt)}</p>
      <div class="item-actions">
        <button class="btn freshness-btn" data-decision="approve_notice">Approve Notice</button>
        <button class="btn freshness-btn" data-decision="approve_addendum">Approve Addendum</button>
        <button class="btn freshness-btn" data-decision="open_revision">Open Revision</button>
        <button class="btn freshness-btn" data-decision="dismiss">Dismiss</button>
        <button class="btn freshness-btn" data-decision="snooze">Snooze</button>
      </div>
    `;
    card.querySelectorAll(".freshness-btn").forEach((btn) => {
      btn.addEventListener("click", async () => {
        await api(`/v1/freshness/updates/${update.id}/decision`, {
          method: "POST",
          body: JSON.stringify({ decision: btn.dataset.decision }),
        });
        await loadUpdates();
        showToast(`Update ${btn.dataset.decision}.`);
      });
    });
    el.updatesList.appendChild(card);
  }
}

async function loadUpdates() {
  const list = await api("/v1/freshness/updates?status=needs_review");
  renderUpdates(list);
}

async function createPost() {
  const created = await api("/v1/posts", {
    method: "POST",
    body: JSON.stringify({ title: "Untitled draft" }),
  });
  state.selectedPostId = created.id;
  await loadPosts();
  showToast("New draft created.");
}

async function saveRevision(source = "manual") {
  const post = currentPost();
  if (!post) {
    showToast("Create or select a post first.");
    return;
  }

  await api(`/v1/posts/${post.id}`, {
    method: "PATCH",
    body: JSON.stringify({ title: el.titleInput.value || "Untitled draft" }),
  });

  await api(`/v1/posts/${post.id}/revisions`, {
    method: "POST",
    body: JSON.stringify({ content: el.contentInput.value, source }),
  });
  await loadPosts();
  showToast("Revision saved.");
}

async function composeDrafts() {
  const post = currentPost();
  if (!post) return showToast("Create or select a post first.");
  const roughInput = el.roughInput.value.trim();
  if (!roughInput) return showToast("Add rough thoughts first.");

  const revisions = await api(`/v1/posts/${post.id}/compose`, {
    method: "POST",
    body: JSON.stringify({
      roughInput,
      mode: el.composeMode.value || undefined,
    }),
  });
  renderComposeResults(revisions);
  await loadPosts();
  showToast("Draft options generated.");
}

async function runReview() {
  const post = currentPost();
  if (!post) return showToast("Create or select a post first.");
  await saveRevision("manual");
  const review = await api(`/v1/posts/${post.id}/review-runs`, {
    method: "POST",
    body: JSON.stringify({ intensity: el.intensity.value }),
  });
  state.latestReviewRunId = review.run.id;
  el.reviewSummary.textContent = review.run.summary;
  renderFeedback(review.ranked);
  showToast("Review completed.");
}

async function publish(visibility) {
  const post = currentPost();
  if (!post) return showToast("Create or select a post first.");
  await api(`/v1/posts/${post.id}/publish`, {
    method: "POST",
    body: JSON.stringify({ visibility, monitorFreshness: true }),
  });
  await loadPosts();
  showToast(`Published (${visibility}).`);
}

async function scanCurrentPost() {
  const post = currentPost();
  if (!post) return showToast("Select a post first.");
  await api(`/v1/posts/${post.id}/freshness-scan`, { method: "POST", body: "{}" });
  await loadUpdates();
  showToast("Freshness scan complete.");
}

async function loadSettings() {
  const settings = await api("/v1/settings");
  const lines = Object.entries(settings.versionWatchlist).map(([k, v]) => `${k}: ${v}`);
  el.watchlistInput.value = lines.join("\n");
}

async function loadRuntime() {
  const runtime = await api("/v1/runtime");
  setRuntimeStatus(runtime);
}

function parseWatchlistInput(raw) {
  const lines = raw
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
  const result = {};
  for (const line of lines) {
    const [key, value] = line.split(":").map((x) => x.trim());
    if (key && value) result[key] = value;
  }
  return result;
}

async function saveWatchlist() {
  const versionWatchlist = parseWatchlistInput(el.watchlistInput.value);
  await api("/v1/settings", {
    method: "PATCH",
    body: JSON.stringify({ versionWatchlist }),
  });
  showToast("Watchlist saved.");
}

document.querySelector("#new-post-btn").addEventListener("click", createPost);
document.querySelector("#save-btn").addEventListener("click", () => saveRevision("manual"));
document.querySelector("#compose-btn").addEventListener("click", composeDrafts);
document.querySelector("#review-btn").addEventListener("click", runReview);
document.querySelector("#publish-private-btn").addEventListener("click", () => publish("private"));
document.querySelector("#publish-public-btn").addEventListener("click", () => publish("public"));
document.querySelector("#scan-current-btn").addEventListener("click", scanCurrentPost);
document.querySelector("#refresh-updates-btn").addEventListener("click", loadUpdates);
document.querySelector("#save-watchlist-btn").addEventListener("click", saveWatchlist);
el.tabWrite.addEventListener("click", () => setTab("write"));
el.tabUpdates.addEventListener("click", () => setTab("updates"));

async function boot() {
  await loadRuntime();
  await loadPosts();
  await loadSettings();
  await loadUpdates();
}

boot().catch((err) => {
  showToast(err.message || "Failed to initialize app");
});
