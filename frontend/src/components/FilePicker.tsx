import { useRef, useState, type DragEvent, type MouseEvent } from "react";

interface FilePickerProps {
  files: File[];
  onChange: (files: File[]) => void;
}

const ALLOWED_EXT = ".fit";

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function filterFitFiles(list: FileList | File[] | null): File[] {
  if (!list) return [];
  return Array.from(list).filter((f) => f.name.toLowerCase().endsWith(ALLOWED_EXT));
}

export function FilePicker({ files, onChange }: FilePickerProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  function addFiles(incoming: File[]) {
    if (incoming.length === 0) return;
    const existingKeys = new Set(files.map((f) => `${f.name}:${f.size}:${f.lastModified}`));
    const deduped = incoming.filter(
      (f) => !existingKeys.has(`${f.name}:${f.size}:${f.lastModified}`),
    );
    if (deduped.length === 0) return;
    onChange([...files, ...deduped]);
  }

  function removeAt(index: number) {
    const next = [...files];
    next.splice(index, 1);
    onChange(next);
  }

  function handleDragOver(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    if (!isDragging) setIsDragging(true);
  }

  function handleDragLeave(e: DragEvent<HTMLDivElement>) {
    if (e.currentTarget.contains(e.relatedTarget as Node)) return;
    setIsDragging(false);
  }

  function handleDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setIsDragging(false);
    addFiles(filterFitFiles(e.dataTransfer.files));
  }

  function handleMouseMove(e: MouseEvent<HTMLDivElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    e.currentTarget.style.setProperty("--mx", `${e.clientX - rect.left}px`);
    e.currentTarget.style.setProperty("--my", `${e.clientY - rect.top}px`);
  }

  return (
    <div>
      <div
        className={`dropzone${isDragging ? " is-dragging" : ""}`}
        onClick={() => inputRef.current?.click()}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onMouseMove={handleMouseMove}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            inputRef.current?.click();
          }
        }}
      >
        <div className="dropzone-icon" aria-hidden="true">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <path
              d="M12 4v12m0-12-4 4m4-4 4 4M5 18h14"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
        <div className="dropzone-title">
          {files.length === 0 ? "Drop .fit files here" : "Add more files"}
        </div>
        <div className="dropzone-hint">
          {files.length === 0
            ? "or tap to choose from your device"
            : `${files.length} selected — tap to add more`}
        </div>
        <input
          ref={inputRef}
          type="file"
          accept=".fit"
          multiple
          hidden
          onChange={(e) => {
            addFiles(filterFitFiles(e.target.files));
            e.target.value = "";
          }}
        />
      </div>

      {files.length > 0 && (
        <ul className="file-list">
          {files.map((file, index) => (
            <li key={`${file.name}:${file.size}:${file.lastModified}`} className="file-item">
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                aria-hidden="true"
                style={{ color: "var(--text-muted)", flexShrink: 0 }}
              >
                <path
                  d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"
                  stroke="currentColor"
                  strokeWidth="1.4"
                  strokeLinejoin="round"
                />
                <path d="M14 3v5h5" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
              </svg>
              <span className="file-item-name">{file.name}</span>
              <span className="file-item-size">{formatBytes(file.size)}</span>
              <button
                type="button"
                className="file-item-remove"
                aria-label={`Remove ${file.name}`}
                onClick={(e) => {
                  e.stopPropagation();
                  removeAt(index);
                }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                  <path
                    d="M6 6l12 12M6 18L18 6"
                    stroke="currentColor"
                    strokeWidth="1.6"
                    strokeLinecap="round"
                  />
                </svg>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
