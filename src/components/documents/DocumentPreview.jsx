import React, { useRef, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Download, X } from 'lucide-react';
import { downloadPdf } from '@/lib/usePrintDocument';

/**
 * Live preview component for all document types (Quote, Invoice, Pick List).
 * Uses an iframe to render the full branded HTML document.
 * Download: generates a real PDF file and downloads it directly — no print dialog.
 */

export default function DocumentPreview({ html, onClose, title = 'Preview' }) {
  const iframeRef = useRef(null);
  const [isDownloading, setIsDownloading] = useState(false);

  useEffect(() => {
    if (iframeRef.current && html) {
      const doc = iframeRef.current.contentDocument || iframeRef.current.contentWindow?.document;
      if (doc) {
        doc.open();
        doc.write(html);
        doc.close();
      }
    }
  }, [html]);

  const handleDownload = () => {
    if (!html || isDownloading) return;
    const filename = (title || 'document').replace(/[^a-z0-9\-_ ]/gi, '').trim().replace(/\s+/g, '-').toLowerCase() + '.pdf';
    downloadPdf(html, filename, () => setIsDownloading(true), () => setIsDownloading(false), () => setIsDownloading(false));
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-4 py-3 border-b bg-muted/30 shrink-0">
        <div className="flex-1">
          <span className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">{title}</span>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="default" onClick={handleDownload} disabled={isDownloading}>
            {isDownloading
              ? <><div className="w-3.5 h-3.5 mr-1.5 border-2 border-current border-t-transparent rounded-full animate-spin" />Generating...</>
              : <><Download className="w-3.5 h-3.5 mr-1.5" />Download PDF</>
            }
          </Button>
          {onClose && (
            <Button size="sm" variant="ghost" onClick={onClose}>
              <X className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>
      <div className="flex-1 bg-slate-100 overflow-auto p-6">
        <iframe
          ref={iframeRef}
          title={title}
          className="w-full h-full min-h-[700px] rounded-sm shadow-md bg-white"
          style={{ border: 'none', minHeight: '700px', maxWidth: '900px', margin: '0 auto' }}
          sandbox="allow-same-origin allow-scripts"
        />
      </div>
    </div>
  );
}