import React, { useState } from 'react';
import { FilePlus, Info, RefreshCw, Table, Trash2 } from 'lucide-react';

import { ADD_NEW_MESSAGE_KEY } from '../../constants';
import { MessageControlProps } from '../../types';

import styles from './MessageControl.module.css';

const MessageControl: React.FC<MessageControlProps> = ({
  selectedKey,
  messageContent,
  responses,
  bridgeMode,
  onKeyChange,
  onContentChange,
  onSendMessage,
  onOpenCardPopup,
  onOpenJSONViewer,
  onAddMessage,
  onUpdateMessage,
  onDeleteMessage,
}) => {
  const [newMessageName, setNewMessageName] = useState<string>('');
  // Raw mode disables JSON validation so XML / plain text can be sent as-is.
  const [rawMode, setRawMode] = useState<boolean>(false);

  const isAddingNew = selectedKey === ADD_NEW_MESSAGE_KEY;
  const isExistingKey = !!selectedKey && !isAddingNew;

  const handleAddMessage = (): void => {
    const name = newMessageName.trim();
    if (!name) return;
    onAddMessage(name, messageContent);
    setNewMessageName('');
  };

  return (
    <div className={styles.messageControlSection}>
      {/* Message Key Selection */}
      <select
        className={styles.messageSelect}
        value={selectedKey}
        onChange={(e) => onKeyChange(e.target.value)}
        disabled={bridgeMode}
        style={{ opacity: bridgeMode ? 0.5 : 1 }}
      >
        <option value="">-- select message key --</option>
        {Object.keys(responses).map((key) => (
          <option key={key} value={key}>
            {key}
          </option>
        ))}
        <option value={ADD_NEW_MESSAGE_KEY}>➕ Add new message</option>
      </select>

      {/* New Message Name (Add mode) */}
      {isAddingNew && !bridgeMode && (
        <input
          className={styles.newNameInput}
          value={newMessageName}
          onChange={(e) => setNewMessageName(e.target.value)}
          placeholder="Message name (key to save in file)"
        />
      )}

      {/* Card Edit Button */}
      {selectedKey === 'card' && !bridgeMode && (
        <div className={styles.cardEditSection}>
          <button className={styles.cardEditButton} onClick={onOpenCardPopup}>
            🃏 Edit Card Selection
          </button>
        </div>
      )}

      {/* Raw mode toggle (disable JSON validation to send XML / plain text) */}
      {!bridgeMode && (
        <div className={styles.rawModeRow}>
          <button
            type="button"
            className={`${styles.rawToggleButton} ${rawMode ? styles.rawToggleActive : ''}`}
            onClick={() => setRawMode((prev) => !prev)}
            aria-pressed={rawMode}
            title={
              rawMode
                ? 'JSON validation is OFF - content is sent as raw text (XML/plain). Click to switch back to JSON mode.'
                : 'Disable JSON validation to send raw XML or plain text'
            }
          >
            <Info size={14} />
            {rawMode ? 'Raw mode: ON (no JSON check)' : 'Raw mode: OFF (JSON)'}
          </button>
        </div>
      )}

      {/* Message Content Textarea */}
      <textarea
        className={styles.messageTextarea}
        value={messageContent}
        onChange={(e) => onContentChange(e.target.value)}
        placeholder={
          bridgeMode
            ? 'Bridge Mode Active - Control panel disabled'
            : rawMode
              ? 'Raw mode - enter XML or plain text to send as-is (no JSON validation)'
              : isAddingNew
                ? 'Enter the JSON object to save under this message name'
                : 'Select a message key to view and edit its content'
        }
        disabled={bridgeMode}
        style={{ opacity: bridgeMode ? 0.5 : 1 }}
      />

      {/* Action Buttons */}
      <div className={styles.actionButtons}>
        {/* View as Table Button */}
        <button
          className={styles.viewTableButton}
          onClick={onOpenJSONViewer}
          disabled={!messageContent || bridgeMode || rawMode}
          title={rawMode ? 'Table view is unavailable in raw mode' : 'View JSON as Table'}
        >
          <Table size={16} />
          View as Table
        </button>

        {isAddingNew ? (
          /* Save New Message to File */
          <button
            className={styles.saveFileButton}
            onClick={handleAddMessage}
            disabled={bridgeMode || !newMessageName.trim() || !messageContent}
            title="Add this message to the active data file"
          >
            <FilePlus size={16} />
            Save New Message
          </button>
        ) : (
          /* Send Button */
          <button
            className={styles.sendButton}
            onClick={() => onSendMessage(rawMode)}
            disabled={bridgeMode || (!selectedKey && !rawMode) || !messageContent}
            style={{ opacity: bridgeMode ? 0.5 : 1 }}
          >
            {rawMode ? '🚀 Broadcast Raw to Dev Clients' : '🚀 Broadcast to Dev Clients'}
          </button>
        )}
      </div>

      {/* Update / delete existing message in file */}
      {isExistingKey && !bridgeMode && (
        <div className={styles.fileEditButtons}>
          <button
            className={styles.updateFileButton}
            onClick={() => onUpdateMessage(selectedKey, messageContent)}
            disabled={!messageContent}
            title="Save edits to this message in the active data file"
          >
            <RefreshCw size={16} />
            Update "{selectedKey}"
          </button>
          <button
            className={styles.deleteFileButton}
            onClick={() => onDeleteMessage(selectedKey)}
            title="Delete this message from the active data file"
          >
            <Trash2 size={16} />
            Delete
          </button>
        </div>
      )}
    </div>
  );
};

export default MessageControl;
