export function SearchIcon({ size = 14 }: { size?: number }) {
  return (
    <svg
      aria-hidden="true"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2" />
      <path
        d="M20 20L16.5 16.5"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function CaretIcon() {
  return (
    <svg
      className="icon-caret"
      aria-hidden="true"
      xmlns="http://www.w3.org/2000/svg"
      width="13"
      height="8"
      viewBox="0 0 13 8"
      fill="none"
    >
      <path
        d="M11.09 0.589996L6.5 5.17L1.91 0.589996L0.5 2L6.5 8L12.5 2L11.09 0.589996Z"
        fill="currentColor"
      />
    </svg>
  );
}

export function CartIcon() {
  return (
    <svg
      aria-hidden="true"
      xmlns="http://www.w3.org/2000/svg"
      width="28"
      height="28"
      viewBox="0 0 33 32"
      fill="none"
    >
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M10.5 27a2 2 0 1 0 0-4 2 2 0 0 0 0 4Zm14 0a2 2 0 1 0 0-4 2 2 0 0 0 0 4ZM7.2 6h2.1l1.1 2h15.4c.8 0 1.4.8 1.2 1.5l-2.1 7.2a1.3 1.3 0 0 1-1.2.9H12.4l.4 1.5h12.3v2H11.3a1.3 1.3 0 0 1-1.2-.9L7.2 6Z"
        fill="currentColor"
      />
    </svg>
  );
}
