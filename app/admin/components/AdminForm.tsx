"use client";

import type { FormEvent, ReactNode } from "react";

export default function AdminForm({
  children,
  onSubmit,
  submitLabel = "Save",
  secondaryLabel,
  onSecondary,
  disabled = false,
}: {
  children: ReactNode;
  onSubmit?: (event: FormEvent<HTMLFormElement>) => void;
  submitLabel?: string;
  secondaryLabel?: string;
  onSecondary?: () => void;
  /** When true, disables the primary submit button. */
  disabled?: boolean;
}) {
  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (disabled) return;
    onSubmit?.(event);
  }

  return (
    <form className="admin-form" onSubmit={handleSubmit} noValidate>
      {children}
      <div className="admin-form__actions">
        <button
          type="submit"
          className="admin-btn admin-btn--primary"
          disabled={disabled}
        >
          {submitLabel}
        </button>
        {secondaryLabel ? (
          <button
            type="button"
            className="admin-btn admin-btn--secondary"
            onClick={onSecondary}
          >
            {secondaryLabel}
          </button>
        ) : null}
      </div>
    </form>
  );
}

export function AdminFormField({
  label,
  htmlFor,
  children,
}: {
  label: string;
  htmlFor: string;
  children: ReactNode;
}) {
  return (
    <div className="admin-form__field">
      <label className="admin-form__label" htmlFor={htmlFor}>
        {label}
      </label>
      {children}
    </div>
  );
}
