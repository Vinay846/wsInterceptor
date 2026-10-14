import { Copy, Edit, GripVertical, Maximize2, Minimize2, Pin, PinOff, Plus, Send, Trash2 } from 'lucide-react';
import React, { useRef, useState } from 'react';

import { ShortcutSectionProps } from '../../types';
import MessageControl from '../MessageControl/MessageControl';

import styles from './ShortcutSection.module.css';

const ShortcutSection: React.FC<ShortcutSectionProps> = ({
  shortcuts,
  bridgeMode,
  devConnected,
  isExpanded = false,
  onToggleExpand,
  messageControlProps,
  onCreateShortcut,
  onEditShortcut,
  onSendShortcut,
  onDuplicateShortcut,
  onDeleteShortcut,
  onPinShortcut,
  onReorderShortcuts,
}) => {
  const [dragOverId, setDragOverId] = useState<string | null>(null);
  const dragIdRef = useRef<string | null>(null);

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
    const pinned = shortcuts.filter((s) => s.pinned).length;

    return { total, withMessages, recentlyUsed, pinned };
  };

  const stats = getShortcutStats();

  const handleDragStart = (e: React.DragEvent<HTMLDivElement>, id: string) => {
    dragIdRef.current = id;
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', id);
    e.currentTarget.classList.add(styles.dragging);
  };

  const handleDragEnd = (e: React.DragEvent<HTMLDivElement>) => {
    dragIdRef.current = null;
    setDragOverId(null);
    e.currentTarget.classList.remove(styles.dragging);
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
      onReorderShortcuts(fromId, toId);
    }
    dragIdRef.current = null;
  };

  return (
    <div className={`${styles.shortcutSection} ${isExpanded ? styles.shortcutSectionExpanded : ''}`}>
      <div className={styles.shortcutHeader}>
        <div>
          <h3 className={styles.shortcutTitle}>⚡ Message Shortcuts</h3>
          <div className={styles.shortcutFileHint}>Saved to shortcuts.json</div>
        </div>
        <div className={styles.headerActions}>
          <button
            className={styles.shortcutCreateBtn}
            onClick={onCreateShortcut}
            disabled={bridgeMode}
            style={{ opacity: bridgeMode ? 0.5 : 1 }}
          >
            <Plus size={14} />
            Create
          </button>
          {onToggleExpand && (
            <button
              type="button"
              className={styles.expandBtn}
              onClick={onToggleExpand}
              title={isExpanded ? 'Exit full screen' : 'Expand to full screen'}
              aria-label={isExpanded ? 'Exit full screen' : 'Expand to full screen'}
            >
              {isExpanded ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
            </button>
          )}
        </div>
      </div>

      <div className={`${styles.shortcutScrollable} ${isExpanded ? styles.shortcutScrollableExpanded : ''}`}>
        <div className={`${styles.shortcutGrid} ${isExpanded ? styles.shortcutGridExpanded : ''}`}>
          {/* MessageControl lives only here — inside shortcutScrollable grid */}
          <div className={`${styles.shortcutItemEnhanced} ${styles.messageControlItem}`} data-slot="message-control">
            <MessageControl {...messageControlProps} compact />
          </div>

          {shortcuts.length === 0 ? (
            <div
              className={
                isExpanded
                  ? `${styles.shortcutItemEnhanced} ${styles.shortcutEmptyCard}`
                  : styles.shortcutEmpty
              }
            >
              <div className={styles.emptyIcon}>⚡</div>
              <div className={styles.emptyTitle}>No shortcuts created yet</div>
              {!isExpanded && (
                <div className={styles.emptySubtitle}>
                  Create your first shortcut to quickly send multiple messages
                </div>
              )}
              <button className={styles.emptyCreateBtn} onClick={onCreateShortcut} disabled={bridgeMode}>
                <Plus size={16} />
                {isExpanded ? 'Create Shortcut' : 'Create First Shortcut'}
              </button>
            </div>
          ) : (
            shortcuts.map((shortcut) => (
              <div
                key={shortcut.id}
                className={`${styles.shortcutItemEnhanced} ${shortcut.pinned ? styles.shortcutPinned : ''} ${
                  dragOverId === shortcut.id ? styles.dragOver : ''
                }`}
                draggable={!bridgeMode}
                onDragStart={(e) => handleDragStart(e, shortcut.id)}
                onDragEnd={handleDragEnd}
                onDragOver={(e) => handleDragOver(e, shortcut.id)}
                onDragLeave={(e) => handleDragLeave(e, shortcut.id)}
                onDrop={(e) => handleDrop(e, shortcut.id)}
              >
                <div className={styles.shortcutItemHeader}>
                  <div className={styles.dragHandle} title="Drag to reorder" aria-hidden>
                    <GripVertical size={14} />
                  </div>
                  <div className={styles.shortcutNameContainer}>
                    <div className={styles.shortcutName}>
                      {shortcut.pinned && <Pin size={12} className={styles.pinIndicator} />}
                      {shortcut.name}
                    </div>
                    <div className={styles.shortcutBadges}>
                      <span className={styles.shortcutMessageCount}>{shortcut.messages.length} messages</span>
                      {shortcut.lastUsed && (
                        <span className={styles.lastUsedBadge}>{formatLastUsed(shortcut.lastUsed)}</span>
                      )}
                    </div>
                  </div>
                  <button
                    type="button"
                    className={`${styles.pinBtn} ${shortcut.pinned ? styles.pinBtnActive : ''}`}
                    onClick={() => onPinShortcut(shortcut.id)}
                    disabled={bridgeMode}
                    style={{ opacity: bridgeMode ? 0.5 : 1 }}
                    title={shortcut.pinned ? 'Unpin shortcut' : 'Pin shortcut'}
                  >
                    {shortcut.pinned ? <PinOff size={14} /> : <Pin size={14} />}
                  </button>
                </div>

                <div className={styles.shortcutMeta}>
                  <div className={styles.messageKeys}>
                    <strong>Messages:</strong> {shortcut.messages.map((m) => m.messageKey).join(', ') || 'No messages'}
                  </div>
                  <div className={styles.shortcutCreated}>
                    Created: {new Date(shortcut.createdAt).toLocaleDateString()}
                  </div>
                </div>

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
              </div>
            ))
          )}
        </div>
      </div>

      {shortcuts.length > 0 && (
        <div className={styles.shortcutFooter}>
          <div className={styles.footerStats}>
            Total: <strong>{stats.total}</strong> | Pinned: <strong>{stats.pinned}</strong> | With messages:{' '}
            <strong>{stats.withMessages}</strong> | Used today: <strong>{stats.recentlyUsed}</strong>
          </div>
        </div>
      )}
    </div>
  );
};

export default ShortcutSection;
