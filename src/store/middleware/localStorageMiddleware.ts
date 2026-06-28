import { Middleware } from '@reduxjs/toolkit';
import { STORAGE_KEYS } from '../../constants';

// Actions that should trigger localStorage save
const SHORTCUT_ACTIONS = [
  'shortcuts/addShortcut',
  'shortcuts/updateShortcut',
  'shortcuts/deleteShortcut',
  'shortcuts/duplicateShortcut',
  'shortcuts/updateShortcutLastUsed',
  'shortcuts/setShortcuts',
  'shortcuts/updateShortcutGameIds',
];

// Middleware to sync shortcuts to localStorage
export const localStorageMiddleware: Middleware = (store) => (next) => (action) => {
  const result = next(action);

  // Check if this action affects shortcuts
  if (SHORTCUT_ACTIONS.includes(action.type)) {
    try {
      const state = store.getState();
      const shortcuts = state.shortcuts.shortcuts;
      localStorage.setItem(STORAGE_KEYS.SHORTCUTS, JSON.stringify(shortcuts));
    } catch (error) {
    }
  }

  return result;
};

// Load shortcuts from localStorage on app init
export const loadShortcutsFromStorage = () => {
  try {
    const savedShortcuts = localStorage.getItem(STORAGE_KEYS.SHORTCUTS);
    if (savedShortcuts) {
      const parsed = JSON.parse(savedShortcuts);
      return parsed;
    }
    return [];
  } catch (error) {
    return [];
  }
};

