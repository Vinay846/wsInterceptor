import React from 'react';
import { Table } from 'lucide-react';

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
}) => {
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
      </select>

      {/* Card Edit Button */}
      {selectedKey === 'card' && !bridgeMode && (
        <div className={styles.cardEditSection}>
          <button className={styles.cardEditButton} onClick={onOpenCardPopup}>
            🃏 Edit Card Selection
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
          disabled={!messageContent || bridgeMode}
          title="View JSON as Table"
        >
          <Table size={16} />
          View as Table
        </button>

        {/* Send Button */}
        <button
          className={styles.sendButton}
          onClick={onSendMessage}
          disabled={bridgeMode || !selectedKey}
          style={{ opacity: bridgeMode ? 0.5 : 1 }}
        >
          🚀 Broadcast to Dev Clients
        </button>
      </div>
    </div>
  );
};

export default MessageControl;
