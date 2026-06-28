import { createContext, useContext } from "react";

const ProductPresentationContext = createContext(null);

export const ProductPresentationProvider = ProductPresentationContext.Provider;

export function useProductPresentation() {
  return useContext(ProductPresentationContext);
}
