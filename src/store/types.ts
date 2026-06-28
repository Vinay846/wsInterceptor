import configSlice from './slices/configSlice';
import connectionSlice from './slices/connectionSlice';
import messageSlice from './slices/messageSlice';
import shortcutSlice from './slices/shortcutSlice';
import uiSlice from './slices/uiSlice';

export type RootState = {
  messages: ReturnType<typeof messageSlice>;
  shortcuts: ReturnType<typeof shortcutSlice>;
  connections: ReturnType<typeof connectionSlice>;
  ui: ReturnType<typeof uiSlice>;
  config: ReturnType<typeof configSlice>;
};

export type AppDispatch = any; // Will be properly typed after store creation