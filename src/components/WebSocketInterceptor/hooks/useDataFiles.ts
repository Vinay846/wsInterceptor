import { useCallback } from 'react';

import { API_URLS } from '../../../constants';
import { useAppDispatch } from '../../../store/hooks';
import {
  setActiveFile,
  setEnvUrl,
  setFileConfig,
  setFiles,
  setInitialKeys,
} from '../../../store/slices/configSlice';
import { addError } from '../../../store/slices/connectionSlice';
import {
  setCollectedRoundData,
  setMessageContent,
  setSelectedKey,
  updateResponse,
} from '../../../store/slices/messageSlice';

import type { Notifications } from './useNotifications';

interface UseDataFilesParams {
  notifications: Notifications;
  activeFile: string;
  refreshDataFromServer: () => Promise<void>;
}

export interface DataFiles {
  loadFileConfig: () => Promise<void>;
  handleEnvUrlChange: (url: string) => void;
  handleSaveInitialKeys: (keys: string[]) => Promise<void>;
  handleCreateFile: (fileName: string) => Promise<void>;
  handleSelectFile: (fileName: string) => Promise<void>;
  handleDeleteFile: (fileName: string) => Promise<void>;
  handleAddMessage: (name: string, content: string) => void;
  handleUpdateMessage: (key: string, content: string) => void;
  handleDeleteMessage: (key: string) => Promise<void>;
}

/**
 * Configuration, data-file & message persistence handlers (everything that
 * talks to the backend file/message endpoints).
 */
export const useDataFiles = ({
  notifications,
  activeFile,
  refreshDataFromServer,
}: UseDataFilesParams): DataFiles => {
  const dispatch = useAppDispatch();
  const { showToastMessage } = notifications;

  const loadFileConfig = useCallback(async (): Promise<void> => {
    try {
      const response = await fetch(API_URLS.FILES);
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      const data = await response.json();
      dispatch(
        setFileConfig({
          files: data.files || [],
          activeFile: data.activeFile || '',
          initialKeys: data.initialKeys || [],
        })
      );
    } catch (error: any) {
      dispatch(addError({ type: 'load_config', message: `Failed to load file config: ${error.message}` }));
    }
  }, [dispatch]);

  const handleEnvUrlChange = useCallback(
    (url: string): void => {
      dispatch(setEnvUrl(url));
    },
    [dispatch]
  );

  const handleSaveInitialKeys = useCallback(
    async (keys: string[]): Promise<void> => {
      try {
        const response = await fetch(API_URLS.INITIAL_KEYS, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ keys }),
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || `HTTP error! status: ${response.status}`);

        dispatch(setInitialKeys(result.initialKeys || keys));
        showToastMessage('💾 Initial Messages Saved', `${(result.initialKeys || keys).length} keys sent on connect`);
      } catch (error: any) {
        dispatch(addError({ type: 'initial_keys', message: `Failed to save initial keys: ${error.message}` }));
      }
    },
    [dispatch, showToastMessage]
  );

  const handleCreateFile = useCallback(
    async (fileName: string): Promise<void> => {
      try {
        const response = await fetch(API_URLS.FILES, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ fileName }),
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || `HTTP error! status: ${response.status}`);

        dispatch(setFiles(result.files || []));
        showToastMessage('🗂️ File Created', `Created "${fileName}"`);
      } catch (error: any) {
        dispatch(addError({ type: 'create_file', message: `Failed to create file: ${error.message}` }));
      }
    },
    [dispatch, showToastMessage]
  );

  const handleSelectFile = useCallback(
    async (fileName: string): Promise<void> => {
      if (!fileName || fileName === activeFile) return;
      try {
        const response = await fetch(API_URLS.ACTIVE_FILE, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ fileName }),
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || `HTTP error! status: ${response.status}`);

        dispatch(setActiveFile(result.activeFile || fileName));
        dispatch(setCollectedRoundData({}));
        await refreshDataFromServer();
        showToastMessage('🗂️ Active File Changed', `Now using "${result.activeFile || fileName}"`);
      } catch (error: any) {
        dispatch(addError({ type: 'active_file', message: `Failed to switch file: ${error.message}` }));
      }
    },
    [dispatch, activeFile, refreshDataFromServer, showToastMessage]
  );

  const handleDeleteFile = useCallback(
    async (fileName: string): Promise<void> => {
      if (!fileName) return;
      try {
        const response = await fetch(API_URLS.FILE_BY_NAME(fileName), { method: 'DELETE' });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || `HTTP error! status: ${response.status}`);

        dispatch(setFiles(result.files || []));
        dispatch(setActiveFile(result.activeFile || ''));
        dispatch(setCollectedRoundData({}));
        await refreshDataFromServer();
        showToastMessage('🗑️ File Deleted', `Deleted "${fileName}"`);
      } catch (error: any) {
        dispatch(addError({ type: 'delete_file', message: `Failed to delete file: ${error.message}` }));
      }
    },
    [dispatch, refreshDataFromServer, showToastMessage]
  );

  const persistMessageToFile = useCallback(
    async (key: string, content: string, isNew: boolean): Promise<void> => {
      let parsed: any;
      try {
        parsed = JSON.parse(content);
      } catch {
        dispatch(addError({ type: 'update_message', message: 'Invalid JSON - cannot save message' }));
        return;
      }
      if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
        dispatch(addError({ type: 'update_message', message: 'Message content must be a JSON object' }));
        return;
      }

      try {
        const response = await fetch(API_URLS.UPDATE_MESSAGE, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ key, data: parsed }),
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || `HTTP error! status: ${response.status}`);

        dispatch(updateResponse({ key, data: parsed }));
        await refreshDataFromServer();
        if (isNew) {
          dispatch(setSelectedKey(key));
        }
        showToastMessage(isNew ? '➕ Message Added' : '💾 Message Updated', `"${key}" saved to ${activeFile}`);
      } catch (error: any) {
        dispatch(addError({ type: 'update_message', message: `Failed to save message: ${error.message}` }));
      }
    },
    [dispatch, refreshDataFromServer, showToastMessage, activeFile]
  );

  const handleAddMessage = useCallback(
    (name: string, content: string): void => {
      void persistMessageToFile(name, content, true);
    },
    [persistMessageToFile]
  );

  const handleUpdateMessage = useCallback(
    (key: string, content: string): void => {
      void persistMessageToFile(key, content, false);
    },
    [persistMessageToFile]
  );

  const handleDeleteMessage = useCallback(
    async (key: string): Promise<void> => {
      if (!key) return;
      try {
        const response = await fetch(API_URLS.DELETE_MESSAGE(key), { method: 'DELETE' });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || `HTTP error! status: ${response.status}`);

        dispatch(setSelectedKey(''));
        dispatch(setMessageContent(''));
        await refreshDataFromServer();
        showToastMessage('🗑️ Message Deleted', `"${key}" removed from ${activeFile}`);
      } catch (error: any) {
        dispatch(addError({ type: 'delete_message', message: `Failed to delete message: ${error.message}` }));
      }
    },
    [dispatch, refreshDataFromServer, showToastMessage, activeFile]
  );

  return {
    loadFileConfig,
    handleEnvUrlChange,
    handleSaveInitialKeys,
    handleCreateFile,
    handleSelectFile,
    handleDeleteFile,
    handleAddMessage,
    handleUpdateMessage,
    handleDeleteMessage,
  };
};
