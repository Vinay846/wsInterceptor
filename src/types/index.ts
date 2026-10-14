import type { ReactNode } from 'react';

export interface MessageData {
  [key: string]: any;
}

export interface ConnectionStatus {
  external: 'connected' | 'disconnected' | 'connecting';
  dev: 'connected' | 'disconnected' | 'connecting';
}

export interface ErrorItem {
  type: string;
  message: string;
  timestamp: string;
  details?: string; // Additional error details like event data, reasons, etc.
}

export interface RoundStatus {
  status: 'waiting' | 'active' | 'complete';
  message: string;
}

export interface MessageType {
  key: string;
  label: string;
  level: number;
  title: string;
  special?: boolean;
}

export interface ResponsesData {
  [key: string]: MessageData;
}

export interface MessageShortcut {
  id: string;
  name: string;
  messages: ShortcutMessage[];
  createdAt: string;
  lastUsed?: string;
  /** When true, messages are sent one-by-one using each message's `delayMs`. */
  sequentialSend?: boolean;
  /** When true, shortcut stays at the top of the list. */
  pinned?: boolean;
}

export interface ShortcutMessage {
  id: string;
  messageKey: string;
  content: string;
  /** Gap (in ms) that elapses after this message before the next one is sent. */
  delayMs?: number;
}

export interface CardSuit {
  name: string;
  symbol: string;
  initial: string;
  color: string;
}

export interface CardRank {
  name: string;
  symbol: string;
  value: number;
  cardValue: number;
}

export interface CardInfo {
  sc: string;
  place: string;
  cardCount: string;
}

export interface ToastMessage {
  title: string;
  message: string;
}

// Component Props Types
export interface CardSelectionPopupProps {
  isOpen: boolean;
  onClose: () => void;
  onCardSelect: (cardInfo: CardInfo) => void;
  currentCardData: any;
}

export interface ShortcutModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (shortcut: Omit<MessageShortcut, 'id' | 'createdAt'>) => void;
  editingShortcut?: MessageShortcut | null;
  availableKeys: string[];
  responses: ResponsesData;
  onCardEdit: (messageId: string, cardData: any) => void;
  onUpdateShortcutMessage: (messageId: string, content: string) => void;
  onSetCardUpdateCallback: (callback: ((messageId: string, cardData: any) => void) | null) => void;
  cardUpdateTrigger?: {messageId: string, cardData: any} | null;
  onCardUpdateComplete?: () => void;
}

export interface ErrorModalProps {
  isOpen: boolean;
  onClose: () => void;
  errors: ErrorItem[];
  onClearErrors: () => void;
}

export interface ToastProps {
  message: ToastMessage | null;
  onDismiss?: () => void;
}

export interface DataManagementProps {
  collectedRoundData: ResponsesData;
  previousRoundData: ResponsesData;
  currentGameId: string;
  isDataLoading: boolean;
  canSaveData: boolean;
  hasCompletedRound: boolean;
  roundStatus: RoundStatus;
  onRefreshData: () => void;
  onSaveData: () => void;
}

export interface BridgeModeControlProps {
  bridgeMode: boolean;
  onToggleBridgeMode: () => void;
}

export interface MessageControlProps {
  selectedKey: string;
  messageContent: string;
  responses: ResponsesData;
  bridgeMode: boolean;
  /** Match shortcut card dimensions (used in expanded grid). */
  compact?: boolean;
  rawMode: boolean;
  newMessageName: string;
  onRawModeChange: (raw: boolean) => void;
  onNewMessageNameChange: (name: string) => void;
  onKeyChange: (key: string) => void;
  onContentChange: (content: string) => void;
  onSendMessage: (raw?: boolean) => void;
  onOpenCardPopup: () => void;
  onOpenJSONViewer: () => void;
  onAddMessage: (name: string, content: string) => void;
  onUpdateMessage: (key: string, content: string) => void;
  onDeleteMessage: (key: string) => void;
}

export interface ShortcutSectionProps {
  shortcuts: MessageShortcut[];
  bridgeMode: boolean;
  devConnected: boolean;
  isExpanded?: boolean;
  onToggleExpand?: () => void;
  /** Props for MessageControl, which is rendered inside shortcutScrollable. */
  messageControlProps: Omit<MessageControlProps, 'compact'>;
  onCreateShortcut: () => void;
  onEditShortcut: (shortcut: MessageShortcut) => void;
  onSendShortcut: (shortcut: MessageShortcut) => void;
  onDuplicateShortcut: (shortcut: MessageShortcut) => void;
  onDeleteShortcut: (shortcutId: string) => void;
  onPinShortcut: (shortcutId: string) => void;
  onReorderShortcuts: (fromId: string, toId: string) => void;
}

export interface MessageColumnProps {
  title: string;
  connectionStatus: 'connected' | 'disconnected' | 'connecting';
  messages: string;
  bridgeMode: boolean;
  onClear: () => void;
  onReconnect?: () => void;
  onDisconnect?: () => void;
  onEditUrl?: () => void;
  isRecording?: boolean;
  onToggleRecording?: () => void;
  showControls?: boolean;
  footer?: ReactNode;
}

export interface EnvConfigPanelProps {
  // Feature 1: Env URL editing
  showUrlEditor: boolean;
  envUrl: string;
  isConnecting: boolean;
  onEnvUrlChange: (url: string) => void;
  onSaveAndConnect: () => void;

  // Feature 2: Initial messages sent to clients on connect
  availableKeys: string[];
  initialKeys: string[];
  onSaveInitialKeys: (keys: string[]) => void;

  // Feature 3: Data file management
  files: string[];
  activeFile: string;
  onSelectFile: (fileName: string) => void;
  onCreateFile: (fileName: string) => void;
  onDeleteFile: (fileName: string) => void;

  // Recording triggers (start/stop message keys)
  recordStartKey: string;
  recordStopKey: string;
  onSaveRecordingConfig: (startKey: string, stopKey: string) => void;
}