import { useState, useCallback } from 'react';
import { Download, Loader, CheckCircle } from 'lucide-react';

interface DownloadButtonProps {
  url: string;
  filename: string;
  label?: string;
  className?: string;
  onDownloaded?: () => void;
}

export function DownloadButton({ url, filename, label = 'Download', className = '', onDownloaded }: DownloadButtonProps) {
  const [progress, setProgress] = useState<number | null>(null);
  const [done, setDone] = useState(false);
  const [error, setError] = useState(false);

  const handleDownload = useCallback(async () => {
      if (progress !== null) return;

      setProgress(0);
      setDone(false);
      setError(false);

      try {
        const response = await fetch(url);
        if (!response.ok) throw new Error('Download failed');

        const contentLength = response.headers.get('content-length');
        const total = contentLength ? parseInt(contentLength, 10) : 0;
        const reader = response.body?.getReader();
        if (!reader) throw new Error('No response body');

        const chunks: Uint8Array[] = [];
        let received = 0;
        while (true) {
          const { done: streamDone, value } = await reader.read();
          if (streamDone) break;
          if (value) {
            chunks.push(value);
            received += value.length;
            if (total > 0) setProgress(Math.min(99, Math.round((received / total) * 100)));
          }
        }

        const blob = new Blob(chunks as BlobPart[]);
        const downloadUrl = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = downloadUrl;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.URL.revokeObjectURL(downloadUrl);

        setProgress(100);
        setDone(true);
        onDownloaded?.();
        window.setTimeout(() => {
          setProgress(null);
          setDone(false);
        }, 2000);
      } catch {
        setProgress(null);
        setError(true);
        window.setTimeout(() => setError(false), 2500);
      }
    }, [url, filename, onDownloaded, progress]);

  return (
    <button
      type="button"
      onClick={handleDownload}
      className={`inline-flex min-h-[42px] items-center justify-center rounded-lg border border-emerald-300 bg-emerald-100 px-3 py-2 text-sm font-semibold text-emerald-950 shadow-sm transition-colors hover:bg-emerald-200 disabled:cursor-not-allowed disabled:opacity-70 ${className}`}
      disabled={progress !== null}
    >
      {progress !== null ? (
        <span className="inline-flex items-center gap-1.5">
          {done ? <CheckCircle className="h-4 w-4 text-emerald-500" /> : <Loader className="h-4 w-4 animate-spin" />}
          {done ? 'Downloaded ✓' : `${progress}%`}
        </span>
      ) : error ? (
        <span className="inline-flex items-center gap-1.5 text-red-500">
          Download failed
        </span>
      ) : (
        <span className="inline-flex items-center gap-1.5">
          <Download className="h-4 w-4" /> {label}
        </span>
      )}
    </button>
  );
}
