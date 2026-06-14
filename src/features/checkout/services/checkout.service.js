import * as checkoutApi from "../api/checkout.api";
import * as ordersApi from "../../orders/api/orders.api";

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

const parseJsonResponse = async (response) => {
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data?.message || `Request failed (${response.status})`);
  }

  return data;
};

export const createOrder = async (data) =>
  parseJsonResponse(
    await wrapAxios(checkoutApi.createOrder(data))
  );

export const createCheckoutSession = async (orderId) =>
  parseJsonResponse(
    await wrapAxios(checkoutApi.createCheckoutSession(orderId))
  );

export const createRazorpayOrder = async (payload) =>
  parseJsonResponse(
    await wrapAxios(checkoutApi.createRazorpayOrder(payload))
  );

export const verifyRazorpayPayment = async (payload) =>
  parseJsonResponse(
    await wrapAxios(checkoutApi.verifyRazorpayPayment(payload))
  );

export const getOrders = () => wrapAxios(ordersApi.getOrders());

export const getOrder = (id) => wrapAxios(ordersApi.getOrderById(id));

export const orderApi = { createOrder, getOrders, getOrder, createRazorpayOrder, verifyRazorpayPayment };


