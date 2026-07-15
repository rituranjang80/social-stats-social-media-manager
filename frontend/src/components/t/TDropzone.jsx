import { useRef, useState } from 'react';
import { Upload } from 'lucide-react';

/**
 * Compact square dropzone for media upload (click + drag/drop).
 */
export default function TDropzone({
  accept = 'image/*,video/*',
  multiple = true,
  onFiles,
  label = 'Upload',
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
        hidden
        onChange={(e) => {
          emit(e.target.files);
          e.target.value = '';
        }}
      />
      <button
        type="button"
        className={`t-dropzone ${active ? 't-dropzone--active' : ''} ${className}`.trim()}
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setActive(true); }}
        onDragLeave={() => setActive(false)}
        onDrop={(e) => {
          e.preventDefault();
          setActive(false);
          emit(e.dataTransfer.files);
        }}
        aria-label={label}
      >
        {children || (
          <>
            <Upload size={18} strokeWidth={2.2} aria-hidden="true" />
            <span className="t-dropzone__label">{label}</span>
          </>
        )}
      </button>
    </>
  );
}
