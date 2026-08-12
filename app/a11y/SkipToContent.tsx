import { uiChrome } from "@/lib/i18n/ui-chrome";

/** Visually hidden until focused — WCAG 2.4.1 Bypass Blocks. */
export default function SkipToContent() {
  return (
    <a href="#main-content" className="skip-to-content">
      {uiChrome("skipToContent")}
    </a>
  );
}
