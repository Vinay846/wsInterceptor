import { useCallback } from 'react';

import { API_URLS } from '../../../constants';
import { useAppDispatch } from '../../../store/hooks';
import { addError } from '../../../store/slices/connectionSlice';
import {
  setCollectedRoundData,
  setCurrentGameId,
  setIsDataLoading,
  setResponses,
} from '../../../store/slices/messageSlice';
import { setShortcuts } from '../../../store/slices/shortcutSlice';
import { setIsUpdatingGameId } from '../../../store/slices/uiSlice';
import type { MessageShortcut, ResponsesData } from '../../../types';
import { generateRandomGameId, updateShortcutGameIds } from '../../../utils/websocket';

import type { Notifications } from './useNotifications';

interface UseServerDataParams {
  notifications: Notifications;
  collectedRoundData: ResponsesData;
  shortcuts: MessageShortcut[];
}

export interface ServerData {
  refreshDataFromServer: () => Promise<void>;
  updateGameIdsWithRefresh: () => Promise<void>;
}

/**
 * Server-state synchronization: refreshing the message catalog from the backend
 * and rotating the game id (which also refreshes data and re-syncs shortcuts).
 */
export const useServerData = ({
  notifications,
  collectedRoundData,
  shortcuts,
}: UseServerDataParams): ServerData => {
  const dispatch = useAppDispatch();
  const { showToastMessage, showSuccessMessage } = notifications;

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

  return { refreshDataFromServer, updateGameIdsWithRefresh };
};
