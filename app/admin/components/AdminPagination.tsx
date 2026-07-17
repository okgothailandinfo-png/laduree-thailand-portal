"use client";

export default function AdminPagination({
  page,
  pageSize,
  total,
  onPageChange,
}: {
  page: number;
  pageSize: number;
  total: number;
  onPageChange?: (page: number) => void;
}) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize) || 1);
  const current = Math.min(Math.max(page, 1), totalPages);
  const from = total === 0 ? 0 : (current - 1) * pageSize + 1;
  const to = Math.min(current * pageSize, total);

  return (
    <div className="admin-pagination" role="navigation" aria-label="Pagination">
      <span>
        {total === 0 ? "0 results" : `${from}–${to} of ${total}`}
      </span>
      <div className="admin-pagination__controls">
        <button
          type="button"
          className="admin-btn admin-btn--secondary"
          disabled={current <= 1}
          onClick={() => onPageChange?.(current - 1)}
        >
          Previous
        </button>
        <button
          type="button"
          className="admin-btn admin-btn--secondary"
          disabled={current >= totalPages}
          onClick={() => onPageChange?.(current + 1)}
        >
          Next
        </button>
      </div>
    </div>
  );
}
