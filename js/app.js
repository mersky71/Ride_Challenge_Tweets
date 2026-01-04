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

// Easy-to-swap park colors (change here later)
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

let rides = []; // loaded from data/rides.json
let active = null; // active challenge object
let currentPark = "mk";

init();

async function init() {
  setupParksDropdown();
  setupMoreMenu();

  rides = await fetch("./data/rides.json").then(r => r.json());
  // Filter active rides only (future-proof)
  rides = rides.filter(r => r.active !== false);

  active = loadActiveChallenge();
  if (active && !isActiveChallengeForNow(active)) {
    // Not active for current challenge-day -> show Start page
    renderStartPage({ canAccessLast: !!loadLastChallenge() });
    setHeaderEnabled(false);
    applyParkTheme("mk");
    return;
  }

  if (active) {
    // Resume today
    setHeaderEnabled(true);
    currentPark = "mk";
    parkSelect.value = currentPark;
    applyParkTheme(currentPark);
    renderParkPage();
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
    if (active) renderParkPage();
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
}

function setHeaderEnabled(enabled) {
  parkSelect.disabled = !enabled;
  moreBtn.disabled = !enabled;
  counterPill.textContent = enabled ? "" : "—";
}

function applyParkTheme(parkId) {
  const t = PARK_THEME[parkId] || PARK_THEME.mk;
  document.documentElement.style.setProperty("--park", t.park);
  document.documentElement.style.setProperty("--park2", t.park2);
  document.documentElement.style.setProperty("--parkText", t.parkText);
}

function renderStartPage({ canAccessLast }) {
  appEl.innerHTML = `
    <div class="stack">
      <div class="card">
        <div class="h1">Welcome</div>
        <p class="p">
          This app helps track rides and generate draft tweets for an Every Ride Challenge.
        </p>
        <p class="p" style="margin-top:10px;">
          It was created by an ordinary person (not a professional software engineer!) with the help of ChatGPT.
          Please manage expectations accordingly ??
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
          <div class="label">Fundraising link</div>
          <input id="fundLink" class="input" placeholder="https://..." />
        </div>

        <div class="btnRow" style="margin-top:12px;">
          <button id="startBtn" class="btn btnPrimary" type="button">Start a new challenge</button>
          ${canAccessLast ? `<button id="accessLastBtn" class="btn" type="button">Access most recent challenge</button>` : ""}
        </div>
      </div>
    </div>
  `;

  const startBtn = document.getElementById("startBtn");
  startBtn.addEventListener("click", () => {
    const tagsText = document.getElementById("tagsText").value ?? "";
    const fundraisingLink = document.getElementById("fundLink").value ?? "";

    active = startNewChallenge({ tagsText, fundraisingLink });
    setHeaderEnabled(true);
    currentPark = "mk";
    parkSelect.value = currentPark;
    applyParkTheme(currentPark);
    renderParkPage();
  });

  const accessLastBtn = document.getElementById("accessLastBtn");
  if (accessLastBtn) {
    accessLastBtn.addEventListener("click", () => {
      const last = loadLastChallenge();
      if (!last) return;
      // Open read-only view: for v1, we’ll just load it into active *without allowing logging*.
      // To keep it simple right now, we’ll render a park page with logging disabled and only allow update-image later.
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

  const parkName = PARKS.find(p => p.id === currentPark)?.name ?? "";
  const parkRides = rides
    .filter(r => r.park === currentPark)
    .sort((a, b) => (a.sortKey || "").localeCompare(b.sortKey || "", "en", { sensitivity: "base" }));

  const completedMap = buildCompletedMap(active.events); // rideId -> { index, event }
  const parkEventIndexes = active.events
    .map((e, idx) => ({ e, idx }))
    .filter(x => x.e.park === currentPark);

  counterPill.textContent = `${active.events.length} rides today`;

  appEl.innerHTML = `
    <div class="stack">
      <div class="card">
        <div class="sectionTitle">
          <h2>${escapeHtml(parkName)}</h2>
          <div class="subtle">${readOnly ? "Read-only view" : ""}</div>
        </div>

        <div class="btnRow" style="margin-top:10px;">
          <button id="undoLastBtn" class="btn" type="button" ${readOnly || parkEventIndexes.length === 0 ? "disabled" : ""}>
            Undo last (this park)
          </button>
          <button id="tweetUpdateBtn" class="btn" type="button" ${active.events.length === 0 ? "disabled" : ""}>
            Tweet an update (image)
          </button>
        </div>
      </div>

      <div class="rides" role="list">
        ${parkRides.map(r => renderRideRow(r, completedMap, readOnly)).join("")}
      </div>
    </div>
  `;

  document.getElementById("undoLastBtn")?.addEventListener("click", () => {
    const lastParkEvent = [...active.events].reverse().find(e => e.park === currentPark);
    if (!lastParkEvent) return;

    openConfirmDialog({
      title: `Undo today’s completion for ${lastParkEvent.rideShort}?`,
      body: "",
      confirmText: "Undo completion",
      onConfirm: () => {
        active.events = active.events.filter(e => e.id !== lastParkEvent.id);
        saveActiveChallenge(active);
        renderParkPage({ readOnly });
      }
    });
  });

  document.getElementById("tweetUpdateBtn")?.addEventListener("click", () => {
    // Placeholder for v1 scaffold: we’ll wire image generation next.
    showToast("Update image generation will be the next file we add (image_export.js).");
  });

  // Wire ride actions
  for (const r of parkRides) {
    // Log actions (only if not read-only)
    if (!readOnly) {
      const standbyBtn = document.querySelector(`[data-standby="${r.id}"]`);
      standbyBtn?.addEventListener("click", () => logRide(r, "standby"));

      const llBtn = document.querySelector(`[data-ll="${r.id}"]`);
      llBtn?.addEventListener("click", () => {
        if (isRideCompleted(r.id)) {
          openEditDialog(r);
        } else {
          logRide(r, "ll");
        }
      });

      const srBtn = document.querySelector(`[data-sr="${r.id}"]`);
      srBtn?.addEventListener("click", () => {
        if (isRideCompleted(r.id)) {
          openEditDialog(r);
        } else {
          logRide(r, "sr");
        }
      });
    } else {
      // Read-only: allow edit? no. (v1)
      // no listeners
    }

    // Undo completion (per ride)
    const undoBtn = document.querySelector(`[data-undo="${r.id}"]`);
    undoBtn?.addEventListener("click", () => {
      const eventInfo = completedMap.get(r.id);
      if (!eventInfo) return;

      const isMostRecent = eventInfo.index === active.events.length - 1;
      const warn = !isMostRecent
        ? "This will renumber later rides today. Previously sent tweets won’t be changed."
        : "";

      openConfirmDialog({
        title: `Undo today’s completion for ${r.name}?`,
        body: warn,
        confirmText: "Undo completion",
        onConfirm: () => {
          active.events = active.events.filter(e => e.id !== eventInfo.event.id);
          saveActiveChallenge(active);
          renderParkPage({ readOnly });
        }
      });
    });
  }

  function isRideCompleted(rideId) {
    return completedMap.has(rideId);
  }
}

function renderRideRow(r, completedMap, readOnly) {
  const info = completedMap.get(r.id);
  const completed = !!info;

  const hasAnyAltLine = !!(r.ll || r.sr);

  // Active state UI:
  // - For rides with LL/SR: show "(standby)" and explicit LL/SR pills
  // - For rides without LL/SR: only ride name (tap logs standby)
  //
  // Completed state UI:
  // - Greyed out
  // - If ride had LL/SR capability: show "— using X"
  // - If no LL/SR capability: no "using standby" text

  const completedSuffix = completed
    ? renderCompletedSuffix(info.event.mode, hasAnyAltLine)
    : "";

  const standbyLabel = hasAnyAltLine ? `<span class="modeHint">(standby)</span>` : "";

  const standbyBtn = hasAnyAltLine
    ? `<button class="modePill" type="button" data-standby="${r.id}" ${completed || readOnly ? "disabled" : ""}>
         <strong>${escapeHtml(r.shortName)}</strong> ${standbyLabel}
       </button>`
    : `<button class="modePill" type="button" data-standby="${r.id}" ${completed || readOnly ? "disabled" : ""}>
         <strong>${escapeHtml(r.shortName)}</strong>
       </button>`;

  const llPill = r.ll
    ? `<button class="modePill" type="button" data-ll="${r.id}" ${readOnly ? "disabled" : ""}>
         ? <span>using Lightning Lane</span>
       </button>`
    : "";

  const srPill = r.sr
    ? `<button class="modePill" type="button" data-sr="${r.id}" ${readOnly ? "disabled" : ""}>
         ?? <span>using Single Rider</span>
       </button>`
    : "";

  const rightUndo = completed
    ? `<button class="smallBtn" type="button" data-undo="${r.id}">Undo completion</button>`
    : "";

  return `
    <div class="rideRow ${completed ? "completed" : ""}" role="listitem">
      <div class="rideMain">
        <p class="rideName">${escapeHtml(r.name)}${completedSuffix}</p>
        <div class="rideMeta">
          ${standbyBtn}
          ${llPill}
          ${srPill}
        </div>
      </div>
      <div class="rideActions">
        ${rightUndo}
      </div>
    </div>
  `;
}

function renderCompletedSuffix(mode, hadAltLines) {
  if (!hadAltLines) return ""; // don’t say "using standby" for rides with no LL/SR
  if (mode === "ll") return ` <span class="subtle">— using Lightning Lane</span>`;
  if (mode === "sr") return ` <span class="subtle">— using Single Rider</span>`;
  return ` <span class="subtle">— using standby</span>`;
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
    rideShort: ride.shortName
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
  renderParkPage();
}

function buildRideTweet({ rideNumber, rideName, mode, timeLabel }) {
  const base = `Ride ${rideNumber}. ${rideName}`;
  const mid = mode === "ll"
    ? " using Lightning Lane"
    : mode === "sr"
      ? " using Single Rider"
      : "";
  return `${base}${mid} at ${timeLabel}`;
}

function openTweetDraft(text) {
  const url = new URL("https://twitter.com/intent/tweet");
  url.searchParams.set("text", text);

  // Optional: include tags/hashtags and fundraising link in the draft (your spec currently focuses on ride text,
  // but we are storing these for later. We'll keep them out of the ride tweet for now.)
  window.open(url.toString(), "_blank", "noopener,noreferrer");
}

function buildCompletedMap(events) {
  const m = new Map();
  events.forEach((e, idx) => {
    m.set(e.rideId, { index: idx, event: e });
  });
  return m;
}

function openEditDialog(ride) {
  const info = buildCompletedMap(active.events).get(ride.id);
  if (!info) return;

  const currentMode = info.event.mode;
  const title = `Edit LL/SR use for ${ride.name}?`;

  openDialog({
    title,
    body: `Update how you rode this attraction today.\nThis will affect future updates only.`,
    content: `
      <div class="radioList">
        ${radioItem("standby", "Standby", currentMode)}
        ${radioItem("ll", "Lightning Lane", currentMode)}
        ${radioItem("sr", "Single Rider", currentMode)}
      </div>
    `,
    buttons: [
      { text: "Save changes", className: "btn btnPrimary", action: () => saveEdit(false) },
      { text: "Save & generate correction tweet", className: "btn", action: () => saveEdit(true) },
      { text: "Cancel", className: "btn", action: () => closeDialog() }
    ]
  });

  function radioItem(value, label, selected) {
    return `
      <label class="radioItem">
        <input type="radio" name="mode" value="${value}" ${selected === value ? "checked" : ""} />
        <span>${escapeHtml(label)}</span>
      </label>
    `;
  }

  function saveEdit(withCorrectionTweet) {
    const picked = document.querySelector('input[name="mode"]:checked')?.value ?? currentMode;

    // Update the existing event in-place
    const idx = info.index;
    active.events[idx] = { ...active.events[idx], mode: picked };
    saveActiveChallenge(active);

    closeDialog();
    renderParkPage();

    showToast("Changes apply to future updates. Previously sent tweets won’t be changed.");

    if (withCorrectionTweet) {
      const rideNumber = idx + 1; // numbering derived from position
      const line = picked === "ll"
        ? "Lightning Lane"
        : picked === "sr"
          ? "Single Rider"
          : "standby";
      const txt = `Correction: Ride ${rideNumber}. ${ride.name} was via ${line}.`;
      openTweetDraft(txt);
    }
  }
}

function openConfirmDialog({ title, body, confirmText, confirmClass, onConfirm }) {
  openDialog({
    title,
    body: body || "",
    content: "",
    buttons: [
      { text: confirmText || "Confirm", className: `btn btnPrimary ${confirmClass || ""}`.trim(), action: () => { closeDialog(); onConfirm(); } },
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

  // Close on backdrop click
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
  setTimeout(() => el.remove(), 2600);
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