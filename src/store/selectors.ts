import { createSelector } from '@reduxjs/toolkit';

import type { RootState } from './types';

// Message selectors
export const selectMessages = (state: RootState) => state.messages;
export const selectExternalMessages = (state: RootState) => state.messages.externalMessages;
export const selectDevMessages = (state: RootState) => state.messages.devMessages;
export const selectSelectedKey = (state: RootState) => state.messages.selectedKey;
export const selectMessageContent = (state: RootState) => state.messages.messageContent;
export const selectBridgeMode = (state: RootState) => state.messages.bridgeMode;
export const selectResponses = (state: RootState) => state.messages.responses;

// Memoized current message selector
export const selectCurrentMessage = createSelector(
  [selectSelectedKey, selectMessageContent],
  (selectedKey, content) => ({
    selectedKey,
    content,
  })
);

// Round data base selectors
const selectCollectedRoundData = (state: RootState) => state.messages.collectedRoundData;
const selectPreviousRoundData = (state: RootState) => state.messages.previousRoundData;
const selectCurrentGameId = (state: RootState) => state.messages.currentGameId;
const selectIsDataLoading = (state: RootState) => state.messages.isDataLoading;

// Memoized round data selector
export const selectRoundData = createSelector(
  [selectCollectedRoundData, selectPreviousRoundData, selectCurrentGameId, selectIsDataLoading],
  (collected, previous, currentGameId, isLoading) => ({
    collected,
    previous,
    currentGameId,
    isLoading,
  })
);

// Shortcut selectors
export const selectShortcuts = (state: RootState) => state.shortcuts;
export const selectShortcutsList = (state: RootState) => state.shortcuts.shortcuts;
export const selectEditingShortcut = (state: RootState) => state.shortcuts.editingShortcut;
const selectEditingCardMessageId = (state: RootState) => state.shortcuts.editingCardMessageId;
const selectCurrentEditingCardData = (state: RootState) => state.shortcuts.currentEditingCardData;
const selectCardUpdateTrigger = (state: RootState) => state.shortcuts.cardUpdateTrigger;

// Memoized card editing state selector
export const selectCardEditingState = createSelector(
  [selectEditingCardMessageId, selectCurrentEditingCardData, selectCardUpdateTrigger],
  (editingCardMessageId, currentEditingCardData, cardUpdateTrigger) => ({
    editingCardMessageId,
    currentEditingCardData,
    cardUpdateTrigger,
  })
);

// Connection selectors
export const selectConnections = (state: RootState) => state.connections;
export const selectConnectionStatus = (state: RootState) => state.connections.status;
export const selectErrors = (state: RootState) => state.connections.errors;
export const selectIsConnecting = (state: RootState) => state.connections.isConnecting;

// UI selectors
export const selectUI = (state: RootState) => state.ui;
const selectShowCardPopup = (state: RootState) => state.ui.showCardPopup;
const selectShowShortcutModal = (state: RootState) => state.ui.showShortcutModal;
const selectShowErrorModal = (state: RootState) => state.ui.showErrorModal;
export const selectToastMessage = (state: RootState) => state.ui.toastMessage;
export const selectRoundStatus = (state: RootState) => state.ui.roundStatus;
export const selectPersistRoundId = (state: RootState) => state.ui.persistRoundId;
const selectIsUpdatingGameId = (state: RootState) => state.ui.isUpdatingGameId;
const selectIsSendingShortcut = (state: RootState) => state.ui.isSendingShortcut;

// Memoized modals selector
export const selectModals = createSelector(
  [selectShowCardPopup, selectShowShortcutModal, selectShowErrorModal],
  (showCardPopup, showShortcutModal, showErrorModal) => ({
    showCardPopup,
    showShortcutModal,
    showErrorModal,
  })
);

// Memoized loading states selector
export const selectLoadingStates = createSelector(
  [selectIsUpdatingGameId, selectIsSendingShortcut],
  (isUpdatingGameId, isSendingShortcut) => ({
    isUpdatingGameId,
    isSendingShortcut,
  })
);

// Config selectors
export const selectEnvUrl = (state: RootState) => state.config.envUrl;
export const selectDataFiles = (state: RootState) => state.config.files;
export const selectActiveFile = (state: RootState) => state.config.activeFile;
export const selectInitialKeys = (state: RootState) => state.config.initialKeys;
const selectRecordStartKey = (state: RootState) => state.config.recordStartKey;
const selectRecordStopKey = (state: RootState) => state.config.recordStopKey;

// Memoized recording config selector
export const selectRecordingConfig = createSelector(
  [selectRecordStartKey, selectRecordStopKey],
  (recordStartKey, recordStopKey) => ({ recordStartKey, recordStopKey })
);

// Memoized file-config selector
export const selectFileConfig = createSelector(
  [selectDataFiles, selectActiveFile, selectInitialKeys],
  (files, activeFile, initialKeys) => ({ files, activeFile, initialKeys })
);

// Computed selectors
export const selectIsConnected = createSelector(
  [selectConnectionStatus],
  (status) => status.external === 'connected' && status.dev === 'connected'
);

export const selectHasErrors = createSelector(
  [selectErrors],
  (errors) => errors.length > 0
);

export const selectRecentErrors = createSelector(
  [selectErrors],
  (errors) => errors.slice(0, 5) // Get last 5 errors
);

export const selectShortcutStats = createSelector(
  [selectShortcutsList],
  (shortcuts) => {
    const total = shortcuts.length;
    const withMessages = shortcuts.filter(s => s.messages.length > 0).length;
    const recentlyUsed = shortcuts.filter(s => 
      s.lastUsed && 
      new Date().getTime() - new Date(s.lastUsed).getTime() < 24 * 60 * 60 * 1000
    ).length;
    
    return { total, withMessages, recentlyUsed };
  }
);

export const selectCanSaveData = createSelector(
  [selectRoundData],
  ({ previous }) => Object.keys(previous).length > 0
);


export const selectMessageCompositionState = createSelector(
  [selectCurrentMessage, selectResponses, selectBridgeMode],
  (currentMessage, responses, bridgeMode) => ({
    ...currentMessage,
    availableKeys: Object.keys(responses),
    canSend: currentMessage.selectedKey && currentMessage.content && !bridgeMode,
    hasCardData: currentMessage.selectedKey === 'card' && responses.card,
  })
);