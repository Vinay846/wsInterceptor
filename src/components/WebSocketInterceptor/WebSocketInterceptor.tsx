import { Hash, Lock, Unlock } from 'lucide-react';
import React from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';

// Redux
import { ROUTES } from '../../routes';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import {
  selectConnectionStatus,
  selectResponses,
  selectCurrentMessage,
  selectExternalMessages,
  selectDevMessages,
  selectRoundData,
  selectShortcutsList,
  selectEditingShortcut,
  selectCardEditingState,
  selectBridgeMode,
  selectErrors,
  selectModals,
  selectToastMessage,
  selectLoadingStates,
  selectRoundStatus,
  selectPersistRoundId,
  selectEnvUrl,
  selectFileConfig,
  selectRecordingConfig,
} from '../../store/selectors';
import { clearErrors } from '../../store/slices/connectionSlice';
import { clearExternalMessages, clearDevMessages, setMessageContent } from '../../store/slices/messageSlice';
import {
  setEditingShortcut,
  setEditingCardMessageId,
  setCurrentEditingCardData,
  setCardUpdateTrigger,
} from '../../store/slices/shortcutSlice';
import {
  setShowCardPopup,
  setShowShortcutModal,
  setShowErrorModal,
  hideToast,
  togglePersistRoundId,
} from '../../store/slices/uiSlice';

// Components
import BridgeModeControl from '../BridgeModeControl/BridgeModeControl';
import CardSelectionPopup from '../CardSelectionPopup/CardSelectionPopup';
import DataManagement from '../DataManagement/DataManagement';
import EnvConfigPanel from '../EnvConfigPanel/EnvConfigPanel';
import ErrorModal from '../ErrorModal/ErrorModal';
import JSONViewerModal from '../JSONViewerModal/JSONViewerModal';
import MessageColumn from '../MessageColumn/MessageColumn';
import ShortcutModal from '../ShortcutModal/ShortcutModal';
import ShortcutSection from '../ShortcutSection/ShortcutSection';
import Toast from '../Toast/Toast';

// Feature hooks (all business logic lives here)
import {
  useDataFiles,
  useInitialization,
  useInterceptorRefs,
  useMessageComposer,
  useNotifications,
  useRoundRecording,
  useServerData,
  useShortcutHandlers,
  useWebSocketConnections,
} from './hooks';

// Styles
import styles from './WebSocketInterceptor.module.css';

/**
 * Top-level interceptor screen. This component only wires together the feature
 * hooks (which hold the logic) and renders the layout. All behaviour lives in
 * the hooks under `./hooks`.
 */
const WebSocketInterceptor: React.FC = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const { shortcutId } = useParams<{ shortcutId?: string }>();

  // ---- Redux state -------------------------------------------------------
  const connections = useAppSelector(selectConnectionStatus);
  const responses = useAppSelector(selectResponses);
  const { selectedKey, content: messageContent } = useAppSelector(selectCurrentMessage);
  const externalMessages = useAppSelector(selectExternalMessages);
  const devMessages = useAppSelector(selectDevMessages);
  const {
    collected: collectedRoundData,
    previous: previousRoundData,
    currentGameId,
    isLoading: isDataLoading,
  } = useAppSelector(selectRoundData);
  const shortcuts = useAppSelector(selectShortcutsList);
  const editingShortcut = useAppSelector(selectEditingShortcut);
  const { editingCardMessageId, currentEditingCardData, cardUpdateTrigger } = useAppSelector(selectCardEditingState);
  const bridgeMode = useAppSelector(selectBridgeMode);
  const errors = useAppSelector(selectErrors);
  const { showCardPopup, showShortcutModal, showErrorModal } = useAppSelector(selectModals);
  const toastMessage = useAppSelector(selectToastMessage);
  const { isUpdatingGameId } = useAppSelector(selectLoadingStates);
  const roundStatus = useAppSelector(selectRoundStatus);
  const persistRoundId = useAppSelector(selectPersistRoundId);
  const envUrl = useAppSelector(selectEnvUrl);
  const { files: dataFiles, activeFile, initialKeys } = useAppSelector(selectFileConfig);
  const { recordStartKey, recordStopKey } = useAppSelector(selectRecordingConfig);

  // ---- View-only local state --------------------------------------------
  const [showJSONViewer, setShowJSONViewer] = React.useState<boolean>(false);
  const [showEnvUrlEditor, setShowEnvUrlEditor] = React.useState<boolean>(false);
  const [shortcutsExpanded, setShortcutsExpanded] = React.useState<boolean>(false);
  const [messageRawMode, setMessageRawMode] = React.useState<boolean>(false);
  const [newMessageName, setNewMessageName] = React.useState<string>('');

  // URL → UI: /shortcuts expands panel; /shortcuts/new|edit opens the modal
  React.useEffect(() => {
    const path = location.pathname;

    if (path === ROUTES.HOME) {
      setShortcutsExpanded(false);
      dispatch(setShowShortcutModal(false));
      dispatch(setEditingShortcut(null));
      return;
    }

    if (!path.startsWith('/shortcuts')) return;

    setShortcutsExpanded(true);

    if (path === ROUTES.SHORTCUT_NEW) {
      dispatch(setEditingShortcut(null));
      dispatch(setShowShortcutModal(true));
      return;
    }

    if (shortcutId) {
      const match = shortcuts.find((s) => s.id === shortcutId);
      if (match) {
        dispatch(setEditingShortcut(match));
        dispatch(setShowShortcutModal(true));
      } else {
        navigate(ROUTES.SHORTCUTS, { replace: true });
      }
      return;
    }

    // /shortcuts — fullscreen list only
    dispatch(setShowShortcutModal(false));
    dispatch(setEditingShortcut(null));
  }, [location.pathname, shortcutId, shortcuts, dispatch, navigate]);

  React.useEffect(() => {
    if (!shortcutsExpanded) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const onKeyDown = (e: KeyboardEvent) => {
      // Modal has its own UI; Esc here only exits the shortcuts fullscreen route
      if (e.key === 'Escape' && !showShortcutModal) {
        navigate(ROUTES.HOME);
      }
    };
    window.addEventListener('keydown', onKeyDown);

    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [shortcutsExpanded, showShortcutModal, navigate]);

  // ---- Feature hooks -----------------------------------------------------
  const refs = useInterceptorRefs();
  const notifications = useNotifications();

  const recording = useRoundRecording({
    refs,
    notifications,
    recordStartKey,
    recordStopKey,
    collectedRoundData,
    previousRoundData,
  });

  const serverData = useServerData({
    notifications,
    collectedRoundData,
    shortcuts,
  });

  const connectionsApi = useWebSocketConnections({
    refs,
    notifications,
    collectRoundData: recording.collectRoundData,
    responses,
    collectedRoundData,
    envUrl,
    bridgeMode,
  });

  const dataFilesApi = useDataFiles({
    notifications,
    activeFile,
    refreshDataFromServer: serverData.refreshDataFromServer,
  });

  const composer = useMessageComposer({
    refs,
    notifications,
    responses,
    selectedKey,
    messageContent,
    editingShortcut,
    editingCardMessageId,
    currentEditingCardData,
  });

  const shortcutHandlers = useShortcutHandlers({
    refs,
    notifications,
    shortcuts,
    editingShortcut,
    devConnectionStatus: connections.dev,
    updateGameIdsWithRefresh: serverData.updateGameIdsWithRefresh,
  });

  useInitialization({
    refs,
    recordStartKeyRef: recording.recordStartKeyRef,
    connectExternal: connectionsApi.connectExternal,
    connectDev: connectionsApi.connectDev,
    updateRoundStatus: recording.updateRoundStatus,
    refreshDataFromServer: serverData.refreshDataFromServer,
    loadFileConfig: dataFilesApi.loadFileConfig,
  });

  return (
    <div className={styles.websocketInterceptor}>
      {/* Toast Message */}
      <Toast message={toastMessage} onDismiss={() => dispatch(hideToast())} />

      {/* Error Badge */}
      {errors.length > 0 && (
        <div className={styles.errorBadge} onClick={() => dispatch(setShowErrorModal(true))}>
          {errors.length} Errors
        </div>
      )}

      {/* Error Modal */}
      <ErrorModal
        isOpen={showErrorModal}
        onClose={() => dispatch(setShowErrorModal(false))}
        errors={errors}
        onClearErrors={() => dispatch(clearErrors())}
      />

      {/* Shortcut Modal */}
      <ShortcutModal
        isOpen={showShortcutModal}
        onClose={() => navigate(ROUTES.SHORTCUTS)}
        onSave={shortcutHandlers.handleSaveShortcut}
        editingShortcut={editingShortcut}
        availableKeys={Object.keys(responses)}
        responses={responses}
        onCardEdit={composer.handleCardEdit}
        onUpdateShortcutMessage={composer.handleUpdateShortcutMessage}
        onSetCardUpdateCallback={() => {}}
        cardUpdateTrigger={cardUpdateTrigger}
        onCardUpdateComplete={() => dispatch(setCardUpdateTrigger(null))}
      />

      {/* Card Selection Popup */}
      <CardSelectionPopup
        isOpen={showCardPopup}
        onClose={() => {
          dispatch(setShowCardPopup(false));
          dispatch(setEditingCardMessageId(null));
          dispatch(setCurrentEditingCardData(null));
        }}
        onCardSelect={composer.handleCardSelect}
        currentCardData={composer.getCurrentCardData()}
      />

      {/* JSON Viewer Modal */}
      <JSONViewerModal
        isOpen={showJSONViewer}
        onClose={() => setShowJSONViewer(false)}
        jsonContent={messageContent}
        onUpdate={(updatedJSON) => {
          dispatch(setMessageContent(updatedJSON));
        }}
      />

      {/* Main Content */}
      <div className={styles.mainContent}>
        {/* External Messages Column */}
        <MessageColumn
          title="Env Messages"
          connectionStatus={connections.external}
          messages={externalMessages}
          bridgeMode={bridgeMode}
          onClear={() => {
            dispatch(clearExternalMessages());
          }}
          onReconnect={() => void connectionsApi.connectExternal()}
          onDisconnect={() => void connectionsApi.disconnectExternal()}
          onEditUrl={() => setShowEnvUrlEditor((s) => !s)}
          isRecording={recording.isRecording}
          onToggleRecording={recording.handleToggleRecording}
          footer={
            <EnvConfigPanel
              showUrlEditor={showEnvUrlEditor}
              envUrl={envUrl}
              isConnecting={connections.external === 'connecting'}
              onEnvUrlChange={dataFilesApi.handleEnvUrlChange}
              onSaveAndConnect={connectionsApi.handleSaveAndConnect}
              availableKeys={Object.keys(responses)}
              initialKeys={initialKeys}
              onSaveInitialKeys={dataFilesApi.handleSaveInitialKeys}
              files={dataFiles}
              activeFile={activeFile}
              onSelectFile={(f) => void dataFilesApi.handleSelectFile(f)}
              onCreateFile={(f) => void dataFilesApi.handleCreateFile(f)}
              onDeleteFile={(f) => void dataFilesApi.handleDeleteFile(f)}
              recordStartKey={recordStartKey}
              recordStopKey={recordStopKey}
              onSaveRecordingConfig={recording.handleSaveRecordingConfig}
            />
          }
        />

        {/* Control Panel Column */}
        <div className={styles.controlPanelColumn}>
          <h3 className={styles.controlPanelHeader}>🎛️ Interceptor Control Panel</h3>

          {/* Data Management Section */}
          <DataManagement
            collectedRoundData={collectedRoundData}
            previousRoundData={previousRoundData}
            currentGameId={currentGameId}
            isDataLoading={isDataLoading}
            canSaveData={recording.canSaveData}
            hasCompletedRound={recording.hasCompletedRound}
            roundStatus={roundStatus}
            onRefreshData={() => void serverData.refreshDataFromServer()}
            onSaveData={() => void recording.saveCollectedData()}
          />

          {/* Bridge Mode Control */}
          <BridgeModeControl bridgeMode={bridgeMode} onToggleBridgeMode={connectionsApi.toggleBridgeMode} />

          {/* New Round + Keep Round ID */}
          <div className={styles.buttonGroup}>
            <button
              className={styles.newRoundBtn}
              onClick={() => void serverData.updateGameIdsWithRefresh({ force: true })}
              disabled={isUpdatingGameId || bridgeMode}
              style={{ opacity: bridgeMode ? 0.5 : 1 }}
              title="Force generate a new round / game ID"
            >
              <Hash size={16} />
              {isUpdatingGameId ? 'Starting New Round...' : 'New Round'}
            </button>
            <button
              type="button"
              className={`${styles.persistRoundBtn} ${
                persistRoundId ? styles.persistRoundBtnActive : styles.persistRoundBtnInactive
              }`}
              onClick={() => dispatch(togglePersistRoundId())}
              disabled={bridgeMode}
              style={{ opacity: bridgeMode ? 0.5 : 1 }}
              title={
                persistRoundId
                  ? 'ON: sending shortcuts keeps the current round ID'
                  : 'OFF: sending shortcuts auto-starts a new round ID'
              }
            >
              {persistRoundId ? <Lock size={16} /> : <Unlock size={16} />}
              {persistRoundId ? 'Keep Round ID ON' : 'Keep Round ID OFF'}
            </button>
          </div>

          {/* Message Control + Shortcuts (expandable to fullscreen together) */}
          <div
            className={`${styles.messageShortcutPanel} ${
              shortcutsExpanded ? styles.messageShortcutPanelExpanded : ''
            }`}
          >
            <ShortcutSection
              shortcuts={shortcuts}
              bridgeMode={bridgeMode}
              devConnected={connections.dev === 'connected'}
              isExpanded={shortcutsExpanded}
              onToggleExpand={() => navigate(shortcutsExpanded ? ROUTES.HOME : ROUTES.SHORTCUTS)}
              messageControlProps={{
                selectedKey,
                messageContent,
                responses,
                bridgeMode,
                rawMode: messageRawMode,
                newMessageName,
                onRawModeChange: setMessageRawMode,
                onNewMessageNameChange: setNewMessageName,
                onKeyChange: composer.handleKeyChange,
                onContentChange: composer.handleContentChange,
                onSendMessage: composer.handleSendMessage,
                onOpenCardPopup: composer.handleOpenCardPopup,
                onOpenJSONViewer: () => setShowJSONViewer(true),
                onAddMessage: dataFilesApi.handleAddMessage,
                onUpdateMessage: dataFilesApi.handleUpdateMessage,
                onDeleteMessage: (key) => void dataFilesApi.handleDeleteMessage(key),
              }}
              onCreateShortcut={shortcutHandlers.handleCreateShortcut}
              onEditShortcut={shortcutHandlers.handleEditShortcut}
              onSendShortcut={shortcutHandlers.handleSendShortcut}
              onDuplicateShortcut={shortcutHandlers.handleDuplicateShortcut}
              onDeleteShortcut={shortcutHandlers.handleDeleteShortcut}
              onPinShortcut={shortcutHandlers.handlePinShortcut}
              onReorderShortcuts={shortcutHandlers.handleReorderShortcuts}
            />
          </div>
        </div>

        {/* Dev Messages Column */}
        <MessageColumn
          title="Dev WebSocket Messages (8084)"
          connectionStatus={connections.dev}
          messages={devMessages}
          bridgeMode={bridgeMode}
          onClear={() => dispatch(clearDevMessages())}
        />
      </div>
    </div>
  );
};

export default WebSocketInterceptor;
