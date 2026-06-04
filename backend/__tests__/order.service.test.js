import { jest } from "@jest/globals";

// Mock mongoose
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

// Mock Models
jest.unstable_mockModule("../models/Order.js", () => {
  return {
    default: {
      create: jest.fn(),
    },
  };
});

jest.unstable_mockModule("../models/Product.js", () => {
  return {
    default: {
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

// Mock email service to avoid network calls during tests
jest.unstable_mockModule("../utils/emailService.js", () => {
  return {
    sendOrderConfirmationEmail: jest.fn().mockResolvedValue(true),
  };
});

// Dynamically import models and service
const { default: mongoose } = await import("mongoose");
const { default: Cart } = await import("../models/Cart.js");
const { default: Product } = await import("../models/Product.js");
const { default: Order } = await import("../models/Order.js");
const orderService = await import("../modules/order/order.service.js");

// Helper to create mock Mongoose query chains that resolve when awaited
const createMockQueryChain = (resolvedValue) => {
  const query = {
    populate: jest.fn().mockReturnThis(),
    then: jest.fn().mockImplementation((onFulfilled) => {
      return Promise.resolve(resolvedValue).then(onFulfilled);
    }),
  };
  return query;
};

describe("orderService", () => {
  const mockUser = {
    _id: "6a15b5bc5f47fb7324960299",
    email: "buyer@example.com",
    name: "Buyer",
  };

  const mockShippingAddress = {
    address: "123 Main St",
    city: "Metro",
    postalCode: "12345",
    country: "Nation",
  };

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("createOrder", () => {
    test("succeeds when stock is sufficient", async () => {
      const mockCart = {
        user: mockUser._id,
        coupon: null,
        couponCode: null,
        items: [
          {
            name: "Product A",
            product: {
              _id: "6a15b5bc5f47fb73249602a1",
              name: "Product A",
              stock: 10,
              status: "Active",
              price: 100,
            },
            variant: null,
            quantity: 2,
            price: 100,
            finalPrice: 100,
          },
        ],
      };

      const queryMock = createMockQueryChain(mockCart);
      Cart.findOne.mockReturnValue(queryMock);

      Order.create.mockResolvedValue([{
        _id: "6a15b5bc5f47fb73249602a9",
        toObject: () => ({ _id: "6a15b5bc5f47fb73249602a9", orderStatus: "Pending" }),
      }]);

      const result = await orderService.createOrder(mockUser, {
        shippingAddress: mockShippingAddress,
        paymentMethod: "COD",
        shippingMethod: "standard",
      });

      expect(result.shortId).toBeDefined();
      expect(mockSession.commitTransaction).toHaveBeenCalled();
    });

    test("fails when requested quantity exceeds product stock", async () => {
      const mockCart = {
        user: mockUser._id,
        coupon: null,
        couponCode: null,
        items: [
          {
            name: "Product A",
            product: {
              _id: "6a15b5bc5f47fb73249602a1",
              name: "Product A",
              stock: 1, // Available stock is 1
              status: "Active",
              price: 100,
            },
            variant: null,
            quantity: 5, // Requesting 5
            price: 100,
            finalPrice: 100,
          },
        ],
      };

      const queryMock = createMockQueryChain(mockCart);
      Cart.findOne.mockReturnValue(queryMock);

      await expect(
        orderService.createOrder(mockUser, {
          shippingAddress: mockShippingAddress,
          paymentMethod: "COD",
          shippingMethod: "standard",
        })
      ).rejects.toThrow(/Insufficient stock for product "Product A"/);

      expect(mockSession.commitTransaction).not.toHaveBeenCalled();
    });

    test("fails when requested quantity exceeds variant stock", async () => {
      const mockCart = {
        user: mockUser._id,
        coupon: null,
        couponCode: null,
        items: [
          {
            name: "Product A",
            product: {
              _id: "6a15b5bc5f47fb73249602a1",
              name: "Product A",
              stock: 10,
              status: "Active",
              price: 100,
            },
            variant: {
              _id: "6a15b5bc5f47fb73249602v1",
              stock: 2, // Available variant stock is 2
              status: "Active",
              size: "M",
              color: "Black",
            },
            size: "M",
            color: "Black",
            quantity: 5, // Requesting 5
            price: 100,
            finalPrice: 100,
          },
        ],
      };

      const queryMock = createMockQueryChain(mockCart);
      Cart.findOne.mockReturnValue(queryMock);

      await expect(
        orderService.createOrder(mockUser, {
          shippingAddress: mockShippingAddress,
          paymentMethod: "COD",
          shippingMethod: "standard",
        })
      ).rejects.toThrow(/Insufficient stock for product "Product A" \(M\/Black\)/);
    });
  });
});
