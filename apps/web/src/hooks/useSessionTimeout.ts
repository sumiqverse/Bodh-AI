'use client';

import * as React from 'react';
import { useRouter } from '@/i18n/routing';
import { clearAuthSession, getAuthToken, getCurrentUser } from '@/lib/api-client';

const TIMEOUT_MS = 20 * 60 * 1000; // 20 minutes inactivity timeout
const WARNING_MS = 18 * 60 * 1000; // 18 minutes warning threshold
const CHECK_INTERVAL_MS = 30 * 1000; // Check every 30 seconds

export interface SessionTimeoutState {
  isTimedOut: boolean;
  showWarning: boolean;
  remainingMinutes: number;
  extendSession: () => void;
  logoutAndClear: () => void;
}

export function useSessionTimeout(): SessionTimeoutState {
  const router = useRouter();
  const [showWarning, setShowWarning] = React.useState<boolean>(false);
  const [remainingMinutes, setRemainingMinutes] = React.useState<number>(2);

  const updateActivity = React.useCallback(() => {
    if (typeof window === 'undefined') return;
    const now = Date.now();
    localStorage.setItem('bodhai_session_last_active', String(now));
    if (showWarning) {
      setShowWarning(false);
    }
  }, [showWarning]);

  const logoutAndClear = React.useCallback(() => {
    clearAuthSession();
    setShowWarning(false);
    router.push('/login');
  }, [router]);

  const extendSession = React.useCallback(() => {
    updateActivity();
    setShowWarning(false);
  }, [updateActivity]);

  React.useEffect(() => {
    if (typeof window === 'undefined') return;

    // Only run if user is logged in
    const token = getAuthToken();
    const user = getCurrentUser();
    if (!token || !user) return;

    // Initialize last active if unset
    if (!localStorage.getItem('bodhai_session_last_active')) {
      localStorage.setItem('bodhai_session_last_active', String(Date.now()));
    }

    const activityEvents = ['mousedown', 'keydown', 'touchstart', 'scroll'];
    const handleUserActivity = () => {
      // Throttle updating localStorage
      const last = Number(localStorage.getItem('bodhai_session_last_active') || '0');
      if (Date.now() - last > 5000) {
        updateActivity();
      }
    };

    activityEvents.forEach((event) => {
      window.addEventListener(event, handleUserActivity, { passive: true });
    });

    const interval = setInterval(() => {
      const last = Number(localStorage.getItem('bodhai_session_last_active') || '0');
      const elapsed = Date.now() - last;

      if (elapsed >= TIMEOUT_MS) {
        logoutAndClear();
      } else if (elapsed >= WARNING_MS) {
        const remaining = Math.max(1, Math.round((TIMEOUT_MS - elapsed) / 60000));
        setRemainingMinutes(remaining);
        setShowWarning(true);
      } else {
        setShowWarning(false);
      }
    }, CHECK_INTERVAL_MS);

    return () => {
      clearInterval(interval);
      activityEvents.forEach((event) => {
        window.removeEventListener(event, handleUserActivity);
      });
    };
  }, [logoutAndClear, updateActivity]);

  return {
    isTimedOut: false,
    showWarning,
    remainingMinutes,
    extendSession,
    logoutAndClear,
  };
}
