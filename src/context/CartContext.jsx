// eslint-disable-next-line react-refresh/only-export-components
export { useCartState, useCartActions, useCartQuery as useCart } from "../features/cart/hooks/useCart";

export const CartProvider = ({ children }) => {
  return children;
};
