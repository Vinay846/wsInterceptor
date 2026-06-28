import { Plus, Trash2, Eye, ArrowUp, ArrowDown } from 'lucide-react';
import React, { useState, useEffect, useCallback } from 'react';

import { ShortcutModalProps, ShortcutMessage } from '../../types';
import { isValidJSON } from '../../utils/websocket';
import JSONViewerModal from '../JSONViewerModal/JSONViewerModal';

import styles from './ShortcutModal.module.css';

const ShortcutModal: React.FC<ShortcutModalProps> = ({
  isOpen,
  onClose,
  onSave,
  editingShortcut,
  availableKeys,
  responses,
  onCardEdit,
  onUpdateShortcutMessage,
  onSetCardUpdateCallback,
  cardUpdateTrigger,
  onCardUpdateComplete,
}) => {
  const [name, setName] = useState('');
  const [messages, setMessages] = useState<ShortcutMessage[]>([]);
  const [showJSONViewer, setShowJSONViewer] = useState(false);
  const [currentViewingMessageId, setCurrentViewingMessageId] = useState<string | null>(null);

  useEffect(() => {
    if (editingShortcut) {
      setName(editingShortcut.name);
      setMessages(editingShortcut.messages);
    } else {
      setName('');
      setMessages([]);
    }
  }, [editingShortcut, isOpen]);

  const addMessage = () => {
    const newMessage: ShortcutMessage = {
      id: Date.now().toString() + Math.random(),
      messageKey: '',
      content: '',
    };
    setMessages((prev) => [...prev, newMessage]);
  };

  const removeMessage = (messageId: string) => {
    setMessages((prev) => prev.filter((m) => m.id !== messageId));
  };

  const updateMessage = useCallback((messageId: string, field: keyof ShortcutMessage, value: string): void => {
    setMessages((prev) => prev.map((m) => (m.id === messageId ? { ...m, [field]: value } : m)));
  }, []);

  const moveMessageUp = (messageId: string) => {
    setMessages((prev) => {
      const index = prev.findIndex((m) => m.id === messageId);
      if (index <= 0) return prev; // Already at the top or not found
      const newMessages = [...prev];
      [newMessages[index - 1], newMessages[index]] = [newMessages[index], newMessages[index - 1]];
      return newMessages;
    });
  };

  const moveMessageDown = (messageId: string) => {
    setMessages((prev) => {
      const index = prev.findIndex((m) => m.id === messageId);
      if (index === -1 || index === prev.length - 1) return prev; // Not found or already at the bottom
      const newMessages = [...prev];
      [newMessages[index], newMessages[index + 1]] = [newMessages[index + 1], newMessages[index]];
      return newMessages;
    });
  };

  const handleOpenJSONViewer = (messageId: string) => {
    setCurrentViewingMessageId(messageId);
    setShowJSONViewer(true);
  };

  const handleCloseJSONViewer = () => {
    setShowJSONViewer(false);
    setCurrentViewingMessageId(null);
  };

  const handleJSONUpdate = (updatedJSON: string) => {
    if (currentViewingMessageId) {
      updateMessage(currentViewingMessageId, 'content', updatedJSON);
    }
  };

  const handleMessageKeyChange = (messageId: string, selectedKey: string) => {
    updateMessage(messageId, 'messageKey', selectedKey);
    if (selectedKey && responses[selectedKey]) {
      updateMessage(messageId, 'content', JSON.stringify(responses[selectedKey], null, 2));
    }
  };

  const handleCardEdit = (messageId: string) => {
    const message = messages.find((m) => m.id === messageId);

    if (message && message.messageKey === 'card' && message.content) {
      try {
        const cardData = JSON.parse(message.content);
        onCardEdit(messageId, cardData);
      } catch (error) {
      }
    }
  };

  // Create stable callback function using useCallback
  const handleCardDataUpdate = useCallback(
    (messageId: string, updatedCardData: any): void => {
      // Use the existing updateMessage function to ensure consistency
      if (updatedCardData) {
        const newContent = JSON.stringify(updatedCardData, null, 2);
        updateMessage(messageId, 'content', newContent);
      }
    },
    [updateMessage]
  );

  // Handle card update trigger from parent
  useEffect(() => {
    if (cardUpdateTrigger && cardUpdateTrigger.cardData) {
      const newContent = JSON.stringify(cardUpdateTrigger.cardData, null, 2);
      updateMessage(cardUpdateTrigger.messageId, 'content', newContent);

      // Clear the trigger
      onCardUpdateComplete?.();
    }
  }, [cardUpdateTrigger, updateMessage, onCardUpdateComplete]);

  // Register card update callback with parent
  useEffect(() => {
    // Register the callback with parent
    onSetCardUpdateCallback(handleCardDataUpdate);

    return () => {
      onSetCardUpdateCallback(null);
    };
  }, [onSetCardUpdateCallback, handleCardDataUpdate]);

  const handleSave = (): void => {
    if (
      name.trim() &&
      messages.length > 0 &&
      messages.every((m) => m.messageKey && m.content.trim() && isValidJSON(m.content))
    ) {
      onSave({
        name: name.trim(),
        messages: messages.map((m) => ({ ...m, content: m.content.trim() })),
        lastUsed: editingShortcut?.lastUsed,
      });
      onClose();
    }
  };

  const handleReset = (): void => {
    setName('');
    setMessages([]);
  };

  const canSave =
    name.trim() &&
    messages.length > 0 &&
    messages.every((m) => m.messageKey && m.content.trim() && isValidJSON(m.content));

  if (!isOpen) return null;

  return (
    <div className={styles.modalOverlay}>
      <div className={styles.modalContent}>
        <div className={styles.modalHeader}>
          <h2 className={styles.modalTitle}>{editingShortcut ? '✏️ Edit Shortcut' : '➕ Create New Shortcut'}</h2>
          <button className={styles.modalClose} onClick={onClose}>
            ×
          </button>
        </div>

        <div className={styles.modalBody}>
          {/* Shortcut Name Input */}
          <div className={styles.formGroup}>
            <label className={styles.formLabel}>Shortcut Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Player Win Setup, Complete Game Round"
              className={styles.formInput}
            />
          </div>

          {/* Messages Section */}
          <div className={styles.messageListSection}>
            <div className={styles.messageListHeader}>
              <h3 className={styles.messageListTitle}>Messages ({messages.length})</h3>
              <button className={styles.addMessageBtn} onClick={addMessage}>
                <Plus size={14} />
                Add Message
              </button>
            </div>

            {messages.length === 0 ? (
              <div className={styles.emptyMessageList}>
                <div className={styles.emptyIcon}>📝</div>
                <div className={styles.emptyText}>No messages added yet</div>
                <div className={styles.emptySubtext}>Click &quot;Add Message&quot; to start building your shortcut</div>
              </div>
            ) : (
              <div className={styles.messagesList}>
                {messages.map((message, index) => {
                  return (
                    <div key={message.id} className={styles.messageItem}>
                      <div className={styles.messageItemHeader}>
                        <span className={styles.messageItemTitle}>
                          Message #{index + 1}
                          {message.messageKey && <span className={styles.messageKeyBadge}>{message.messageKey}</span>}
                        </span>
                        <div className={styles.messageHeaderButtons}>
                          <button
                            className={styles.jsonViewerBtn}
                            onClick={() => handleOpenJSONViewer(message.id)}
                            disabled={!message.content || !isValidJSON(message.content)}
                            title="View JSON as Table"
                          >
                            <Eye size={12} />
                          </button>
                          <button
                            className={styles.moveMessageBtn}
                            onClick={() => moveMessageUp(message.id)}
                            disabled={index === 0}
                            title="Move message up"
                          >
                            <ArrowUp size={12} />
                          </button>
                          <button
                            className={styles.moveMessageBtn}
                            onClick={() => moveMessageDown(message.id)}
                            disabled={index === messages.length - 1}
                            title="Move message down"
                          >
                            <ArrowDown size={12} />
                          </button>
                          <button
                            className={styles.removeMessageBtn}
                            onClick={() => removeMessage(message.id)}
                            title="Remove this message"
                          >
                            <Trash2 size={12} />
                            Remove
                          </button>
                        </div>
                      </div>

                      <select
                        value={message.messageKey}
                        onChange={(e) => handleMessageKeyChange(message.id, e.target.value)}
                        className={styles.messageKeySelect}
                      >
                        <option value="">-- Select Message Key --</option>
                        {availableKeys.map((key) => (
                          <option key={key} value={key}>
                            {key}
                          </option>
                        ))}
                      </select>

                      <textarea
                        value={message.content}
                        onChange={(e) => updateMessage(message.id, 'content', e.target.value)}
                        placeholder="Enter JSON content for the message..."
                        className={styles.messageContentTextarea}
                      />

                      <div className={styles.messageActions}>
                        {message.content && (
                          <span
                            className={`${styles.messageStatus} ${
                              isValidJSON(message.content) ? styles.jsonValidSmall : styles.jsonInvalidSmall
                            }`}
                          >
                            {isValidJSON(message.content) ? '✅ Valid JSON' : '❌ Invalid JSON'}
                          </span>
                        )}

                        {message.messageKey === 'card' && message.content && isValidJSON(message.content) && (
                          <button
                            className={styles.cardEditButtonSmall}
                            onClick={() => handleCardEdit(message.id)}
                            title="Edit card selection"
                          >
                            🃏 Edit Card
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Save Progress Info */}
          {messages.length > 0 && (
            <div className={styles.progressInfo}>
              <div className={styles.progressText}>
                Progress: {messages.filter((m) => m.messageKey && m.content && isValidJSON(m.content)).length} /{' '}
                {messages.length} messages completed
              </div>
              <div className={styles.progressBar}>
                <div
                  className={styles.progressFill}
                  style={{
                    width: `${(messages.filter((m) => m.messageKey && m.content && isValidJSON(m.content)).length / messages.length) * 100}%`,
                  }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Modal Actions */}
        <div className={styles.modalActions}>
          <button className={styles.btnSecondary} onClick={handleReset}>
            🔄 Reset
          </button>
          <button className={styles.btnSecondary} onClick={onClose}>
            Cancel
          </button>
          <button
            className={styles.btnPrimary}
            onClick={handleSave}
            disabled={!canSave}
            title={!canSave ? 'Please complete all messages with valid JSON' : 'Save shortcut'}
          >
            {editingShortcut ? '💾 Update Shortcut' : '✨ Create Shortcut'}
          </button>
        </div>
      </div>

      {/* JSON Viewer Modal */}
      <JSONViewerModal
        isOpen={showJSONViewer}
        onClose={handleCloseJSONViewer}
        jsonContent={currentViewingMessageId ? messages.find((m) => m.id === currentViewingMessageId)?.content || '' : ''}
        onUpdate={handleJSONUpdate}
      />
    </div>
  );
};

export default ShortcutModal;
