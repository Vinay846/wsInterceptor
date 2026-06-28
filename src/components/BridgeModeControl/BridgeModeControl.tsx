import { ArrowLeftRight } from 'lucide-react';
import React from 'react';

import { BridgeModeControlProps } from '../../types';

import styles from './BridgeModeControl.module.css';

const BridgeModeControl: React.FC<BridgeModeControlProps> = ({ bridgeMode, onToggleBridgeMode }) => {
  return (
    <>
      {/* Bridge Mode Toggle */}
      <div className={styles.buttonGroup}>
        <button
          className={`${styles.actionButton} ${bridgeMode ? styles.bridgeModeActive : styles.bridgeModeInactive}`}
          onClick={onToggleBridgeMode}
        >
          <ArrowLeftRight size={16} />
          {bridgeMode ? '🌉 Bridge Mode ON' : '🌉 Bridge Mode OFF'}
        </button>
      </div>

      {/* Bridge Mode Warning */}
      {bridgeMode && (
        <div className={styles.bridgeModeWarning}>
          <div className={styles.warningTitle}>🌉 BRIDGE MODE ACTIVE</div>
          <div className={styles.warningText}>
            Control panel is disabled. All External ↔ Dev communication is direct passthrough.
          </div>
        </div>
      )}

      {/* Development Debug Panel */}
      {/* {process.env.NODE_ENV === 'development' && (
        <div className={styles.debugPanel}>
          <div className={styles.debugTitle}>🔧 Debug Info</div>
          <div className={styles.debugInfo}>
            Bridge Mode: <span className={styles.debugValue}>{bridgeMode.toString()}</span>
          </div>
        </div>
      )} */}
    </>
  );
};

export default BridgeModeControl;
