import React, { useEffect, useState } from 'react';
import { WifiOff, Wifi, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function OfflineIndicator({ isOnline, pendingCount, onSync }) {
  const [syncing, setSyncing] = useState(false);

  const handleSync = async () => {
    setSyncing(true);
    await onSync();
    setSyncing(false);
  };

  if (!isOnline) {
    return (
      <div className="bg-amber-500/10 border border-amber-500/20 text-amber-700 px-4 py-2 rounded-lg flex items-center justify-between text-sm">
        <div className="flex items-center gap-2">
          <WifiOff className="w-4 h-4" />
          <span>Offline mode — scanning saved locally</span>
        </div>
      </div>
    );
  }

  if (pendingCount > 0) {
    return (
      <div className="bg-blue-500/10 border border-blue-500/20 text-blue-700 px-4 py-2 rounded-lg flex items-center justify-between text-sm">
        <div className="flex items-center gap-2">
          <Wifi className="w-4 h-4" />
          <span>{pendingCount} scan{pendingCount !== 1 ? 's' : ''} pending sync</span>
        </div>
        <button
          onClick={handleSync}
          disabled={syncing}
          className="text-xs font-semibold px-2 py-1 rounded bg-blue-500 text-white hover:bg-blue-600 disabled:opacity-50"
        >
          {syncing ? 'Syncing...' : 'Sync'}
        </button>
      </div>
    );
  }

  return (
    <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 px-4 py-2 rounded-lg flex items-center gap-2 text-sm">
      <CheckCircle2 className="w-4 h-4" />
      <span>All synced</span>
    </div>
  );
}