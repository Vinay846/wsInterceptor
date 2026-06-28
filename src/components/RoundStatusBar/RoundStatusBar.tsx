import React from 'react';

import { RoundStatusBarProps } from '../../types';

import styles from './RoundStatusBar.module.css';

const RoundStatusBar: React.FC<RoundStatusBarProps> = ({
  roundStatus,
  collectedRoundData,
  previousRoundData,
  savedRoundsData,
  bridgeMode,
}) => {
  const getStatusIndicator = (): string => {
    switch (roundStatus.status) {
      case 'active':
        return '🟢';
      case 'complete':
        return '🔵';
      default:
        return '⚪';
    }
  };

  const currentKeys = Object.keys(collectedRoundData);
  const previousKeys = Object.keys(previousRoundData);
  const savedKeys = Object.keys(savedRoundsData);

  return (
    <div className={styles.roundStatusBar}>
      <div className={styles.roundInfo}>
        <div className={styles.statusHeader}>
          <span className={styles.roundIndicator}>{getStatusIndicator()}</span>
          <span className={styles.roundText}>{roundStatus.message}</span>
        </div>

        {currentKeys.length > 0 && roundStatus.status === 'active' && (
          <div className={styles.keysInfo}>
            <span className={styles.roundDataCount}>🟢 Current Round ({currentKeys.length}):</span>
            <span className={styles.keysList}>{currentKeys.join(', ')}</span>
          </div>
        )}

        {previousKeys.length > 0 && (
          <div className={styles.keysInfo}>
            <span className={`${styles.roundDataCount} ${styles.previous} ${roundStatus.status === 'complete' || roundStatus.status === 'waiting' ? styles.readyToSave : ''}`}>
              🔵 Previous Round ({previousKeys.length}) - Ready to Save:
            </span>
            <span className={styles.keysList}>{previousKeys.join(', ')}</span>
          </div>
        )}
      </div>

      <div className={styles.savedRoundsInfo}>
        <div className={styles.savedInfo}>
          <span className={styles.savedCount}>💾 Saved Data ({savedKeys.length} keys total):</span>
          {savedKeys.length > 0 && <span className={styles.savedKeysList}>{savedKeys.join(', ')}</span>}
          {savedKeys.length === 0 && <span className={styles.savedKeysList}>No saved data</span>}
        </div>

        {bridgeMode && <span className={`${styles.savedCount} ${styles.bridgeActive}`}>🌉 Bridge Active</span>}
      </div>
    </div>
  );
};

export default RoundStatusBar;
