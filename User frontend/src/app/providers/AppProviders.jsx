import { QueryClientProvider } from "@tanstack/react-query";
import { ToastProvider } from "../../context/ToastContext.jsx";
import { AuthProvider } from "@/features/auth/context/AuthContext";
import { ConfirmDialogProvider } from "../../context/ConfirmDialogContext.jsx";
import { queryClient } from "./queryClient.js";

export default function AppProviders({ children }) {
  return (
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <ConfirmDialogProvider>
          <AuthProvider>{children}</AuthProvider>
        </ConfirmDialogProvider>
      </ToastProvider>
    </QueryClientProvider>
  );
}
