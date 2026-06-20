import { QueryClientProvider } from "@tanstack/react-query";
import { ToastProvider } from "../../context/ToastContext.jsx";
import { AuthProvider } from "@/features/auth/context/AuthContext";
import { ConfirmDialogProvider } from "../../context/ConfirmDialogContext.jsx";
import { queryClient } from "./queryClient.js";
import { GiftCardProvider } from "../../context/GiftCardContext.jsx";
import { OrderActionsProvider } from "@/features/orders/context/OrderActionsContext";

export default function AppProviders({ children }) {
  return (
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <ConfirmDialogProvider>
          <AuthProvider>
            <GiftCardProvider>
              <OrderActionsProvider>
                {children}
              </OrderActionsProvider>
            </GiftCardProvider>
          </AuthProvider>
        </ConfirmDialogProvider>
      </ToastProvider>
    </QueryClientProvider>
  );
}
