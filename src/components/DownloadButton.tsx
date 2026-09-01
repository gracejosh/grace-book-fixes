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

  const handleDownload = useCallback(async () => {
    setProgress(0);
    setDone(false);
    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error('Download failed');

      const contentLength = response.headers.get('content-length');
      const total = contentLength ? parseInt(contentLength) : 0;
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
          if (total > 0) setProgress(Math.round((received / total) * 100));
        }
      }

      const blob = new Blob(chunks as BlobPart[]);
      const downloadUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = downloadUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(downloadUrl);

      setProgress(100);
      setDone(true);
      onDownloaded?.();
      setTimeout(() => { setProgress(null); setDone(false); }, 2000);
    } catch {
      setProgress(null);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
      document.body.appendChild(a);
      a.click();
      a.remove();
    }
  }, [url, filename, onDownloaded]);

  return (
    <button onClick={handleDownload} className={className} disabled={progress !== null && progress < 100}>
      {progress !== null ? (
        <span className="inline-flex items-center gap-1.5">
          {done ? <CheckCircle className="h-4 w-4 text-emerald-500" /> : <Loader className="h-4 w-4 animate-spin" />}
          {done ? 'Done' : `${progress}%`}
        </span>
      ) : (
        <span className="inline-flex items-center gap-1.5">
          <Download className="h-4 w-4" /> {label}
        </span>
      )}
    </button>
  );
}
