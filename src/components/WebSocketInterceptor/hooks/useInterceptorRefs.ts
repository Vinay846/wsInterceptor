import { useRef } from 'react';

/**
 * Refs that need to be shared across the interceptor hooks.
 *
 * - `externalWsRef` / `devWsRef`: live WebSocket instances, read by the
 *   connection, message-composer, shortcut and initialization hooks.
 * - `roundTimerRef`: timeout used to reset the round status, shared between the
 *   recording hook and the mount-cleanup effect.
 */
export interface InterceptorRefs {
  externalWsRef: React.MutableRefObject<WebSocket | null>;
  devWsRef: React.MutableRefObject<WebSocket | null>;
  roundTimerRef: React.MutableRefObject<NodeJS.Timeout | null>;
}

export const useInterceptorRefs = (): InterceptorRefs => {
  const externalWsRef = useRef<WebSocket | null>(null);
  const devWsRef = useRef<WebSocket | null>(null);
  const roundTimerRef = useRef<NodeJS.Timeout | null>(null);

  return { externalWsRef, devWsRef, roundTimerRef };
};
