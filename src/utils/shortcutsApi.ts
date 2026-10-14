import { API_URLS, STORAGE_KEYS } from '../constants';
import type { MessageShortcut } from '../types';

const LOAD_FLAG = '__wsInterceptorShortcutsLoaded';
const LOAD_PROMISE = '__wsInterceptorShortcutsPromise';

type ShortcutsGlobal = typeof globalThis & {
  [LOAD_FLAG]?: boolean;
  [LOAD_PROMISE]?: Promise<MessageShortcut[]>;
};

async function doFetchShortcuts(): Promise<MessageShortcut[]> {
  const response = await fetch(API_URLS.SHORTCUTS);
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  const contentType = response.headers.get('content-type') || '';
  if (!contentType.includes('application/json')) {
    throw new Error('Shortcuts API returned non-JSON (restart the server)');
  }

  const serverData = await response.json();
  let shortcutsList: MessageShortcut[] = Array.isArray(serverData.shortcuts)
    ? serverData.shortcuts
    : [];

  // One-time migration from legacy localStorage → shortcuts.json
  if (shortcutsList.length === 0) {
    try {
      const legacy = localStorage.getItem(STORAGE_KEYS.SHORTCUTS);
      if (legacy) {
        const parsed = JSON.parse(legacy);
        if (Array.isArray(parsed) && parsed.length > 0) {
          shortcutsList = parsed;
          await saveShortcutsToServer(shortcutsList);
          localStorage.removeItem(STORAGE_KEYS.SHORTCUTS);
        }
      }
    } catch {
      // keep whatever the file had
    }
  }

  return shortcutsList;
}

/**
 * Exactly one GET /api/shortcuts for the lifetime of the page.
 * Safe under React Strict Mode, Vite HMR, and multiple import sites.
 */
export function loadShortcutsOnce(): Promise<MessageShortcut[]> {
  const g = globalThis as ShortcutsGlobal;

  if (g[LOAD_PROMISE]) {
    return g[LOAD_PROMISE];
  }

  if (g[LOAD_FLAG]) {
    return Promise.resolve([]);
  }

  g[LOAD_FLAG] = true;
  g[LOAD_PROMISE] = doFetchShortcuts().catch((err) => {
    // Allow a manual retry only if the first attempt failed
    g[LOAD_FLAG] = false;
    g[LOAD_PROMISE] = undefined;
    throw err;
  });

  return g[LOAD_PROMISE];
}

export async function saveShortcutsToServer(shortcuts: MessageShortcut[]): Promise<void> {
  const response = await fetch(API_URLS.SHORTCUTS, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ shortcuts }),
  });

  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new Error(`Failed to save shortcuts.json (${response.status}): ${text}`);
  }
}
