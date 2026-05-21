interface MergeButtonProps {
  disabled: boolean;
  loading: boolean;
  count: number;
  onClick: () => void;
}

export function MergeButton({ disabled, loading, count, onClick }: MergeButtonProps) {
  const label = (() => {
    if (loading) return "Merging…";
    if (count < 2) return "Add at least 2 files";
    return `Merge ${count} files`;
  })();

  return (
    <button
      type="button"
      className={`btn-primary${loading ? " loading" : ""}`}
      disabled={disabled || loading}
      onClick={onClick}
    >
      {loading && <span className="spinner" aria-hidden="true" />}
      {!loading && (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path
            d="M7 4v9a4 4 0 0 0 4 4h6m0 0-3-3m3 3-3 3"
            stroke="currentColor"
            strokeWidth="1.7"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M17 4v3"
            stroke="currentColor"
            strokeWidth="1.7"
            strokeLinecap="round"
          />
        </svg>
      )}
      {label}
    </button>
  );
}
