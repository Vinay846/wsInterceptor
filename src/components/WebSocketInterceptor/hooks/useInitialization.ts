import { useEffect, useRef } from 'react';

import type { RoundStatus } from '../../../types';

import type { InterceptorRefs } from './useInterceptorRefs';

interface UseInitializationParams {
  refs: InterceptorRefs;
  recordStartKeyRef: React.MutableRefObject<string>;
  connectExternal: () => Promise<void>;
  connectDev: () => void;
  updateRoundStatus: (status: RoundStatus['status'], message: string) => void;
  refreshDataFromServer: () => Promise<void>;
  loadFileConfig: () => Promise<void>;
}

/**
 * Runs the one-time mount effects: opening the WebSocket connections, the first
 * data refresh and loading the data-file configuration. Also tears the
 * connections down on unmount.
 */
export const useInitialization = ({
  refs,
  recordStartKeyRef,
  connectExternal,
  connectDev,
  updateRoundStatus,
  refreshDataFromServer,
  loadFileConfig,
}: UseInitializationParams): void => {
  const { externalWsRef, devWsRef, roundTimerRef } = refs;

  const connectionsInitialized = useRef<boolean>(false);
  const dataRefreshed = useRef<boolean>(false);
  const configLoaded = useRef<boolean>(false);

  // Initialize connections and start data collection
  useEffect(() => {
    if (!connectionsInitialized.current) {
      connectionsInitialized.current = true;
      updateRoundStatus(
        'waiting',
        recordStartKeyRef.current
          ? `Waiting for "${recordStartKeyRef.current}" to start recording...`
          : 'Ready - recording on every message (or use Record button)...'
      );

      // Initialize connections immediately
      const initializeConnections = async (): Promise<void> => {
        try {
          await connectExternal();
        } catch (error) {
        }

        try {
          connectDev();
        } catch (error) {
        }
      };

      void initializeConnections();
    }

    return (): void => {
      if (externalWsRef.current) externalWsRef.current.close();
      if (devWsRef.current) devWsRef.current.close();
      if (roundTimerRef.current) clearTimeout(roundTimerRef.current);
    };
    // Empty dependency array to run only once
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect((): void => {
    if (!dataRefreshed.current) {
      dataRefreshed.current = true;
      refreshDataFromServer();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Empty dependency array since we only want this to run once

  // Load data-file & initial-keys configuration once on mount
  useEffect((): void => {
    if (!configLoaded.current) {
      configLoaded.current = true;
      void loadFileConfig();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
};
