import { CircleDot, Pencil, Square } from 'lucide-react';
import React from 'react';

import { MessageColumnProps } from '../../types';

import styles from './MessageColumn.module.css';

const MessageColumn: React.FC<MessageColumnProps> = ({
  title,
  connectionStatus,
  messages,
  bridgeMode,
  onClear,
  onReconnect,
  onDisconnect,
  onEditUrl,
  isRecording,
  onToggleRecording,
  showControls = true,
  footer,
}) => {
  return (
    <div className={styles.messageColumn}>
      <div className={styles.columnHeader}>
        <span className={styles.columnTitle}>
          <div className={`${styles.connectionIndicator} ${styles[connectionStatus]}`} />
          {title} {bridgeMode && '🌉'}
          {onEditUrl && (
            <button
              className={styles.editUrlBtn}
              onClick={onEditUrl}
              title="Edit Env WebSocket URL"
              aria-label="Edit Env WebSocket URL"
            >
              <Pencil size={14} />
            </button>
          )}
        </span>
        {showControls && (
          <div className={styles.columnControls}>
            {onToggleRecording && (
              <button
                className={`${styles.controlBtn} ${isRecording ? styles.recordingBtn : styles.recordBtn}`}
                onClick={onToggleRecording}
                title={isRecording ? 'Stop recording' : 'Start recording'}
              >
                {isRecording ? <Square size={11} /> : <CircleDot size={11} />}
                {isRecording ? 'Stop' : 'Record'}
              </button>
            )}
            <button className={styles.controlBtn} onClick={onClear}>
              Clear
            </button>
            {onReconnect && (
              <button className={styles.controlBtn} onClick={onReconnect}>
                Reconnect
              </button>
            )}
            {onDisconnect && (
              <button className={`${styles.controlBtn} ${styles.disconnectBtn}`} onClick={onDisconnect}>
                Disconnect
              </button>
            )}
          </div>
        )}
      </div>

      <div className={styles.messageBox}>
        <pre className={styles.messagePre}>{messages}</pre>
      </div>

      <div className={`${styles.status} ${styles[connectionStatus]}`}>
        {connectionStatus === 'connected' ? '✅ Connected' : '❌ Disconnected'}
        {title.includes('Dev') && connectionStatus === 'connected' && (
          <div className={styles.additionalInfo}>- Auto-sends initial data to new clients</div>
        )}
        {bridgeMode && connectionStatus === 'connected' && (
          <div className={styles.bridgeInfo}>🌉 Bridge Mode: Direct message passthrough active</div>
        )}
      </div>

      {footer && <div className={styles.columnFooter}>{footer}</div>}
    </div>
  );
};

export default MessageColumn;
