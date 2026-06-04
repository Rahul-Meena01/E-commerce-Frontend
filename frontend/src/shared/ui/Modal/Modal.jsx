import { useEffect, useId, useRef } from "react";
import { X } from "lucide-react";
import { Button } from "../Button/index.js";

const focusableSelector =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function Modal({
  children,
  description,
  footer,
  isOpen,
  onClose,
  title,
  width = "560px",
}) {
  const titleId = useId();
  const descriptionId = useId();
  const panelRef = useRef(null);
  const previousFocusRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return undefined;

    previousFocusRef.current = document.activeElement;
    document.body.style.overflow = "hidden";

    const focusable = panelRef.current?.querySelectorAll(focusableSelector);
    const first = focusable?.[0];
    const last = focusable?.[focusable.length - 1];
    first?.focus();

    const onKeyDown = (event) => {
      if (event.key === "Escape") {
        onClose?.();
      }

      if (event.key === "Tab" && focusable?.length) {
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    };

    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = "";
      previousFocusRef.current?.focus?.();
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="ds-modal__backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose?.();
      }}
    >
      <section
        ref={panelRef}
        className="ds-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descriptionId : undefined}
        style={{ "--ds-modal-width": width }}
      >
        <header className="ds-modal__header">
          <div>
            <h2 className="ds-modal__title" id={titleId}>
              {title}
            </h2>
            {description && (
              <p className="ds-modal__description" id={descriptionId}>
                {description}
              </p>
            )}
          </div>
          <Button variant="ghost" aria-label="Close dialog" onClick={onClose}>
            <X size={18} />
          </Button>
        </header>
        <div className="ds-modal__body">{children}</div>
        {footer && <footer className="ds-modal__footer">{footer}</footer>}
      </section>
    </div>
  );
}
