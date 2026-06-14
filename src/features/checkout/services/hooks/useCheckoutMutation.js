import { useMutation } from "@tanstack/react-query";
import { createOrder } from "../checkout.service";

export function useCheckoutMutation() {
  return useMutation({
    mutationFn: createOrder,
  });
}
