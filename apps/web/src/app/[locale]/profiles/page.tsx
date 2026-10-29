'use client';

import * as React from 'react';
import { useRouter } from '@/i18n/routing';

export default function ProfilesRedirect(): React.JSX.Element {
  const router = useRouter();

  React.useEffect(() => {
    router.replace('/profile');
  }, [router]);

  return (
    <div className="flex items-center justify-center min-h-[50vh] text-xs text-muted-foreground">
      Redirecting to your private profile...
    </div>
  );
}
