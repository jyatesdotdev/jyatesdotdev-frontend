const STORAGE_KEY = 'jyates-jsh-files';
const HISTORY_STORAGE_KEY = 'jyates-jsh-history';
const MAX_HISTORY_ENTRIES = 100;

/** Loads user-created terminal files from localStorage. Tolerates bad data. */
export function loadUserFiles(): Record<string, string> {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) return {};
    return Object.fromEntries(
      Object.entries(parsed).filter(([, v]) => typeof v === 'string')
    ) as Record<string, string>;
  } catch {
    return {};
  }
}

export function saveUserFiles(files: Record<string, string>): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(files));
  } catch {
    // Storage full or unavailable — the in-memory session still works
  }
}

/** Loads a bounded, validated command history from its own storage record. */
export function loadCommandHistory(): string[] {
  try {
    const raw = window.localStorage.getItem(HISTORY_STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((value): value is string => typeof value === 'string' && value.trim() !== '')
      .slice(-MAX_HISTORY_ENTRIES);
  } catch {
    return [];
  }
}

export function saveCommandHistory(history: string[]): void {
  try {
    window.localStorage.setItem(
      HISTORY_STORAGE_KEY,
      JSON.stringify(history.slice(-MAX_HISTORY_ENTRIES))
    );
  } catch {
    // Storage full or unavailable — the in-memory session still works
  }
}
