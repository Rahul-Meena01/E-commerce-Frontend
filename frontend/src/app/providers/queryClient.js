import { QueryClient } from "@tanstack/react-query";

const RETRYABLE_STATUS = new Set([408, 429, 500, 502, 503, 504]);

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60,
      gcTime: 1000 * 60 * 10,
      refetchOnWindowFocus: false,
      retry: (failureCount, error) => {
        if (failureCount >= 2) return false;
        const status = error?.status;
        if (typeof status === "number") {
          return RETRYABLE_STATUS.has(status);
        }
        return true;
      },
    },
    mutations: {
      retry: 1,
    },
  },
});
