import { useRef, useState } from 'react';
import { Loader2, Upload } from 'lucide-react';

/**
 * Compact square dropzone for media upload (click + drag/drop).
 */
export default function TDropzone({
  accept = 'image/*,video/*',
  multiple = true,
  onFiles,
  label = 'Upload',
  disabled = false,
  uploading = false,
  className = '',
  children,
}) {
  const inputRef = useRef(null);
  const [active, setActive] = useState(false);

  function emit(fileList) {
    const files = Array.from(fileList || []);
    if (files.length && onFiles) onFiles(files);
  }

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        multiple={multiple}
        disabled={disabled || uploading}
        hidden
        onChange={(e) => {
          emit(e.target.files);
          e.target.value = '';
        }}
      />
      <button
        type="button"
        className={[
          't-dropzone',
          active ? 't-dropzone--active' : '',
          uploading ? 't-dropzone--uploading' : '',
          className,
        ].filter(Boolean).join(' ')}
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          if (!disabled && !uploading) setActive(true);
        }}
        onDragLeave={() => setActive(false)}
        onDrop={(e) => {
          e.preventDefault();
          setActive(false);
          if (!disabled && !uploading) emit(e.dataTransfer.files);
        }}
        aria-label={label}
        aria-busy={uploading}
        disabled={disabled || uploading}
      >
        {uploading ? (
          <>
            <Loader2 className="t-dropzone__spinner" size={18} aria-hidden="true" />
            <span className="t-dropzone__label">Uploading…</span>
          </>
        ) : children || (
          <>
            <Upload size={18} strokeWidth={2.2} aria-hidden="true" />
            <span className="t-dropzone__label">{label}</span>
          </>
        )}
      </button>
    </>
  );
}
