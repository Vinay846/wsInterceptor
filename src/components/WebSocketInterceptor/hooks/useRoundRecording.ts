import { useCallback, useEffect, useRef, useState } from 'react';

import { API_URLS, TIMING } from '../../../constants';
import { store } from '../../../store';
import { useAppDispatch } from '../../../store/hooks';
import { setRecordingConfig } from '../../../store/slices/configSlice';
import { addError } from '../../../store/slices/connectionSlice';
import {
  addToCollectedRoundData,
  clearExternalMessages,
  setCollectedRoundData,
  setPreviousRoundData,
} from '../../../store/slices/messageSlice';
import { setRoundStatus } from '../../../store/slices/uiSlice';
import type { ResponsesData, RoundStatus } from '../../../types';

import type { InterceptorRefs } from './useInterceptorRefs';
import type { Notifications } from './useNotifications';

interface UseRoundRecordingParams {
  refs: Pick<InterceptorRefs, 'roundTimerRef'>;
  notifications: Notifications;
  recordStartKey: string;
  recordStopKey: string;
  collectedRoundData: ResponsesData;
  previousRoundData: ResponsesData;
}

export interface RoundRecording {
  isRecording: boolean;
  canSaveData: boolean;
  hasCompletedRound: boolean;
  /** Live ref to the configured start key (read inside mount effects). */
  recordStartKeyRef: React.MutableRefObject<string>;
  updateRoundStatus: (status: RoundStatus['status'], message: string) => void;
  collectRoundData: (messageType: string, messageData: any) => void;
  finalizeRound: (completeRoundData: any) => void;
  handleToggleRecording: () => void;
  handleSaveRecordingConfig: (startKey: string, stopKey: string) => void;
  saveCollectedData: () => Promise<void>;
}

/**
 * Owns all round-recording behaviour: collecting messages into a round,
 * finalizing a round, manual record/stop controls and saving the captured data.
 */
export const useRoundRecording = ({
  refs,
  notifications,
  recordStartKey,
  recordStopKey,
  collectedRoundData,
  previousRoundData,
}: UseRoundRecordingParams): RoundRecording => {
  const dispatch = useAppDispatch();
  const { showToastMessage, showSuccessMessage } = notifications;
  const { roundTimerRef } = refs;

  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [canSaveData, setCanSaveData] = useState<boolean>(false);
  const [hasCompletedRound, setHasCompletedRound] = useState<boolean>(false);

  // Recording control refs (read inside the stable WebSocket message handler)
  const isRecordingRef = useRef<boolean>(false);
  const manualRecordingRef = useRef<boolean>(false);
  const recordStartKeyRef = useRef<string>(recordStartKey);
  const recordStopKeyRef = useRef<string>(recordStopKey);

  // Keep recording trigger refs in sync with config
  useEffect(() => {
    recordStartKeyRef.current = recordStartKey;
    recordStopKeyRef.current = recordStopKey;
  }, [recordStartKey, recordStopKey]);

  // State validation utility
  const validateRoundDataIntegrity = useCallback((data: any, _context: string) => {
    const keys = Object.keys(data);
    const criticalKeys = ['game', 'timer', 'betstats', 'winners'];
    const missingCritical = criticalKeys.filter((key) => !keys.includes(key));

    return { keys, missingCritical, isComplete: missingCritical.length === 0 };
  }, []);

  // Game round management
  const updateRoundStatus = useCallback(
    (status: RoundStatus['status'], message: string): void => {
      dispatch(setRoundStatus({ status, message }));
    },
    [dispatch]
  );

  // Finalize the current capture: move collected data to "previous round" and allow saving
  const finalizeRound = useCallback(
    (completeRoundData: any): void => {
      isRecordingRef.current = false;
      setIsRecording(false);
      manualRecordingRef.current = false;

      const totalMessages = Object.keys(completeRoundData).length;
      const completedKeys = Object.keys(completeRoundData).join(', ');

      if (totalMessages === 0) {
        updateRoundStatus('waiting', 'Recording stopped - no messages were collected.');
        return;
      }

      // Validate round completion integrity (informational)
      validateRoundDataIntegrity(completeRoundData, 'ROUND COMPLETION');

      updateRoundStatus(
        'complete',
        `Round completed: ${completedKeys} (${totalMessages} messages) - Moving to previous round.`
      );

      // Set the COMPLETE round data as previous round data for saving
      dispatch(setPreviousRoundData(completeRoundData));
      // Clear collected data for next round
      dispatch(setCollectedRoundData({}));

      setCanSaveData(true);
      setHasCompletedRound(true);

      showToastMessage('🎯 Round Completed!', `Collected ${totalMessages} keys: ${completedKeys}`);

      if (roundTimerRef.current) {
        clearTimeout(roundTimerRef.current);
      }

      roundTimerRef.current = setTimeout(() => {
        dispatch(clearExternalMessages());
        updateRoundStatus(
          'waiting',
          `Waiting for next round. Previous: ${completedKeys} (${totalMessages} messages) ready to save.`
        );
      }, TIMING.ROUND_COMPLETE_DELAY);
    },
    [updateRoundStatus, dispatch, showToastMessage, validateRoundDataIntegrity, roundTimerRef]
  );

  const collectRoundData = useCallback(
    (messageType: string, messageData: any): void => {
      const startKey = recordStartKeyRef.current;
      const stopKey = recordStopKeyRef.current;
      const isManual = manualRecordingRef.current;

      // Manual mode: only collect while a manual recording is active; ignore auto triggers
      if (isManual) {
        if (!isRecordingRef.current) return;
        dispatch(addToCollectedRoundData({ key: messageType, data: messageData }));
        setTimeout(() => {
          const currentKeys = Object.keys(store.getState().messages.collectedRoundData);
          updateRoundStatus('active', `Recording (manual): ${currentKeys.join(', ')} (${currentKeys.length} messages)`);
        }, 0);
        return;
      }

      // Auto mode - decide whether to start recording
      if (!isRecordingRef.current) {
        if (startKey) {
          // Wait for the configured start key before collecting anything
          if (messageType !== startKey) return;
          isRecordingRef.current = true;
          setIsRecording(true);
          dispatch(setCollectedRoundData({})); // begin a fresh round
        } else {
          // No start key configured: collect continuously (legacy behavior)
          isRecordingRef.current = true;
          setIsRecording(true);
        }
      }

      // Collect this message
      dispatch(addToCollectedRoundData({ key: messageType, data: messageData }));

      setTimeout(() => {
        const currentCollectedData = store.getState().messages.collectedRoundData;
        const currentKeys = Object.keys(currentCollectedData);
        updateRoundStatus('active', `Collecting: ${currentKeys.join(', ')} (${currentKeys.length} messages)`);

        // Auto stop trigger
        if (stopKey && messageType === stopKey) {
          finalizeRound(currentCollectedData);
        }
      }, 0);
    },
    [updateRoundStatus, dispatch, finalizeRound]
  );

  // Manual recording controls (Record/Stop button in the Env column header)
  const handleToggleRecording = useCallback((): void => {
    if (isRecordingRef.current) {
      // Stop and finalize whatever has been collected so far
      const completeRoundData = store.getState().messages.collectedRoundData;
      finalizeRound(completeRoundData);
      showToastMessage('⏹️ Recording Stopped', 'Manual recording stopped');
    } else {
      // Start a fresh manual recording
      manualRecordingRef.current = true;
      isRecordingRef.current = true;
      setIsRecording(true);
      dispatch(setCollectedRoundData({}));
      updateRoundStatus('active', 'Manual recording started - collecting messages...');
      showToastMessage('⏺️ Recording Started', 'Manually collecting messages');
    }
  }, [dispatch, updateRoundStatus, showToastMessage, finalizeRound]);

  const handleSaveRecordingConfig = useCallback(
    (startKey: string, stopKey: string): void => {
      dispatch(setRecordingConfig({ recordStartKey: startKey, recordStopKey: stopKey }));
      showToastMessage(
        '💾 Recording Triggers Saved',
        `Start: ${startKey || 'manual'} • Stop: ${stopKey || 'manual'}`
      );
    },
    [dispatch, showToastMessage]
  );

  const saveCollectedData = useCallback(async (): Promise<void> => {
    // FALLBACK STRATEGY: If previousRoundData is empty or only has winners,
    // use collectedRoundData + whatever is in previousRoundData
    let dataToSave;

    if (Object.keys(previousRoundData).length === 0) {
      dataToSave = JSON.parse(JSON.stringify(collectedRoundData));
    } else if (Object.keys(previousRoundData).length === 1 && previousRoundData.winners) {
      dataToSave = JSON.parse(JSON.stringify({ ...collectedRoundData, ...previousRoundData }));
    } else {
      dataToSave = JSON.parse(JSON.stringify(previousRoundData));
    }

    const keysToSave = Object.keys(dataToSave);
    const totalKeys = keysToSave.length;

    if (totalKeys === 0) {
      dispatch(addError({ type: 'save_validation', message: 'No round data available to save!' }));
      return;
    }

    // Validate data integrity before saving
    validateRoundDataIntegrity(dataToSave, 'SAVE OPERATION');

    // Show toast message with keys being saved
    showToastMessage('💾 Saving Round Data', `Saving ${totalKeys} keys: ${keysToSave.join(', ')}`);

    try {
      const response = await fetch(API_URLS.SAVE_COLLECTED_DATA, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dataToSave),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      await response.json();

      // Only clear the data after successful save
      dispatch(setPreviousRoundData({}));
      setCanSaveData(false);

      // DON'T refresh data from server immediately after save
      // This might be overwriting our state
      // refreshDataFromServer();

      showToastMessage('🎯 Round Data Saved!', `Successfully saved ${totalKeys} keys: ${keysToSave.join(', ')}`);
      showSuccessMessage('🎯 Previous round data saved successfully!');
    } catch (error: any) {
      dispatch(addError({ type: 'save_collected', message: `Failed to save collected data: ${error.message}` }));
    }
  }, [
    previousRoundData,
    collectedRoundData,
    showSuccessMessage,
    showToastMessage,
    dispatch,
    validateRoundDataIntegrity,
  ]);

  return {
    isRecording,
    canSaveData,
    hasCompletedRound,
    recordStartKeyRef,
    updateRoundStatus,
    collectRoundData,
    finalizeRound,
    handleToggleRecording,
    handleSaveRecordingConfig,
    saveCollectedData,
  };
};
