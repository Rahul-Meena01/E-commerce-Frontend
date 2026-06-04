import { jest } from "@jest/globals";
import bcrypt from "bcryptjs";

// Mock User Model BEFORE importing authService
jest.unstable_mockModule("../models/User.js", () => {
  return {
    default: {
      findOne: jest.fn(),
      findById: jest.fn(),
    },
  };
});

// Import mock User and authService dynamically after mocking
const { default: User } = await import("../models/User.js");
const authService = await import("../modules/auth/auth.service.js");

describe("authService", () => {
  const mockPassword = "testpassword123";
  let hashedPassword;

  beforeAll(async () => {
    hashedPassword = await bcrypt.hash(mockPassword, 10);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("loginUser", () => {
    test("succeeds with correct credentials", async () => {
      const mockUser = {
        _id: "6a15b5bc5f47fb7324960201",
        name: "Test User",
        email: "test@example.com",
        password: hashedPassword,
        phone: "9876543210",
        role: "user",
      };

      User.findOne.mockResolvedValue(mockUser);

      const result = await authService.loginUser({
        email: "test@example.com",
        password: mockPassword,
      });

      expect(result.token).toBeDefined();
      expect(result.userObject.email).toBe("test@example.com");
      expect(User.findOne).toHaveBeenCalledWith({ email: "test@example.com" });
    });

    test("fails with non-existent user email", async () => {
      User.findOne.mockResolvedValue(null);

      await expect(
        authService.loginUser({
          email: "unknown@example.com",
          password: mockPassword,
        })
      ).rejects.toThrow("Invalid credentials");
    });

    test("fails with incorrect password", async () => {
      const mockUser = {
        _id: "6a15b5bc5f47fb7324960201",
        name: "Test User",
        email: "test@example.com",
        password: hashedPassword,
        phone: "9876543210",
        role: "user",
      };

      User.findOne.mockResolvedValue(mockUser);

      await expect(
        authService.loginUser({
          email: "test@example.com",
          password: "wrongpassword",
        })
      ).rejects.toThrow("Invalid credentials");
    });
  });
});
