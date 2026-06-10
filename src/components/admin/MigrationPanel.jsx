import React, { useState } from 'react';
import { db } from '@/api/db';
import { Button } from '@/components/ui/button';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Zap, CheckCircle2, AlertTriangle, Archive, Cloud } from 'lucide-react';
import { toast } from 'sonner';

export default function MigrationPanel() {
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState(null);

  const runMigration = async () => {
    setRunning(true);
    setResult(null);
    try {
      const response = await db.functions.invoke('migrateOldCombinationTypes', {});
      const data = response.data;

      if (data?.success) {
        const s = data.summary;
        setResult({ success: true, summary: s });
        if (s.totalChanges > 0) {
          toast.success(`Migration complete — ${s.totalChanges} records updated`);
        } else {
          toast.success('Migration complete — nothing to migrate (already clean)');
        }
        if (s.errors?.length > 0) toast.error(`${s.errors.length} error(s) during migration`);
      } else {
        toast.error(data?.error || 'Migration failed');
        setResult({ success: false, error: data?.error });
      }
    } catch (error) {
      toast.error(`Migration error: ${error.message}`);
      setResult({ success: false, error: error.message });
    } finally {
      setRunning(false);
    }
  };

  const alreadyRan = result?.success && result.summary?.totalChanges === 0;

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Scans all asset records and kit records for old "combination" type names and converts them:
      </p>

      <div className="grid grid-cols-2 gap-3 text-sm">
        <div className="p-3 border rounded-lg bg-muted/30 flex items-center gap-3">
          <Archive className="w-4 h-4 text-amber-500 shrink-0" />
          <div>
            <p className="font-medium">Physical combination</p>
            <p className="text-xs text-muted-foreground">→ Serialized Kit</p>
          </div>
        </div>
        <div className="p-3 border rounded-lg bg-muted/30 flex items-center gap-3">
          <Cloud className="w-4 h-4 text-blue-400 shrink-0" />
          <div>
            <p className="font-medium">Virtual combination</p>
            <p className="text-xs text-muted-foreground">→ Cloud Kit</p>
          </div>
        </div>
      </div>

      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button
            className="w-full gap-2"
            disabled={running || alreadyRan}
            variant={result?.success ? 'outline' : 'default'}
          >
            <Zap className="w-4 h-4" />
            {running ? 'Running migration...' : alreadyRan ? 'Already up to date' : 'Run Migration'}
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Run Kit Migration?</AlertDialogTitle>
            <AlertDialogDescription>
              This will find every asset or kit record still using "Physical combination" or "Virtual combination" and convert it to the correct Serialized Kit or Cloud Kit type. Existing contents and project assignments are preserved. You can re-run it safely — it only changes records that still need updating.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={runMigration}>Run Migration</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {result && (
        <div className={`p-4 rounded-lg border ${result.success ? 'border-emerald-500/20 bg-emerald-500/5' : 'border-red-500/20 bg-red-500/5'}`}>
          {result.success ? (
            <div className="flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
              <div className="flex-1 space-y-2 text-sm">
                <p className="font-semibold text-emerald-600">Migration complete</p>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-muted-foreground">
                  <span>Physical combination assets found:</span>
                  <span className="font-semibold text-foreground">{result.summary.physicalCombinationAssetsFound}</span>
                  <span>Virtual combination assets found:</span>
                  <span className="font-semibold text-foreground">{result.summary.virtualCombinationAssetsFound}</span>
                  <span>Asset categories fixed:</span>
                  <span className="font-semibold text-foreground">{result.summary.assetCategoriesFixed}</span>
                  <span>New Serialized Kits created:</span>
                  <span className="font-semibold text-foreground">{result.summary.newSerializedKitsCreated}</span>
                  <span>New Cloud Kits created:</span>
                  <span className="font-semibold text-foreground">{result.summary.newCloudKitsCreated}</span>
                  <span>Legacy kit_type fields fixed:</span>
                  <span className="font-semibold text-foreground">{result.summary.legacyKitTypesFixed}</span>
                </div>
                <p className="text-xs font-bold text-foreground border-t pt-2">
                  Total changes: {result.summary.totalChanges}
                  {result.summary.totalChanges === 0 && ' — database was already clean ✓'}
                </p>
                {result.summary.errors?.length > 0 && (
                  <div className="mt-2 p-2 bg-red-500/10 rounded border border-red-500/20">
                    <p className="text-xs font-medium text-red-600">{result.summary.errors.length} error(s):</p>
                    <ul className="mt-1 space-y-0.5 text-xs text-red-600">
                      {result.summary.errors.map((err, i) => <li key={i}>• {err}</li>)}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
              <div className="text-sm">
                <p className="font-medium text-red-600">Migration failed</p>
                <p className="text-xs text-muted-foreground mt-1">{result.error}</p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}