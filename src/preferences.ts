// Visitor preferences stored in the browser: globe/flat map and light/dark theme.
// localStorage may not exist or may fail (private mode, blocked cookies): it never breaks the app.

export function readPreference(key: string): string | null {
  try {
    return localStorage.getItem("atlas:" + key);
  } catch {
    return null;
  }
}

export function savePreference(key: string, value: string): void {
  try {
    localStorage.setItem("atlas:" + key, value);
  } catch {
    /* no problem: it just won't remember on the next visit */
  }
}

export function deletePreference(key: string): void {
  try {
    localStorage.removeItem("atlas:" + key);
  } catch {
    /* same */
  }
}
