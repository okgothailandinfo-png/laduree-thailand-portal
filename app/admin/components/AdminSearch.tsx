"use client";

export default function AdminSearch({
  value,
  onChange,
  placeholder = "Search…",
  disabled = false,
}: {
  value: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
}) {
  return (
    <div className="admin-search">
      <label className="visually-hidden" htmlFor="admin-search">
        Search
      </label>
      <input
        id="admin-search"
        className="admin-search__input"
        type="search"
        value={value}
        placeholder={placeholder}
        disabled={disabled}
        onChange={(event) => onChange?.(event.target.value)}
      />
    </div>
  );
}
