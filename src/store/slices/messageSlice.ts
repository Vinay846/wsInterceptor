import { createSlice, PayloadAction } from '@reduxjs/toolkit';

import { ResponsesData } from '../../types';

interface MessageState {
  // WebSocket messages
  externalMessages: string;
  devMessages: string;
  
  // Current message composition
  selectedKey: string;
  messageContent: string;
  
  // Response data
  responses: ResponsesData;
  
  // Round data management
  collectedRoundData: ResponsesData;
  previousRoundData: ResponsesData;
  currentGameId: string;
  isDataLoading: boolean;
  
  // Bridge mode
  bridgeMode: boolean;
}

const initialState: MessageState = {
  externalMessages: '',
  devMessages: '',
  selectedKey: '',
  messageContent: '',
  responses: {},
  collectedRoundData: {},
  previousRoundData: {},
  currentGameId: '',
  isDataLoading: false,
  bridgeMode: false,
};

const messageSlice = createSlice({
  name: 'messages',
  initialState,
  reducers: {
    // WebSocket message updates
    addExternalMessage: (state, action: PayloadAction<string>) => {
      state.externalMessages += action.payload + '\n\n';
    },
    
    addDevMessage: (state, action: PayloadAction<string>) => {
      const message = state.bridgeMode 
        ? '[BRIDGE MODE] ' + action.payload 
        : action.payload;
      state.devMessages += message + '\n\n';
    },
    
    clearExternalMessages: (state) => {
      state.externalMessages = '';
    },
    
    clearDevMessages: (state) => {
      state.devMessages = '';
    },
    
    // Message composition
    setSelectedKey: (state, action: PayloadAction<string>) => {
      state.selectedKey = action.payload;
    },
    
    setMessageContent: (state, action: PayloadAction<string>) => {
      state.messageContent = action.payload;
    },
    
    // Response data management
    setResponses: (state, action: PayloadAction<ResponsesData>) => {
      state.responses = action.payload;
    },
    
    updateResponse: (state, action: PayloadAction<{ key: string; data: any }>) => {
      state.responses[action.payload.key] = action.payload.data;
    },
    
    // Round data management
    setCollectedRoundData: (state, action: PayloadAction<ResponsesData>) => {
      state.collectedRoundData = action.payload;
    },
    
    addToCollectedRoundData: (state, action: PayloadAction<{ key: string; data: any }>) => {
      state.collectedRoundData[action.payload.key] = action.payload.data;
    },
    
    setPreviousRoundData: (state, action: PayloadAction<ResponsesData>) => {
      state.previousRoundData = action.payload;
    },
    
    setCurrentGameId: (state, action: PayloadAction<string>) => {
      state.currentGameId = action.payload;
    },
    
    setIsDataLoading: (state, action: PayloadAction<boolean>) => {
      state.isDataLoading = action.payload;
    },
    
    // Bridge mode
    setBridgeMode: (state, action: PayloadAction<boolean>) => {
      state.bridgeMode = action.payload;
    },
    
    // Complex operations
    startNewRound: (state, action: PayloadAction<string>) => {
      // Move current round data to previous
      state.previousRoundData = state.collectedRoundData;
      
      // Clear current round data
      state.collectedRoundData = {};
      
      // Update game ID
      state.currentGameId = action.payload;
      
    },
    
    resetAllData: (state) => {
      state.collectedRoundData = {};
      state.previousRoundData = {};
      state.currentGameId = '';
    },
  },
});

export const {
  addExternalMessage,
  addDevMessage,
  clearExternalMessages,
  clearDevMessages,
  setSelectedKey,
  setMessageContent,
  setResponses,
  updateResponse,
  setCollectedRoundData,
  addToCollectedRoundData,
  setPreviousRoundData,
  setCurrentGameId,
  setIsDataLoading,
  setBridgeMode,
  startNewRound,
  resetAllData,
} = messageSlice.actions;

export default messageSlice.reducer;