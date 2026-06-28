import { createSlice, PayloadAction } from '@reduxjs/toolkit';

import { MessageShortcut, ShortcutMessage } from '../../types';
import { loadShortcutsFromStorage } from '../middleware/localStorageMiddleware';

interface ShortcutState {
  shortcuts: MessageShortcut[];
  editingShortcut: MessageShortcut | null;
  
  // Card editing state
  editingCardMessageId: string | null;
  currentEditingCardData: any;
  cardUpdateTrigger: { messageId: string; cardData: any } | null;
}

// Load shortcuts from localStorage on initialization
const loadedShortcuts = loadShortcutsFromStorage();

const initialState: ShortcutState = {
  shortcuts: loadedShortcuts,
  editingShortcut: null,
  editingCardMessageId: null,
  currentEditingCardData: null,
  cardUpdateTrigger: null,
};

const shortcutSlice = createSlice({
  name: 'shortcuts',
  initialState,
  reducers: {
    // Shortcut CRUD operations
    addShortcut: (state, action: PayloadAction<MessageShortcut>) => {
      state.shortcuts.push(action.payload);
    },
    
    updateShortcut: (state, action: PayloadAction<MessageShortcut>) => {
      const index = state.shortcuts.findIndex(s => s.id === action.payload.id);
      if (index !== -1) {
        state.shortcuts[index] = action.payload;
      }
    },
    
    deleteShortcut: (state, action: PayloadAction<string>) => {
      state.shortcuts = state.shortcuts.filter(s => s.id !== action.payload);
    },
    
    duplicateShortcut: (state, action: PayloadAction<MessageShortcut>) => {
      const duplicated = {
        ...action.payload,
        id: Date.now().toString() + Math.random(),
        name: `${action.payload.name} (Copy)`,
        createdAt: new Date().toISOString(),
        lastUsed: undefined,
      };
      state.shortcuts.push(duplicated);
    },
    
    updateShortcutLastUsed: (state, action: PayloadAction<string>) => {
      const shortcut = state.shortcuts.find(s => s.id === action.payload);
      if (shortcut) {
        shortcut.lastUsed = new Date().toISOString();
      }
    },
    
    setShortcuts: (state, action: PayloadAction<MessageShortcut[]>) => {
      state.shortcuts = action.payload;
    },
    
    // Editing state
    setEditingShortcut: (state, action: PayloadAction<MessageShortcut | null>) => {
      state.editingShortcut = action.payload;
    },
    
    updateEditingShortcutMessage: (state, action: PayloadAction<{ messageId: string; content: string }>) => {
      if (state.editingShortcut) {
        const message = state.editingShortcut.messages.find(m => m.id === action.payload.messageId);
        if (message) {
          message.content = action.payload.content;
        }
      }
    },
    
    // Card editing state
    setEditingCardMessageId: (state, action: PayloadAction<string | null>) => {
      state.editingCardMessageId = action.payload;
    },
    
    setCurrentEditingCardData: (state, action: PayloadAction<any>) => {
      state.currentEditingCardData = action.payload;
    },
    
    setCardUpdateTrigger: (state, action: PayloadAction<{ messageId: string; cardData: any } | null>) => {
      state.cardUpdateTrigger = action.payload;
    },
    
    // Complex operations
    createShortcutFromTemplate: (state, action: PayloadAction<{ name: string; messages: ShortcutMessage[] }>) => {
      const newShortcut: MessageShortcut = {
        id: Date.now().toString() + Math.random(),
        name: action.payload.name,
        messages: action.payload.messages,
        createdAt: new Date().toISOString(),
      };
      state.shortcuts.push(newShortcut);
    },
    
    updateShortcutGameIds: (state, action: PayloadAction<{ shortcutId: string; newGameId: string }>) => {
      const shortcut = state.shortcuts.find(s => s.id === action.payload.shortcutId);
      if (shortcut) {
        shortcut.messages.forEach(message => {
          try {
            const data = JSON.parse(message.content);
            
            // Update various game ID fields based on message type
            if (data.id !== undefined) data.id = action.payload.newGameId;
            if (data.game !== undefined) data.game = action.payload.newGameId;
            if (data.gameId !== undefined) data.gameId = action.payload.newGameId;
            if (data.gId !== undefined) data.gId = action.payload.newGameId;
            
            message.content = JSON.stringify(data, null, 2);
          } catch (error) {
            // Skip invalid JSON
          }
        });
      }
    },
    
    clearCardEditingState: (state) => {
      state.editingCardMessageId = null;
      state.currentEditingCardData = null;
      state.cardUpdateTrigger = null;
    },
  },
});

export const {
  addShortcut,
  updateShortcut,
  deleteShortcut,
  duplicateShortcut,
  updateShortcutLastUsed,
  setShortcuts,
  setEditingShortcut,
  updateEditingShortcutMessage,
  setEditingCardMessageId,
  setCurrentEditingCardData,
  setCardUpdateTrigger,
  createShortcutFromTemplate,
  updateShortcutGameIds,
  clearCardEditingState,
} = shortcutSlice.actions;

export default shortcutSlice.reducer;