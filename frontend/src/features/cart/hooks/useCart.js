import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { cartApi } from "../services/cart.service";
import { useAuth } from '@/features/auth/hooks/useAuth';
import logger from '@/shared/utils/logger';

const STORAGE_KEY = "loft_cart";

const loadLocalCart = () => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
};

const saveLocalCart = (items) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch (err) {
    void err;
  }
};

export const useCartQuery = () => {
  const { isAuthenticated } = useAuth();
  
  return useQuery({
    queryKey: ["cart", isAuthenticated],
    queryFn: async () => {
      if (!isAuthenticated) {
        return loadLocalCart();
      }
      
      // Attempt merge if local cart has items
      const localItems = loadLocalCart();
      if (localItems.length > 0) {
        try {
          await cartApi.mergeCart(localItems);
          localStorage.removeItem(STORAGE_KEY);
        } catch (err) {
          logger.error("Cart merge failed", err);
        }
      }
      
      const res = await cartApi.getCart();
      if (res.ok) {
        const data = await res.json();
        return data?.data || { items: [], totals: { subtotal: 0, discount: 0, tax: 0, shipping: 0, grandTotal: 0 } };
      }
      throw new Error("Failed to fetch cart");
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
};

export const useCartMutations = () => {
  const queryClient = useQueryClient();
  const { isAuthenticated } = useAuth();

  const handleGuestCartUpdate = (updateFn) => {
    const current = loadLocalCart();
    const updated = updateFn(current);
    saveLocalCart(updated);
    queryClient.setQueryData(["cart", false], updated);
    return updated;
  };

  const addToCart = useMutation({
    mutationFn: async ({ product, size = "", color = "", quantity = 1 }) => {
      const itemPayload = {
        productId: product.productId || product.id,
        name: product.name,
        price: product.discountPrice || product.price,
        quantity,
        size,
        color,
        image: product.image || "",
      };

      if (!isAuthenticated) {
        handleGuestCartUpdate((prev) => {
          const existing = prev.findIndex(
            (item) => item.product === itemPayload.productId && item.size === size && item.color === color
          );
          if (existing >= 0) {
            return prev.map((item, i) => i === existing ? { ...item, quantity: item.quantity + quantity } : item);
          }
          const tempId = "guest_item_" + Math.random().toString(36).substring(2, 9) + Date.now().toString(36);
          return [...prev, { _id: tempId, product: itemPayload.productId, name: itemPayload.name, price: itemPayload.price, quantity, size, color, image: itemPayload.image }];
        });
        return;
      }

      const res = await cartApi.addItem(itemPayload);
      if (!res.ok) throw new Error("Failed to add item");
    },
    onSuccess: () => {
      if (isAuthenticated) queryClient.invalidateQueries({ queryKey: ["cart"] });
    },
  });

  const removeFromCart = useMutation({
    mutationFn: async ({ productId, size = "", color = "", itemId }) => {
      const rawId = itemId || productId;
      const targetId = typeof rawId === "object" && rawId ? (rawId._id || rawId.id) : rawId;

      if (!isAuthenticated) {
        const cleanProductId = typeof productId === "object" && productId ? (productId._id || productId.id) : productId;
        handleGuestCartUpdate((prev) => prev.filter((i) => !(i.product === cleanProductId && (i.size || "") === (size || "") && (i.color || "") === (color || ""))));
        return;
      }
      
      if (targetId) {
        const res = await cartApi.removeItem(targetId);
        if (!res.ok) throw new Error("Failed to remove item");
      }
    },
    onSuccess: () => {
      if (isAuthenticated) queryClient.invalidateQueries({ queryKey: ["cart"] });
    },
  });

  const updateQuantity = useMutation({
    mutationFn: async ({ productId, size = "", color = "", quantity, itemId }) => {
      const rawId = itemId || productId;
      const targetId = typeof rawId === "object" && rawId ? (rawId._id || rawId.id) : rawId;

      if (!isAuthenticated) {
        const cleanProductId = typeof productId === "object" && productId ? (productId._id || productId.id) : productId;
        handleGuestCartUpdate((prev) => prev.map((i) => (i.product === cleanProductId && (i.size || "") === (size || "") && (i.color || "") === (color || "")) ? { ...i, quantity } : i));
        return;
      }

      if (targetId) {
        const res = await cartApi.updateItem(targetId, { quantity });
        if (!res.ok) throw new Error("Failed to update item");
      }
    },
    onSuccess: () => {
      if (isAuthenticated) queryClient.invalidateQueries({ queryKey: ["cart"] });
    },
  });

  const clearCart = useMutation({
    mutationFn: async () => {
      if (!isAuthenticated) {
        localStorage.removeItem(STORAGE_KEY);
        queryClient.setQueryData(["cart", false], []);
        return;
      }
      const res = await cartApi.clearCart();
      if (!res.ok) throw new Error("Failed to clear cart");
    },
    onSuccess: () => {
      if (isAuthenticated) queryClient.invalidateQueries({ queryKey: ["cart"] });
    },
  });

  return {
    addToCart: addToCart.mutateAsync,
    removeFromCart: removeFromCart.mutateAsync,
    updateQuantity: updateQuantity.mutateAsync,
    clearCart: clearCart.mutateAsync,
    isAdding: addToCart.isPending,
    isRemoving: removeFromCart.isPending,
    isUpdating: updateQuantity.isPending,
    isClearing: clearCart.isPending,
  };
};

export const useCartState = () => {
  const { data: cartData, isLoading: syncing } = useCartQuery();
  
  // Handle both array (guest) and object (auth) shapes safely
  const cartItems = Array.isArray(cartData) ? cartData : (cartData?.items || []);
  const cartCount = cartItems.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0);
  const cartSubtotal = cartItems.reduce((sum, item) => sum + (Number(item.price) || 0) * (Number(item.quantity) || 0), 0);
  
  const TAX_PERCENTAGE = 18;
  const FREE_SHIPPING_THRESHOLD = 1000;
  const SHIPPING_CHARGE = 99;

  const fallbackDiscount = 0;
  const fallbackDiscountedSubtotal = Math.max(cartSubtotal - fallbackDiscount, 0);
  const fallbackTax = Number(((fallbackDiscountedSubtotal * TAX_PERCENTAGE) / 100).toFixed(2));
  const fallbackShipping = fallbackDiscountedSubtotal >= FREE_SHIPPING_THRESHOLD ? 0 : SHIPPING_CHARGE;
  const fallbackGrandTotal = Number((fallbackDiscountedSubtotal + fallbackTax + fallbackShipping).toFixed(2));

  const cartTotals = (!Array.isArray(cartData) && cartData?.totals) ? cartData.totals : {
    subtotal: cartSubtotal,
    discount: fallbackDiscount,
    tax: fallbackTax,
    shipping: fallbackShipping,
    grandTotal: fallbackGrandTotal,
    totalItems: cartCount
  };
  
  const couponCode = (!Array.isArray(cartData) && cartData?.couponCode) ? cartData.couponCode : null;
  
  return {
    cartItems,
    cartCount,
    cartSubtotal,
    cartTotals,
    couponCode,
    syncing
  };
};
 
export const useCartActions = () => {
  const mutations = useCartMutations();
  const { data: cartData } = useCartQuery();
  const cartItems = Array.isArray(cartData) ? cartData : (cartData?.items || []);
  
  const isInCart = (productId, size = "", color = "") => 
    cartItems.some(item => item.product === productId && item.size === size && item.color === color);

  return {
    ...mutations,
    isInCart
  };
};
 
export const useCart = () => { return { ...useCartState(), ...useCartActions() }; };

