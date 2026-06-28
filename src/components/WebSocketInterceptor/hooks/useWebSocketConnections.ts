import { useCallback, useEffect, useRef } from 'react';

import { API_URLS, INITIAL_BROADCAST_KEYS, TIMING } from '../../../constants';
import { useAppDispatch } from '../../../store/hooks';
import {
  addError,
  setDevConnectionStatus,
  setExternalConnectionStatus,
} from '../../../store/slices/connectionSlice';
import {
  addDevMessage,
  addExternalMessage,
  setBridgeMode,
} from '../../../store/slices/messageSlice';
import type { ResponsesData } from '../../../types';
import { resolveEnvWebSocketUrl } from '../../../utils/websocket';

import type { InterceptorRefs } from './useInterceptorRefs';
import type { Notifications } from './useNotifications';

interface UseWebSocketConnectionsParams {
  refs: Pick<InterceptorRefs, 'externalWsRef' | 'devWsRef'>;
  notifications: Notifications;
  collectRoundData: (messageType: string, messageData: any) => void;
  responses: ResponsesData;
  collectedRoundData: ResponsesData;
  envUrl: string;
  bridgeMode: boolean;
}

export interface WebSocketConnections {
  connectExternal: () => Promise<void>;
  connectDev: () => void;
  disconnectExternal: () => void;
  toggleBridgeMode: () => void;
  handleSaveAndConnect: () => void;
}

/**
 * Owns the External & Dev WebSocket lifecycles plus bridge-mode passthrough.
 */
export const useWebSocketConnections = ({
  refs,
  notifications,
  collectRoundData,
  responses,
  collectedRoundData,
  envUrl,
  bridgeMode,
}: UseWebSocketConnectionsParams): WebSocketConnections => {
  const dispatch = useAppDispatch();
  const { showToastMessage, showSuccessMessage } = notifications;
  const { externalWsRef, devWsRef } = refs;

  const bridgeModeRef = useRef<boolean>(false);
  const lastExternalMessageRef = useRef<{ message: string; timestamp: string } | null>(null);
  const lastDevMessageRef = useRef<{ message: string; timestamp: string } | null>(null);

  // Update ref whenever bridgeMode state changes
  useEffect(() => {
    bridgeModeRef.current = bridgeMode;
  }, [bridgeMode]);

  // WebSocket functions with proper bridge mode handling
  const connectExternal = useCallback(async (): Promise<void> => {
    if (externalWsRef.current) {
      externalWsRef.current.close();
    }

    dispatch(setExternalConnectionStatus('connecting'));

    try {
      const wsURL = await resolveEnvWebSocketUrl(envUrl, window.location.href);

      const ws = new WebSocket(wsURL);
      externalWsRef.current = ws;

      ws.onopen = (): void => {
        dispatch(setExternalConnectionStatus('connected'));
      };

      ws.onmessage = (event: MessageEvent): void => {
        const data: string = event.data;
        const currentBridgeMode = bridgeModeRef.current;

        // Store the last message received
        lastExternalMessageRef.current = {
          message: data,
          timestamp: new Date().toISOString(),
        };

        // Always display messages in the External UI column
        dispatch(addExternalMessage(data));

        // Bridge mode: Forward ALL messages to dev WebSocket
        if (currentBridgeMode) {
          if (devWsRef.current && devWsRef.current.readyState === WebSocket.OPEN) {
            try {
              devWsRef.current.send(data);
            } catch (error) {
              dispatch(
                addError({
                  type: 'bridge_forward_ext_dev',
                  message: 'Failed to forward message from External to Dev WebSocket',
                })
              );
            }
          } else {
            dispatch(
              addError({
                type: 'bridge_no_dev',
                message: 'Dev WebSocket not connected - cannot forward External messages',
              })
            );
          }
          // Continue processing for round data collection even in bridge mode
        }

        // Process messages for round data collection (both normal and bridge mode)
        try {
          const parsed: any = JSON.parse(data);
          if (parsed.type === 'error' || parsed.type === 'status') return;

          Object.keys(parsed).forEach((key: string) => {
            if (!['type', 'message', 'timestamp'].includes(key)) {
              collectRoundData(key, parsed[key]);
            }
          });
        } catch (e) {
          // Non-JSON external message received
        }
      };

      ws.onclose = (event: CloseEvent): void => {
        dispatch(setExternalConnectionStatus('disconnected'));

        // Prepare error details with last message
        const errorDetailsObj: any = {
          code: event.code,
          reason: event.reason || 'No reason provided',
          wasClean: event.wasClean,
          type: event.code === 1000 ? 'Normal closure' : 'Abnormal closure',
        };

        // Add last message if available
        if (lastExternalMessageRef.current) {
          errorDetailsObj.lastMessage = {
            content: lastExternalMessageRef.current.message.substring(0, 500) + (lastExternalMessageRef.current.message.length > 500 ? '...' : ''),
            timestamp: lastExternalMessageRef.current.timestamp,
            fullLength: lastExternalMessageRef.current.message.length,
          };
        } else {
          errorDetailsObj.lastMessage = 'No messages received before disconnection';
        }

        const errorDetails = JSON.stringify(errorDetailsObj, null, 2);

        dispatch(addError({
          type: 'external_connection',
          message: event.code === 1000 ? 'External WebSocket disconnected (normal closure)' : 'External WebSocket disconnected (abnormal closure)',
          details: errorDetails
        }));

        // Clear the last message ref
        lastExternalMessageRef.current = null;
      };

      ws.onerror = (errorEvent: Event): void => {
        dispatch(setExternalConnectionStatus('disconnected'));

        // Try to capture error details if available
        const errorDetails = JSON.stringify({
          type: errorEvent.type,
          target: errorEvent.target ? 'WebSocket' : 'Unknown',
          timestamp: new Date().toISOString(),
        }, null, 2);

        dispatch(
          addError({
            type: 'external_websocket',
            message: 'WebSocket connection error - check if server is running',
            details: errorDetails
          })
        );
      };
    } catch (error: any) {
      dispatch(setExternalConnectionStatus('disconnected'));
      dispatch(addError({
        type: 'external_connect',
        message: `Failed to connect to external WebSocket: ${error}. Set a ws:// URL via the pencil icon, or add ?JSESSIONID=xxx&tableId=yyy to the page URL.`
      }));
    }
  }, [dispatch, collectRoundData, envUrl, externalWsRef, devWsRef]);

  const connectDev = useCallback((): void => {
    if (devWsRef.current) {
      devWsRef.current.close();
    }

    dispatch(setDevConnectionStatus('connecting'));

    try {
      const ws = new WebSocket(API_URLS.DEV_WEBSOCKET);
      devWsRef.current = ws;

      ws.onopen = (): void => {
        dispatch(setDevConnectionStatus('connected'));

        // Identify this client as interceptor
        ws.send(
          JSON.stringify({
            type: 'client_identification',
            clientType: 'interceptor',
            timestamp: new Date().toISOString(),
          })
        );

        setTimeout(() => {
          let sentCount = 0;

          INITIAL_BROADCAST_KEYS.forEach((key: string, index: number) => {
            setTimeout(() => {
              const dataToSend = collectedRoundData[key] || responses[key];
              if (dataToSend && devWsRef.current) {
                const message = JSON.stringify({ [key]: dataToSend });
                devWsRef.current.send(message);
                sentCount++;
              }
            }, index * TIMING.RECONNECT_DELAY);
          });

          setTimeout(
            () => {
              showSuccessMessage(`📤 Initial data broadcasted to all clients! (${sentCount} messages)`);
            },
            INITIAL_BROADCAST_KEYS.length * TIMING.RECONNECT_DELAY + 100
          );
        }, TIMING.INITIAL_DATA_DELAY);
      };

      ws.onmessage = (event: MessageEvent): void => {
        const message: string = event.data;
        const currentBridgeMode = bridgeModeRef.current;

        // Store the last message received
        lastDevMessageRef.current = {
          message: message,
          timestamp: new Date().toISOString(),
        };

        // Always display messages in the Dev UI column
        dispatch(addDevMessage(message));

        // Handle system messages first
        try {
          const parsed: any = JSON.parse(message);

          // Handle bridge mode confirmations
          if (parsed.type === 'bridge_mode_confirmed') {
            if (parsed.bridgeMode !== undefined && parsed.bridgeMode !== bridgeModeRef.current) {
              dispatch(setBridgeMode(parsed.bridgeMode));
              bridgeModeRef.current = parsed.bridgeMode;
            }
            return;
          }

          // Handle bridge status responses
          if (parsed.type === 'bridge_status' || parsed.type === 'bridge_mode_status') {
            if (parsed.bridgeMode !== undefined && parsed.bridgeMode !== bridgeModeRef.current) {
              dispatch(setBridgeMode(parsed.bridgeMode));
              bridgeModeRef.current = parsed.bridgeMode;
              showToastMessage(
                parsed.bridgeMode ? '🌉 Bridge Mode ON' : '🌉 Bridge Mode OFF',
                'Bridge mode synchronized with server'
              );
            }
            return;
          }

          // Handle client identification confirmations
          if (parsed.type === 'identification_confirmed') {
            if (parsed.bridgeMode !== undefined && parsed.bridgeMode !== bridgeModeRef.current) {
              dispatch(setBridgeMode(parsed.bridgeMode));
              bridgeModeRef.current = parsed.bridgeMode;
            }
            return;
          }

          // Handle errors
          if (parsed.type === 'error') {
            dispatch(addError({ type: 'dev_error', message: parsed.message }));
            return;
          }

          // Skip system messages in bridge mode
          if (
            parsed.type &&
            [
              'bridge_mode_toggle',
              'client_identification',
              'bridge_status',
              'bridge_mode_confirmed',
              'identification_confirmed',
            ].includes(parsed.type)
          ) {
            return;
          }
        } catch (e) {
          // Not JSON, continue with bridge mode logic
        }

        // Bridge mode: Forward ALL non-system messages to external WebSocket
        if (currentBridgeMode) {
          if (externalWsRef.current && externalWsRef.current.readyState === WebSocket.OPEN) {
            try {
              externalWsRef.current.send(message);
            } catch (error) {
              dispatch(
                addError({
                  type: 'bridge_forward_dev_ext',
                  message: 'Failed to forward message from Dev to External WebSocket',
                })
              );
            }
          } else {
            dispatch(
              addError({
                type: 'bridge_no_ext',
                message: 'External WebSocket not connected - cannot forward Dev messages',
              })
            );
          }
          return; // Don't process further in bridge mode
        }
      };

      ws.onclose = (event: CloseEvent): void => {
        dispatch(setDevConnectionStatus('disconnected'));
        dispatch(setBridgeMode(false));
        bridgeModeRef.current = false;

        // Prepare error details with last message
        const errorDetailsObj: any = {
          code: event.code,
          reason: event.reason || 'No reason provided',
          wasClean: event.wasClean,
          type: event.code === 1000 ? 'Normal closure' : 'Abnormal closure',
        };

        // Add last message if available
        if (lastDevMessageRef.current) {
          errorDetailsObj.lastMessage = {
            content: lastDevMessageRef.current.message.substring(0, 500) + (lastDevMessageRef.current.message.length > 500 ? '...' : ''),
            timestamp: lastDevMessageRef.current.timestamp,
            fullLength: lastDevMessageRef.current.message.length,
          };
        } else {
          errorDetailsObj.lastMessage = 'No messages received before disconnection';
        }

        const errorDetails = JSON.stringify(errorDetailsObj, null, 2);

        dispatch(addError({
          type: 'dev_connection',
          message: event.code === 1000 ? 'Dev WebSocket disconnected (normal closure)' : 'Dev WebSocket disconnected (abnormal closure)',
          details: errorDetails
        }));

        // Clear the last message ref
        lastDevMessageRef.current = null;
      };

      ws.onerror = (errorEvent: Event): void => {
        dispatch(setDevConnectionStatus('disconnected'));
        dispatch(setBridgeMode(false));
        bridgeModeRef.current = false;

        const errorDetails = JSON.stringify({
          type: errorEvent.type,
          target: errorEvent.target ? 'WebSocket' : 'Unknown',
          timestamp: new Date().toISOString(),
        }, null, 2);

        dispatch(
          addError({
            type: 'dev_websocket',
            message: 'WebSocket connection error - check if server is running on port 8084',
            details: errorDetails
          })
        );
      };
    } catch (error) {
      dispatch(addError({ type: 'dev_connect', message: 'Failed to connect to dev WebSocket' }));
    }
  }, [dispatch, collectedRoundData, responses, showSuccessMessage, showToastMessage, devWsRef, externalWsRef]);

  const disconnectExternal = useCallback((): void => {
    if (externalWsRef.current) {
      externalWsRef.current.close(1000, 'Manual disconnect');
      externalWsRef.current = null;
    }
    dispatch(setExternalConnectionStatus('disconnected'));
    showSuccessMessage('🔌 External WebSocket disconnected manually');
  }, [dispatch, showSuccessMessage, externalWsRef]);

  // Bridge mode functionality with proper synchronization
  const toggleBridgeMode = useCallback(() => {
    const newBridgeMode = !bridgeMode;

    // Check if both connections are ready for bridge mode
    if (newBridgeMode) {
      const devConnected = devWsRef.current && devWsRef.current.readyState === WebSocket.OPEN;
      const externalConnected = externalWsRef.current && externalWsRef.current.readyState === WebSocket.OPEN;

      if (!devConnected) {
        showToastMessage('⚠️ Bridge Mode Failed', 'Dev WebSocket is not connected');
        return;
      }

      if (!externalConnected) {
        showToastMessage(
          'ℹ️ Bridge Mode - External Not Connected',
          'Bridge mode enabled but External WebSocket is not connected. Add ?JSESSIONID=xxx&tableId=yyy to URL.'
        );
        // Continue anyway - user might connect External later
      }
    }

    // Update ref immediately
    bridgeModeRef.current = newBridgeMode;

    // Update Redux state
    dispatch(setBridgeMode(newBridgeMode));

    // Notify the server about bridge mode change
    if (devWsRef.current && devWsRef.current.readyState === WebSocket.OPEN) {
      devWsRef.current.send(
        JSON.stringify({
          type: 'bridge_mode_toggle',
          enabled: newBridgeMode,
          timestamp: new Date().toISOString(),
        })
      );
    }

    // Show toast message
    setTimeout(() => {
      showToastMessage(
        newBridgeMode ? '🌉 Bridge Mode ON' : '🌉 Bridge Mode OFF',
        newBridgeMode ? 'Direct External ↔ Dev passthrough enabled' : 'Control panel control restored'
      );
    }, 0);
  }, [bridgeMode, dispatch, showToastMessage, devWsRef, externalWsRef]);

  const handleSaveAndConnect = useCallback((): void => {
    void connectExternal();
  }, [connectExternal]);

  return { connectExternal, connectDev, disconnectExternal, toggleBridgeMode, handleSaveAndConnect };
};
