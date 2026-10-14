import { configureStore } from '@reduxjs/toolkit';

import configSlice from './slices/configSlice';
import connectionSlice from './slices/connectionSlice';
import messageSlice from './slices/messageSlice';
import shortcutSlice from './slices/shortcutSlice';
import uiSlice from './slices/uiSlice';
import { localStorageMiddleware } from './middleware/localStorageMiddleware';
import websocketMiddleware from './middleware/websocketMiddleware';

const rootReducer = {
  messages: messageSlice,
  shortcuts: shortcutSlice,
  connections: connectionSlice,
  ui: uiSlice,
  config: configSlice,
};

export const store = configureStore({
  reducer: rootReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        // Ignore these action types
        ignoredActions: ['ui/setCardUpdateCallback'],
        // Ignore these field paths in all actions
        ignoredActionsPaths: ['payload.callback'],
        // Ignore these paths in the state
        ignoredPaths: ['ui.cardUpdateCallback'],
      },
    }).concat(localStorageMiddleware, websocketMiddleware),
});

// Types are exported from types.ts to avoid circular references
