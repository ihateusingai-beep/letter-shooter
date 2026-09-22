// js/dataio.js — Export/import localStorage progress (Phase 19.6 / C1)
// Allows teacher/student to back up progress before browser data clear,
// or transfer progress to another device.

const EXPORT_KEYS = ['ls-settings', 'ls-progress', 'ls-leaderboard', 'ls-daily', 'ls-weekly'];
const EXPORT_VERSION = '1.0';
const APP_VERSION = '1.7.1'; // Keep in sync with HANDOVER.md version header

/**
 * Collect all localStorage keys starting with 'ls-' (minus ls-cd-* if any)
 * and return as a JSON-serializable object.
 */
export function collectLocalStorage() {
  const out = {};
  for (const key of EXPORT_KEYS) {
    const raw = localStorage.getItem(key);
    if (raw !== null) {
      try {
        out[key] = JSON.parse(raw);
      } catch {
        // Store raw string as fallback (e.g. malformed JSON from old version)
        out[key] = raw;
      }
    }
  }
  return out;
}

/**
 * Build the full export payload with metadata wrapper.
 */
export function buildExportPayload() {
  return {
    version: EXPORT_VERSION,
    exportedAt: new Date().toISOString(),
    appVersion: APP_VERSION,
    data: collectLocalStorage(),
  };
}

/**
 * Serialize payload to JSON string (pretty-printed for readability).
 */
export function serializeExport() {
  return JSON.stringify(buildExportPayload(), null, 2);
}

/**
 * Trigger browser download of the export payload as <appName>-YYYY-MM-DD.json.
 * Returns the suggested filename.
 */
export function downloadExport() {
  const json = serializeExport();
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const date = new Date().toISOString().slice(0, 10);
  const filename = `letter-shooter-${date}.json`;

  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  // Free the object URL after a tick to ensure download starts
  setTimeout(() => URL.revokeObjectURL(url), 0);

  return filename;
}

/**
 * Validate an import payload. Throws Error with a user-facing message on failure.
 * Returns the parsed payload on success.
 */
export function parseImport(jsonString) {
  if (!jsonString || typeof jsonString !== 'string') {
    throw new Error('檔案內容空白');
  }
  let parsed;
  try {
    parsed = JSON.parse(jsonString);
  } catch {
    throw new Error('JSON 格式錯誤');
  }
  if (!parsed || typeof parsed !== 'object') {
    throw new Error('JSON 結構錯誤');
  }
  if (!parsed.data || typeof parsed.data !== 'object') {
    throw new Error('缺少 data 欄位');
  }
  // Verify expected keys are present (allow partial — only warn for unknown keys)
  const knownKeys = new Set(EXPORT_KEYS);
  const incomingKeys = Object.keys(parsed.data);
  const unknownKeys = incomingKeys.filter(k => !knownKeys.has(k));
  return { payload: parsed, unknownKeys };
}

/**
 * Apply an import payload to localStorage. Overwrites existing keys with the
 * imported values. Only the keys present in `payload.data` are touched.
 * Returns { appliedKeys, skippedKeys, unknownKeys }.
 */
export function applyImport(payload) {
  const appliedKeys = [];
  const skippedKeys = [];
  for (const key of EXPORT_KEYS) {
    if (key in payload.data) {
      try {
        // Re-serialize through JSON to validate it's stringifiable
        localStorage.setItem(key, JSON.stringify(payload.data[key]));
        appliedKeys.push(key);
      } catch (e) {
        skippedKeys.push(key);
      }
    }
  }
  return { appliedKeys, skippedKeys };
}

/**
 * High-level: parse + apply a JSON import string. Throws on validation failure.
 * Returns a summary object.
 */
export function importFromString(jsonString) {
  const { payload, unknownKeys } = parseImport(jsonString);
  const { appliedKeys, skippedKeys } = applyImport(payload);
  return {
    version: payload.version,
    exportedAt: payload.exportedAt,
    appVersion: payload.appVersion,
    appliedKeys,
    skippedKeys,
    unknownKeys,
  };
}