import React from 'react';

import { ToastProps } from '../../types';

import styles from './Toast.module.css';

const Toast: React.FC<ToastProps> = ({ message, onDismiss }) => {
  if (!message) return null;

  return (
    <div 
      className={styles.toastMessage} 
      onClick={onDismiss}
      role="alert"
      aria-live="polite"
      title="Click to dismiss"
    >
      <div className={styles.toastContent}>
        <div className={styles.toastTitle}>{message.title}</div>
        <div className={styles.toastBody}>{message.message}</div>
      </div>
    </div>
  );
};

export default Toast;
