import { useState } from "react";
import { FilePicker } from "./components/FilePicker";
import { MergeButton } from "./components/MergeButton";
import { mergeFitFiles } from "./api/fitApi";

type Status = "idle" | "merging" | "done" | "error";

function suggestedFilename(files: File[]): string {
  if (files.length === 0) return "merged.fit";
  const base = files[0].name.replace(/\.fit$/i, "");
  return `${base}-merged.fit`;
}

export default function App() {
  const [files, setFiles] = useState<File[]>([]);
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);

  async function handleMerge() {
    if (files.length < 2) return;
    setStatus("merging");
    setError(null);
    try {
      const blob = await mergeFitFiles(files);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = suggestedFilename(files);
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      setStatus("done");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Merge failed");
      setStatus("error");
    }
  }

  function reset() {
    setFiles([]);
    setStatus("idle");
    setError(null);
  }

  return (
    <main className="shell">
      <header className="hero fade-up">
        <span className="hero-eyebrow">
          <span className="dot" aria-hidden="true" />
          ephemeral · private
        </span>
        <h1>Merge your .fit files.</h1>
        <p>
          Combine activities from any Garmin device into a single file. Processed in memory,
          never stored.
        </p>
      </header>

      <section className="fade-up" style={{ animationDelay: "60ms" }}>
        <FilePicker files={files} onChange={setFiles} />
      </section>

      <section className="action-row fade-up" style={{ animationDelay: "120ms" }}>
        <MergeButton
          disabled={files.length < 2}
          loading={status === "merging"}
          count={files.length}
          onClick={handleMerge}
        />
        {files.length > 0 && status !== "merging" && (
          <button type="button" className="btn-secondary" onClick={reset}>
            Clear all
          </button>
        )}
      </section>

      {status === "done" && (
        <div className="status success" role="status">
          <svg
            className="status-icon"
            viewBox="0 0 24 24"
            fill="none"
            aria-hidden="true"
          >
            <path
              d="M5 12.5l4.5 4.5L19 7.5"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          Merged file downloaded.
        </div>
      )}

      {status === "error" && error && (
        <div className="status error" role="alert">
          <svg
            className="status-icon"
            viewBox="0 0 24 24"
            fill="none"
            aria-hidden="true"
          >
            <path
              d="M12 8v5m0 3.5v.1M12 3l10 18H2L12 3z"
              stroke="currentColor"
              strokeWidth="1.7"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          {error}
        </div>
      )}

      <footer className="footer fade-up" style={{ animationDelay: "200ms" }}>
        Tip — install as an app from your browser's <kbd>⋮</kbd> menu.
      </footer>
    </main>
  );
}
