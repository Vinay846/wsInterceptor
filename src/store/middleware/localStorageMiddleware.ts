import { Middleware } from '@reduxjs/toolkit';

import { API_URLS, STORAGE_KEYS } from '../../constants';
import type { MessageShortcut } from '../../types';
import { saveShortcutsToServer } from '../../utils/shortcutsApi';

// Actions that should trigger shortcuts.json save on the server
const SHORTCUT_ACTIONS = new Set([
  'shortcuts/addShortcut',
  'shortcuts/updateShortcut',
  'shortcuts/deleteShortcut',
  'shortcuts/duplicateShortcut',
  'shortcuts/updateShortcutLastUsed',
  'shortcuts/togglePinShortcut',
  'shortcuts/reorderShortcuts',
  'shortcuts/setShortcuts',
  'shortcuts/updateShortcutGameIds',
  'shortcuts/createShortcutFromTemplate',
]);

let saveShortcutsTimer: ReturnType<typeof setTimeout> | null = null;
let pendingShortcuts: MessageShortcut[] | null = null;

function persistShortcutsToFile(shortcuts: MessageShortcut[]): void {
  pendingShortcuts = shortcuts;
  if (saveShortcutsTimer) clearTimeout(saveShortcutsTimer);
  saveShortcutsTimer = setTimeout(() => {
    saveShortcutsTimer = null;
    const toSave = pendingShortcuts;
    pendingShortcuts = null;
    if (!toSave) return;
    void saveShortcutsToServer(toSave).catch((err) => {
      console.error('Failed to save shortcuts.json:', err);
    });
  }, 150);
}

// Flush pending write on tab close so the last edit is not lost
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    if (!pendingShortcuts) return;
    // keepalive fetch so the write can finish during unload
    void fetch(API_URLS.SHORTCUTS, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ shortcuts: pendingShortcuts }),
      keepalive: true,
    });
  });
}

// Middleware to sync shortcuts to shortcuts.json (and keep env/recording in localStorage)
export const localStorageMiddleware: Middleware = (store) => (next) => (action) => {
  const result = next(action);
  const type = (action as { type?: string }).type;

  if (type && SHORTCUT_ACTIONS.has(type)) {
    try {
      persistShortcutsToFile(store.getState().shortcuts.shortcuts);
    } catch {
      // ignore
    }
  }

  if (type === 'config/setEnvUrl') {
    try {
      localStorage.setItem(STORAGE_KEYS.ENV_URL, store.getState().config.envUrl || '');
    } catch {
      // ignore
    }
  }

  if (type === 'config/setRecordingConfig') {
    try {
      const { recordStartKey, recordStopKey } = store.getState().config;
      localStorage.setItem(STORAGE_KEYS.RECORDING, JSON.stringify({ recordStartKey, recordStopKey }));
    } catch {
      // ignore
    }
  }

  return result;
};
