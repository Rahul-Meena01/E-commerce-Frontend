import { useMutation } from "@tanstack/react-query";
import { createOrder } from "../services/checkout.service";

export function useCheckoutMutation() {
  return useMutation({
    mutationFn: createOrder,
  });
}
