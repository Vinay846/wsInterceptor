import { useCallback } from 'react';

import { useAppDispatch } from '../../../store/hooks';
import { addError } from '../../../store/slices/connectionSlice';
import { addDevMessage } from '../../../store/slices/messageSlice';
import {
  addShortcut,
  deleteShortcut,
  setEditingShortcut,
  updateShortcut,
  updateShortcutLastUsed,
} from '../../../store/slices/shortcutSlice';
import { setShowShortcutModal } from '../../../store/slices/uiSlice';
import type { ConnectionStatus, MessageShortcut } from '../../../types';

import type { InterceptorRefs } from './useInterceptorRefs';
import type { Notifications } from './useNotifications';

interface UseShortcutHandlersParams {
  refs: Pick<InterceptorRefs, 'devWsRef'>;
  notifications: Notifications;
  shortcuts: MessageShortcut[];
  editingShortcut: MessageShortcut | null;
  devConnectionStatus: ConnectionStatus['dev'];
  updateGameIdsWithRefresh: () => Promise<void>;
}

export interface ShortcutHandlers {
  handleCreateShortcut: () => void;
  handleEditShortcut: (shortcut: MessageShortcut) => void;
  handleDuplicateShortcut: (shortcut: MessageShortcut) => void;
  handleDeleteShortcut: (shortcutId: string) => void;
  handleSaveShortcut: (shortcutData: Omit<MessageShortcut, 'id' | 'createdAt'>) => void;
  handleSendShortcut: (shortcut: MessageShortcut) => void;
}

/**
 * CRUD + send handlers for message shortcuts.
 */
export const useShortcutHandlers = ({
  refs,
  notifications,
  shortcuts,
  editingShortcut,
  devConnectionStatus,
  updateGameIdsWithRefresh,
}: UseShortcutHandlersParams): ShortcutHandlers => {
  const dispatch = useAppDispatch();
  const { showToastMessage } = notifications;
  const { devWsRef } = refs;

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
    [editingShortcut, showToastMessage, dispatch]
  );

  const handleSendShortcut = useCallback(
    (shortcut: MessageShortcut): void => {
      if (!devWsRef.current || devConnectionStatus !== 'connected') {
        dispatch(addError({ type: 'shortcut_send', message: 'Dev WebSocket not connected' }));
        return;
      }

      try {
        const useSequential = !!shortcut.sequentialSend;
        const delayFor = (message: MessageShortcut['messages'][number]): number =>
          typeof message.delayMs === 'number' ? message.delayMs : 200;

        // In sequential mode the first message fires instantly and each
        // following message waits for the SUM of the previous messages' delays
        // (e.g. 200ms then 200ms => fired at 0ms, 200ms, 400ms). In the default
        // mode every message is spaced by a fixed 200ms (legacy behavior).
        let cumulative = 0;
        shortcut.messages.forEach((message, index) => {
          const sendAt = useSequential ? cumulative : index * 200;
          if (useSequential) {
            cumulative += delayFor(message);
          }

          setTimeout(() => {
            if (devWsRef.current && devWsRef.current.readyState === WebSocket.OPEN) {
              const parsedContent = JSON.parse(message.content);
              const payload = { [message.messageKey]: parsedContent };
              devWsRef.current.send(JSON.stringify(payload));

              dispatch(addDevMessage(JSON.stringify(payload, null, 2)));
            } else if (devWsRef.current && devWsRef.current.readyState === WebSocket.CONNECTING) {
              // WebSocket is still connecting, skipping message - silently continue
            }
          }, sendAt);
        });

        // Update last used timestamp
        dispatch(updateShortcutLastUsed(shortcut.id));

        // Total time until the last message has been dispatched
        const totalDuration = useSequential ? cumulative : shortcut.messages.length * 200;

        // Update round ID and sync everywhere after sending all messages
        setTimeout(
          () => {
            updateGameIdsWithRefresh().catch(() => {});
          },
          totalDuration + 100
        ); // Wait for all messages to be sent + small buffer

        showToastMessage('🚀 Shortcut Sent!', `All ${shortcut.messages.length} messages sent successfully`);
      } catch (error) {
        dispatch(addError({ type: 'shortcut_send', message: 'Failed to send shortcut messages' }));
      }
    },
    [devConnectionStatus, dispatch, showToastMessage, updateGameIdsWithRefresh, devWsRef]
  );

  return {
    handleCreateShortcut,
    handleEditShortcut,
    handleDuplicateShortcut,
    handleDeleteShortcut,
    handleSaveShortcut,
    handleSendShortcut,
  };
};
