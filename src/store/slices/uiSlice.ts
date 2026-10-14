import { createSlice, PayloadAction } from '@reduxjs/toolkit';

import { ToastMessage, RoundStatus } from '../../types';

interface UIState {
  // Modal states
  showCardPopup: boolean;
  showShortcutModal: boolean;
  showErrorModal: boolean;
  
  // Toast notification
  toastMessage: ToastMessage | null;
  
  // Round status
  roundStatus: RoundStatus;
  
  // Loading states
  isUpdatingGameId: boolean;
  isSendingShortcut: boolean;

  // When true, shortcut sends keep the current game/round ID (no auto-rotate)
  persistRoundId: boolean;
  
  // Card update callback (non-serializable)
  cardUpdateCallback: ((messageId: string, cardData: any) => void) | null;
  
  // Form states
  isFormDirty: boolean;
  lastSavedTime: string | null;
}

const initialState: UIState = {
  showCardPopup: false,
  showShortcutModal: false,
  showErrorModal: false,
  toastMessage: null,
  roundStatus: {
    status: 'waiting',
    message: 'Waiting for round to start...',
  },
  isUpdatingGameId: false,
  isSendingShortcut: false,
  persistRoundId: false,
  cardUpdateCallback: null,
  isFormDirty: false,
  lastSavedTime: null,
};

const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    // Modal controls
    setShowCardPopup: (state, action: PayloadAction<boolean>) => {
      state.showCardPopup = action.payload;
    },
    
    setShowShortcutModal: (state, action: PayloadAction<boolean>) => {
      state.showShortcutModal = action.payload;
    },
    
    setShowErrorModal: (state, action: PayloadAction<boolean>) => {
      state.showErrorModal = action.payload;
    },
    
    closeAllModals: (state) => {
      state.showCardPopup = false;
      state.showShortcutModal = false;
      state.showErrorModal = false;
    },
    
    // Toast notifications
    setToastMessage: (state, action: PayloadAction<ToastMessage | null>) => {
      state.toastMessage = action.payload;
    },
    
    showToast: (state, action: PayloadAction<{ title: string; message: string }>) => {
      state.toastMessage = {
        title: action.payload.title,
        message: action.payload.message,
      };
    },
    
    hideToast: (state) => {
      state.toastMessage = null;
    },
    
    // Round status
    setRoundStatus: (state, action: PayloadAction<RoundStatus>) => {
      state.roundStatus = action.payload;
    },
    
    updateRoundStatus: (state, action: PayloadAction<{ status?: 'waiting' | 'active' | 'complete'; message?: string }>) => {
      if (action.payload.status) {
        state.roundStatus.status = action.payload.status;
      }
      if (action.payload.message) {
        state.roundStatus.message = action.payload.message;
      }
    },
    
    // Loading states
    setIsUpdatingGameId: (state, action: PayloadAction<boolean>) => {
      state.isUpdatingGameId = action.payload;
    },
    
    setIsSendingShortcut: (state, action: PayloadAction<boolean>) => {
      state.isSendingShortcut = action.payload;
    },

    setPersistRoundId: (state, action: PayloadAction<boolean>) => {
      state.persistRoundId = action.payload;
    },

    togglePersistRoundId: (state) => {
      state.persistRoundId = !state.persistRoundId;
    },
    
    // Card update callback (non-serializable)
    setCardUpdateCallback: (state, action: PayloadAction<((messageId: string, cardData: any) => void) | null>) => {
      state.cardUpdateCallback = action.payload;
    },
    
    // Form states
    setIsFormDirty: (state, action: PayloadAction<boolean>) => {
      state.isFormDirty = action.payload;
    },
    
    setLastSavedTime: (state, action: PayloadAction<string | null>) => {
      state.lastSavedTime = action.payload;
    },
    
    markFormSaved: (state) => {
      state.isFormDirty = false;
      state.lastSavedTime = new Date().toISOString();
    },
    
    // Complex operations
    showSuccessToast: (state, action: PayloadAction<string>) => {
      state.toastMessage = {
        title: '✅ Success',
        message: action.payload,
      };
    },
    
    showErrorToast: (state, action: PayloadAction<string>) => {
      state.toastMessage = {
        title: '❌ Error',
        message: action.payload,
      };
    },
    
    showWarningToast: (state, action: PayloadAction<string>) => {
      state.toastMessage = {
        title: '⚠️ Warning',
        message: action.payload,
      };
    },
    
    showInfoToast: (state, action: PayloadAction<string>) => {
      state.toastMessage = {
        title: 'ℹ️ Info',
        message: action.payload,
      };
    },
    
    startRound: (state, action: PayloadAction<string>) => {
      state.roundStatus = {
        status: 'active',
        message: `Round ${action.payload} in progress...`,
      };
    },
    
    completeRound: (state, action: PayloadAction<string>) => {
      state.roundStatus = {
        status: 'complete',
        message: `Round ${action.payload} completed!`,
      };
    },
    
    resetUI: (state) => {
      state.showCardPopup = false;
      state.showShortcutModal = false;
      state.showErrorModal = false;
      state.toastMessage = null;
      state.isUpdatingGameId = false;
      state.isSendingShortcut = false;
      state.persistRoundId = false;
      state.isFormDirty = false;
      state.roundStatus = {
        status: 'waiting',
        message: 'Waiting for round to start...',
      };
    },
  },
});

export const {
  setShowCardPopup,
  setShowShortcutModal,
  setShowErrorModal,
  closeAllModals,
  setToastMessage,
  showToast,
  hideToast,
  setRoundStatus,
  updateRoundStatus,
  setIsUpdatingGameId,
  setIsSendingShortcut,
  setPersistRoundId,
  togglePersistRoundId,
  setCardUpdateCallback,
  setIsFormDirty,
  setLastSavedTime,
  markFormSaved,
  showSuccessToast,
  showErrorToast,
  showWarningToast,
  showInfoToast,
  startRound,
  completeRound,
  resetUI,
} = uiSlice.actions;

export default uiSlice.reducer;