// Preferences are optional: the app still works when storage is blocked.
export function readPreference(key, fallback) {
  try {
    return localStorage.getItem(key) ?? fallback;
  } catch {
    return fallback;
  }
}

export function savePreference(key, value) {
  try {
    localStorage.setItem(key, value);
  } catch {
    // Storage restrictions must not interrupt the form.
  }
}
