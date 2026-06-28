import { createSlice, PayloadAction } from '@reduxjs/toolkit';

import { DEFAULT_RECORD_START_KEY, DEFAULT_RECORD_STOP_KEY, STORAGE_KEYS } from '../../constants';

interface ConfigState {
  // User-overridable Env WebSocket URL (empty => derive from page URL params)
  envUrl: string;
  // Data file management
  files: string[];
  activeFile: string;
  // Keys auto-sent to clients on connect (server-side behavior)
  initialKeys: string[];
  // Recording triggers (message keys that start/stop a round capture)
  recordStartKey: string;
  recordStopKey: string;
}

function loadEnvUrl(): string {
  try {
    return localStorage.getItem(STORAGE_KEYS.ENV_URL) || '';
  } catch {
    return '';
  }
}

function loadRecordingConfig(): { recordStartKey: string; recordStopKey: string } {
  const fallback = { recordStartKey: DEFAULT_RECORD_START_KEY, recordStopKey: DEFAULT_RECORD_STOP_KEY };
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.RECORDING);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    return {
      recordStartKey: typeof parsed.recordStartKey === 'string' ? parsed.recordStartKey : fallback.recordStartKey,
      recordStopKey: typeof parsed.recordStopKey === 'string' ? parsed.recordStopKey : fallback.recordStopKey,
    };
  } catch {
    return fallback;
  }
}

const initialState: ConfigState = {
  envUrl: loadEnvUrl(),
  files: [],
  activeFile: '',
  initialKeys: [],
  ...loadRecordingConfig(),
};

const configSlice = createSlice({
  name: 'config',
  initialState,
  reducers: {
    setEnvUrl: (state, action: PayloadAction<string>) => {
      state.envUrl = action.payload;
    },

    setFiles: (state, action: PayloadAction<string[]>) => {
      state.files = action.payload;
    },

    setActiveFile: (state, action: PayloadAction<string>) => {
      state.activeFile = action.payload;
    },

    setInitialKeys: (state, action: PayloadAction<string[]>) => {
      state.initialKeys = action.payload;
    },

    // Bulk update from the server's /files response
    setFileConfig: (
      state,
      action: PayloadAction<{ files: string[]; activeFile: string; initialKeys: string[] }>
    ) => {
      state.files = action.payload.files;
      state.activeFile = action.payload.activeFile;
      state.initialKeys = action.payload.initialKeys;
    },

    setRecordingConfig: (
      state,
      action: PayloadAction<{ recordStartKey: string; recordStopKey: string }>
    ) => {
      state.recordStartKey = action.payload.recordStartKey;
      state.recordStopKey = action.payload.recordStopKey;
    },
  },
});

export const {
  setEnvUrl,
  setFiles,
  setActiveFile,
  setInitialKeys,
  setFileConfig,
  setRecordingConfig,
} = configSlice.actions;

export default configSlice.reducer;
