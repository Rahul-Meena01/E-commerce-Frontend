import * as api from "../api/cart.api";

const wrapAxios = async (axiosPromise) => {
  try {
    const res = await axiosPromise;
    return {
      ok: true,
      status: res.status,
      json: async () => res.data,
    };
  } catch (err) {
    return {
      ok: false,
      status: err.response?.status || 500,
      json: async () => err.response?.data || { message: err.message },
    };
  }
};

export const cartApi = {
  getCart: () => wrapAxios(api.getCart()),

  addItem: (item) => wrapAxios(api.addToCart(item)),

  updateItem: (itemId, data) => wrapAxios(api.updateCartItem(itemId, data)),

  removeItem: (itemId) => wrapAxios(api.removeCartItem(itemId)),

  clearCart: () => wrapAxios(api.clearCart()),

  mergeCart: (items) => wrapAxios(api.mergeCart(items)),

  applyCoupon: (code) => wrapAxios(api.applyCoupon(code)),

  removeCoupon: () => wrapAxios(api.removeCoupon()),

  applyGiftCard: (code) => wrapAxios(api.applyGiftCard(code)),

  removeGiftCard: () => wrapAxios(api.removeGiftCard()),
};
