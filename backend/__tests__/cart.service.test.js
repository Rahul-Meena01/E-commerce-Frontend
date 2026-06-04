import { jest } from "@jest/globals";

// Mock mongoose
jest.unstable_mockModule("mongoose", () => {
  return {
    default: {
      Types: {
        ObjectId: (id) => id || "6a15b5bc5f47fb7324960205",
      },
      model: jest.fn().mockReturnValue({
        findOne: jest.fn(),
        findById: jest.fn(),
      }),
    },
  };
});

// Mock Models
jest.unstable_mockModule("../models/Cart.js", () => {
  return {
    default: {
      findOne: jest.fn(),
      create: jest.fn(),
      findOneAndUpdate: jest.fn(),
    },
  };
});

jest.unstable_mockModule("../models/Product.js", () => {
  return {
    default: {
      findById: jest.fn(),
    },
  };
});

jest.unstable_mockModule("../models/Coupon.js", () => {
  return {
    default: {
      findOne: jest.fn(),
      findById: jest.fn(),
    },
  };
});

// Dynamically import models and service
const { default: mongoose } = await import("mongoose");
const { default: Cart } = await import("../models/Cart.js");
const { default: Product } = await import("../models/Product.js");
const { default: Coupon } = await import("../models/Coupon.js");
const cartService = await import("../modules/cart/cart.service.js");

// Helper to create mock Mongoose query chains
const createMockQueryChain = (resolvedValue) => {
  const query = {
    populate: jest.fn().mockReturnThis(),
    then: jest.fn().mockImplementation((onFulfilled) => {
      return Promise.resolve(resolvedValue).then(onFulfilled);
    }),
  };
  return query;
};

describe("cartService", () => {
  const mockUserId = "6a15b5bc5f47fb7324960299";
  const mockProductId = "6a15b5bc5f47fb73249602a1";

  let mockCartInstance;
  let mockProductInstance;
  let mockVariantInstance;
  let mockCouponInstance;

  beforeEach(() => {
    mockCartInstance = {
      user: mockUserId,
      items: [],
      coupon: null,
      couponCode: null,
      totals: { subtotal: 0, discount: 0, tax: 0, shipping: 0, grandTotal: 0 },
      markModified: jest.fn(),
      save: jest.fn().mockResolvedValue(true),
    };

    mockProductInstance = {
      _id: mockProductId,
      name: "Test Shirt",
      slug: "test-shirt",
      price: 600,
      discountPrice: 500,
      stock: 10,
      status: "Active",
      sku: "TEST-SHRT",
    };

    mockVariantInstance = {
      _id: "6a15b5bc5f47fb73249602v1",
      parentProduct: mockProductId,
      name: "Test Shirt - Red/M",
      brand: "Loft Classic",
      price: 650,
      discountPrice: 550,
      stock: 5,
      status: "Active",
      sku: "TEST-SHRT-RED-M",
      size: "M",
      color: "Red",
    };

    mockCouponInstance = {
      _id: "6a15b5bc5f47fb73249602c1",
      code: "WELCOME100",
      status: "active",
      expiryDate: new Date(Date.now() + 1000000),
      discountType: "fixed",
      discountValue: 100,
      minimumOrderAmount: 400,
      usageLimit: 0,
      usedCount: 0,
      isValidCoupon: jest.fn().mockReturnValue(true),
      save: jest.fn().mockResolvedValue(true),
    };
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("getCart", () => {
    test("creates new cart if none exists", async () => {
      Cart.findOne.mockReturnValue(createMockQueryChain(null));
      Cart.create.mockResolvedValue(mockCartInstance);

      const cart = await cartService.getCart(mockUserId);
      expect(Cart.create).toHaveBeenCalledWith({ user: mockUserId, items: [] });
      expect(cart.totals.subtotal).toBe(0);
    });

    test("returns existing cart and calculates totals", async () => {
      mockCartInstance.items = [
        {
          product: mockProductId,
          name: "Test Shirt",
          quantity: 2,
          price: 500,
          finalPrice: 500,
          isAvailable: true,
        },
      ];

      Cart.findOne.mockReturnValue(createMockQueryChain(mockCartInstance));

      const cart = await cartService.getCart(mockUserId);
      expect(cart.totals.subtotal).toBe(1000);
      expect(cart.totals.grandTotal).toBe(1000 + 1000 * 0.18); // Subtotal=1000, Shipping=0, Tax=180, GT=1180
    });
  });

  describe("addToCart", () => {
    test("succeeds for standard active product", async () => {
      Product.findById.mockResolvedValue(mockProductInstance);
      Cart.findOne.mockResolvedValue(null);
      Cart.create.mockResolvedValue(mockCartInstance);

      const cart = await cartService.addToCart(mockUserId, {
        productId: mockProductId,
        quantity: 2,
      });

      expect(cart.items.length).toBe(1);
      expect(cart.items[0].finalPrice).toBe(500); // Uses discountPrice
      expect(cart.items[0].quantity).toBe(2);
      expect(cart.items[0].subtotal).toBe(1000);
    });

    test("succeeds for variant product", async () => {
      Product.findById.mockResolvedValue(mockProductInstance);
      Cart.findOne.mockResolvedValue(mockCartInstance);
      
      const mockVariantModel = mongoose.model("Variants");
      mockVariantModel.findOne.mockResolvedValue(mockVariantInstance);

      const cart = await cartService.addToCart(mockUserId, {
        productId: mockProductId,
        quantity: 2,
        size: "M",
        color: "Red",
      });

      expect(cart.items.length).toBe(1);
      expect(cart.items[0].finalPrice).toBe(550); // Uses variant discountPrice 550
      expect(cart.items[0].variant.toString()).toBe(mockVariantInstance._id);
      expect(cart.items[0].quantity).toBe(2);
    });

    test("fails if quantity exceeds available stock", async () => {
      Product.findById.mockResolvedValue(mockProductInstance);
      Cart.findOne.mockResolvedValue(mockCartInstance);

      await expect(
        cartService.addToCart(mockUserId, {
          productId: mockProductId,
          quantity: 20, // Only 10 available
        })
      ).rejects.toThrow(/Only 10 items available/);
    });

    test("fails if product is inactive", async () => {
      mockProductInstance.status = "Inactive";
      Product.findById.mockResolvedValue(mockProductInstance);

      await expect(
        cartService.addToCart(mockUserId, {
          productId: mockProductId,
          quantity: 1,
        })
      ).rejects.toThrow(/Product unavailable/);
    });
  });

  describe("updateQuantity", () => {
    test("updates item quantity and recalculates totals", async () => {
      mockCartInstance.items = [
        {
          product: mockProductId,
          name: "Test Shirt",
          quantity: 2,
          price: 600,
          finalPrice: 500,
          isAvailable: true,
        },
      ];

      Cart.findOne.mockResolvedValue(mockCartInstance);
      Product.findById.mockResolvedValue(mockProductInstance);

      const cart = await cartService.updateQuantity(mockUserId, mockProductId, 3);
      expect(cart.items[0].quantity).toBe(3);
      expect(cart.totals.subtotal).toBe(1500);
    });

    test("removes item if quantity is set to 0", async () => {
      mockCartInstance.items = [
        {
          product: mockProductId,
          name: "Test Shirt",
          quantity: 2,
          price: 600,
          finalPrice: 500,
          isAvailable: true,
        },
      ];

      Cart.findOne.mockResolvedValue(mockCartInstance);

      const cart = await cartService.updateQuantity(mockUserId, mockProductId, 0);
      expect(cart.items.length).toBe(0);
      expect(cart.totals.subtotal).toBe(0);
    });
  });

  describe("removeItem", () => {
    test("removes requested item", async () => {
      mockCartInstance.items = [
        {
          product: mockProductId,
          name: "Test Shirt",
          quantity: 2,
          price: 600,
          finalPrice: 500,
          isAvailable: true,
        },
      ];

      Cart.findOne.mockResolvedValue(mockCartInstance);

      const cart = await cartService.removeItem(mockUserId, mockProductId);
      expect(cart.items.length).toBe(0);
    });
  });

  describe("clearCart", () => {
    test("clears all items and resets totals", async () => {
      mockCartInstance.items = [{ product: mockProductId, quantity: 2, finalPrice: 500 }];
      mockCartInstance.coupon = "somecoupon";
      mockCartInstance.couponCode = "WELCOME100";

      Cart.findOne.mockResolvedValue(mockCartInstance);

      const cart = await cartService.clearCart(mockUserId);
      expect(cart.items.length).toBe(0);
      expect(cart.coupon).toBeNull();
      expect(cart.couponCode).toBeNull();
      expect(cart.totals.subtotal).toBe(0);
    });
  });

  describe("applyCoupon", () => {
    test("applies fixed discount coupon successfully", async () => {
      mockCartInstance.items = [
        {
          product: mockProductId,
          name: "Test Shirt",
          quantity: 2,
          price: 600,
          finalPrice: 500,
          isAvailable: true,
        },
      ];

      Cart.findOne.mockResolvedValue(mockCartInstance);
      Coupon.findOne.mockResolvedValue(mockCouponInstance);

      const cart = await cartService.applyCoupon(mockUserId, "WELCOME100");
      expect(cart.coupon.toString()).toBe(mockCouponInstance._id);
      expect(cart.couponCode).toBe("WELCOME100");
      expect(cart.totals.discount).toBe(100);
      expect(cart.totals.grandTotal).toBeCloseTo((1000 - 100) * 1.18 + 99, 2); // (1000-100) + 18% tax + 99 shipping
    });

    test("fails if cart subtotal is less than minimumOrderAmount", async () => {
      mockCartInstance.items = [
        {
          product: mockProductId,
          name: "Test Shirt",
          quantity: 1,
          price: 300,
          finalPrice: 300,
          isAvailable: true,
        },
      ]; // subtotal 300, coupon min order is 400

      Cart.findOne.mockResolvedValue(mockCartInstance);
      Coupon.findOne.mockResolvedValue(mockCouponInstance);

      await expect(
        cartService.applyCoupon(mockUserId, "WELCOME100")
      ).rejects.toThrow(/Minimum order amount should be/);
    });

    test("fails if coupon is expired or inactive", async () => {
      mockCouponInstance.isValidCoupon.mockReturnValue(false);
      mockCartInstance.items = [{ product: mockProductId, finalPrice: 500, quantity: 1 }];

      Cart.findOne.mockResolvedValue(mockCartInstance);
      Coupon.findOne.mockResolvedValue(mockCouponInstance);

      await expect(
        cartService.applyCoupon(mockUserId, "WELCOME100")
      ).rejects.toThrow(/Coupon invalid or expired/);
    });
  });
});
