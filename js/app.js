// app.js
import {
  loadActiveChallenge,
  saveActiveChallenge,
  clearActiveChallenge,
  loadLastChallenge,
  startNewChallenge,
  isActiveChallengeForNow
} from "./storage.js";

const PARKS = [
  { id: "mk", name: "Magic Kingdom" },
  { id: "ep", name: "EPCOT" },
  { id: "hs", name: "Hollywood Studios" },
  { id: "ak", name: "Animal Kingdom" }
];

// Park colors (CSS uses --park)
const PARK_THEME = {
  mk: { park: "#ff5aa5", park2: "rgba(255,90,165,.18)", parkText: "#0b0f14" },
  ep: { park: "#7c5cff", park2: "rgba(124,92,255,.18)", parkText: "#0b0f14" },
  hs: { park: "#ffb14a", park2: "rgba(255,177,74,.18)", parkText: "#0b0f14" },
  ak: { park: "#52d39a", park2: "rgba(82,211,154,.18)", parkText: "#0b0f14" }
};

const appEl = document.getElementById("app");
const parkSelect = document.getElementById("parkSelect");
const counterPill = document.getElementById("counterPill");
const dialogHost = document.getElementById("dialogHost");

const moreBtn = document.getElementById("moreBtn");
const moreMenu = document.getElementById("moreMenu");
const endToStartBtn = document.getElementById("endToStartBtn");

// Title in header (index.html uses id="appTitle")
const appTitle = document.getElementById("appTitle");

let rides = [];
let active = null;
let currentPark = "mk";

init();

async function init() {
  setupParksDropdown();
  setupMoreMenu();

  rides = await fetch("./data/rides.json").then(r => r.json());
  rides = rides.filter(r => r.active !== false);

  active = loadActiveChallenge();

  // If there's an active challenge but it's not "today" (cutoff logic handled in storage.js),
  // show Start page.
  if (active && !isActiveChallengeForNow(active)) {
    renderStartPage({ canAccessLast: !!loadLastChallenge() });
    setHeaderEnabled(false);
    applyParkTheme("mk");
    return;
  }

  if (active) {
    setHeaderEnabled(true);
    currentPark = "mk";
    parkSelect.value = currentPark;
    applyParkTheme(currentPark);
    renderParkPage({ readOnly: false });
  } else {
    renderStartPage({ canAccessLast: !!loadLastChallenge() });
    setHeaderEnabled(false);
    applyParkTheme("mk");
  }
}

function setupParksDropdown() {
  parkSelect.innerHTML = "";
  for (const p of PARKS) {
    const opt = document.createElement("option");
    opt.value = p.id;
    opt.textContent = p.name;
    parkSelect.appendChild(opt);
  }
  parkSelect.addEventListener("change", () => {
    currentPark = parkSelect.value;
    applyParkTheme(currentPark);
    if (active) renderParkPage({ readOnly: false });
  });
}

function setupMoreMenu() {
  moreBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    const expanded = moreBtn.getAttribute("aria-expanded") === "true";
    moreBtn.setAttribute("aria-expanded", String(!expanded));
    moreMenu.setAttribute("aria-hidden", String(expanded));
  });

  document.addEventListener("click", () => {
    moreBtn.setAttribute("aria-expanded", "false");
    moreMenu.setAttribute("aria-hidden", "true");
  });

  endToStartBtn.addEventListener("click", () => {
    moreBtn.setAttribute("aria-expanded", "false");
    moreMenu.setAttribute("aria-hidden", "true");

    openConfirmDialog({
      title: "End today’s challenge?",
      body: "This will clear all rides logged today and return you to the Start page. You can begin a new challenge immediately.",
      confirmText: "End challenge and return to Start",
      confirmClass: "btnDanger",
      onConfirm: () => {
        clearActiveChallenge();
        active = null;
        setHeaderEnabled(false);
        applyParkTheme("mk");
        renderStartPage({ canAccessLast: !!loadLastChallenge() });
      }
    });
  });

  // NEW: Tweet update moved into More menu (index.html button id="tweetUpdateMenuBtn")
  const tweetUpdateMenuBtn = document.getElementById("tweetUpdateMenuBtn");
  tweetUpdateMenuBtn?.addEventListener("click", () => {
    moreBtn.setAttribute("aria-expanded", "false");
    moreMenu.setAttribute("aria-hidden", "true");

    if (!active || !active.events || active.events.length === 0) {
      showToast("Log at least one ride first.");
      return;
    }

    // We'll wire image generation later (image_export.js)
    showToast("Update image generation is next (image_export.js).");
  });
}

function setHeaderEnabled(enabled) {
  // Hide app title on park pages
  if (appTitle) appTitle.style.display = enabled ? "none" : "block";

  // Show/hide controls
  parkSelect.style.display = enabled ? "inline-flex" : "none";
  moreBtn.style.display = enabled ? "inline-flex" : "none";
  counterPill.style.display = enabled ? "inline-flex" : "none";

  // Enable/disable
  parkSelect.disabled = !enabled;
  moreBtn.disabled = !enabled;
}

function applyParkTheme(parkId) {
  const t = PARK_THEME[parkId] || PARK_THEME.mk;
  document.documentElement.style.setProperty("--park", t.park);
  document.documentElement.style.setProperty("--park2", t.park2);
  document.documentElement.style.setProperty("--parkText", t.parkText);
}

function renderStartPage({ canAccessLast }) {
  appEl.innerHTML = `
    <div class="stack startPage">
      <div class="card">
        <div class="h1">Welcome</div>
        <p class="p">
          This app helps track rides and generate draft tweets for an Every Ride Challenge.
        </p>
        <p class="p" style="margin-top:10px;">
          It was created by an ordinary person (not a professional software engineer!) with the help of ChatGPT.
          Please manage expectations accordingly 🙂
        </p>
        <p class="p" style="margin-top:10px;">
          If something doesn’t work for you, feel free to compose your ride tweets manually.
        </p>
      </div>

      <div class="card">
        <div class="h1">Start a new challenge</div>

        <div class="formRow">
          <div class="label">Tags and hashtags</div>
          <textarea id="tagsText" class="textarea">#EveryRideWDW @RideEvery
Help me support @GKTWVillage by donating at the link below</textarea>
        </div>

        <div class="formRow">
          <div class="label">My fundraising link</div>
          <input id="fundLink" class="input" placeholder="https://..." />
        </div>

        <div class="btnRow" style="margin-top:12px;">
          <button id="startBtn" class="btn btnPrimary" type="button">Start a new challenge</button>
          ${canAccessLast ? `<button id="accessLastBtn" class="btn" type="button">Access most recent challenge</button>` : ""}
        </div>
      </div>
    </div>
  `;

  document.getElementById("startBtn")?.addEventListener("click", () => {
    const tagsText = document.getElementById("tagsText").value ?? "";
    const fundraisingLink = document.getElementById("fundLink").value ?? "";

    active = startNewChallenge({ tagsText, fundraisingLink });

    setHeaderEnabled(true);
    currentPark = "mk";
    parkSelect.value = currentPark;
    applyParkTheme(currentPark);
    renderParkPage({ readOnly: false });
  });

  const accessLastBtn = document.getElementById("accessLastBtn");
  if (accessLastBtn) {
    accessLastBtn.addEventListener("click", () => {
      const last = loadLastChallenge();
      if (!last) return;
      active = last;
      setHeaderEnabled(true);
      currentPark = "mk";
      parkSelect.value = currentPark;
      applyParkTheme(currentPark);
      renderParkPage({ readOnly: true });
      showToast("Viewing most recent challenge (read-only).");
    });
  }
}

function renderParkPage({ readOnly = false } = {}) {
  if (!active) return;

  const parkRides = rides
    .filter(r => r.park === currentPark)
    .sort((a, b) => (a.sortKey || "").localeCompare(b.sortKey || "", "en", { sensitivity: "base" }));

  const completedMap = buildCompletedMap(active.events);

  // Header pill text
  counterPill.textContent = `Rides: ${active.events.length}`;

  // Park page now only shows ride list (no park banner card)
  appEl.innerHTML = `
    <div class="stack">
      <div class="rides" role="list">
        ${parkRides.map(r => renderRideRow(r, completedMap, readOnly)).join("")}
      </div>
    </div>
  `;

  for (const r of parkRides) {
    const hasLL = !!r.ll;
    const hasSR = !!r.sr;
    const hasAnyAlt = hasLL || hasSR;

    const info = completedMap.get(r.id);
    const isCompleted = !!info;

    if (!readOnly) {
      if (!hasAnyAlt) {
        const nameBtn = document.querySelector(`[data-log-name="${r.id}"]`);
        nameBtn?.addEventListener("click", () => {
          if (isCompleted) return;
          logRide(r, "standby");
        });
      } else {
        // Buttons exist only when NOT completed
        if (!isCompleted) {
          document.querySelector(`[data-line="${r.id}:standby"]`)?.addEventListener("click", () => logRide(r, "standby"));
          if (hasLL) document.querySelector(`[data-line="${r.id}:ll"]`)?.addEventListener("click", () => logRide(r, "ll"));
          if (hasSR) document.querySelector(`[data-line="${r.id}:sr"]`)?.addEventListener("click", () => logRide(r, "sr"));
        }
      }

      // Undo/Edit button (only exists when completed)
      document.querySelector(`[data-undo="${r.id}"]`)?.addEventListener("click", () => {
        const eventInfo = completedMap.get(r.id);
        if (!eventInfo) return;
        openUndoEditDialog(r, eventInfo);
      });
    }
  }
}

function renderRideRow(r, completedMap, readOnly) {
  const info = completedMap.get(r.id);
  const completed = !!info;

  const hasLL = !!r.ll;
  const hasSR = !!r.sr;
  const hasAnyAlt = hasLL || hasSR;

  // Row 1: ride name only
  const nameIsClickable = !readOnly && !completed && !hasAnyAlt;
  const nameHtml = nameIsClickable
    ? `<button type="button" class="rideName" style="all:unset;display:block;cursor:pointer;font-weight:600;font-size:16px;" data-log-name="${r.id}">${escapeHtml(r.name)}</button>`
    : `<p class="rideName">${escapeHtml(r.name)}</p>`;

  // Row 2 for completed rides: "- completed using ..."
  const suffixHtml = completed ? renderCompletedSuffix(info.event.mode) : "";

  // Row 2 for uncompleted rides: line buttons (if applicable)
  let buttonsHtml = "";
  if (hasAnyAlt && !completed) {
    const colsClass = hasSR ? "three" : "two";
    const standbyBtn = renderLineButton(r.id, "standby", "Standby Line", false, readOnly);
    const llBtn = hasLL ? renderLineButton(r.id, "ll", "Lightning Lane", false, readOnly) : "";
    const srBtn = hasSR ? renderLineButton(r.id, "sr", "Single Rider", false, readOnly) : "";

    buttonsHtml = `
      <div class="lineButtons ${colsClass}">
        ${standbyBtn}
        ${llBtn}
        ${srBtn}
      </div>
    `;
  }

  const undoHtml = completed && !readOnly
    ? `<button class="smallBtn" type="button" data-undo="${r.id}">Undo/Edit</button>`
    : "";

  return `
    <div class="rideRow ${completed ? "completed" : ""}" role="listitem">
      <div class="rideMain">
        ${nameHtml}
        ${suffixHtml}
        ${buttonsHtml}
      </div>
      <div class="rideActions">${undoHtml}</div>
    </div>
  `;
}

function renderLineButton(rideId, mode, label, selected, readOnly) {
  const cls = ["lineBtn"];
  if (selected) cls.push("selected");
  if (readOnly) cls.push("disabled");
  return `
    <button
      type="button"
      class="${cls.join(" ")}"
      ${readOnly ? "disabled" : ""}
      data-line="${rideId}:${mode}">
      ${escapeHtml(label)}
    </button>
  `;
}

function renderCompletedSuffix(mode) {
  const label =
    mode === "ll" ? "Lightning Lane" :
    mode === "sr" ? "Single Rider" :
    "Standby Line";
  return `<div class="completedNote">- completed using ${label}</div>`;
}

function logRide(ride, mode) {
  if (!active) return;

  const now = new Date();
  const timeLabel = formatTime(now);
  const rideNumber = active.events.length + 1;

  const event = {
    id: crypto.randomUUID(),
    rideId: ride.id,
    park: ride.park,
    mode, // standby | ll | sr
    timeISO: now.toISOString(),
    rideName: ride.name
  };

  active.events.push(event);
  saveActiveChallenge(active);

  const tweetText = buildRideTweet({
    rideNumber,
    rideName: ride.name,
    mode,
    timeLabel
  });

  openTweetDraft(tweetText);
  renderParkPage({ readOnly: false });
}

function buildRideTweet({ rideNumber, rideName, mode, timeLabel }) {
  const base = `Ride ${rideNumber}. ${rideName}`;
  const mid =
    mode === "ll" ? " using Lightning Lane" :
    mode === "sr" ? " using Single Rider" :
    "";
  return `${base}${mid} at ${timeLabel}`;
}

function openTweetDraft(mainText) {
  const tags = (active?.tagsText ?? "").trim();
  const link = (active?.fundraisingLink ?? "").trim();

  let fullText = (mainText ?? "").trim();
  if (tags) fullText += "\n\n" + tags;
  if (link) fullText += "\n\n" + link;

  const url = new URL("https://twitter.com/intent/tweet");
  url.searchParams.set("text", fullText);
  window.open(url.toString(), "_blank", "noopener,noreferrer");
}

function buildCompletedMap(events) {
  const m = new Map();
  events.forEach((e, idx) => m.set(e.rideId, { index: idx, event: e }));
  return m;
}

// Line-type editor used by Undo/Edit
function openLineEditDialog(ride, info) {
  if (!active || !info) return;

  const idx = info.index;
  const currentMode = info.event.mode;

  openDialog({
    title: `Edit line used for ${ride.name}?`,
    body: `This will affect future updates only.\nPreviously sent tweets won’t be changed.`,
    content: `
      <div class="radioList">
        ${radioItem("standby", "Standby Line", currentMode)}
        ${radioItem("ll", "Lightning Lane", currentMode, !!ride.ll)}
        ${radioItem("sr", "Single Rider", currentMode, !!ride.sr)}
      </div>
    `,
    buttons: [
      { text: "Save changes", className: "btn btnPrimary", action: () => saveEdit(false) },
      { text: "Save & generate correction tweet", className: "btn", action: () => saveEdit(true) },
      { text: "Cancel", className: "btn", action: () => closeDialog() }
    ]
  });

  function radioItem(value, label, selected, enabled = true) {
    return `
      <label class="radioItem" style="${enabled ? "" : "opacity:.45"}">
        <input type="radio" name="mode" value="${value}" ${selected === value ? "checked" : ""} ${enabled ? "" : "disabled"} />
        <span>${escapeHtml(label)}</span>
      </label>
    `;
  }

  function saveEdit(withCorrectionTweet) {
    const picked = document.querySelector('input[name="mode"]:checked')?.value ?? currentMode;

    active.events[idx] = { ...active.events[idx], mode: picked };
    saveActiveChallenge(active);

    closeDialog();
    renderParkPage({ readOnly: false });

    showToast("Changes saved for future updates.");

    if (withCorrectionTweet) {
      const rideNumber = idx + 1;
      const line =
        picked === "ll" ? "Lightning Lane" :
        picked === "sr" ? "Single Rider" :
        "Standby Line";
      const txt = `Correction: Ride ${rideNumber}. ${ride.name} was via ${line}.`;
      openTweetDraft(txt);
    }
  }
}

// Legacy entry point (kept so older code paths won't break if reintroduced)
function openEditDialog(ride, info, tappedMode) {
  if (!info) return;
  const currentMode = info.event.mode;
  if (tappedMode && tappedMode === currentMode) return;
  openLineEditDialog(ride, info);
}

// Undo/Edit dialog for completed rides
function openUndoEditDialog(ride, eventInfo) {
  const hasAlt = !!ride.ll || !!ride.sr;

  const isMostRecent = eventInfo.index === active.events.length - 1;
  const warn = !isMostRecent
    ? "Note: This will renumber later rides today. Previously sent tweets won’t be changed."
    : "";

  const buttons = [
    {
      text: "Undo completion",
      className: "btn btnPrimary",
      action: () => {
        closeDialog();
        active.events = active.events.filter(e => e.id !== eventInfo.event.id);
        saveActiveChallenge(active);
        renderParkPage({ readOnly: false });
      }
    }
  ];

  if (hasAlt) {
    buttons.push({
      text: "Edit line used",
      className: "btn",
      action: () => {
        closeDialog();
        openLineEditDialog(ride, eventInfo);
      }
    });
  }

  buttons.push({ text: "Cancel", className: "btn", action: () => closeDialog() });

  openDialog({
    title: `Undo/Edit: ${ride.name}`,
    body: warn,
    content: "",
    buttons
  });
}

function openConfirmDialog({ title, body, confirmText, confirmClass, onConfirm }) {
  openDialog({
    title,
    body: body || "",
    content: "",
    buttons: [
      {
        text: confirmText || "Confirm",
        className: `btn btnPrimary ${confirmClass || ""}`.trim(),
        action: () => { closeDialog(); onConfirm(); }
      },
      { text: "Cancel", className: "btn", action: () => closeDialog() }
    ]
  });
}

function openDialog({ title, body, content, buttons }) {
  dialogHost.innerHTML = `
    <div class="dialogBackdrop" role="presentation">
      <div class="dialog" role="dialog" aria-modal="true">
        <h3>${escapeHtml(title)}</h3>
        ${body ? `<p>${escapeHtml(body).replaceAll("\n", "<br/>")}</p>` : ""}
        ${content || ""}
        <div class="btnRow" style="margin-top:10px;">
          ${buttons.map((b, i) => `<button data-dbtn="${i}" type="button" class="${b.className || "btn"}">${escapeHtml(b.text)}</button>`).join("")}
        </div>
      </div>
    </div>
  `;

  // click outside closes
  dialogHost.querySelector(".dialogBackdrop")?.addEventListener("click", (e) => {
    if (e.target.classList.contains("dialogBackdrop")) closeDialog();
  });

  buttons.forEach((b, i) => {
    dialogHost.querySelector(`[data-dbtn="${i}"]`)?.addEventListener("click", b.action);
  });
}

function closeDialog() {
  dialogHost.innerHTML = "";
}

function showToast(msg) {
  const el = document.createElement("div");
  el.className = "toast";
  el.textContent = msg;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 2200);
}

function formatTime(d) {
  let h = d.getHours();
  const m = String(d.getMinutes()).padStart(2, "0");
  const ampm = h >= 12 ? "PM" : "AM";
  h = h % 12;
  if (h === 0) h = 12;
  return `${h}:${m} ${ampm}`;
}

function escapeHtml(s) {
  return String(s)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
