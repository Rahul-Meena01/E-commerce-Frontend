import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { wishlistApi } from "../services/wishlist.service";
import { useAuth } from "@/features/auth/hooks/useAuth";
import logger from "@/shared/utils/logger";

const STORAGE_KEY = "loft_wishlist";

const loadLocalWishlist = () => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
};

const saveLocalWishlist = (items) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch (err) {
    void err;
  }
};

// Maps backend DB item structure to frontend presentation structure
const mapWishlistItem = (item) => {
  if (!item) return null;
  const isPopulatedProduct = item._id && item.name;
  const product = isPopulatedProduct ? item : (item.product || {});
  const variant = item.variant || {};

  const name = variant.name || product.name || "Product";
  const image = variant.image || product.image || "";
  const price = variant.price !== undefined && variant.price > 0
    ? (variant.discountPrice || variant.price)
    : (product.discountPrice || product.price || 0);

  return {
    id: product._id || product.id || String(item._id),
    productId: product._id || product.id,
    variantId: variant._id || null,
    size: item.size || variant.size || "",
    color: item.color || variant.color || "",
    name,
    brand: product.brand || variant.brand || "",
    price,
    image,
  };
};

export const useWishlistQuery = () => {
  const { isAuthenticated } = useAuth();

  return useQuery({
    queryKey: ["wishlist", isAuthenticated],
    queryFn: async () => {
      if (!isAuthenticated) {
        return loadLocalWishlist().map(mapWishlistItem).filter(Boolean);
      }

      // Attempt merge if local wishlist has items
      const localItems = loadLocalWishlist();
      if (localItems.length > 0) {
        try {
          await wishlistApi.mergeWishlist(localItems);
          localStorage.removeItem(STORAGE_KEY);
        } catch (err) {
          logger.error("Wishlist merge failed", err);
        }
      }

      const res = await wishlistApi.getWishlist();
      if (res.ok) {
        const json = await res.json();
        const items = json.data?.products || [];
        return items.map(mapWishlistItem).filter(Boolean);
      }
      throw new Error("Failed to fetch wishlist");
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
};

export const useWishlistMutations = () => {
  const queryClient = useQueryClient();
  const { isAuthenticated } = useAuth();

  const handleGuestWishlistUpdate = (updater) => {
    const current = loadLocalWishlist();
    const updated = updater(current);
    saveLocalWishlist(updated);
    queryClient.setQueryData(["wishlist", false], updated.map(mapWishlistItem).filter(Boolean));
    return updated;
  };

  const toggleWishlist = useMutation({
    mutationFn: async (product) => {
      const productId = product.id || product._id || product.productId;
      const variantId = product.variantId || product.variant?._id || product.variant || null;
      const size = product.size || "";
      const color = product.color || "";

      if (!isAuthenticated) {
        handleGuestWishlistUpdate((prev) => {
          const existsIndex = prev.findIndex(
            (item) =>
              String(item.product?._id || item.product || item.id) === String(productId) &&
              String(item.variant?._id || item.variant || "") === String(variantId || "") &&
              (item.size || "") === (size || "") &&
              (item.color || "") === (color || "")
          );
          if (existsIndex >= 0) {
            return prev.filter((_, i) => i !== existsIndex);
          }
          return [
            ...prev,
            {
              product: product.product || { _id: productId, name: product.name, brand: product.brand, price: product.price, image: product.image },
              variant: variantId ? { _id: variantId, size, color } : null,
              size,
              color,
            },
          ];
        });
        return;
      }

      const currentWishlist = queryClient.getQueryData(["wishlist", true]) || [];
      const isIn = currentWishlist.some(
        (item) => String(item.productId || item.id) === String(productId)
      );

      let res;
      if (isIn) {
        res = await wishlistApi.removeFromWishlist(productId);
      } else {
        res = await wishlistApi.addToWishlist(productId);
      }

      if (!res.ok) throw new Error("Failed to update wishlist");
      const json = await res.json();
      return json.data || [];
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["wishlist"] });
    },
  });

  return {
    toggleWishlist: toggleWishlist.mutateAsync,
    addToWishlist: toggleWishlist.mutateAsync, // mapping alias
    removeFromWishlist: async (productId, variantId = null) => {
      await toggleWishlist.mutateAsync({ id: productId, variantId });
    },
  };
};

export const useWishlistState = () => {
  const { data: wishlistItems = [] } = useWishlistQuery();
  const wishlistCount = wishlistItems.length;

  return {
    wishlistItems,
    wishlistCount,
  };
};

export const useWishlistActions = () => {
  const mutations = useWishlistMutations();
  const { data: wishlistItems = [] } = useWishlistQuery();

  const isInWishlist = (productId, variantId = null) =>
    wishlistItems.some(
      (item) =>
        String(item.productId || item.id) === String(productId) &&
        (!variantId || String(item.variantId || "") === String(variantId))
    );

  return {
    ...mutations,
    isInWishlist,
  };
};

export const useWishlist = () => {
  return {
    ...useWishlistState(),
    ...useWishlistActions(),
  };
};
