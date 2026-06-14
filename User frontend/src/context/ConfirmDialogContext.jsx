import { createContext, useCallback, useContext, useMemo, useState } from "react";
import { AlertTriangle } from "lucide-react";
import { Button, Modal } from "../shared/ui/index.js";

const ConfirmDialogContext = createContext(null);

export function ConfirmDialogProvider({ children }) {
  const [request, setRequest] = useState(null);

  const confirm = useCallback((options) => {
    return new Promise((resolve) => {
      setRequest({
        confirmLabel: "Confirm",
        cancelLabel: "Cancel",
        tone: "danger",
        ...options,
        resolve,
      });
    });
  }, []);

  const close = useCallback(
    (value) => {
      request?.resolve(value);
      setRequest(null);
    },
    [request],
  );

  const value = useMemo(() => ({ confirm }), [confirm]);

  return (
    <ConfirmDialogContext.Provider value={value}>
      {children}
      <Modal
        isOpen={Boolean(request)}
        onClose={() => close(false)}
        title={request?.title || "Confirm action"}
        description={request?.description}
        width="460px"
        footer={
          <>
            <Button variant="secondary" onClick={() => close(false)}>
              {request?.cancelLabel || "Cancel"}
            </Button>
            <Button
              variant={request?.tone === "danger" ? "danger" : "primary"}
              onClick={() => close(true)}
            >
              {request?.confirmLabel || "Confirm"}
            </Button>
          </>
        }
      >
        {request?.message && (
          <div style={{ display: "flex", gap: "12px", alignItems: "flex-start" }}>
            <AlertTriangle
              aria-hidden="true"
              size={22}
              style={{
                color: request.tone === "danger" ? "var(--ds-color-danger)" : "var(--ds-color-warning)",
                flex: "0 0 auto",
              }}
            />
            <p style={{ margin: 0, color: "var(--ds-color-text-muted)", lineHeight: 1.6 }}>
              {request.message}
            </p>
          </div>
        )}
      </Modal>
    </ConfirmDialogContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useConfirmDialog() {
  const context = useContext(ConfirmDialogContext);
  if (!context) {
    throw new Error("useConfirmDialog must be used within ConfirmDialogProvider");
  }
  return context.confirm;
}
