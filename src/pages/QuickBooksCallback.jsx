import React, { useEffect } from 'react';
import { Loader2 } from 'lucide-react';

// This page receives the redirect from the external QuickBooks Sync Service.
// The sync service redirects to:
//   /admin?tab=accounting&qb_callback=success  (on success)
//   /admin?tab=accounting&qb_callback=error    (on error)
//
// This page just forwards those params to the admin accounting page.
// It is kept as a fallback relay in case the sync service redirects here first.
export default function QuickBooksCallback() {
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const cbResult = params.get('qb_callback');
    const cbError = params.get('error');

    const base = '/admin?tab=accounting';

    if (cbError) {
      window.location.replace(`${base}&qb_callback=error`);
    } else if (cbResult === 'success') {
      window.location.replace(`${base}&qb_callback=success`);
    } else {
      // Legacy: old flow sent qb_code / qb_realm — now just redirect to admin
      window.location.replace(base);
    }
  }, []);

  return (
    <div className="flex items-center justify-center min-h-screen bg-background">
      <div className="flex items-center gap-3 text-muted-foreground">
        <Loader2 className="w-5 h-5 animate-spin text-primary" />
        <span className="text-sm">Completing QuickBooks authorization...</span>
      </div>
    </div>
  );
}