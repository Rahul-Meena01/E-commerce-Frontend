import { jest } from "@jest/globals";

// Mock express
const mockRouter = {
  get: jest.fn(),
  post: jest.fn(),
};

jest.unstable_mockModule("express", () => {
  return {
    default: {
      Router: jest.fn().mockReturnValue(mockRouter),
    },
  };
});

// Mock Models
jest.unstable_mockModule("../models/Wishlist.js", () => {
  return {
    default: {
      findOne: jest.fn(),
      create: jest.fn(),
      findById: jest.fn(),
    },
  };
});

jest.unstable_mockModule("../models/Product.js", () => {
  return {
    default: {},
  };
});

jest.unstable_mockModule("../models/Variant.js", () => {
  return {
    default: {},
  };
});

// Mock protect middleware
jest.unstable_mockModule("../middleware/authMiddleware.js", () => {
  return {
    protect: (req, res, next) => next(),
  };
});

// Dynamically import wishlist router and models
const { default: Wishlist } = await import("../models/Wishlist.js");
const { default: wishlistRouter } = await import("../routes/wishlist.js");

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

describe("wishlistRouter", () => {
  let getHandler;
  let toggleHandler;
  let mergeHandler;

  const mockUserId = "6a15b5bc5f47fb7324960299";
  const mockProductId = "6a15b5bc5f47fb73249602a1";
  const mockVariantId = "6a15b5bc5f47fb73249602v1";

  beforeAll(() => {
    // Retrieve handlers from mocks
    const getCalls = mockRouter.get.mock.calls;
    const postCalls = mockRouter.post.mock.calls;

    // Find the handlers registered
    // get("/", protect, async ...)
    const getCall = getCalls.find(call => call[0] === "/");
    if (getCall) getHandler = getCall[getCall.length - 1];

    // post("/toggle", protect, async ...)
    const toggleCall = postCalls.find(call => call[0] === "/toggle");
    if (toggleCall) toggleHandler = toggleCall[toggleCall.length - 1];

    // post("/merge", protect, async ...)
    const mergeCall = postCalls.find(call => call[0] === "/merge");
    if (mergeCall) mergeHandler = mergeCall[mergeCall.length - 1];
  });

  let mockReq;
  let mockRes;

  beforeEach(() => {
    mockReq = {
      user: { _id: mockUserId },
      body: {},
    };

    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("GET /", () => {
    test("returns existing wishlist items", async () => {
      const mockWishlist = {
        user: mockUserId,
        items: [
          { product: mockProductId, variant: null, size: "", color: "" }
        ]
      };

      Wishlist.findOne.mockReturnValue(createMockQueryChain(mockWishlist));

      await getHandler(mockReq, mockRes);

      expect(Wishlist.findOne).toHaveBeenCalledWith({ user: mockUserId });
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        message: "Wishlist fetched successfully",
        data: mockWishlist.items,
      });
    });

    test("creates new wishlist if none exists", async () => {
      const mockNewWishlist = {
        user: mockUserId,
        items: []
      };

      Wishlist.findOne.mockReturnValue(createMockQueryChain(null));
      Wishlist.create.mockResolvedValue(mockNewWishlist);

      await getHandler(mockReq, mockRes);

      expect(Wishlist.create).toHaveBeenCalledWith({ user: mockUserId, items: [] });
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        message: "Wishlist fetched successfully",
        data: [],
      });
    });
  });

  describe("POST /toggle", () => {
    test("adds item to wishlist if not already present", async () => {
      mockReq.body = { productId: mockProductId, size: "L" };
      const mockWishlist = {
        user: mockUserId,
        items: [],
        save: jest.fn().mockResolvedValue(true),
      };

      Wishlist.findOne.mockResolvedValue(mockWishlist);
      
      const mockPopulatedWishlist = {
        _id: "some_id",
        items: [{ product: mockProductId, variant: null, size: "L", color: "" }],
      };
      Wishlist.findById.mockReturnValue(createMockQueryChain(mockPopulatedWishlist));

      await toggleHandler(mockReq, mockRes);

      expect(mockWishlist.items.length).toBe(1);
      expect(mockWishlist.items[0].product).toBe(mockProductId);
      expect(mockWishlist.items[0].size).toBe("L");
      expect(mockWishlist.save).toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        message: "Item added to wishlist",
        data: mockPopulatedWishlist.items,
        action: "added",
      });
    });

    test("removes item from wishlist if already present", async () => {
      mockReq.body = { productId: mockProductId, size: "L" };
      const mockWishlist = {
        user: mockUserId,
        items: [
          {
            product: mockProductId,
            variant: null,
            size: "L",
            color: "",
            toString: () => mockProductId,
          }
        ],
        save: jest.fn().mockResolvedValue(true),
      };

      Wishlist.findOne.mockResolvedValue(mockWishlist);

      const mockPopulatedWishlist = {
        _id: "some_id",
        items: [],
      };
      Wishlist.findById.mockReturnValue(createMockQueryChain(mockPopulatedWishlist));

      await toggleHandler(mockReq, mockRes);

      expect(mockWishlist.items.length).toBe(0);
      expect(mockWishlist.save).toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        message: "Item removed from wishlist",
        data: [],
        action: "removed",
      });
    });
  });

  describe("POST /merge", () => {
    test("merges guest wishlist items without duplication", async () => {
      mockReq.body = {
        items: [
          { product: mockProductId, variant: null, size: "M", color: "Blue" },
          { product: "another_prod", variant: null, size: "S", color: "Red" }
        ],
      };

      const mockWishlist = {
        user: mockUserId,
        items: [
          {
            product: mockProductId,
            variant: null,
            size: "M",
            color: "Blue",
            toString: () => mockProductId,
          }
        ],
        save: jest.fn().mockResolvedValue(true),
      };

      Wishlist.findOne.mockResolvedValue(mockWishlist);

      const mockPopulatedWishlist = {
        _id: "some_id",
        items: [
          { product: mockProductId, variant: null, size: "M", color: "Blue" },
          { product: "another_prod", variant: null, size: "S", color: "Red" }
        ],
      };
      Wishlist.findById.mockReturnValue(createMockQueryChain(mockPopulatedWishlist));

      await mergeHandler(mockReq, mockRes);

      // Should only add the new one, since mockProductId/M/Blue is already present
      expect(mockWishlist.items.length).toBe(2);
      expect(mockWishlist.save).toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        message: "Wishlist merged successfully",
        data: mockPopulatedWishlist.items,
      });
    });
  });
});
