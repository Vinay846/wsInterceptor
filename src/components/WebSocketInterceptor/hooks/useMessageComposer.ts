import { useCallback, useState } from 'react';

import { useAppDispatch } from '../../../store/hooks';
import {
  addDevMessage,
  setMessageContent,
  setSelectedKey,
  updateResponse,
} from '../../../store/slices/messageSlice';
import {
  setCardUpdateTrigger,
  setCurrentEditingCardData,
  setEditingCardMessageId,
  setEditingShortcut,
} from '../../../store/slices/shortcutSlice';
import { setShowCardPopup } from '../../../store/slices/uiSlice';
import type { MessageShortcut, ResponsesData } from '../../../types';

import type { InterceptorRefs } from './useInterceptorRefs';
import type { Notifications } from './useNotifications';

interface UseMessageComposerParams {
  refs: Pick<InterceptorRefs, 'devWsRef'>;
  notifications: Notifications;
  responses: ResponsesData;
  selectedKey: string;
  messageContent: string;
  editingShortcut: MessageShortcut | null;
  editingCardMessageId: string | null;
  currentEditingCardData: any;
}

export interface MessageComposer {
  handleKeyChange: (key: string) => void;
  handleContentChange: (content: string) => void;
  handleSendMessage: (raw?: boolean) => void;
  handleOpenCardPopup: () => void;
  handleCardEdit: (messageId: string, cardData: any) => void;
  handleUpdateShortcutMessage: (messageId: string, content: string) => void;
  handleCardSelect: (cardInfo: any) => void;
  getCurrentCardData: () => any;
}

/**
 * Message composition (key selection, content editing, sending) plus the
 * card-editing flow used both for the active message and shortcut messages.
 */
export const useMessageComposer = ({
  refs,
  notifications,
  responses,
  selectedKey,
  messageContent,
  editingShortcut,
  editingCardMessageId,
  currentEditingCardData,
}: UseMessageComposerParams): MessageComposer => {
  const dispatch = useAppDispatch();
  const { addErrorMessage, showSuccessMessage } = notifications;
  const { devWsRef } = refs;

  const [seqCounter, setSeqCounter] = useState<number>(1000);

  const getNextSeqId = useCallback((): number => {
    setSeqCounter((prev) => prev + 1);
    return seqCounter + 1;
  }, [seqCounter]);

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

  const handleSendMessage = useCallback(
    (raw?: boolean): void => {
      // In raw mode we only need content (XML / plain text). In JSON mode we
      // also need a selected key to wrap the parsed payload under.
      const hasTarget = raw ? !!messageContent : !!selectedKey && !!messageContent;
      if (!hasTarget || !devWsRef.current || devWsRef.current.readyState !== WebSocket.OPEN) {
        if (devWsRef.current && devWsRef.current.readyState === WebSocket.CONNECTING) {
          addErrorMessage('message_send', 'WebSocket is still connecting. Please wait and try again.');
        } else if (devWsRef.current && devWsRef.current.readyState === WebSocket.CLOSED) {
          addErrorMessage('message_send', 'WebSocket is closed. Please reconnect and try again.');
        }
        return;
      }

      // Raw mode: send the content exactly as typed (no JSON validation/wrapping)
      if (raw) {
        devWsRef.current.send(messageContent);
        dispatch(addDevMessage(messageContent));
        showSuccessMessage('🚀 Raw message sent to dev clients!');
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
    },
    [selectedKey, messageContent, showSuccessMessage, addErrorMessage, dispatch, devWsRef]
  );

  const handleOpenCardPopup = useCallback((): void => {
    dispatch(setShowCardPopup(true));
  }, [dispatch]);

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

  return {
    handleKeyChange,
    handleContentChange,
    handleSendMessage,
    handleOpenCardPopup,
    handleCardEdit,
    handleUpdateShortcutMessage,
    handleCardSelect,
    getCurrentCardData,
  };
};
