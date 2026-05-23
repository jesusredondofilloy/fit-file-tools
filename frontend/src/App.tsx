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

      <nav
        className="social-row fade-up"
        aria-label="Project links"
        style={{ animationDelay: "180ms" }}
      >
        <a
          href="https://github.com/jesusredondofilloy"
          target="_blank"
          rel="noopener noreferrer"
          className="social-btn"
          aria-label="GitHub profile"
        >
          <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path d="M12 .5C5.65.5.5 5.65.5 12c0 5.08 3.29 9.39 7.86 10.91.58.11.79-.25.79-.55 0-.27-.01-1.18-.02-2.14-3.2.7-3.88-1.36-3.88-1.36-.52-1.32-1.28-1.67-1.28-1.67-1.05-.72.08-.71.08-.71 1.16.08 1.77 1.19 1.77 1.19 1.03 1.77 2.71 1.26 3.37.96.1-.75.4-1.26.73-1.55-2.55-.29-5.24-1.28-5.24-5.69 0-1.26.45-2.29 1.19-3.1-.12-.29-.52-1.46.11-3.05 0 0 .97-.31 3.18 1.18a11.04 11.04 0 0 1 5.79 0c2.2-1.49 3.17-1.18 3.17-1.18.63 1.59.23 2.76.11 3.05.74.81 1.19 1.84 1.19 3.1 0 4.42-2.69 5.39-5.26 5.68.41.36.78 1.06.78 2.14 0 1.55-.01 2.8-.01 3.18 0 .31.21.67.8.55 4.56-1.52 7.85-5.83 7.85-10.91C23.5 5.65 18.35.5 12 .5z" />
          </svg>
          <span>GitHub</span>
        </a>
        {/* TODO: replace YOUR_HANDLE with your Buy Me a Coffee username */}
        <a
          href="https://www.buymeacoffee.com/YOUR_HANDLE"
          target="_blank"
          rel="noopener noreferrer"
          className="social-btn"
          aria-label="Buy me a coffee"
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.7"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M4 10h13v5a4 4 0 0 1-4 4H8a4 4 0 0 1-4-4v-5z" />
            <path d="M17 11h2a3 3 0 0 1 0 6h-2" />
            <path d="M8 3v2" />
            <path d="M12 3v2" />
          </svg>
          <span>Buy me a coffee</span>
        </a>
      </nav>

      <footer className="footer fade-up" style={{ animationDelay: "220ms" }}>
        Tip — install as an app from your browser's <kbd>⋮</kbd> menu.
      </footer>
    </main>
  );
}
