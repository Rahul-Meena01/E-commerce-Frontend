export { useCartState, useCartActions, useCartQuery as useCart } from "../features/cart/hooks/useCart";

export const CartProvider = ({ children }) => {
  return children;
};
