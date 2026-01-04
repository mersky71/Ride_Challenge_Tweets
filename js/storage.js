// storage.js
const KEY_ACTIVE = "erw_activeChallenge_v1";
const KEY_LAST = "erw_lastChallenge_v1";

export const CUTOFF_HOUR = 3; // 3:00 AM local time

export function dayKeyFor(date, cutoffHour = CUTOFF_HOUR) {
  // Challenge "day" is based on local time minus cutoff hours.
  const shifted = new Date(date.getTime() - cutoffHour * 60 * 60 * 1000);
  const y = shifted.getFullYear();
  const m = String(shifted.getMonth() + 1).padStart(2, "0");
  const d = String(shifted.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function loadActiveChallenge() {
  try {
    const raw = localStorage.getItem(KEY_ACTIVE);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function saveActiveChallenge(ch) {
  localStorage.setItem(KEY_ACTIVE, JSON.stringify(ch));
}

export function clearActiveChallenge() {
  localStorage.removeItem(KEY_ACTIVE);
}

export function loadLastChallenge() {
  try {
    const raw = localStorage.getItem(KEY_LAST);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function saveLastChallenge(ch) {
  localStorage.setItem(KEY_LAST, JSON.stringify(ch));
}

export function archiveActiveToLastIfPresent() {
  const active = loadActiveChallenge();
  if (active) saveLastChallenge(active);
}

export function startNewChallenge({ tagsText, fundraisingLink }) {
  // Archive any existing active challenge before overwriting.
  archiveActiveToLastIfPresent();

  const now = new Date();
  const dayKey = dayKeyFor(now);

  const challenge = {
    id: crypto.randomUUID(),
    dayKey,
    startedAt: now.toISOString(),
    settings: {
      tagsText: tagsText ?? "",
      fundraisingLink: fundraisingLink ?? ""
    },
    // Events are authoritative; numbering is derived from order.
    // event: { id, rideId, park, mode, timeISO }
    events: []
  };

  saveActiveChallenge(challenge);
  return challenge;
}

export function isActiveChallengeForNow(ch) {
  if (!ch) return false;
  const nowKey = dayKeyFor(new Date());
  return ch.dayKey === nowKey;
}