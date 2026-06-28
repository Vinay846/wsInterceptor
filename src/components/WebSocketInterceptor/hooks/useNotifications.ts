import { useCallback } from 'react';

import { TIMING } from '../../../constants';
import { useAppDispatch } from '../../../store/hooks';
import { addError } from '../../../store/slices/connectionSlice';
import { setToastMessage } from '../../../store/slices/uiSlice';

export interface Notifications {
  showToastMessage: (title: string, message: string) => void;
  showSuccessMessage: (message: string) => void;
  addErrorMessage: (type: string, message: string) => void;
}

/**
 * Centralized toast / error helpers used across the interceptor hooks.
 */
export const useNotifications = (): Notifications => {
  const dispatch = useAppDispatch();

  const addErrorMessage = useCallback(
    (type: string, message: string): void => {
      dispatch(addError({ type, message }));
    },
    [dispatch]
  );

  const showSuccessMessage = useCallback((message: string): void => {
    // Success message handled by toast notifications
  }, []);

  const showToastMessage = useCallback(
    (title: string, message: string): void => {
      dispatch(setToastMessage({ title, message }));
      setTimeout(() => {
        dispatch(setToastMessage(null));
      }, TIMING.TOAST_DURATION);
    },
    [dispatch]
  );

  return { showToastMessage, showSuccessMessage, addErrorMessage };
};
