import { ChevronDown, ChevronRight, FilePlus, Plug, Save, Trash2 } from 'lucide-react';
import React, { useEffect, useState } from 'react';

import { EnvConfigPanelProps } from '../../types';

import styles from './EnvConfigPanel.module.css';

const EnvConfigPanel: React.FC<EnvConfigPanelProps> = ({
  showUrlEditor,
  envUrl,
  isConnecting,
  onEnvUrlChange,
  onSaveAndConnect,
  availableKeys,
  initialKeys,
  onSaveInitialKeys,
  files,
  activeFile,
  onSelectFile,
  onCreateFile,
  onDeleteFile,
  recordStartKey,
  recordStopKey,
  onSaveRecordingConfig,
}) => {
  const [showInitialKeys, setShowInitialKeys] = useState<boolean>(false);
  const [showRecording, setShowRecording] = useState<boolean>(false);
  const [showFiles, setShowFiles] = useState<boolean>(false);
  const [selectedKeys, setSelectedKeys] = useState<string[]>(initialKeys);
  const [newFileName, setNewFileName] = useState<string>('');
  const [startKey, setStartKey] = useState<string>(recordStartKey);
  const [stopKey, setStopKey] = useState<string>(recordStopKey);

  // Keep local checkbox selection in sync when server config loads/changes
  useEffect(() => {
    setSelectedKeys(initialKeys);
  }, [initialKeys]);

  // Keep recording trigger inputs in sync when config loads/changes
  useEffect(() => {
    setStartKey(recordStartKey);
    setStopKey(recordStopKey);
  }, [recordStartKey, recordStopKey]);

  const toggleKey = (key: string): void => {
    setSelectedKeys((prev) => (prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]));
  };

  const handleCreateFile = (): void => {
    const name = newFileName.trim();
    if (!name) return;
    onCreateFile(name);
    setNewFileName('');
  };

  // Preserve ordering for keys not present in availableKeys (e.g. server-side keys)
  const extraKeys = initialKeys.filter((k) => !availableKeys.includes(k));
  const allKeys = [...availableKeys, ...extraKeys];

  return (
    <div className={styles.panel}>
      {/* Feature 1: Env URL editor */}
      {showUrlEditor && (
        <div className={styles.section}>
          <div className={styles.sectionTitle}>Env WebSocket URL</div>
          <textarea
            className={styles.urlInput}
            value={envUrl}
            onChange={(e) => onEnvUrlChange(e.target.value)}
            placeholder="ws://host/path  OR  https://...?JSESSIONID=xxx&tableId=yyy  (leave empty to use page URL)"
            rows={3}
          />
          <button className={styles.primaryBtn} onClick={onSaveAndConnect} disabled={isConnecting}>
            <Plug size={14} />
            {isConnecting ? 'Connecting...' : 'Save & Connect'}
          </button>
        </div>
      )}

      {/* Feature 2: Initial messages on connect */}
      <div className={styles.section}>
        <button className={styles.sectionHeader} onClick={() => setShowInitialKeys((s) => !s)}>
          {showInitialKeys ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          <span>Initial Messages on Connect ({initialKeys.length})</span>
        </button>
        {showInitialKeys && (
          <div className={styles.sectionBody}>
            <div className={styles.hint}>Select which messages are auto-sent to each client on connect.</div>
            <div className={styles.keyList}>
              {allKeys.length === 0 && <div className={styles.empty}>No keys available. Refresh data first.</div>}
              {allKeys.map((key) => (
                <label key={key} className={styles.keyItem}>
                  <input
                    type="checkbox"
                    checked={selectedKeys.includes(key)}
                    onChange={() => toggleKey(key)}
                  />
                  <span>{key}</span>
                </label>
              ))}
            </div>
            <button className={styles.primaryBtn} onClick={() => onSaveInitialKeys(selectedKeys)}>
              <Save size={14} />
              Save Initial Messages
            </button>
          </div>
        )}
      </div>

      {/* Recording triggers (start/stop message keys) */}
      <div className={styles.section}>
        <button className={styles.sectionHeader} onClick={() => setShowRecording((s) => !s)}>
          {showRecording ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          <span>Recording Triggers (start: {recordStartKey || 'manual'}, stop: {recordStopKey || 'manual'})</span>
        </button>
        {showRecording && (
          <div className={styles.sectionBody}>
            <div className={styles.hint}>
              Choose which message starts and stops a round capture. Pick a saved key or type your own. Leave empty to
              rely on the manual Record/Stop button.
            </div>
            <datalist id="recordKeyOptions">
              {availableKeys.map((key) => (
                <option key={key} value={key} />
              ))}
            </datalist>
            <label className={styles.triggerLabel}>
              <span>Start on</span>
              <input
                className={styles.triggerInput}
                list="recordKeyOptions"
                value={startKey}
                onChange={(e) => setStartKey(e.target.value)}
                placeholder="e.g. game (empty = manual only)"
              />
            </label>
            <label className={styles.triggerLabel}>
              <span>Stop on</span>
              <input
                className={styles.triggerInput}
                list="recordKeyOptions"
                value={stopKey}
                onChange={(e) => setStopKey(e.target.value)}
                placeholder="e.g. winners (empty = manual only)"
              />
            </label>
            <button
              className={styles.primaryBtn}
              onClick={() => onSaveRecordingConfig(startKey.trim(), stopKey.trim())}
            >
              <Save size={14} />
              Save Recording Triggers
            </button>
          </div>
        )}
      </div>

      {/* Feature 3: Data file management */}
      <div className={styles.section}>
        <button className={styles.sectionHeader} onClick={() => setShowFiles((s) => !s)}>
          {showFiles ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          <span>Data File ({activeFile || 'none'})</span>
        </button>
        {showFiles && (
          <div className={styles.sectionBody}>
            <div className={styles.hint}>The active file is used for recording, Refresh Data and Save Round.</div>
            <div className={styles.fileRow}>
              <select
                className={styles.fileSelect}
                value={activeFile}
                onChange={(e) => onSelectFile(e.target.value)}
              >
                {files.length === 0 && <option value="">No files</option>}
                {files.map((file) => (
                  <option key={file} value={file}>
                    {file}
                  </option>
                ))}
              </select>
              <button
                className={styles.deleteBtn}
                onClick={() => onDeleteFile(activeFile)}
                disabled={files.length <= 1 || !activeFile}
                title="Delete active file"
              >
                <Trash2 size={14} />
              </button>
            </div>
            <div className={styles.fileRow}>
              <input
                className={styles.fileNameInput}
                value={newFileName}
                onChange={(e) => setNewFileName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleCreateFile()}
                placeholder="new-file-name.json"
              />
              <button className={styles.createBtn} onClick={handleCreateFile} disabled={!newFileName.trim()}>
                <FilePlus size={14} />
                New
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default EnvConfigPanel;
