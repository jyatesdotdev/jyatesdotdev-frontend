const STORAGE_KEY = 'jyates-jsh-files';

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
