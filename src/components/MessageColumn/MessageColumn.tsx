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
  showControls = true,
}) => {
  return (
    <div className={styles.messageColumn}>
      <div className={styles.columnHeader}>
        <span className={styles.columnTitle}>
          <div className={`${styles.connectionIndicator} ${styles[connectionStatus]}`} />
          {title} {bridgeMode && '🌉'}
        </span>
        {showControls && (
          <div className={styles.columnControls}>
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
    </div>
  );
};

export default MessageColumn;
