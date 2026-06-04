import { jest } from "@jest/globals";
import crypto from "crypto";

// Mock mongoose and session
const mockSession = {
  startTransaction: jest.fn(),
  commitTransaction: jest.fn(),
  abortTransaction: jest.fn(),
  endSession: jest.fn(),
};

jest.unstable_mockModule("mongoose", () => {
  return {
    default: {
      startSession: jest.fn().mockResolvedValue(mockSession),
      Types: {
        ObjectId: (id) => id || "6a15b5bc5f47fb7324960205",
      },
      model: jest.fn().mockReturnValue({
        bulkWrite: jest.fn().mockResolvedValue({ modifiedCount: 1 }),
      }),
    },
  };
});

// Mock Stripe
const mockStripeInstance = {
  checkout: {
    sessions: {
      create: jest.fn().mockResolvedValue({
        id: "cs_test_session",
        url: "https://stripe.com/checkout",
      }),
    },
  },
  webhooks: {
    constructEvent: jest.fn(),
  },
};

jest.unstable_mockModule("stripe", () => {
  return {
    default: jest.fn().mockImplementation(() => mockStripeInstance),
  };
});

// Mock Razorpay
const mockRazorpayInstance = {
  orders: {
    create: jest.fn().mockResolvedValue({
      id: "order_rzp_test",
      amount: 100000,
      currency: "INR",
    }),
    fetch: jest.fn().mockResolvedValue({
      id: "order_rzp_test",
      amount: 118000, // Matches mockCartInstance.totals.grandTotal * 100
      currency: "INR",
    }),
  },
};

jest.unstable_mockModule("razorpay", () => {
  return {
    default: jest.fn().mockImplementation(() => mockRazorpayInstance),
  };
});

// Mock Models
jest.unstable_mockModule("../models/Order.js", () => {
  return {
    default: {
      findById: jest.fn(),
      create: jest.fn(),
    },
  };
});

jest.unstable_mockModule("../models/Product.js", () => {
  return {
    default: {
      findById: jest.fn(),
      bulkWrite: jest.fn().mockResolvedValue({ modifiedCount: 1 }),
    },
  };
});

jest.unstable_mockModule("../models/Cart.js", () => {
  return {
    default: {
      findOne: jest.fn(),
      findOneAndUpdate: jest.fn(),
    },
  };
});

// Mock Email Service
jest.unstable_mockModule("../utils/emailService.js", () => {
  return {
    sendOrderConfirmationEmail: jest.fn().mockResolvedValue(true),
  };
});

// Dynamically import
const { default: mongoose } = await import("mongoose");
const { default: Order } = await import("../models/Order.js");
const { default: Product } = await import("../models/Product.js");
const { default: Cart } = await import("../models/Cart.js");
const { default: env } = await import("../config/env.js");
const { sendOrderConfirmationEmail } = await import("../utils/emailService.js");
const paymentService = await import("../modules/payment/payment.service.js");

const createMockQueryChain = (resolvedValue) => {
  const query = {
    populate: jest.fn().mockReturnThis(),
    then: jest.fn().mockImplementation((onFulfilled) => {
      return Promise.resolve(resolvedValue).then(onFulfilled);
    }),
  };
  return query;
};

describe("paymentService", () => {
  const mockUserId = "6a15b5bc5f47fb7324960299";
  const mockOrderId = "6a15b5bc5f47fb73249602a9";

  let mockOrderInstance;
  let mockUserInstance;
  let mockCartInstance;

  beforeEach(() => {
    mockUserInstance = {
      _id: mockUserId,
      name: "Buyer Name",
      email: "buyer@example.com",
      phone: "9876543210",
    };

    mockOrderInstance = {
      _id: mockOrderId,
      user: mockUserInstance,
      totalPrice: 1000,
      orderItems: [{ product: "6a15b5bc5f47fb73249602a1", quantity: 2 }],
      isPaid: false,
      save: jest.fn().mockResolvedValue(true),
    };

    mockCartInstance = {
      user: mockUserId,
      coupon: null,
      couponCode: null,
      items: [
        {
          name: "Test Shirt",
          product: {
            _id: "6a15b5bc5f47fb73249602a1",
            name: "Test Shirt",
            stock: 10,
            status: "Active",
            price: 600,
          },
          quantity: 2,
          finalPrice: 500,
        },
      ],
      totals: { subtotal: 1000, discount: 0, tax: 180, shipping: 0, grandTotal: 1180 },
    };
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("createStripeSession", () => {
    test("creates Stripe checkout session successfully", async () => {
      Order.findById.mockReturnValue(createMockQueryChain(mockOrderInstance));

      const result = await paymentService.createStripeSession(
        mockUserId,
        mockOrderId,
        "http://localhost:5173"
      );

      expect(result.sessionId).toBe("cs_test_session");
      expect(result.checkoutUrl).toBe("https://stripe.com/checkout");
      expect(mockOrderInstance.paymentProvider).toBe("Stripe");
      expect(mockOrderInstance.paymentSessionId).toBe("cs_test_session");
      expect(mockOrderInstance.save).toHaveBeenCalled();
    });

    test("fails if order is already paid", async () => {
      mockOrderInstance.isPaid = true;
      Order.findById.mockReturnValue(createMockQueryChain(mockOrderInstance));

      await expect(
        paymentService.createStripeSession(mockUserId, mockOrderId, "http://localhost:5173")
      ).rejects.toThrow(/Order is already paid/);
    });

    test("fails if orderId is missing", async () => {
      await expect(
        paymentService.createStripeSession(mockUserId, null, "http://localhost:5173")
      ).rejects.toThrow(/orderId is required/);
    });

    test("fails if order not found", async () => {
      Order.findById.mockReturnValue(createMockQueryChain(null));
      await expect(
        paymentService.createStripeSession(mockUserId, mockOrderId, "http://localhost:5173")
      ).rejects.toThrow(/Order not found/);
    });

    test("fails if Stripe credentials are not configured", async () => {
      const originalSecret = env.STRIPE_SECRET_KEY;
      env.STRIPE_SECRET_KEY = "";
      Order.findById.mockReturnValue(createMockQueryChain(mockOrderInstance));
      await expect(
        paymentService.createStripeSession(mockUserId, mockOrderId, "http://localhost:5173")
      ).rejects.toThrow(/Stripe secret key is not configured/);
      env.STRIPE_SECRET_KEY = originalSecret;
    });
  });

  describe("handleStripeWebhook", () => {
    test("processes successful payment webhook", async () => {
      const mockEvent = {
        type: "checkout.session.completed",
        data: {
          object: {
            id: "cs_test_session",
            payment_status: "paid",
            metadata: { orderId: mockOrderId },
          },
        },
      };

      mockStripeInstance.webhooks.constructEvent.mockReturnValue(mockEvent);
      Order.findById.mockResolvedValue(mockOrderInstance);

      const result = await paymentService.handleStripeWebhook("raw_body", "sig_header");
      expect(result.received).toBe(true);
      expect(Order.findById).toHaveBeenCalledWith(mockOrderId);
      expect(mockOrderInstance.isPaid).toBe(true);
      expect(mockOrderInstance.orderStatus).toBe("Processing");
      expect(mockOrderInstance.save).toHaveBeenCalled();
    });

    test("fails if Stripe webhook secret is not configured", async () => {
      const originalSecret = env.STRIPE_WEBHOOK_SECRET;
      env.STRIPE_WEBHOOK_SECRET = "";
      await expect(
        paymentService.handleStripeWebhook("raw_body", "sig_header")
      ).rejects.toThrow(/Stripe webhook secret is not configured/);
      env.STRIPE_WEBHOOK_SECRET = originalSecret;
    });

    test("fails if signature header is missing", async () => {
      await expect(
        paymentService.handleStripeWebhook("raw_body", null)
      ).rejects.toThrow(/Missing Stripe signature header/);
    });
  });

  describe("createRazorpayOrder", () => {
    test("creates Razorpay order successfully", async () => {
      Cart.findOne.mockReturnValue(createMockQueryChain(mockCartInstance));

      const result = await paymentService.createRazorpayOrder(mockUserId);
      expect(result.rzpOrderId).toBe("order_rzp_test");
      expect(result.amount).toBe(100000);
      expect(mockRazorpayInstance.orders.create).toHaveBeenCalled();
    });

    test("fails if cart is empty", async () => {
      mockCartInstance.items = [];
      Cart.findOne.mockReturnValue(createMockQueryChain(mockCartInstance));

      await expect(
        paymentService.createRazorpayOrder(mockUserId)
      ).rejects.toThrow(/Your cart is empty/);
    });

    test("fails if Razorpay credentials are not configured", async () => {
      const originalId = env.RAZORPAY_KEY_ID;
      const originalSecret = env.RAZORPAY_KEY_SECRET;
      env.RAZORPAY_KEY_ID = "";
      Cart.findOne.mockReturnValue(createMockQueryChain(mockCartInstance));
      await expect(
        paymentService.createRazorpayOrder(mockUserId)
      ).rejects.toThrow(/Razorpay credentials are not configured/);
      env.RAZORPAY_KEY_ID = originalId;
    });

    test("fails if product in cart is no longer available", async () => {
      mockCartInstance.items[0].product = null;
      Cart.findOne.mockReturnValue(createMockQueryChain(mockCartInstance));
      await expect(
        paymentService.createRazorpayOrder(mockUserId)
      ).rejects.toThrow(/is no longer available/);
    });

    test("fails if product is inactive", async () => {
      mockCartInstance.items[0].product.status = "Inactive";
      Cart.findOne.mockReturnValue(createMockQueryChain(mockCartInstance));
      await expect(
        paymentService.createRazorpayOrder(mockUserId)
      ).rejects.toThrow(/is inactive/);
    });

    test("fails if variant is inactive", async () => {
      mockCartInstance.items[0].variant = { status: "Inactive" };
      Cart.findOne.mockReturnValue(createMockQueryChain(mockCartInstance));
      await expect(
        paymentService.createRazorpayOrder(mockUserId)
      ).rejects.toThrow(/is currently deactivated/);
    });

    test("fails if variant stock is insufficient", async () => {
      mockCartInstance.items[0].variant = { status: "Active", stock: 1 };
      Cart.findOne.mockReturnValue(createMockQueryChain(mockCartInstance));
      await expect(
        paymentService.createRazorpayOrder(mockUserId)
      ).rejects.toThrow(/Insufficient stock for/);
    });

    test("fails if product stock is insufficient", async () => {
      mockCartInstance.items[0].product.stock = 1;
      mockCartInstance.items[0].variant = null;
      Cart.findOne.mockReturnValue(createMockQueryChain(mockCartInstance));
      await expect(
        paymentService.createRazorpayOrder(mockUserId)
      ).rejects.toThrow(/Insufficient stock for/);
    });
  });

  describe("verifyRazorpayPayment", () => {
    test("verifies signature and creates paid order", async () => {
      Cart.findOne.mockReturnValue(createMockQueryChain(mockCartInstance));

      const rzpOrderId = "order_rzp_test";
      const rzpPaymentId = "pay_rzp_test";
      const sign = rzpOrderId + "|" + rzpPaymentId;
      const rzpSignature = crypto
        .createHmac("sha256", "rzp_secret_mock")
        .update(sign)
        .digest("hex");

      Order.create.mockResolvedValue([
        {
          _id: mockOrderId,
          user: mockUserId,
          toObject: () => ({ _id: mockOrderId }),
        },
      ]);

      const result = await paymentService.verifyRazorpayPayment(mockUserInstance, {
        razorpay_order_id: rzpOrderId,
        razorpay_payment_id: rzpPaymentId,
        razorpay_signature: rzpSignature,
        shippingAddress: { address: "123 Street", city: "City" },
        shippingMethod: "standard",
      });

      expect(result._id).toBe(mockOrderId);
      expect(mockSession.commitTransaction).toHaveBeenCalled();
      expect(Cart.findOneAndUpdate).toHaveBeenCalled();
    });

    test("fails if payment gateway amount does not match calculated grand total", async () => {
      Cart.findOne.mockReturnValue(createMockQueryChain(mockCartInstance));
      mockRazorpayInstance.orders.fetch.mockResolvedValueOnce({
        id: "order_rzp_test",
        amount: 50000, // 500.00 rupees instead of mockCartInstance's 1180.00
        currency: "INR",
      });

      const rzpOrderId = "order_rzp_test";
      const rzpPaymentId = "pay_rzp_test";
      const sign = rzpOrderId + "|" + rzpPaymentId;
      const rzpSignature = crypto
        .createHmac("sha256", "rzp_secret_mock")
        .update(sign)
        .digest("hex");

      await expect(
        paymentService.verifyRazorpayPayment(mockUserInstance, {
          razorpay_order_id: rzpOrderId,
          razorpay_payment_id: rzpPaymentId,
          razorpay_signature: rzpSignature,
          shippingAddress: { address: "123 Street", city: "City" },
          shippingMethod: "standard",
        })
      ).rejects.toThrow(/Payment Integrity Violation: Payment gateway amount/);
    });

    test("fails if signature mismatch", async () => {
      await expect(
        paymentService.verifyRazorpayPayment(mockUserInstance, {
          razorpay_order_id: "id1",
          razorpay_payment_id: "id2",
          razorpay_signature: "wrong_sig",
          shippingAddress: {},
          shippingMethod: "standard",
        })
      ).rejects.toThrow(/Payment verification failed/);
    });

    test("fails if missing payment details", async () => {
      await expect(
        paymentService.verifyRazorpayPayment(mockUserInstance, {})
      ).rejects.toThrow(/Missing payment details for verification/);
    });

    test("fails if cart is empty during verification", async () => {
      mockCartInstance.items = [];
      Cart.findOne.mockReturnValue(createMockQueryChain(mockCartInstance));
      const rzpOrderId = "order_rzp_test";
      const rzpPaymentId = "pay_rzp_test";
      const sign = rzpOrderId + "|" + rzpPaymentId;
      const rzpSignature = crypto.createHmac("sha256", "rzp_secret_mock").update(sign).digest("hex");

      await expect(
        paymentService.verifyRazorpayPayment(mockUserInstance, {
          razorpay_order_id: rzpOrderId,
          razorpay_payment_id: rzpPaymentId,
          razorpay_signature: rzpSignature,
          shippingAddress: {},
          shippingMethod: "standard",
        })
      ).rejects.toThrow(/Cart is empty. Order could not be created./);
    });

    test("fails if product is missing during verification", async () => {
      mockCartInstance.items[0].product = null;
      Cart.findOne.mockReturnValue(createMockQueryChain(mockCartInstance));
      const rzpOrderId = "order_rzp_test";
      const rzpPaymentId = "pay_rzp_test";
      const sign = rzpOrderId + "|" + rzpPaymentId;
      const rzpSignature = crypto.createHmac("sha256", "rzp_secret_mock").update(sign).digest("hex");

      await expect(
        paymentService.verifyRazorpayPayment(mockUserInstance, {
          razorpay_order_id: rzpOrderId,
          razorpay_payment_id: rzpPaymentId,
          razorpay_signature: rzpSignature,
          shippingAddress: {},
          shippingMethod: "standard",
        })
      ).rejects.toThrow(/is no longer available/);
    });

    test("fails if product is inactive during verification", async () => {
      mockCartInstance.items[0].product.status = "Inactive";
      Cart.findOne.mockReturnValue(createMockQueryChain(mockCartInstance));
      const rzpOrderId = "order_rzp_test";
      const rzpPaymentId = "pay_rzp_test";
      const sign = rzpOrderId + "|" + rzpPaymentId;
      const rzpSignature = crypto.createHmac("sha256", "rzp_secret_mock").update(sign).digest("hex");

      await expect(
        paymentService.verifyRazorpayPayment(mockUserInstance, {
          razorpay_order_id: rzpOrderId,
          razorpay_payment_id: rzpPaymentId,
          razorpay_signature: rzpSignature,
          shippingAddress: {},
          shippingMethod: "standard",
        })
      ).rejects.toThrow(/is inactive/);
    });

    test("fails if variant is inactive during verification", async () => {
      mockCartInstance.items[0].variant = { status: "Inactive" };
      Cart.findOne.mockReturnValue(createMockQueryChain(mockCartInstance));
      const rzpOrderId = "order_rzp_test";
      const rzpPaymentId = "pay_rzp_test";
      const sign = rzpOrderId + "|" + rzpPaymentId;
      const rzpSignature = crypto.createHmac("sha256", "rzp_secret_mock").update(sign).digest("hex");

      await expect(
        paymentService.verifyRazorpayPayment(mockUserInstance, {
          razorpay_order_id: rzpOrderId,
          razorpay_payment_id: rzpPaymentId,
          razorpay_signature: rzpSignature,
          shippingAddress: {},
          shippingMethod: "standard",
        })
      ).rejects.toThrow(/is currently deactivated/);
    });

    test("fails if variant stock is insufficient during verification", async () => {
      mockCartInstance.items[0].variant = { status: "Active", stock: 1 };
      Cart.findOne.mockReturnValue(createMockQueryChain(mockCartInstance));
      const rzpOrderId = "order_rzp_test";
      const rzpPaymentId = "pay_rzp_test";
      const sign = rzpOrderId + "|" + rzpPaymentId;
      const rzpSignature = crypto.createHmac("sha256", "rzp_secret_mock").update(sign).digest("hex");

      await expect(
        paymentService.verifyRazorpayPayment(mockUserInstance, {
          razorpay_order_id: rzpOrderId,
          razorpay_payment_id: rzpPaymentId,
          razorpay_signature: rzpSignature,
          shippingAddress: {},
          shippingMethod: "standard",
        })
      ).rejects.toThrow(/Insufficient stock for/);
    });

    test("fails if product stock is insufficient during verification", async () => {
      mockCartInstance.items[0].product.stock = 1;
      mockCartInstance.items[0].variant = null;
      Cart.findOne.mockReturnValue(createMockQueryChain(mockCartInstance));
      const rzpOrderId = "order_rzp_test";
      const rzpPaymentId = "pay_rzp_test";
      const sign = rzpOrderId + "|" + rzpPaymentId;
      const rzpSignature = crypto.createHmac("sha256", "rzp_secret_mock").update(sign).digest("hex");

      await expect(
        paymentService.verifyRazorpayPayment(mockUserInstance, {
          razorpay_order_id: rzpOrderId,
          razorpay_payment_id: rzpPaymentId,
          razorpay_signature: rzpSignature,
          shippingAddress: {},
          shippingMethod: "standard",
        })
      ).rejects.toThrow(/Insufficient stock for/);
    });

    test("rolls back transaction if variant bulkWrite fails", async () => {
      mockCartInstance.items[0].variant = { _id: "v1", status: "Active", stock: 5 };
      Cart.findOne.mockReturnValue(createMockQueryChain(mockCartInstance));

      const mockVariantModel = mongoose.model("Variants");
      mockVariantModel.bulkWrite.mockResolvedValueOnce({ modifiedCount: 0 });

      const rzpOrderId = "order_rzp_test";
      const rzpPaymentId = "pay_rzp_test";
      const sign = rzpOrderId + "|" + rzpPaymentId;
      const rzpSignature = crypto.createHmac("sha256", "rzp_secret_mock").update(sign).digest("hex");

      await expect(
        paymentService.verifyRazorpayPayment(mockUserInstance, {
          razorpay_order_id: rzpOrderId,
          razorpay_payment_id: rzpPaymentId,
          razorpay_signature: rzpSignature,
          shippingAddress: { address: "123 Street", city: "City" },
          shippingMethod: "standard",
        })
      ).rejects.toThrow(/Insufficient stock for one or more variant items/);
      expect(mockSession.abortTransaction).toHaveBeenCalled();
    });

    test("rolls back transaction if product bulkWrite fails", async () => {
      mockCartInstance.items[0].variant = null;
      Cart.findOne.mockReturnValue(createMockQueryChain(mockCartInstance));

      Product.bulkWrite.mockResolvedValueOnce({ modifiedCount: 0 });

      const rzpOrderId = "order_rzp_test";
      const rzpPaymentId = "pay_rzp_test";
      const sign = rzpOrderId + "|" + rzpPaymentId;
      const rzpSignature = crypto.createHmac("sha256", "rzp_secret_mock").update(sign).digest("hex");

      await expect(
        paymentService.verifyRazorpayPayment(mockUserInstance, {
          razorpay_order_id: rzpOrderId,
          razorpay_payment_id: rzpPaymentId,
          razorpay_signature: rzpSignature,
          shippingAddress: { address: "123 Street", city: "City" },
          shippingMethod: "standard",
        })
      ).rejects.toThrow(/Insufficient stock for one or more product items/);
      expect(mockSession.abortTransaction).toHaveBeenCalled();
    });

    test("verifies payment successfully even if email notification fails", async () => {
      Cart.findOne.mockReturnValue(createMockQueryChain(mockCartInstance));
      sendOrderConfirmationEmail.mockRejectedValueOnce(new Error("Email server down"));

      const rzpOrderId = "order_rzp_test";
      const rzpPaymentId = "pay_rzp_test";
      const sign = rzpOrderId + "|" + rzpPaymentId;
      const rzpSignature = crypto
        .createHmac("sha256", "rzp_secret_mock")
        .update(sign)
        .digest("hex");

      Order.create.mockResolvedValue([
        {
          _id: mockOrderId,
          user: mockUserId,
          toObject: () => ({ _id: mockOrderId }),
        },
      ]);

      const result = await paymentService.verifyRazorpayPayment(mockUserInstance, {
        razorpay_order_id: rzpOrderId,
        razorpay_payment_id: rzpPaymentId,
        razorpay_signature: rzpSignature,
        shippingAddress: { address: "123 Street", city: "City" },
        shippingMethod: "standard",
      });

      expect(result._id).toBe(mockOrderId);
      expect(mockSession.commitTransaction).toHaveBeenCalled();
    });
  });

  describe("handleRazorpayWebhook", () => {
    test("handles webhook successfully with order.paid event", async () => {
      const body = {
        event: "order.paid",
        payload: {
          order: {
            entity: {
              id: "order_rzp_test"
            }
          }
        }
      };
      const signature = crypto
        .createHmac("sha256", "rzp_wh_secret_mock")
        .update(JSON.stringify(body))
        .digest("hex");

      const result = await paymentService.handleRazorpayWebhook(body, signature);
      expect(result.success).toBe(true);
      expect(result.message).toBe("Webhook handled successfully");
    });

    test("bypasses signature check if secret is not configured", async () => {
      const originalSecret = env.RAZORPAY_WEBHOOK_SECRET;
      env.RAZORPAY_WEBHOOK_SECRET = "";

      const result = await paymentService.handleRazorpayWebhook({}, null);
      expect(result.success).toBe(true);
      expect(result.message).toBe("Webhook accepted (unverified)");

      env.RAZORPAY_WEBHOOK_SECRET = originalSecret;
    });

    test("fails if signature header is missing but secret is configured", async () => {
      await expect(
        paymentService.handleRazorpayWebhook({}, null)
      ).rejects.toThrow(/Missing signature header/);
    });

    test("fails if signature is invalid", async () => {
      await expect(
        paymentService.handleRazorpayWebhook({}, "invalid_signature")
      ).rejects.toThrow(/Invalid webhook signature/);
    });
  });
});
