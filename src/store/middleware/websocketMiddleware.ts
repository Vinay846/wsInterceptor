import { Middleware } from '@reduxjs/toolkit';

import { updateResponse } from '../slices/messageSlice';
import { showSuccessToast } from '../slices/uiSlice';

// WebSocket middleware to handle side effects
export const websocketMiddleware: Middleware = (store) => (next) => (action) => {
  const result = next(action);

  // Type guard to check if action has type and payload
  if (typeof action === 'object' && action !== null && 'type' in action) {
    const typedAction = action as { type: string; payload?: unknown };

    // Handle WebSocket-related actions
    if (typedAction.type === 'messages/addExternalMessage') {
      // Parse and process external messages
      try {
        if (typeof typedAction.payload === 'string') {
          const messageData = JSON.parse(typedAction.payload);

          // Update responses based on message content
          Object.keys(messageData).forEach((key) => {
            store.dispatch(updateResponse({ key, data: messageData[key] }));
          });
        }
      } catch (error) {
        // Not JSON, just log as regular message
      }
    }

    if (typedAction.type === 'connections/setExternalConnectionStatus') {
      if (typedAction.payload === 'connected') {
        store.dispatch(showSuccessToast('External WebSocket connected'));
      }
      // Note: Disconnection errors are now handled in WebSocketInterceptor with full error details
    }

    if (typedAction.type === 'connections/setDevConnectionStatus') {
      if (typedAction.payload === 'connected') {
        store.dispatch(showSuccessToast('Dev WebSocket connected'));
      }
      // Note: Disconnection errors are now handled in WebSocketInterceptor with full error details
    }
  }

  return result;
};

export default websocketMiddleware;
