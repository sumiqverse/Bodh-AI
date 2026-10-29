'use client';

import * as React from 'react';
import { useRouter } from '@/i18n/routing';
import {
  getCurrentUser,
  getAuthToken,
  getUserDashboardPath,
  syncSessionCookies,
} from '@/lib/api-client';

export function HomeAuthRedirect(): React.JSX.Element | null {
  const router = useRouter();

  React.useEffect(() => {
    // Check if bypass requested via URL
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('public') === 'true') {
        return;
      }
    }

    const user = getCurrentUser();
    const token = getAuthToken();
    if (user && token) {
      // Ensure cookies are synchronized for edge middleware
      syncSessionCookies(token, user);
      // Immediately redirect to user's dashboard
      router.replace(getUserDashboardPath(user));
    }
  }, [router]);

  return null;
}
