import { createSlice, PayloadAction } from '@reduxjs/toolkit';

import { ConnectionStatus, ErrorItem } from '../../types';

interface ConnectionState {
  status: ConnectionStatus;
  errors: ErrorItem[];
  isConnecting: boolean;
  reconnectAttempts: {
    external: number;
    dev: number;
  };
  lastConnectionTime: {
    external: string | null;
    dev: string | null;
  };
}

const initialState: ConnectionState = {
  status: {
    external: 'disconnected',
    dev: 'disconnected',
  },
  errors: [],
  isConnecting: false,
  reconnectAttempts: {
    external: 0,
    dev: 0,
  },
  lastConnectionTime: {
    external: null,
    dev: null,
  },
};

const connectionSlice = createSlice({
  name: 'connections',
  initialState,
  reducers: {
    // Connection status
    setConnectionStatus: (state, action: PayloadAction<ConnectionStatus>) => {
      state.status = action.payload;
    },
    
    setExternalConnectionStatus: (state, action: PayloadAction<'connected' | 'disconnected' | 'connecting'>) => {
      state.status.external = action.payload;
      
      if (action.payload === 'connected') {
        state.lastConnectionTime.external = new Date().toISOString();
        state.reconnectAttempts.external = 0;
      } else if (action.payload === 'connecting') {
        state.reconnectAttempts.external += 1;
      }
    },
    
    setDevConnectionStatus: (state, action: PayloadAction<'connected' | 'disconnected' | 'connecting'>) => {
      state.status.dev = action.payload;
      
      if (action.payload === 'connected') {
        state.lastConnectionTime.dev = new Date().toISOString();
        state.reconnectAttempts.dev = 0;
      } else if (action.payload === 'connecting') {
        state.reconnectAttempts.dev += 1;
      }
    },
    
    setIsConnecting: (state, action: PayloadAction<boolean>) => {
      state.isConnecting = action.payload;
    },
    
    // Error management
    addError: (state, action: PayloadAction<{ type: string; message: string; details?: string }>) => {
      const error: ErrorItem = {
        type: action.payload.type,
        message: action.payload.message,
        timestamp: new Date().toISOString(),
        details: action.payload.details,
      };
      
      // Keep only last 50 errors
      state.errors.unshift(error);
      if (state.errors.length > 50) {
        state.errors = state.errors.slice(0, 50);
      }
    },
    
    clearErrors: (state) => {
      state.errors = [];
    },
    
    removeError: (state, action: PayloadAction<string>) => {
      state.errors = state.errors.filter(error => error.timestamp !== action.payload);
    },
    
    // Reconnection management
    incrementReconnectAttempts: (state, action: PayloadAction<'external' | 'dev'>) => {
      state.reconnectAttempts[action.payload] += 1;
    },
    
    resetReconnectAttempts: (state, action: PayloadAction<'external' | 'dev'>) => {
      state.reconnectAttempts[action.payload] = 0;
    },
    
    // Complex operations
    handleConnectionFailure: (state, action: PayloadAction<{ 
      type: 'external' | 'dev'; 
      error: string; 
    }>) => {
      // Set connection status to disconnected
      state.status[action.payload.type] = 'disconnected';
      
      // Add error
      const error: ErrorItem = {
        type: `${action.payload.type}_connection`,
        message: action.payload.error,
        timestamp: new Date().toISOString(),
      };
      state.errors.unshift(error);
      
      // Increment reconnect attempts
      state.reconnectAttempts[action.payload.type] += 1;
    },
    
    handleSuccessfulConnection: (state, action: PayloadAction<'external' | 'dev'>) => {
      state.status[action.payload] = 'connected';
      state.lastConnectionTime[action.payload] = new Date().toISOString();
      state.reconnectAttempts[action.payload] = 0;
      state.isConnecting = false;
    },
    
    resetAllConnections: (state) => {
      state.status = {
        external: 'disconnected',
        dev: 'disconnected',
      };
      state.reconnectAttempts = {
        external: 0,
        dev: 0,
      };
      state.isConnecting = false;
    },
  },
});

export const {
  setConnectionStatus,
  setExternalConnectionStatus,
  setDevConnectionStatus,
  setIsConnecting,
  addError,
  clearErrors,
  removeError,
  incrementReconnectAttempts,
  resetReconnectAttempts,
  handleConnectionFailure,
  handleSuccessfulConnection,
  resetAllConnections,
} = connectionSlice.actions;

export default connectionSlice.reducer;