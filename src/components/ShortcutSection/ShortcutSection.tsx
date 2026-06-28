import { Plus, Send, Edit, Copy, Trash2 } from 'lucide-react';
import React from 'react';

import { ShortcutSectionProps } from '../../types';

import styles from './ShortcutSection.module.css';

const ShortcutSection: React.FC<ShortcutSectionProps> = ({
  shortcuts,
  bridgeMode,
  devConnected,
  onCreateShortcut,
  onEditShortcut,
  onSendShortcut,
  onDuplicateShortcut,
  onDeleteShortcut,
}) => {
  const formatLastUsed = (timestamp: string): string => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  const getShortcutStats = () => {
    const total = shortcuts.length;
    const withMessages = shortcuts.filter((s) => s.messages.length > 0).length;
    const recentlyUsed = shortcuts.filter(
      (s) => s.lastUsed && new Date().getTime() - new Date(s.lastUsed).getTime() < 24 * 60 * 60 * 1000
    ).length;

    return { total, withMessages, recentlyUsed };
  };

  const stats = getShortcutStats();

  return (
    <div className={styles.shortcutSection}>
      <div className={styles.shortcutHeader}>
        <h3 className={styles.shortcutTitle}>⚡ Message Shortcuts</h3>
        <button
          className={styles.shortcutCreateBtn}
          onClick={onCreateShortcut}
          disabled={bridgeMode}
          style={{ opacity: bridgeMode ? 0.5 : 1 }}
        >
          <Plus size={14} />
          Create
        </button>
      </div>

      {/* Shortcuts List */}
      <div className={styles.shortcutScrollable}>
        {shortcuts.length === 0 ? (
          <div className={styles.shortcutEmpty}>
            <div className={styles.emptyIcon}>⚡</div>
            <div className={styles.emptyTitle}>No shortcuts created yet</div>
            <div className={styles.emptySubtitle}>Create your first shortcut to quickly send multiple messages</div>
            <button className={styles.emptyCreateBtn} onClick={onCreateShortcut} disabled={bridgeMode}>
              <Plus size={16} />
              Create First Shortcut
            </button>
          </div>
        ) : (
          shortcuts.map((shortcut) => (
            <div key={shortcut.id} className={styles.shortcutItemEnhanced}>
              {/* Shortcut Header */}
              <div className={styles.shortcutItemHeader}>
                <div className={styles.shortcutNameContainer}>
                  <div className={styles.shortcutName}>{shortcut.name}</div>
                  <div className={styles.shortcutBadges}>
                    <span className={styles.shortcutMessageCount}>{shortcut.messages.length} messages</span>
                    {shortcut.lastUsed && (
                      <span className={styles.lastUsedBadge}>{formatLastUsed(shortcut.lastUsed)}</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Shortcut Meta Info */}
              <div className={styles.shortcutMeta}>
                <div className={styles.messageKeys}>
                  <strong>Messages:</strong> {shortcut.messages.map((m) => m.messageKey).join(', ') || 'No messages'}
                </div>
                <div className={styles.shortcutCreated}>
                  Created: {new Date(shortcut.createdAt).toLocaleDateString()}
                </div>
              </div>

              {/* Shortcut Actions */}
              <div className={styles.shortcutActions}>
                <button
                  className={`${styles.shortcutBtn} ${styles.shortcutBtnSend}`}
                  onClick={() => onSendShortcut(shortcut)}
                  disabled={!devConnected || bridgeMode || shortcut.messages.length === 0}
                  style={{ opacity: bridgeMode || !devConnected ? 0.5 : 1 }}
                  title={
                    !devConnected
                      ? 'Dev WebSocket not connected'
                      : bridgeMode
                        ? 'Disabled in Bridge Mode'
                        : shortcut.messages.length === 0
                          ? 'No messages to send'
                          : `Send all ${shortcut.messages.length} messages`
                  }
                >
                  <Send size={12} />
                  Send All ({shortcut.messages.length})
                </button>

                <button
                  className={`${styles.shortcutBtn} ${styles.shortcutBtnEdit}`}
                  onClick={() => onEditShortcut(shortcut)}
                  disabled={bridgeMode}
                  style={{ opacity: bridgeMode ? 0.5 : 1 }}
                  title={bridgeMode ? 'Disabled in Bridge Mode' : 'Edit shortcut'}
                >
                  <Edit size={12} />
                  Edit
                </button>

                <button
                  className={`${styles.shortcutBtn} ${styles.shortcutBtnCopy}`}
                  onClick={() => onDuplicateShortcut(shortcut)}
                  disabled={bridgeMode}
                  style={{ opacity: bridgeMode ? 0.5 : 1 }}
                  title={bridgeMode ? 'Disabled in Bridge Mode' : 'Duplicate shortcut'}
                >
                  <Copy size={12} />
                  Copy
                </button>

                <button
                  className={`${styles.shortcutBtn} ${styles.shortcutBtnDelete}`}
                  onClick={() => onDeleteShortcut(shortcut.id)}
                  disabled={bridgeMode}
                  style={{ opacity: bridgeMode ? 0.5 : 1 }}
                  title={bridgeMode ? 'Disabled in Bridge Mode' : 'Delete shortcut'}
                >
                  <Trash2 size={12} />
                  Delete
                </button>
              </div>

              {/* Quick Preview */}
              {/* {shortcut.messages.length > 0 && (
                <div className={styles.quickPreview}>
                  <div className={styles.previewLabel}>Quick Preview:</div>
                  <div className={styles.previewList}>
                    {shortcut.messages.slice(0, 3).map((msg, idx) => (
                      <span key={idx} className={styles.previewItem}>
                        {msg.messageKey}
                      </span>
                    ))}
                    {shortcut.messages.length > 3 && (
                      <span className={styles.previewMore}>+{shortcut.messages.length - 3} more</span>
                    )}
                  </div>
                </div>
              )} */}
            </div>
          ))
        )}
      </div>

      {/* Footer Stats */}
      {shortcuts.length > 0 && (
        <div className={styles.shortcutFooter}>
          <div className={styles.footerStats}>
            Total shortcuts: <strong>{stats.total}</strong> | With messages: <strong>{stats.withMessages}</strong> |
            Used today: <strong>{stats.recentlyUsed}</strong>
          </div>
        </div>
      )}
    </div>
  );
};

export default ShortcutSection;
