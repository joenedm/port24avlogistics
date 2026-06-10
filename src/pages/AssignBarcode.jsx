import React, { useState, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ScanBarcode, Camera, Search, CheckCircle2, AlertCircle, Link2, Package, X } from 'lucide-react';
import CameraScanner from '@/components/crew/CameraScanner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import PageHeader from '@/components/shared/PageHeader';
import StatusBadge from '@/components/shared/StatusBadge';

export default function AssignBarcode() {
  const [scannedCode, setScannedCode] = useState('');
  const [barcodeInput, setBarcodeInput] = useState('');
  const [assetSearch, setAssetSearch] = useState('');
  const [selectedAsset, setSelectedAsset] = useState(null);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [feedback, setFeedback] = useState(null); // { type, message }
  const [saving, setSaving] = useState(false);
  const barcodeRef = useRef(null);
  const searchRef = useRef(null);
  const queryClient = useQueryClient();

  const { data: assets = [] } = useQuery({
    queryKey: ['assets'],
    queryFn: () => base44.entities.Asset.list('-created_date', 5000),
  });

  const flash = (type, message) => {
    setFeedback({ type, message });
    setTimeout(() => setFeedback(null), 4000);
  };

  const handleCameraScan = (code) => {
    setCameraOpen(false);
    setBarcodeInput(code);
    setScannedCode(code);
    setTimeout(() => searchRef.current?.focus(), 100);
  };

  const handleBarcodeSubmit = (e) => {
    e.preventDefault();
    const trimmed = barcodeInput.trim();
    if (!trimmed) return;

    // Check if this barcode is already assigned to an asset
    const existing = assets.find(a =>
      a.barcode && String(a.barcode).trim().toLowerCase() === trimmed.toLowerCase()
    );
    if (existing) {
      flash('warn', `Barcode "${trimmed}" is already assigned to: ${existing.name}`);
      return;
    }

    setScannedCode(trimmed);
    searchRef.current?.focus();
  };

  // Filter assets by name, category, or existing barcode/serial
  const filteredAssets = assetSearch.trim().length < 2 ? [] : assets.filter(a => {
    const q = assetSearch.toLowerCase();
    return (
      a.name?.toLowerCase().includes(q) ||
      a.category?.toLowerCase().includes(q) ||
      a.barcode?.toLowerCase().includes(q) ||
      a.serial_number?.toLowerCase().includes(q) ||
      a.location?.toLowerCase().includes(q)
    );
  }).slice(0, 12);

  const handleAssign = async () => {
    if (!scannedCode || !selectedAsset) return;
    setSaving(true);
    await base44.entities.Asset.update(selectedAsset.id, { barcode: scannedCode });
    queryClient.invalidateQueries({ queryKey: ['assets'] });
    flash('success', `✓ Barcode "${scannedCode}" assigned to "${selectedAsset.name}"`);
    // Reset for next assignment
    setScannedCode('');
    setBarcodeInput('');
    setAssetSearch('');
    setSelectedAsset(null);
    setSaving(false);
    setTimeout(() => barcodeRef.current?.focus(), 100);
  };

  const reset = () => {
    setScannedCode('');
    setBarcodeInput('');
    setAssetSearch('');
    setSelectedAsset(null);
    setFeedback(null);
    setTimeout(() => barcodeRef.current?.focus(), 100);
  };

  const readyToAssign = scannedCode && selectedAsset;

  return (
    <div>
      <PageHeader
        title="Assign Barcodes to Assets"
        description="Scan a physical asset tag and link it to an asset in your inventory"
      />

      <div className="max-w-xl mx-auto space-y-5">

        {/* Step 1 — Scan or type the barcode */}
        <Card className={cn('border-2 transition-all', scannedCode ? 'border-primary/40' : 'border-border')}>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <span className={cn(
                'w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0',
                scannedCode ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
              )}>1</span>
              Scan or type the barcode from the tag
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {scannedCode ? (
              <div className="flex items-center gap-3 p-3 rounded-xl bg-primary/10 border border-primary/30">
                <ScanBarcode className="w-5 h-5 text-primary shrink-0" />
                <div className="flex-1">
                  <p className="text-xs text-muted-foreground">Scanned barcode</p>
                  <p className="font-mono font-bold text-lg text-primary">{scannedCode}</p>
                </div>
                <button onClick={reset} className="text-muted-foreground hover:text-foreground">
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <form onSubmit={handleBarcodeSubmit} className="flex gap-2">
                <div className="relative flex-1">
                  <ScanBarcode className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    ref={barcodeRef}
                    value={barcodeInput}
                    onChange={e => setBarcodeInput(e.target.value)}
                    placeholder="Scan QR or type e.g. ABC-1234"
                    className="pl-10 font-mono h-12 text-base"
                    autoFocus
                    autoComplete="off"
                  />
                </div>
                <Button type="button" variant="outline" className="h-12 px-3" onClick={() => setCameraOpen(true)} title="Use camera">
                  <Camera className="w-5 h-5" />
                </Button>
                <Button type="submit" className="h-12 px-5">Set</Button>
              </form>
            )}
            <p className="text-xs text-muted-foreground">
              Scan the QR code on the physical label, or manually type the ID (e.g. <span className="font-mono">ABC-1234</span>).
            </p>
          </CardContent>
        </Card>

        {/* Step 2 — Find the asset */}
        <Card className={cn('border-2 transition-all', !scannedCode ? 'opacity-50 pointer-events-none' : selectedAsset ? 'border-emerald-500/40' : 'border-border')}>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <span className={cn(
                'w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0',
                selectedAsset ? 'bg-emerald-500 text-white' : 'bg-muted text-muted-foreground'
              )}>2</span>
              Find the asset to link it to
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {selectedAsset ? (
              <div className="flex items-start gap-3 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30">
                <Package className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <p className="font-semibold truncate">{selectedAsset.name}</p>
                  <div className="flex gap-2 mt-1 flex-wrap">
                    {selectedAsset.category && <Badge variant="secondary" className="text-xs">{selectedAsset.category}</Badge>}
                    <StatusBadge status={selectedAsset.status} />
                    {selectedAsset.barcode && (
                      <Badge variant="outline" className="text-xs font-mono">Current: {selectedAsset.barcode}</Badge>
                    )}
                  </div>
                  {selectedAsset.location && <p className="text-xs text-muted-foreground mt-1">📍 {selectedAsset.location}</p>}
                </div>
                <button onClick={() => { setSelectedAsset(null); setAssetSearch(''); }} className="text-muted-foreground hover:text-foreground shrink-0">
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    ref={searchRef}
                    value={assetSearch}
                    onChange={e => setAssetSearch(e.target.value)}
                    placeholder="Search by name, category, location..."
                    className="pl-10 h-11"
                    autoComplete="off"
                  />
                </div>
                {filteredAssets.length > 0 && (
                  <div className="mt-2 border rounded-xl divide-y max-h-64 overflow-y-auto">
                    {filteredAssets.map(asset => (
                      <button
                        key={asset.id}
                        className="w-full flex items-start gap-3 px-4 py-3 text-left hover:bg-muted/50 transition-colors"
                        onClick={() => { setSelectedAsset(asset); setAssetSearch(''); }}
                      >
                        <Package className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">{asset.name}</p>
                          <div className="flex gap-2 mt-0.5 flex-wrap">
                            {asset.category && <span className="text-xs text-muted-foreground">{asset.category}</span>}
                            {asset.barcode && <span className="text-xs font-mono text-muted-foreground">#{asset.barcode}</span>}
                            {asset.location && <span className="text-xs text-muted-foreground">📍 {asset.location}</span>}
                          </div>
                        </div>
                        <StatusBadge status={asset.status} />
                      </button>
                    ))}
                  </div>
                )}
                {assetSearch.trim().length >= 2 && filteredAssets.length === 0 && (
                  <p className="text-sm text-muted-foreground mt-2 text-center py-4">No assets found for "{assetSearch}"</p>
                )}
                {assetSearch.trim().length < 2 && (
                  <p className="text-xs text-muted-foreground mt-2">Type at least 2 characters to search your inventory.</p>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Step 3 — Confirm */}
        <AnimatePresence>
          {readyToAssign && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              <Card className="border-2 border-primary/50 bg-primary/5">
                <CardContent className="pt-5 space-y-4">
                  <div className="flex items-center gap-3">
                    <Link2 className="w-5 h-5 text-primary shrink-0" />
                    <div>
                      <p className="text-sm font-semibold">Ready to link</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Barcode <span className="font-mono text-primary">{scannedCode}</span> → <span className="font-semibold">{selectedAsset.name}</span>
                      </p>
                      {selectedAsset.barcode && (
                        <p className="text-xs text-amber-500 mt-1">
                          ⚠ This will replace the existing barcode: <span className="font-mono">{selectedAsset.barcode}</span>
                        </p>
                      )}
                    </div>
                  </div>
                  <Button
                    onClick={handleAssign}
                    disabled={saving}
                    className="w-full h-11 text-base font-bold"
                  >
                    {saving ? 'Saving...' : 'Assign Barcode'}
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Feedback */}
        <AnimatePresence mode="wait">
          {feedback && (
            <motion.div
              key={feedback.message}
              initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              className={cn(
                'flex items-center gap-3 p-4 rounded-xl border font-semibold text-sm',
                feedback.type === 'success' ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' :
                feedback.type === 'warn'    ? 'bg-amber-500/10 text-amber-600 border-amber-500/20' :
                'bg-destructive/10 text-destructive border-destructive/20'
              )}
            >
              {feedback.type === 'success' ? <CheckCircle2 className="w-5 h-5 shrink-0" /> : <AlertCircle className="w-5 h-5 shrink-0" />}
              {feedback.message}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Camera */}
        {cameraOpen && (
          <CameraScanner onScan={handleCameraScan} onClose={() => setCameraOpen(false)} />
        )}

      </div>
    </div>
  );
}