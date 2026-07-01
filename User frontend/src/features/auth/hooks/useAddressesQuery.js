import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "../../../shared/constants/queryKeys";
import authFetch from "../../../shared/utils/http";

export function useAddressesQuery(enabled = true) {
  return useQuery({
    queryKey: queryKeys.addresses.all,
    queryFn: async () => {
      const res = await authFetch("/api/addresses");
      if (!res.ok) throw new Error("Failed to fetch addresses");
      const json = await res.json();
      return json.addresses || [];
    },
    staleTime: 300_000,
    enabled,
  });
}

export function useCreateAddressMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload) => {
      const res = await authFetch("/api/addresses", {
        method: "POST",
        body: payload,
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Failed to create address");
      }
      const json = await res.json();
      return json.address;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.addresses.all });
    },
  });
}

export function useUpdateAddressMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, payload }) => {
      const res = await authFetch(`/api/addresses/${id}`, {
        method: "PUT",
        body: payload,
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Failed to update address");
      }
      const json = await res.json();
      return json.address;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.addresses.all });
    },
  });
}

export function useDeleteAddressMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id) => {
      const res = await authFetch(`/api/addresses/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Failed to delete address");
      }
      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.addresses.all });
    },
  });
}
