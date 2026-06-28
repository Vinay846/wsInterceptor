import { Database, Save } from 'lucide-react';
import React, { useEffect, useState } from 'react';

import { DataManagementProps } from '../../types';

import styles from './DataManagement.module.css';

const DataManagement: React.FC<DataManagementProps> = ({
  collectedRoundData,
  previousRoundData,
  currentGameId,
  isDataLoading,
  canSaveData,
  hasCompletedRound,
  roundStatus,
  onRefreshData,
  onSaveData,
}) => {
  const currentKeys = Object.keys(collectedRoundData);
  const previousKeys = Object.keys(previousRoundData);
  const isRoundActive = roundStatus.status === 'active';
  const isReadyToSave = (roundStatus.status === 'complete' || roundStatus.status === 'waiting') && canSaveData && hasCompletedRound;

  // State to accumulate all previous keys from completed rounds
  const [allPreviousKeys, setAllPreviousKeys] = useState<string[]>([]);

  // Update accumulated previous keys when a round completes
  useEffect(() => {
    if (roundStatus.status === 'complete' && previousKeys.length > 0) {
      setAllPreviousKeys(prevKeys => {
        // Merge new keys with existing ones, avoiding duplicates
        const newKeys = previousKeys.filter(key => !prevKeys.includes(key));
        return [...prevKeys, ...newKeys];
      });
    }
  }, [roundStatus.status, previousKeys]);

  // Reset accumulated keys when starting a completely new game session
  useEffect(() => {
    if (currentGameId && allPreviousKeys.length === 0 && previousKeys.length === 0 && currentKeys.length === 0) {
      // This indicates a fresh start, so we can keep the accumulated keys empty
    }
  }, [currentGameId, allPreviousKeys.length, previousKeys.length, currentKeys.length]);

  return (
    <div className={styles.dataManagementSection}>
      <div className={styles.dataInfo}>
        {/* Show current round only when active */}
        {isRoundActive && currentKeys.length > 0 && (
          <div className={styles.dataRow}>
            <div className={styles.dataRowHeader}>
              <span className={styles.dataLabel}>Current Round:</span>
              <span className={styles.dataCount}>{currentKeys.length}</span>
            </div>
            <div className={styles.currentRoundIndicator}>
              <div>• Collecting: {currentKeys.join(', ')}</div>
            </div>
          </div>
        )}

        {/* Show previous round when available */}
        {previousKeys.length > 0 && (
          <div className={styles.dataRow}>
            <div className={styles.dataRowHeader}>
              <span className={styles.dataLabel}>Latest Completed Round:</span>
              <span className={styles.dataCount}>{previousKeys.length}</span>
            </div>
            <div className={`${styles.previousRoundIndicator} ${isReadyToSave ? styles.readyToSave : ''}`}>
              <div><strong>• Keys from Latest Round:</strong></div>
              <div className={styles.keysList}>
                {previousKeys.map((key, index) => (
                  <span key={key} className={styles.keyBadge}>
                    {key}{index < previousKeys.length - 1 ? ', ' : ''}
                  </span>
                ))}
              </div>
            </div>
            {isReadyToSave && (
              <div className={styles.savePreview}>
                <small>Ready to save all {previousKeys.length} keys with complete round data</small>
              </div>
            )}
          </div>
        )}

        <div className={styles.dataRow}>
          <div className={styles.dataRowHeader}>
            <span className={styles.dataLabel}>Current Game ID:</span>
            <span className={`${styles.dataCount} ${styles.gameIdBadge}`}>{currentGameId || 'None'}</span>
          </div>
        </div>
      </div>

      <div className={styles.dataButtons}>
        <button
          className={`${styles.actionButton} ${styles.refreshDataBtn}`}
          onClick={onRefreshData}
          disabled={isDataLoading}
        >
          <Database size={16} />
          {isDataLoading ? 'Loading...' : 'Refresh Data'}
        </button>


        <button
          className={`${styles.actionButton} ${styles.saveRoundBtn} ${isReadyToSave ? styles.highlightSave : ''}`}
          onClick={onSaveData}
          disabled={!canSaveData || !hasCompletedRound}
          title={
            !hasCompletedRound 
              ? 'Complete at least one round first' 
              : isRoundActive 
                ? 'Complete current round first' 
                : 'Save previous round data'
          }
        >
          <Save size={16} />
          {isReadyToSave ? 'Save Previous Round!' : 'Save Previous Round'}
        </button>
      </div>
    </div>
  );
};

export default DataManagement;
