const fieldNames = ["name", "role", "age", "personality", "backstory", "appearance", "clothing", "palette", "signature_details", "art_style"];
let projects = [];
let characters = [];
let activeProjectId = "";
let activeCharacter = null;
let saveTimer = null;
let saving = false;
let filmSaveTimer = 0;
let toastTimer = null;

const $ = (id) => document.getElementById(id);
const escapeText = (value = "") => String(value).replace(/[&<>"']/g, (char) => ({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[char]));

async function api(path, options = {}) {
  const response = await fetch(path, { ...options, headers: { "Content-Type": "application/json", ...(options.headers || {}) } });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.error || `Request failed (${response.status})`);
  return payload;
}

function toast(message, error = false) {
  const el = $("toast");
  el.textContent = message;
  el.classList.toggle("error", error);
  el.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove("show"), 3300);
}

function setBusy(button, busy, label) {
  if (!button.dataset.originalLabel) button.dataset.originalLabel = button.textContent.trim();
  button.disabled = busy;
  button.classList.toggle("busy", busy);
  button.textContent = busy ? label : button.dataset.originalLabel;
}

async function init() {
  bindEvents();
  await Promise.all([loadProjects(), loadStatus()]);
}

async function loadStatus() {
  try {
    const state = await api("/api/status");
    const pill = $("aiStatus");
    const local = state.image_provider === "comfyui";
    pill.innerHTML = local ? (state.image_ready ? "<i></i> Local model ready" : state.comfy_running ? "<i></i> Add a local model" : "<i></i> ComfyUI offline") : (state.image_ready ? "<i></i> Gemini images ready" : "<i></i> Gemini API key needed");
    pill.classList.toggle("ready", state.image_ready);
    $("providerHint").textContent = local
      ? (state.image_ready ? `Connected to local ComfyUI${state.checkpoint ? ` · ${state.checkpoint}` : ""}.` : state.comfy_running ? "ComfyUI is running. Add an anime SD 1.5 checkpoint to its checkpoints folder." : "Start ComfyUI and add an anime SD 1.5 checkpoint to generate locally.")
      : (state.image_ready ? `Ready to generate with ${state.image_model}.` : "Set a paid Gemini API key to generate images.");
    $("draftBtn").title = state.ai_configured ? "Create an AI-assisted character brief" : "Set GEMINI_API_KEY to enable the character agent";
  } catch {
    $("aiStatus").innerHTML = "<i></i> Local mode";
  }
}

async function loadProjects(preferredId = "") {
  projects = await api("/api/projects");
  const select = $("projectSelect");
  select.replaceChildren();
  for (const project of projects) {
    const option = document.createElement("option");
    option.value = project.id;
    option.textContent = project.name;
    select.append(option);
  }
  if (!projects.length) {
    activeProjectId = "";
    $("crumbProject").textContent = "No project";
    $("characterList").innerHTML = '<div class="empty-nav">Create a project to start your film workspace.</div>';
    showWelcome(false);
    openProjectDialog();
    return;
  }
  activeProjectId = preferredId || (projects.some((project) => project.id === activeProjectId) ? activeProjectId : projects[0].id);
  select.value = activeProjectId;
  $("crumbProject").textContent = projects.find((project) => project.id === activeProjectId)?.name || "Project";
  await loadCharacters();
  await loadFilmPlan();
}

async function loadCharacters(selectId = "") {
  if (!activeProjectId) return;
  characters = await api(`/api/projects/${activeProjectId}/characters`);
  renderCharacterNav();
  const chosen = selectId || (characters.some((item) => item.id === activeCharacter?.id) ? activeCharacter.id : characters[0]?.id);
  if (chosen) selectCharacter(chosen);
  else {
    activeCharacter = null;
    showWelcome(true);
  }
}

function renderCharacterNav() {
  const list = $("characterList");
  list.replaceChildren();
  if (!characters.length) {
    const empty = document.createElement("div");
    empty.className = "empty-nav";
    empty.textContent = "Your character lineup will appear here.";
    list.append(empty);
    return;
  }
  characters.forEach((character) => {
    const button = document.createElement("button");
    button.className = `character-item${character.id === activeCharacter?.id ? " active" : ""}`;
    button.type = "button";
    button.title = character.name;
    const glyph = document.createElement("span");
    glyph.className = "character-glyph";
    glyph.textContent = character.name.trim().charAt(0).toUpperCase() || "✦";
    const name = document.createElement("span");
    name.className = "character-name";
    name.textContent = character.name || "Untitled character";
    button.append(glyph, name);
    button.addEventListener("click", () => selectCharacter(character.id));
    list.append(button);
  });
}

function selectCharacter(id) {
  activeCharacter = characters.find((item) => item.id === id) || null;
  if (!activeCharacter) return showWelcome(true);
  clearTimeout(saveTimer);
  fieldNames.forEach((field) => { $(`f-${field}`).value = activeCharacter[field] || ""; });
  $("characterTitle").textContent = activeCharacter.name || "Untitled character";
  $("crumbCharacter").textContent = activeCharacter.name || "Untitled character";
  $("characterSub").textContent = activeCharacter.role ? `${activeCharacter.role} · Character bible` : "Build a character bible and develop the visual reference.";
  $("approvalBadge").textContent = activeCharacter.status === "approved" ? "✓  Approved" : "●  Draft";
  $("approvalBadge").classList.toggle("approved", activeCharacter.status === "approved");
  $("artCount").textContent = activeCharacter.image_url ? "1" : "0";
  if (activeCharacter.image_url) {
    $("artImage").src = `${activeCharacter.image_url}?v=${encodeURIComponent(activeCharacter.updated_at || Date.now())}`;
    $("artImageFrame").classList.remove("hidden");
    $("artPlaceholder").classList.add("hidden");
    $("imageDate").textContent = formatDate(activeCharacter.updated_at);
  } else {
    $("artImageFrame").classList.add("hidden");
    $("artPlaceholder").classList.remove("hidden");
  }
  $("saveState").textContent = "All changes saved";
  $("saveState").className = "save-state saved";
  $("editor").classList.remove("hidden");
  $("welcome").classList.add("hidden");
  renderCharacterNav();
}

function showWelcome(show) {
  $("editor").classList.toggle("hidden", show);
  $("welcome").classList.toggle("hidden", !show);
  if (!show) return;
  $("crumbCharacter").textContent = "New character";
}

function formData() {
  return Object.fromEntries(fieldNames.map((field) => [field, $(`f-${field}`).value.trim()]));
}

function bindEvents() {
  $("newProjectBtn").addEventListener("click", openProjectDialog);
  $("newCharacterBtn").addEventListener("click", createCharacter);
  $("welcomeCreate").addEventListener("click", () => projects.length ? createCharacter() : openProjectDialog());
  $("projectSelect").addEventListener("change", async (event) => {
    await flushSave();
    activeProjectId = event.target.value;
    $("crumbProject").textContent = projects.find((project) => project.id === activeProjectId)?.name || "Project";
    await loadCharacters();
    await loadFilmPlan();
  });
  $("saveBtn").addEventListener("click", () => saveCharacter(true));
  fieldNames.forEach((field) => {
    $(`f-${field}`).addEventListener("input", () => {
      $("saveState").textContent = "Unsaved changes";
      $("saveState").className = "save-state saving";
      clearTimeout(saveTimer);
      saveTimer = setTimeout(() => saveCharacter(false), 750);
    });
  });
  $("draftBtn").addEventListener("click", draftCharacter);
  $("approveBtn").addEventListener("click", approveCharacter);
  $("generateBtn").addEventListener("click", () => generateImage(false));
  $("reviseBtn").addEventListener("click", () => generateImage(true));
  $("uploadBtn").addEventListener("click", () => $("imageUpload").click());
  $("replaceImageBtn").addEventListener("click", () => $("imageUpload").click());
  $("imageUpload").addEventListener("change", uploadReference);
  $("goArtwork").addEventListener("click", () => activateTab("artwork"));
  document.querySelectorAll(".tab").forEach((button) => button.addEventListener("click", () => activateTab(button.dataset.tab)));
  $("helpBtn").addEventListener("click", () => $("helpDialog").showModal());
  $("projectForm").addEventListener("submit", createProject);
  $("filmWorkspaceBtn").addEventListener("click", () => activateTab("film"));
  $("addSceneBtn").addEventListener("click", addScene);
  ["filmLogline", "filmOutline"].forEach((id) => $(id).addEventListener("input", () => {
    clearTimeout(filmSaveTimer); filmSaveTimer = setTimeout(saveFilmPlan, 500);
  }));
}

function activateTab(tabName) {
  document.querySelectorAll(".tab").forEach((button) => button.classList.toggle("active", button.dataset.tab === tabName));
  ["film", "character", "artwork", "history"].forEach((name) => $(`${name}Tab`).classList.toggle("hidden", name !== tabName));
  if (tabName === "film") loadFilmPlan();
  if (tabName === "history" && activeCharacter) loadHistory();
}

async function loadFilmPlan() {
  if (!activeProjectId || !$('sceneList')) return;
  try {
    const plan = await api(`/api/projects/${activeProjectId}/film-plan`);
    $("filmLogline").value = plan.logline || ""; $("filmOutline").value = plan.outline || "";
    renderScenes(plan.scenes || []);
  } catch (error) { toast(error.message, true); }
}

async function saveFilmPlan() {
  if (!activeProjectId) return;
  try { await api(`/api/projects/${activeProjectId}/film-plan`, { method: "POST", body: JSON.stringify({ logline: $("filmLogline").value, outline: $("filmOutline").value }) }); }
  catch (error) { toast(error.message, true); }
}

function renderScenes(scenes) {
  const list = $("sceneList"); list.replaceChildren();
  if (!scenes.length) { const empty = document.createElement("p"); empty.className = "empty-scenes"; empty.textContent = "No scenes yet. Add the opening scene to start your animatic plan."; list.append(empty); return; }
  scenes.forEach((scene, index) => {
    const card = document.createElement("section"); card.className = "scene-card";
    const heading = document.createElement("div"); heading.className = "scene-heading";
    const title = document.createElement("input"); title.value = scene.title; title.setAttribute("aria-label", `Scene ${index + 1} title`);
    title.addEventListener("change", () => api(`/api/scenes/${scene.id}`, { method: "PATCH", body: JSON.stringify({ title: title.value }) }).catch((e) => toast(e.message, true)));
    const badge = document.createElement("span"); badge.textContent = `SCENE ${String(index + 1).padStart(2, "0")}`; heading.append(badge, title);
    const summary = document.createElement("textarea"); summary.rows = 2; summary.placeholder = "What happens in this scene?"; summary.value = scene.summary;
    summary.addEventListener("change", () => api(`/api/scenes/${scene.id}`, { method: "PATCH", body: JSON.stringify({ summary: summary.value }) }).catch((e) => toast(e.message, true)));
    const shots = document.createElement("div"); shots.className = "shot-list";
    (scene.shots || []).forEach((shot) => {
      const row = document.createElement("div"); row.className = "shot-row";
      const desc = document.createElement("input"); desc.value = shot.description; desc.placeholder = "Shot description"; desc.addEventListener("change", () => api(`/api/shots/${shot.id}`, { method: "PATCH", body: JSON.stringify({ description: desc.value }) }).catch((e) => toast(e.message, true)));
      const duration = document.createElement("input"); duration.value = shot.duration; duration.placeholder = "Duration"; duration.setAttribute("aria-label", "Shot duration"); duration.addEventListener("change", () => api(`/api/shots/${shot.id}`, { method: "PATCH", body: JSON.stringify({ duration: duration.value }) }).catch((e) => toast(e.message, true)));
      const status = document.createElement("select"); ["planned", "boarding", "ready", "done"].forEach((value) => { const option = document.createElement("option"); option.value = value; option.textContent = value; status.append(option); }); status.value = shot.status; status.addEventListener("change", () => api(`/api/shots/${shot.id}`, { method: "PATCH", body: JSON.stringify({ status: status.value }) }).catch((e) => toast(e.message, true)));
      row.append(desc, duration, status); shots.append(row);
    });
    const addShot = document.createElement("button"); addShot.type = "button"; addShot.className = "text-button"; addShot.textContent = "+ Add shot"; addShot.addEventListener("click", async () => { await api(`/api/scenes/${scene.id}/shots`, { method: "POST", body: "{}" }); loadFilmPlan(); });
    card.append(heading, summary, shots, addShot); list.append(card);
  });
}

async function addScene() {
  if (!activeProjectId) return;
  try { await api(`/api/projects/${activeProjectId}/scenes`, { method: "POST", body: JSON.stringify({}) }); await loadFilmPlan(); }
  catch (error) { toast(error.message, true); }
}

function openProjectDialog() {
  $("projectName").value = "";
  $("projectDescription").value = "";
  $("projectDialog").showModal();
  setTimeout(() => $("projectName").focus(), 30);
}

async function createProject(event) {
  event.preventDefault();
  const submit = $("projectForm").querySelector("[type=submit]");
  setBusy(submit, true, "Creating…");
  try {
    const project = await api("/api/projects", { method: "POST", body: JSON.stringify({ name: $("projectName").value, description: $("projectDescription").value }) });
    $("projectDialog").close();
    await loadProjects(project.id);
    toast("Project created. Add your first character when you’re ready.");
  } catch (error) { toast(error.message, true); }
  finally { setBusy(submit, false); }
}

async function createCharacter() {
  if (!activeProjectId) return openProjectDialog();
  try {
    const character = await api(`/api/projects/${activeProjectId}/characters`, { method: "POST", body: JSON.stringify({ name: "Untitled character", art_style: "cinematic hand-drawn anime" }) });
    characters.unshift(character);
    selectCharacter(character.id);
    $("f-name").focus();
    toast("Character created. Start with the idea or fill in the character bible.");
  } catch (error) { toast(error.message, true); }
}

async function flushSave() {
  clearTimeout(saveTimer);
  if (activeCharacter && $("saveState").classList.contains("saving")) await saveCharacter(false);
}

async function saveCharacter(showToast) {
  if (!activeCharacter) return;
  if (saving) {
    if (!showToast) saveTimer = setTimeout(() => saveCharacter(false), 500);
    return;
  }
  saving = true;
  const button = $("saveBtn");
  const payload = formData();
  let newerEdits = false;
  if (showToast) setBusy(button, true, "Saving…");
  try {
    const updated = await api(`/api/characters/${activeCharacter.id}`, { method: "PATCH", body: JSON.stringify(payload) });
    activeCharacter = updated;
    characters = characters.map((item) => item.id === updated.id ? updated : item);
    $("characterTitle").textContent = updated.name || "Untitled character";
    $("crumbCharacter").textContent = updated.name || "Untitled character";
    $("characterSub").textContent = updated.role ? `${updated.role} · Character bible` : "Build a character bible and develop the visual reference.";
    $("approvalBadge").textContent = "●  Draft";
    $("approvalBadge").classList.remove("approved");
    $("saveState").textContent = "All changes saved";
    $("saveState").className = "save-state saved";
    renderCharacterNav();
    newerEdits = JSON.stringify(formData()) !== JSON.stringify(payload);
    if (showToast) toast("Character saved.");
  } catch (error) {
    $("saveState").textContent = "Could not save";
    toast(error.message, true);
  } finally {
    saving = false;
    if (showToast) setBusy(button, false);
    if (newerEdits) saveTimer = setTimeout(() => saveCharacter(false), 100);
  }
}

async function draftCharacter() {
  if (!activeCharacter) return;
  const button = $("draftBtn");
  const existing = formData();
  const idea = $("ideaInput").value.trim() || Object.entries(existing).filter(([, value]) => value).map(([key, value]) => `${key}: ${value}`).join("\n");
  if (!idea) return toast("Add a short idea or fill in a few details first.", true);
  await saveCharacter(false);
  setBusy(button, true, "Developing the character…");
  try {
    const updated = await api(`/api/characters/${activeCharacter.id}/draft`, { method: "POST", body: JSON.stringify({ idea }) });
    characters = characters.map((item) => item.id === updated.id ? updated : item);
    selectCharacter(updated.id);
    $("ideaInput").value = "";
    toast("Character brief drafted. Review and adjust any detail.");
  } catch (error) { toast(error.message, true); }
  finally { setBusy(button, false); }
}

async function generateImage(revise) {
  if (!activeCharacter) return;
  await flushSave();
  const button = revise ? $("reviseBtn") : $("generateBtn");
  if (revise && !$("revisionInput").value.trim()) return toast("Describe the change you want to make first.", true);
  setBusy(button, true, revise ? "Revising the reference…" : "Generating the reference…");
  try {
    const updated = await api(`/api/characters/${activeCharacter.id}/${revise ? "revise" : "generate"}`, { method: "POST", body: JSON.stringify({ instruction: $("revisionInput").value }) });
    characters = characters.map((item) => item.id === updated.id ? updated : item);
    selectCharacter(updated.id);
    $("revisionInput").value = "";
    activateTab("artwork");
    toast(revise ? "Reference revised. Review the new version." : "Reference sheet generated. Review before approving.");
  } catch (error) { toast(error.message, true); }
  finally { setBusy(button, false); }
}

async function uploadReference(event) {
  const file = event.target.files?.[0];
  event.target.value = "";
  if (!file || !activeCharacter) return;
  if (!/^image\/(png|jpeg|webp)$/.test(file.type)) return toast("Choose a PNG, JPEG, or WebP image.", true);
  if (file.size > 16 * 1024 * 1024) return toast("Image must be 16 MB or smaller.", true);
  const button = $("artImageFrame").classList.contains("hidden") ? $("uploadBtn") : $("replaceImageBtn");
  setBusy(button, true, "Saving image…");
  try {
    const dataUrl = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(new Error("Could not read that image file."));
      reader.readAsDataURL(file);
    });
    const updated = await api(`/api/characters/${activeCharacter.id}/upload`, { method: "POST", body: JSON.stringify({ data_url: dataUrl }) });
    characters = characters.map((item) => item.id === updated.id ? updated : item);
    selectCharacter(updated.id);
    activateTab("artwork");
    toast("Reference image saved to this character.");
  } catch (error) { toast(error.message, true); }
  finally {
    setBusy(button, false);
  }
}

async function approveCharacter() {
  if (!activeCharacter) return;
  await flushSave();
  if (!activeCharacter.name || !activeCharacter.appearance) return toast("Add a character name and appearance before approving.", true);
  try {
    await api(`/api/characters/${activeCharacter.id}/approve`, { method: "POST", body: "{}" });
    activeCharacter.status = "approved";
    characters = characters.map((item) => item.id === activeCharacter.id ? activeCharacter : item);
    $("approvalBadge").textContent = "✓  Approved";
    $("approvalBadge").classList.add("approved");
    toast("Design approved. This version is ready for future storyboard work.");
  } catch (error) { toast(error.message, true); }
}

async function loadHistory() {
  const list = $("historyList");
  list.innerHTML = '<div class="empty-nav">Loading saved versions…</div>';
  try {
    const entries = await api(`/api/characters/${activeCharacter.id}/versions`);
    list.replaceChildren();
    if (!entries.length) { list.innerHTML = '<div class="empty-nav">No versions yet.</div>'; return; }
    entries.forEach((entry) => {
      const snapshotData = JSON.parse(entry.snapshot);
      const item = document.createElement("div");
      item.className = "history-item";
      const icon = document.createElement("span"); icon.className = "history-icon"; icon.textContent = entry.event.includes("Approved") ? "✓" : "✦";
      const copy = document.createElement("div");
      const title = document.createElement("strong"); title.textContent = entry.event;
      const summary = document.createElement("p"); summary.textContent = [snapshotData.name, snapshotData.role].filter(Boolean).join(" · ") || "Character details saved";
      copy.append(title, summary);
      const date = document.createElement("time"); date.textContent = formatDate(entry.created_at);
      item.append(icon, copy, date); list.append(item);
    });
  } catch (error) { list.textContent = error.message; }
}

function formatDate(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.valueOf())) return "";
  return date.toLocaleString([], { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

init().catch((error) => { toast(error.message || "Could not start Character Studio.", true); });
