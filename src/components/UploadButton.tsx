import { useState, useRef, useCallback } from 'react';
import { UploadCloud, CheckCircle, Loader } from 'lucide-react';
import { uploadToCloudinary } from '@/lib/supabase';

interface UploadButtonProps {
  onUploaded: (url: string) => void;
  resourceType?: 'image' | 'raw' | 'video';
  accept?: string;
  label?: string;
  currentUrl?: string;
}

export function UploadButton({
  onUploaded,
  resourceType = 'image',
  accept,
  label = 'Upload',
  currentUrl,
}: UploadButtonProps) {
  const [progress, setProgress] = useState<number | null>(null);
  const [complete, setComplete] = useState(false);
  const [error, setError] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(
    async (file: File) => {
      setProgress(0);
      setComplete(false);
      setError(false);
      try {
        const url = await uploadToCloudinary(file, resourceType, (p) => {
          setProgress(p);
        });
        setComplete(true);
        onUploaded(url);
        setTimeout(() => { setProgress(null); setComplete(false); }, 2000);
      } catch {
        setError(true);
        setProgress(null);
      }
    },
    [onUploaded, resourceType],
  );

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
    e.target.value = '';
  };

  return (
    <div>
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={progress !== null}
        className="w-full flex items-center justify-center gap-2 rounded-xl border border-dashed border-slate-300 dark:border-slate-600 px-4 py-3 text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all disabled:opacity-50"
      >
        {progress !== null ? (
          <>
            <Loader className="h-4 w-4 animate-spin" />
            Uploading... {progress}%
          </>
        ) : complete ? (
          <>
            <CheckCircle className="h-4 w-4 text-emerald-500" />
            Complete ✓
          </>
        ) : (
          <>
            <UploadCloud className="h-4 w-4" />
            {label}
          </>
        )}
      </button>

      <input
        ref={inputRef}
        type="file"
        accept={accept}
        onChange={handleChange}
        className="hidden"
      />

      {progress !== null && (
        <div className="mt-2 h-2 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-primary-500 to-gold-500 transition-all duration-200"
            style={{ width: `${progress}%` }}
          />
        </div>
      )}

      {error && <p className="text-xs text-red-500 mt-1">Upload failed. Try again.</p>}

      {currentUrl && progress === null && !complete && (
        <p className="text-xs text-emerald-500 mt-1 flex items-center gap-1">
          <CheckCircle className="h-3 w-3" /> Uploaded
        </p>
      )}
    </div>
  );
}
