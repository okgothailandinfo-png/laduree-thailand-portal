/**
 * Shared dialog/drawer focus helpers (WCAG 2.2 keyboard + focus management).
 */

export const FOCUSABLE_SELECTOR =
  'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function getFocusableElements(root: HTMLElement): HTMLElement[] {
  return Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter(
    (el) => !el.hasAttribute("disabled") && el.getAttribute("aria-hidden") !== "true",
  );
}

/** Trap Tab / Shift+Tab inside `root`. Returns true when the event was handled. */
export function trapTabKey(event: KeyboardEvent, root: HTMLElement): boolean {
  if (event.key !== "Tab") return false;
  const focusable = getFocusableElements(root);
  if (focusable.length === 0) return false;
  const first = focusable[0];
  const last = focusable[focusable.length - 1];
  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault();
    last.focus();
    return true;
  }
  if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault();
    first.focus();
    return true;
  }
  return false;
}

export function isFocusableElement(
  node: EventTarget | null,
): node is HTMLElement {
  return node instanceof HTMLElement && typeof node.focus === "function";
}
