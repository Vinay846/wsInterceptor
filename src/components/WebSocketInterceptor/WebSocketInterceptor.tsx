import { Hash } from 'lucide-react';
import React, { useState, useEffect, useCallback, useRef } from 'react';

// Redux
import { API_URLS, TIMING, INITIAL_BROADCAST_KEYS, STORAGE_KEYS } from '../../constants';
import { store } from '../../store';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import {
  selectConnectionStatus,
  selectResponses,
  selectCurrentMessage,
  selectExternalMessages,
  selectDevMessages,
  selectRoundData,
  selectShortcutsList,
  selectEditingShortcut,
  selectCardEditingState,
  selectBridgeMode,
  selectErrors,
  selectModals,
  selectToastMessage,
  selectLoadingStates,
  selectRoundStatus,
} from '../../store/selectors';
import {
  setExternalConnectionStatus,
  setDevConnectionStatus,
  addError,
  clearErrors,
} from '../../store/slices/connectionSlice';
import {
  setResponses,
  updateResponse,
  setSelectedKey,
  setMessageContent,
  addExternalMessage,
  addDevMessage,
  clearExternalMessages,
  clearDevMessages,
  setBridgeMode,
  setCurrentGameId,
  setCollectedRoundData,
  addToCollectedRoundData,
  setPreviousRoundData,
  setIsDataLoading,
} from '../../store/slices/messageSlice';
import {
  setShortcuts,
  setEditingShortcut,
  addShortcut,
  updateShortcut,
  deleteShortcut,
  updateShortcutLastUsed,
  setEditingCardMessageId,
  setCurrentEditingCardData,
  setCardUpdateTrigger,
} from '../../store/slices/shortcutSlice';
import {
  setShowCardPopup,
  setShowShortcutModal,
  setShowErrorModal,
  setToastMessage,
  hideToast,
  setRoundStatus,
  setIsUpdatingGameId,
} from '../../store/slices/uiSlice';

// Components
import { RoundStatus, MessageShortcut } from '../../types';
import { extractParamsFromUrl, generateRandomGameId, updateShortcutGameIds } from '../../utils/websocket';
import BridgeModeControl from '../BridgeModeControl/BridgeModeControl';
import CardSelectionPopup from '../CardSelectionPopup/CardSelectionPopup';
import DataManagement from '../DataManagement/DataManagement';
import ErrorModal from '../ErrorModal/ErrorModal';
import JSONViewerModal from '../JSONViewerModal/JSONViewerModal';
import MessageColumn from '../MessageColumn/MessageColumn';
import MessageControl from '../MessageControl/MessageControl';
import RoundStatusBar from '../RoundStatusBar/RoundStatusBar';
import ShortcutModal from '../ShortcutModal/ShortcutModal';
import ShortcutSection from '../ShortcutSection/ShortcutSection';
import Toast from '../Toast/Toast';

// Types and Constants

// Styles
import styles from './WebSocketInterceptor.module.css';

// Utils

const WebSocketInterceptor: React.FC = () => {
  // Redux dispatch and selectors
  const dispatch = useAppDispatch();

  // Get state from Redux store
  const connections = useAppSelector(selectConnectionStatus);
  const responses = useAppSelector(selectResponses);
  const { selectedKey, content: messageContent } = useAppSelector(selectCurrentMessage);
  const externalMessages = useAppSelector(selectExternalMessages);
  const devMessages = useAppSelector(selectDevMessages);
  const {
    collected: collectedRoundData,
    previous: previousRoundData,
    currentGameId,
    isLoading: isDataLoading,
  } = useAppSelector(selectRoundData);
  const shortcuts = useAppSelector(selectShortcutsList);
  const editingShortcut = useAppSelector(selectEditingShortcut);
  const { editingCardMessageId, currentEditingCardData, cardUpdateTrigger } = useAppSelector(selectCardEditingState);
  const bridgeMode = useAppSelector(selectBridgeMode);
  const errors = useAppSelector(selectErrors);
  const { showCardPopup, showShortcutModal, showErrorModal } = useAppSelector(selectModals);
  const toastMessage = useAppSelector(selectToastMessage);
  const { isUpdatingGameId } = useAppSelector(selectLoadingStates);
  const roundStatus = useAppSelector(selectRoundStatus);

  // Local state for non-Redux managed state
  const [seqCounter, setSeqCounter] = useState<number>(1000);
  const [isRoundActive, setIsRoundActive] = useState<boolean>(false);
  const [canSaveData, setCanSaveData] = useState<boolean>(false);
  const [hasCompletedRound, setHasCompletedRound] = useState<boolean>(false);
  const [showJSONViewer, setShowJSONViewer] = useState<boolean>(false);

  // Refs
  const externalWsRef = useRef<WebSocket | null>(null);
  const devWsRef = useRef<WebSocket | null>(null);
  const roundTimerRef = useRef<NodeJS.Timeout | null>(null);
  const bridgeModeRef = useRef<boolean>(false);
  const connectionsInitialized = useRef<boolean>(false);
  const dataRefreshed = useRef<boolean>(false);
  const lastExternalMessageRef = useRef<{ message: string; timestamp: string } | null>(null);
  const lastDevMessageRef = useRef<{ message: string; timestamp: string } | null>(null);

  // Update ref whenever bridgeMode state changes
  useEffect(() => {
    bridgeModeRef.current = bridgeMode;
  }, [bridgeMode]);

  // State validation utility
  const validateRoundDataIntegrity = useCallback((data: any, context: string) => {
    const keys = Object.keys(data);
    const criticalKeys = ['game', 'timer', 'betstats', 'winners'];
    const missingCritical = criticalKeys.filter((key) => !keys.includes(key));

    return { keys, missingCritical, isComplete: missingCritical.length === 0 };
  }, []);

  // Utility functions
  const addErrorMessage = useCallback(
    (type: string, message: string): void => {
      dispatch(addError({ type, message }));
    },
    [dispatch]
  );

  const showSuccessMessage = useCallback((message: string): void => {
    // Success message handled by toast notifications
  }, []);

  const getNextSeqId = useCallback((): number => {
    setSeqCounter((prev) => prev + 1);
    return seqCounter + 1;
  }, [seqCounter]);

  const showToastMessage = useCallback(
    (title: string, message: string): void => {
      dispatch(setToastMessage({ title, message }));
      setTimeout(() => {
        dispatch(setToastMessage(null));
      }, TIMING.TOAST_DURATION);
    },
    [dispatch]
  );

  // Message Control handlers
  const handleKeyChange = useCallback(
    (key: string): void => {
      dispatch(setSelectedKey(key));
      if (key && responses[key]) {
        const nextSeq = getNextSeqId();
        const dataWithSeq = { ...responses[key], seq: nextSeq };
        dispatch(setMessageContent(JSON.stringify(dataWithSeq, null, 2)));
      } else {
        dispatch(setMessageContent(''));
      }
    },
    [dispatch, responses, getNextSeqId]
  );

  const handleContentChange = useCallback(
    (content: string): void => {
      dispatch(setMessageContent(content));
    },
    [dispatch]
  );

  const handleSendMessage = useCallback((): void => {
    if (!selectedKey || !messageContent || !devWsRef.current || devWsRef.current.readyState !== WebSocket.OPEN) {
      if (devWsRef.current && devWsRef.current.readyState === WebSocket.CONNECTING) {
        addErrorMessage('message_send', 'WebSocket is still connecting. Please wait and try again.');
      } else if (devWsRef.current && devWsRef.current.readyState === WebSocket.CLOSED) {
        addErrorMessage('message_send', 'WebSocket is closed. Please reconnect and try again.');
      }
      return;
    }

    try {
      const parsedContent = JSON.parse(messageContent);
      const message = { [selectedKey]: parsedContent };
      devWsRef.current.send(JSON.stringify(message));

      dispatch(addDevMessage(JSON.stringify(message, null, 2)));
      showSuccessMessage(`🚀 ${selectedKey} message sent to dev clients!`);
    } catch (error) {
      addErrorMessage('message_send', `Failed to send message: Invalid JSON format`);
    }
  }, [selectedKey, messageContent, showSuccessMessage, addErrorMessage, dispatch]);

  const handleOpenCardPopup = useCallback((): void => {
    dispatch(setShowCardPopup(true));
  }, [dispatch]);

  // Shortcut handlers
  const handleCreateShortcut = useCallback((): void => {
    dispatch(setEditingShortcut(null));
    dispatch(setShowShortcutModal(true));
  }, [dispatch]);

  const handleEditShortcut = useCallback(
    (shortcut: MessageShortcut): void => {
      dispatch(setEditingShortcut(shortcut));
      dispatch(setShowShortcutModal(true));
    },
    [dispatch]
  );

  // Move handleSendShortcut after updateGameIdsWithRefresh to fix hoisting issue

  const handleDuplicateShortcut = useCallback(
    (shortcut: MessageShortcut): void => {
      const duplicatedShortcut: MessageShortcut = {
        ...shortcut,
        id: `shortcut_${Date.now()}`,
        name: `${shortcut.name} (Copy)`,
        createdAt: new Date().toISOString(),
        lastUsed: undefined,
      };

      dispatch(addShortcut(duplicatedShortcut));
      showToastMessage('📋 Shortcut Duplicated!', `"${duplicatedShortcut.name}" has been created`);
    },
    [dispatch, showToastMessage]
  );

  const handleDeleteShortcut = useCallback(
    (shortcutId: string): void => {
      const shortcut = shortcuts.find((s) => s.id === shortcutId);
      if (shortcut) {
        dispatch(deleteShortcut(shortcutId));
        showToastMessage('🗑️ Shortcut Deleted!', `"${shortcut.name}" has been removed`);
      }
    },
    [shortcuts, dispatch, showToastMessage]
  );

  // Modal handlers
  const handleSaveShortcut = useCallback(
    (shortcutData: Omit<MessageShortcut, 'id' | 'createdAt'>): void => {
      if (editingShortcut) {
        // Update existing shortcut
        dispatch(updateShortcut({ ...editingShortcut, ...shortcutData }));
        showToastMessage('✏️ Shortcut Updated!', `"${shortcutData.name}" has been saved`);
      } else {
        // Create new shortcut
        const newShortcut: MessageShortcut = {
          ...shortcutData,
          id: `shortcut_${Date.now()}`,
          createdAt: new Date().toISOString(),
        };
        dispatch(addShortcut(newShortcut));
        showToastMessage('✨ Shortcut Created!', `"${shortcutData.name}" has been added`);
      }

      dispatch(setShowShortcutModal(false));
      dispatch(setEditingShortcut(null));
    },
    [editingShortcut, showToastMessage]
  );

  const handleCardEdit = useCallback(
    (messageId: string, cardData: any): void => {
      // Set the current card data and editing message ID, then open the card popup
      dispatch(setEditingCardMessageId(messageId));
      dispatch(setCurrentEditingCardData(cardData));
      dispatch(setShowCardPopup(true));
    },
    [dispatch]
  );


  const handleUpdateShortcutMessage = useCallback(
    (messageId: string, content: string): void => {
      if (editingShortcut) {
        const updatedShortcut = {
          ...editingShortcut,
          messages: editingShortcut.messages.map((msg) => (msg.id === messageId ? { ...msg, content } : msg)),
        };
        dispatch(setEditingShortcut(updatedShortcut));
      }
    },
    [dispatch, editingShortcut]
  );

  const handleCardSelect = useCallback(
    (cardInfo: any): void => {
      if (editingCardMessageId) {
        // Handle shortcut card editing - use the stored current card data
        const currentCardData = currentEditingCardData || responses.card;
        const updatedCardData = { ...currentCardData, ...cardInfo };

        // Trigger update using state instead of callback
        dispatch(setCardUpdateTrigger({ messageId: editingCardMessageId, cardData: updatedCardData }));

        dispatch(setEditingCardMessageId(null));
        dispatch(setCurrentEditingCardData(null));
      } else if (selectedKey === 'card' && responses.card) {
        // Handle normal card editing
        const updatedCardData = { ...responses.card, ...cardInfo };
        dispatch(setMessageContent(JSON.stringify(updatedCardData, null, 2)));
        dispatch(updateResponse({ key: 'card', data: updatedCardData }));
      }
      dispatch(setShowCardPopup(false));
    },
    [selectedKey, responses.card, editingCardMessageId, currentEditingCardData, dispatch]
  );

  // Get current card data for the popup
  const getCurrentCardData = useCallback(() => {
    if (editingCardMessageId && currentEditingCardData) {
      return currentEditingCardData;
    }
    return responses.card;
  }, [editingCardMessageId, currentEditingCardData, responses.card]);

  // API Functions
  const refreshDataFromServer = useCallback(async (): Promise<void> => {
    dispatch(setIsDataLoading(true));
    try {
      const response = await fetch(API_URLS.DATA_ENDPOINT);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const serverData = await response.json();
      if (serverData.savedData) {
        const { savedAt: _savedAt, messageCount: _messageCount, ...gameData } = serverData.savedData;

        // DON'T overwrite collected round data during refresh if we're actively collecting
        // Only set it if we don't have any collected data yet
        if (Object.keys(collectedRoundData).length === 0) {
          dispatch(setCollectedRoundData(gameData));
        }

        dispatch(setResponses(gameData));

        if (gameData.game && gameData.game.id) {
          dispatch(setCurrentGameId(gameData.game.id));
        }
      }

      showSuccessMessage('🔄 Data refreshed from server!');
    } catch (error: any) {
      dispatch(addError({ type: 'refresh_data', message: `Failed to refresh data: ${error.message}` }));
    } finally {
      dispatch(setIsDataLoading(false));
    }
  }, [showSuccessMessage, collectedRoundData, dispatch]);

  const updateGameIdsWithRefresh = useCallback(async (): Promise<void> => {
    const randomGameId = generateRandomGameId();
    dispatch(setIsUpdatingGameId(true));

    try {
      const response = await fetch(API_URLS.UPDATE_GAME_IDS, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newGameId: randomGameId }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      await refreshDataFromServer();
      dispatch(setCurrentGameId(randomGameId));

      const updatedShortcuts = shortcuts.map((shortcut) => updateShortcutGameIds(shortcut, randomGameId));
      dispatch(setShortcuts(updatedShortcuts));

      // ID update complete - no automatic game message sending

      showToastMessage('🎉 New Round Started!', `Game ID updated to: ${result.newGameId}. All shortcuts updated!`);
    } catch (error: any) {
      dispatch(addError({ type: 'update_game_ids', message: `Failed to update game IDs: ${error.message}` }));
    } finally {
      dispatch(setIsUpdatingGameId(false));
    }
  }, [dispatch, refreshDataFromServer, showToastMessage, shortcuts]);

  const handleSendShortcut = useCallback(
    (shortcut: MessageShortcut): void => {
      if (!devWsRef.current || connections.dev !== 'connected') {
        dispatch(addError({ type: 'shortcut_send', message: 'Dev WebSocket not connected' }));
        return;
      }

      try {
        shortcut.messages.forEach((message, index) => {
          setTimeout(() => {
            if (devWsRef.current && devWsRef.current.readyState === WebSocket.OPEN) {
              const parsedContent = JSON.parse(message.content);
              const payload = { [message.messageKey]: parsedContent };
              devWsRef.current.send(JSON.stringify(payload));

              dispatch(addDevMessage(JSON.stringify(payload, null, 2)));
            } else if (devWsRef.current && devWsRef.current.readyState === WebSocket.CONNECTING) {
              // WebSocket is still connecting, skipping message - silently continue
            }
          }, index * 200);
        });

        // Update last used timestamp
        dispatch(updateShortcutLastUsed(shortcut.id));

        // Update round ID and sync everywhere after sending all messages
        setTimeout(
          () => {
            updateGameIdsWithRefresh().catch(() => {});
          },
          shortcut.messages.length * 200 + 100
        ); // Wait for all messages to be sent + small buffer

        showToastMessage('🚀 Shortcut Sent!', `All ${shortcut.messages.length} messages sent successfully`);
      } catch (error) {
        dispatch(addError({ type: 'shortcut_send', message: 'Failed to send shortcut messages' }));
      }
    },
    [connections.dev, dispatch, showToastMessage, updateGameIdsWithRefresh]
  );

  const saveCollectedData = useCallback(async (): Promise<void> => {
    // FALLBACK STRATEGY: If previousRoundData is empty or only has winners,
    // use collectedRoundData + whatever is in previousRoundData
    let dataToSave;

    if (Object.keys(previousRoundData).length === 0) {
      dataToSave = JSON.parse(JSON.stringify(collectedRoundData));
    } else if (Object.keys(previousRoundData).length === 1 && previousRoundData.winners) {
      dataToSave = JSON.parse(JSON.stringify({ ...collectedRoundData, ...previousRoundData }));
    } else {
      dataToSave = JSON.parse(JSON.stringify(previousRoundData));
    }

    const keysToSave = Object.keys(dataToSave);
    const totalKeys = keysToSave.length;

    if (totalKeys === 0) {
      dispatch(addError({ type: 'save_validation', message: 'No round data available to save!' }));
      return;
    }

    // Validate data integrity before saving
    validateRoundDataIntegrity(dataToSave, 'SAVE OPERATION');

    // Show toast message with keys being saved
    showToastMessage('💾 Saving Round Data', `Saving ${totalKeys} keys: ${keysToSave.join(', ')}`);

    // Ensure we have critical keys before saving
    const criticalKeys = ['winners'];
    const hasCriticalKeys = criticalKeys.every((key) => keysToSave.includes(key));

    if (!hasCriticalKeys) {
      dispatch(
        addError({
          type: 'save_validation',
          message: 'Missing critical data keys. Cannot save incomplete round data.',
        })
      );
      return;
    }

    try {

      const response = await fetch(API_URLS.SAVE_COLLECTED_DATA, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dataToSave),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      await response.json();

      // Only clear the data after successful save
      dispatch(setPreviousRoundData({}));
      setCanSaveData(false);

      // DON'T refresh data from server immediately after save
      // This might be overwriting our state
      // refreshDataFromServer();

      showToastMessage('🎯 Round Data Saved!', `Successfully saved ${totalKeys} keys: ${keysToSave.join(', ')}`);
      showSuccessMessage('🎯 Previous round data saved successfully!');
    } catch (error: any) {
      dispatch(addError({ type: 'save_collected', message: `Failed to save collected data: ${error.message}` }));
    }
  }, [
    previousRoundData,
    collectedRoundData,
    showSuccessMessage,
    showToastMessage,
    dispatch,
    validateRoundDataIntegrity,
  ]);

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
  }, [bridgeMode, dispatch, showToastMessage]);

  // Game round management
  const updateRoundStatus = useCallback(
    (status: RoundStatus['status'], message: string): void => {
      dispatch(setRoundStatus({ status, message }));
    },
    [dispatch]
  );

  const collectRoundData = useCallback(
    (messageType: string, messageData: any): void => {
      // ALWAYS collect ALL messages - we collect everything during a round
      // Add this message to collected round data immediately
      dispatch(addToCollectedRoundData({ key: messageType, data: messageData }));

      // Get updated data for status display (including the new message)
      // Use setTimeout to ensure Redux state is updated before accessing
      setTimeout(() => {
        // Access current collected data from the store after Redux update
        const currentCollectedData = store.getState().messages.collectedRoundData;
        const currentKeys = Object.keys(currentCollectedData);
        const keysDisplay = currentKeys.join(', ');

        // Mark round as active if we see any game-related message
        if (!isRoundActive) {
          setIsRoundActive(true);
          updateRoundStatus('active', `Round active - collecting: ${messageType}...`);
        } else {
          // Update status with current keys and message count
          updateRoundStatus('active', `Collecting: ${keysDisplay} (${currentKeys.length} messages)`);
        }

        // Round ends when winners message arrives - this is the trigger to save
        if (messageType === 'winners') {
          // Get the complete round data - use current state, not stale closure variable
          const completeRoundData = currentCollectedData;
          const totalMessages = Object.keys(completeRoundData).length;
          const completedKeys = Object.keys(completeRoundData).join(', ');

          // Validate round completion integrity
          validateRoundDataIntegrity(completeRoundData, 'ROUND COMPLETION');

          updateRoundStatus(
            'complete',
            `Round completed: ${completedKeys} (${totalMessages} messages) - Moving to previous round.`
          );

          // Set the COMPLETE round data (including winners) as previous round data for saving
          dispatch(setPreviousRoundData(completeRoundData));

          // Clear collected data for next round
          dispatch(setCollectedRoundData({}));

          setCanSaveData(true);
          setHasCompletedRound(true);
          setIsRoundActive(false);

          // Show toast notification about round completion
          showToastMessage('🎯 Round Completed!', `Collected ${totalMessages} keys: ${completedKeys}`);

          if (roundTimerRef.current) {
            clearTimeout(roundTimerRef.current);
          }

          roundTimerRef.current = setTimeout(() => {
            dispatch(clearExternalMessages());
            updateRoundStatus(
              'waiting',
              `Waiting for next round. Previous: ${completedKeys} (${totalMessages} messages) ready to save.`
            );
          }, TIMING.ROUND_COMPLETE_DELAY);
        }
      }, 0); // End setTimeout for Redux state sync
    },
    [isRoundActive, updateRoundStatus, dispatch, showToastMessage, validateRoundDataIntegrity]
  );

  // WebSocket functions with proper bridge mode handling
  const connectExternal = useCallback(async (): Promise<void> => {
    if (externalWsRef.current) {
      externalWsRef.current.close();
    }

    dispatch(setExternalConnectionStatus('connecting'));

    try {
      const wsURL = await extractParamsFromUrl(window.location.href);
      
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
        message: `Failed to connect to external WebSocket: ${error}. Add ?JSESSIONID=xxx&tableId=yyy to URL for real game connection.` 
      }));
    }
  }, [dispatch, collectRoundData]);

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
  }, [dispatch, collectedRoundData, responses, showSuccessMessage, showToastMessage]);

  const disconnectExternal = useCallback((): void => {
    if (externalWsRef.current) {
      externalWsRef.current.close(1000, 'Manual disconnect');
      externalWsRef.current = null;
    }
    dispatch(setExternalConnectionStatus('disconnected'));
    showSuccessMessage('🔌 External WebSocket disconnected manually');
  }, [dispatch, showSuccessMessage]);

  // Initialize connections and start data collection  
  useEffect(() => {
    if (!connectionsInitialized.current) {
      connectionsInitialized.current = true;
      setIsRoundActive(true); // Start collecting immediately
      updateRoundStatus('active', 'Initialized - collecting all incoming messages...');
      
      // Initialize connections immediately
      const initializeConnections = async (): Promise<void> => {
        try {
          await connectExternal();
        } catch (error) {
        }

        try {
          connectDev();
        } catch (error) {
        }
      };
      
      void initializeConnections();
    }

    return (): void => {
      if (externalWsRef.current) externalWsRef.current.close();
      if (devWsRef.current) devWsRef.current.close();
      if (roundTimerRef.current) clearTimeout(roundTimerRef.current);
    };
    // Empty dependency array to run only once
  }, []);

  useEffect((): void => {
    if (!dataRefreshed.current) {
      dataRefreshed.current = true;
      refreshDataFromServer();
    }
  }, []); // Empty dependency array since we only want this to run once

  return (
    <div className={styles.websocketInterceptor}>
      {/* Toast Message */}
      <Toast message={toastMessage} onDismiss={() => dispatch(hideToast())} />

      {/* Error Badge */}
      {errors.length > 0 && (
        <div className={styles.errorBadge} onClick={() => dispatch(setShowErrorModal(true))}>
          {errors.length} Errors
        </div>
      )}

      {/* Error Modal */}
      <ErrorModal
        isOpen={showErrorModal}
        onClose={() => dispatch(setShowErrorModal(false))}
        errors={errors}
        onClearErrors={() => dispatch(clearErrors())}
      />

      {/* Shortcut Modal */}
      <ShortcutModal
        isOpen={showShortcutModal}
        onClose={() => {
          dispatch(setShowShortcutModal(false));
          dispatch(setEditingShortcut(null));
        }}
        onSave={handleSaveShortcut}
        editingShortcut={editingShortcut}
        availableKeys={Object.keys(responses)}
        responses={responses}
        onCardEdit={handleCardEdit}
        onUpdateShortcutMessage={handleUpdateShortcutMessage}
        onSetCardUpdateCallback={() => {}}
        cardUpdateTrigger={cardUpdateTrigger}
        onCardUpdateComplete={() => dispatch(setCardUpdateTrigger(null))}
      />

      {/* Card Selection Popup */}
      <CardSelectionPopup
        isOpen={showCardPopup}
        onClose={() => {
          dispatch(setShowCardPopup(false));
          dispatch(setEditingCardMessageId(null));
          dispatch(setCurrentEditingCardData(null));
        }}
        onCardSelect={handleCardSelect}
        currentCardData={getCurrentCardData()}
      />

      {/* JSON Viewer Modal */}
      <JSONViewerModal
        isOpen={showJSONViewer}
        onClose={() => setShowJSONViewer(false)}
        jsonContent={messageContent}
        onUpdate={(updatedJSON) => {
          dispatch(setMessageContent(updatedJSON));
        }}
      />

      {/* Main Content */}
      <div className={styles.mainContent}>
        {/* External Messages Column */}
        <MessageColumn
          title="Env Messages"
          connectionStatus={connections.external}
          messages={externalMessages}
          bridgeMode={bridgeMode}
          onClear={() => {
            dispatch(clearExternalMessages());
          }}
          onReconnect={() => void connectExternal()}
          onDisconnect={() => void disconnectExternal()}
        />

        {/* Control Panel Column */}
        <div className={styles.controlPanelColumn}>
          <h3 className={styles.controlPanelHeader}>🎛️ Interceptor Control Panel</h3>

          {/* Data Management Section */}
          <DataManagement
            collectedRoundData={collectedRoundData}
            previousRoundData={previousRoundData}
            currentGameId={currentGameId}
            isDataLoading={isDataLoading}
            canSaveData={canSaveData}
            hasCompletedRound={hasCompletedRound}
            roundStatus={roundStatus}
            onRefreshData={() => void refreshDataFromServer()}
            onSaveData={() => void saveCollectedData()}
          />

          {/* Bridge Mode Control */}
          <BridgeModeControl bridgeMode={bridgeMode} onToggleBridgeMode={toggleBridgeMode} />

          {/* New Round Section */}
          <div className={styles.buttonGroup}>
            <button
              className={styles.newRoundBtn}
              onClick={() => void updateGameIdsWithRefresh()}
              disabled={isUpdatingGameId || bridgeMode}
              style={{ opacity: bridgeMode ? 0.5 : 1 }}
            >
              <Hash size={16} />
              {isUpdatingGameId ? 'Starting New Round...' : 'New Round'}
            </button>
          </div>

          {/* Message Control Section */}
          <MessageControl
            selectedKey={selectedKey}
            messageContent={messageContent}
            responses={responses}
            bridgeMode={bridgeMode}
            onKeyChange={handleKeyChange}
            onContentChange={handleContentChange}
            onSendMessage={handleSendMessage}
            onOpenCardPopup={handleOpenCardPopup}
            onOpenJSONViewer={() => setShowJSONViewer(true)}
          />

          {/* Shortcut Section */}
          <ShortcutSection
            shortcuts={shortcuts}
            bridgeMode={bridgeMode}
            devConnected={connections.dev === 'connected'}
            onCreateShortcut={handleCreateShortcut}
            onEditShortcut={handleEditShortcut}
            onSendShortcut={handleSendShortcut}
            onDuplicateShortcut={handleDuplicateShortcut}
            onDeleteShortcut={handleDeleteShortcut}
          />
        </div>

        {/* Dev Messages Column */}
        <MessageColumn
          title="Dev WebSocket Messages (8084)"
          connectionStatus={connections.dev}
          messages={devMessages}
          bridgeMode={bridgeMode}
          onClear={() => dispatch(clearDevMessages())}
        />
      </div>

      {/* Round Status Bar */}
      <RoundStatusBar
        roundStatus={roundStatus}
        collectedRoundData={collectedRoundData}
        previousRoundData={previousRoundData}
        savedRoundsData={{}}
        bridgeMode={bridgeMode}
      />
    </div>
  );
};

export default WebSocketInterceptor;
