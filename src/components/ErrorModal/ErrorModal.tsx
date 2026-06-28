import React from 'react';

import { ErrorModalProps } from '../../types';

import styles from './ErrorModal.module.css';

const ErrorModal: React.FC<ErrorModalProps> = ({ isOpen, onClose, errors, onClearErrors }) => {
  if (!isOpen) return null;

  return (
    <div className={styles.errorModal}>
      <div className={styles.errorModalContent}>
        <div className={styles.errorModalHeader}>
          <div className={styles.errorModalTitle}>🚨 Error Log</div>
          <button className={styles.errorModalClose} onClick={onClose}>
            ×
          </button>
        </div>

        <div>
          <button className={styles.clearErrorsBtn} onClick={onClearErrors}>
            Clear All Errors
          </button>
        </div>

        <div>
          {errors.length === 0 ? (
            <p className={styles.noErrors}>No errors recorded.</p>
          ) : (
            errors.map((error, index) => (
              <div key={index} className={styles.errorItem}>
                <div className={styles.errorType}>{error.type}</div>
                <div className={styles.errorMessage}>{error.message}</div>
                {error.details && (
                  <div className={styles.errorDetails}>
                    <div className={styles.errorDetailsLabel}>Error Details:</div>
                    <pre className={styles.errorDetailsPre}>{error.details}</pre>
                  </div>
                )}
                <div className={styles.errorTimestamp}>{new Date(error.timestamp).toLocaleString()}</div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default ErrorModal;
