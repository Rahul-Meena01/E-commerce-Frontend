import { useEffect, useId, useRef } from "react";
import { X } from "lucide-react";
import { Button } from "../Button/index.js";

export function Drawer({ children, description, footer, isOpen, onClose, title, width = "420px" }) {
  const titleId = useId();
  const descriptionId = useId();
  const drawerRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return undefined;
    document.body.style.overflow = "hidden";
    drawerRef.current?.querySelector("button, [href], input, select, textarea")?.focus();
    const onKeyDown = (event) => {
      if (event.key === "Escape") onClose?.();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = "";
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="ds-drawer__backdrop" onMouseDown={(event) => {
      if (event.target === event.currentTarget) onClose?.();
    }}>
      <aside
        ref={drawerRef}
        className="ds-drawer"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descriptionId : undefined}
        style={{ "--ds-drawer-width": width }}
      >
        <header className="ds-drawer__header">
          <div>
            <h2 className="ds-drawer__title" id={titleId}>{title}</h2>
            {description && <p className="ds-drawer__description" id={descriptionId}>{description}</p>}
          </div>
          <Button variant="ghost" aria-label="Close drawer" onClick={onClose}>
            <X size={18} />
          </Button>
        </header>
        <div className="ds-drawer__body">{children}</div>
        {footer && <footer className="ds-drawer__footer">{footer}</footer>}
      </aside>
    </div>
  );
}
