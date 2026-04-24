const STORAGE_KEY = 'jyatesdotdev-visitor-id';

function generateUUID(): string {
  return crypto.randomUUID();
}

export function getVisitorId(): string {
  try {
    let id = localStorage.getItem(STORAGE_KEY);
    if (!id) {
      id = generateUUID();
      localStorage.setItem(STORAGE_KEY, id);
    }
    return id;
  } catch {
    // localStorage unavailable (private browsing, etc.) — generate ephemeral ID
    return generateUUID();
  }
}
