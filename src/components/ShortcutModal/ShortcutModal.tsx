import {
  Plus,
  Trash2,
  Eye,
  ArrowUp,
  ArrowDown,
  Clock,
  Maximize2,
  Minimize2,
  GripVertical,
} from 'lucide-react';
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';

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
  const [sequentialSend, setSequentialSend] = useState(false);
  const [showJSONViewer, setShowJSONViewer] = useState(false);
  const [currentViewingMessageId, setCurrentViewingMessageId] = useState<string | null>(null);
  const [messagesExpanded, setMessagesExpanded] = useState(false);
  const [dragOverId, setDragOverId] = useState<string | null>(null);
  const dragIdRef = useRef<string | null>(null);

  const DEFAULT_DELAY_MS = 200;

  useEffect(() => {
    if (editingShortcut) {
      setName(editingShortcut.name);
      setMessages(editingShortcut.messages);
      setSequentialSend(!!editingShortcut.sequentialSend);
    } else {
      setName('');
      setMessages([]);
      setSequentialSend(false);
    }
    setMessagesExpanded(false);
  }, [editingShortcut, isOpen]);

  // Fullscreen messages list: lock body scroll + Esc to exit
  useEffect(() => {
    if (!messagesExpanded) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMessagesExpanded(false);
    };
    window.addEventListener('keydown', onKeyDown);

    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [messagesExpanded]);

  const addMessage = () => {
    const newMessage: ShortcutMessage = {
      id: Date.now().toString() + Math.random(),
      messageKey: '',
      content: '',
      delayMs: DEFAULT_DELAY_MS,
    };
    setMessages((prev) => [...prev, newMessage]);
  };

  const updateMessageDelay = (messageId: string, delayMs: number) => {
    setMessages((prev) => prev.map((m) => (m.id === messageId ? { ...m, delayMs } : m)));
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

  const reorderMessages = (fromId: string, toId: string) => {
    setMessages((prev) => {
      const fromIndex = prev.findIndex((m) => m.id === fromId);
      const toIndex = prev.findIndex((m) => m.id === toId);
      if (fromIndex === -1 || toIndex === -1 || fromIndex === toIndex) return prev;
      const next = [...prev];
      const [moved] = next.splice(fromIndex, 1);
      next.splice(toIndex, 0, moved);
      return next;
    });
  };

  const handleDragStart = (e: React.DragEvent<HTMLElement>, id: string) => {
    dragIdRef.current = id;
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', id);
    const item = (e.currentTarget as HTMLElement).closest(`.${styles.messageItem}`);
    item?.classList.add(styles.dragging);
  };

  const handleDragEnd = (e: React.DragEvent<HTMLElement>) => {
    dragIdRef.current = null;
    setDragOverId(null);
    const item = (e.currentTarget as HTMLElement).closest(`.${styles.messageItem}`);
    item?.classList.remove(styles.dragging);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>, id: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverId !== id) setDragOverId(id);
  };

  const handleDragLeave = (_e: React.DragEvent<HTMLDivElement>, id: string) => {
    if (dragOverId === id) setDragOverId(null);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>, toId: string) => {
    e.preventDefault();
    const fromId = dragIdRef.current || e.dataTransfer.getData('text/plain');
    setDragOverId(null);
    if (fromId && fromId !== toId) {
      reorderMessages(fromId, toId);
    }
    dragIdRef.current = null;
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
        messages: messages.map((m) => ({
          ...m,
          content: m.content.trim(),
          delayMs: typeof m.delayMs === 'number' ? m.delayMs : DEFAULT_DELAY_MS,
        })),
        sequentialSend,
        lastUsed: editingShortcut?.lastUsed,
      });
      onClose();
    }
  };

  const handleReset = (): void => {
    setName('');
    setMessages([]);
    setSequentialSend(false);
  };

  const canSave =
    name.trim() &&
    messages.length > 0 &&
    messages.every((m) => m.messageKey && m.content.trim() && isValidJSON(m.content));

  if (!isOpen) return null;

  const renderExpandToggle = () => (
    <button
      type="button"
      className={styles.expandBtn}
      onClick={() => setMessagesExpanded((v) => !v)}
      title={messagesExpanded ? 'Exit full screen' : 'Expand messages to full screen'}
      aria-label={messagesExpanded ? 'Exit full screen' : 'Expand messages to full screen'}
    >
      {messagesExpanded ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
    </button>
  );

  const messagesSection = (
    <div
      className={`${styles.messageListSection} ${
        messagesExpanded ? styles.messageListSectionExpanded : ''
      }`}
    >
      <div className={styles.messageListHeader}>
        <h3 className={styles.messageListTitle}>Messages ({messages.length})</h3>
        <div className={styles.messageListHeaderActions}>
          {renderExpandToggle()}
          <button
            type="button"
            className={`${styles.sequenceToggleBtn} ${sequentialSend ? styles.sequenceToggleActive : ''}`}
            onClick={() => setSequentialSend((prev) => !prev)}
            aria-pressed={sequentialSend}
            title={
              sequentialSend
                ? 'Sequential send is ON - each message waits for its delay before the next is sent. Click to disable.'
                : 'Send messages in sequence with a per-message delay'
            }
          >
            <Clock size={14} />
            {sequentialSend ? 'Sequence: ON' : 'Sequence: OFF'}
          </button>
          <button type="button" className={styles.addMessageBtn} onClick={addMessage}>
            <Plus size={14} />
            Add Message
          </button>
        </div>
      </div>

      {sequentialSend && messages.length > 0 && (
        <div className={styles.sequenceHint}>
          The first message is sent instantly; each following message waits for the sum of the previous
          messages&apos; delays (e.g. 200ms then 200ms → sent at 0ms, 200ms, 400ms).
        </div>
      )}

      {messages.length === 0 ? (
        <div className={styles.emptyMessageList}>
          <div className={styles.emptyIcon}>📝</div>
          <div className={styles.emptyText}>No messages added yet</div>
          <div className={styles.emptySubtext}>Click &quot;Add Message&quot; to start building your shortcut</div>
        </div>
      ) : (
        <div className={`${styles.messagesList} ${messagesExpanded ? styles.messagesListExpanded : ''}`}>
          {messages.map((message, index) => (
            <div
              key={message.id}
              className={`${styles.messageItem} ${dragOverId === message.id ? styles.dragOver : ''}`}
              onDragOver={(e) => handleDragOver(e, message.id)}
              onDragLeave={(e) => handleDragLeave(e, message.id)}
              onDrop={(e) => handleDrop(e, message.id)}
            >
              <div className={styles.messageItemHeader}>
                <div className={styles.messageItemTitleRow}>
                  <div
                    className={styles.dragHandle}
                    draggable
                    onDragStart={(e) => handleDragStart(e, message.id)}
                    onDragEnd={handleDragEnd}
                    title="Drag to reorder"
                    aria-label="Drag to reorder"
                  >
                    <GripVertical size={14} />
                  </div>
                  <span className={styles.messageItemTitle}>
                    Message #{index + 1}
                    {message.messageKey && (
                      <span className={styles.messageKeyBadge}>{message.messageKey}</span>
                    )}
                  </span>
                </div>
                <div className={styles.messageHeaderButtons}>
                  {sequentialSend && (
                    <div
                      className={styles.delayInputWrap}
                      title="Delay (ms) that elapses after this message before the next one is sent"
                    >
                      <Clock size={11} />
                      <input
                        type="number"
                        min={0}
                        step={50}
                        className={styles.delayInput}
                        value={message.delayMs ?? DEFAULT_DELAY_MS}
                        onChange={(e) =>
                          updateMessageDelay(message.id, Math.max(0, parseInt(e.target.value, 10) || 0))
                        }
                      />
                      <span className={styles.delayUnit}>ms</span>
                    </div>
                  )}
                  <button
                    type="button"
                    className={styles.jsonViewerBtn}
                    onClick={() => handleOpenJSONViewer(message.id)}
                    disabled={!message.content || !isValidJSON(message.content)}
                    title="View JSON as Table"
                  >
                    <Eye size={12} />
                  </button>
                  <button
                    type="button"
                    className={styles.moveMessageBtn}
                    onClick={() => moveMessageUp(message.id)}
                    disabled={index === 0}
                    title="Move message up"
                  >
                    <ArrowUp size={12} />
                  </button>
                  <button
                    type="button"
                    className={styles.moveMessageBtn}
                    onClick={() => moveMessageDown(message.id)}
                    disabled={index === messages.length - 1}
                    title="Move message down"
                  >
                    <ArrowDown size={12} />
                  </button>
                  <button
                    type="button"
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
                    type="button"
                    className={styles.cardEditButtonSmall}
                    onClick={() => handleCardEdit(message.id)}
                    title="Edit card selection"
                  >
                    🃏 Edit Card
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  return (
    <div className={styles.modalOverlay}>
      <div className={styles.modalContent}>
        <div className={styles.modalHeader}>
          <h2 className={styles.modalTitle}>{editingShortcut ? '✏️ Edit Shortcut' : '➕ Create New Shortcut'}</h2>
          <div className={styles.modalHeaderActions}>
            {/* Expand icon on the right of Create/Edit Shortcut header */}
            {renderExpandToggle()}
            <button type="button" className={styles.modalClose} onClick={onClose}>
              ×
            </button>
          </div>
        </div>

        <div className={styles.modalBody}>
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

          {/* Inline messages list (hidden while portaled fullscreen) */}
          {!messagesExpanded && messagesSection}

          {/* Placeholder so layout stays stable while expanded */}
          {messagesExpanded && (
            <div className={styles.messageListPlaceholder}>
              Messages open in full screen — press Esc or the minimize icon to return
            </div>
          )}

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

        <div className={styles.modalActions}>
          <button type="button" className={styles.btnSecondary} onClick={handleReset}>
            🔄 Reset
          </button>
          <button type="button" className={styles.btnSecondary} onClick={onClose}>
            Cancel
          </button>
          <button
            type="button"
            className={styles.btnPrimary}
            onClick={handleSave}
            disabled={!canSave}
            title={!canSave ? 'Please complete all messages with valid JSON' : 'Save shortcut'}
          >
            {editingShortcut ? '💾 Update Shortcut' : '✨ Create Shortcut'}
          </button>
        </div>
      </div>

      {/* Portal outside modal so backdrop-filter cannot trap position:fixed */}
      {messagesExpanded && createPortal(messagesSection, document.body)}

      <JSONViewerModal
        isOpen={showJSONViewer}
        onClose={handleCloseJSONViewer}
        jsonContent={
          currentViewingMessageId
            ? messages.find((m) => m.id === currentViewingMessageId)?.content || ''
            : ''
        }
        onUpdate={handleJSONUpdate}
      />
    </div>
  );
};

export default ShortcutModal;
