"use client";

export type AdminFilterOption = {
  value: string;
  label: string;
};

export default function AdminFilter({
  label,
  value,
  options,
  onChange,
  disabled = false,
}: {
  label: string;
  value: string;
  options: readonly AdminFilterOption[];
  onChange?: (value: string) => void;
  disabled?: boolean;
}) {
  const id = `admin-filter-${label.toLowerCase().replace(/\s+/g, "-")}`;

  return (
    <div className="admin-filter">
      <label className="visually-hidden" htmlFor={id}>
        {label}
      </label>
      <select
        id={id}
        className="admin-filter__select"
        value={value}
        disabled={disabled}
        onChange={(event) => onChange?.(event.target.value)}
        aria-label={label}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}
