"use client";

type CatalogStatusProps = {
  status: "loading" | "error" | "empty";
  errorMessage?: string | null;
  emptyMessage?: string;
  onRetry?: () => void;
};

export default function CatalogStatus({
  status,
  errorMessage,
  emptyMessage = "No items available.",
  onRetry,
}: CatalogStatusProps) {
  if (status === "loading") {
    return (
      <div className="catalog-status" role="status" aria-live="polite">
        Loading…
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="catalog-status catalog-status--error" role="alert">
        <p>{errorMessage ?? "Unable to load data."}</p>
        {onRetry ? (
          <button type="button" className="catalog-status__retry" onClick={onRetry}>
            Retry
          </button>
        ) : null}
      </div>
    );
  }

  return (
    <div className="catalog-status catalog-status--empty" role="status">
      {emptyMessage}
    </div>
  );
}
