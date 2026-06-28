import { z } from "zod";

export const registerSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email"),
  password: z.string().min(6, "Password must be at least 6 characters")
});



export const registerVendorSchema = registerSchema.extend({
  shopName: z.string().min(1, "Shop name is required"),
  phone: z.string().min(1, "Phone is required")
});

export const loginSchema = z.object({
  email: z.string().email("Invalid email"),
  password: z.string().min(1, "Password is required")
});

export const productSchema = z.object({
  name: z.string().min(1, "Name is required"),
  price: z.number().positive("Price must be positive"),
  stock_qty: z.number().int().nonnegative("Stock quantity must be non-negative").default(0),
  category: z.string().min(1, "Category is required"),
  subCategory: z.string().optional(),
  description: z.string().optional()
}).passthrough(); // Allow other fields for now

export const orderSchema = z.object({
  orderItems: z.array(z.object({
    product: z.string(),
    qty: z.number().int().positive()
  })).min(1, "Order must have at least one item"),
  shippingAddress: z.any().optional(),
  paymentMethod: z.string().optional()
}).passthrough();

export const wishlistSchema = z.object({
  productId: z.string().regex(/^[0-9a-fA-F]{24}$/, "Invalid ObjectId")
});

export const couponSchema = z.object({
  code: z.string().min(1, "Code is required"),
  discountType: z.enum(["flat", "percent", "percentage", "fixed"]),
  discountValue: z.number().positive(),
  maxUsesPerUser: z.number().int().positive().optional(),
  expiresAt: z.string().optional()
}).passthrough();
