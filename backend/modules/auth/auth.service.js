// backend/modules/auth/auth.service.js
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import slugify from "slugify";
import mongoose from "mongoose";
import User from "../../models/User.js";
import Vendor from "../../models/VendorSchema.js";
import env from "../../config/env.js";

const formatUserObject = (user) => {
  if (!user) return null;
  return {
    id: user._id,
    name: user.name,
    email: user.email,
    phone: user.phone,
    role: user.role,
    location: user.location || "",
    bio: user.bio || "",
    profileImage: user.profileImage || "",
    address: user.address || "",
    city: user.city || "",
    pincode: user.pincode || "",
    vendorSlug: user.vendorProfile?.slug || null,
  };
};

export const registerUser = async ({ name, email, password, phone, adminSecret }) => {
  if (typeof name !== "string" || typeof email !== "string" || typeof password !== "string") {
    throw Object.assign(new Error("Name, email, and password must be strings"), { statusCode: 400 });
  }

  if (!name.trim() || !email.trim() || !password) {
    throw Object.assign(new Error("Name, email, and password are required"), { statusCode: 400 });
  }

  if (password.length < 6) {
    throw Object.assign(new Error("Password must be at least 6 characters"), { statusCode: 400 });
  }

  let role = "user";
  if (adminSecret !== undefined && adminSecret !== null && adminSecret !== "") {
    if (adminSecret !== env.ADMIN_SECRET) {
      throw Object.assign(new Error("Invalid secret key"), { statusCode: 403 });
    }
    role = "admin";
  }

  const normalizedEmail = email.trim().toLowerCase();
  const existingUser = await User.findOne({ email: normalizedEmail });

  if (existingUser) {
    throw Object.assign(new Error("Email is already registered"), { statusCode: 400 });
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  const newUser = new User({
    name: name.trim(),
    email: normalizedEmail,
    password: hashedPassword,
    phone: phone?.trim() || "",
    role,
  });

  await newUser.save();

  const token = jwt.sign({ id: newUser._id, role: newUser.role }, env.JWT_SECRET, {
    expiresIn: "7d",
  });

  return {
    userId: newUser._id,
    token,
    userObject: formatUserObject(newUser),
  };
};

export const loginUser = async ({ email, password }) => {
  if (typeof email !== "string" || typeof password !== "string") {
    throw Object.assign(new Error("Email and password must be strings"), { statusCode: 400 });
  }

  if (!email.trim() || !password) {
    throw Object.assign(new Error("Email and password are required"), { statusCode: 400 });
  }

  let user = await User.findOne({ email: email.trim().toLowerCase() });

  if (!user) {
    throw Object.assign(new Error("Invalid credentials"), { statusCode: 401 });
  }

  if (user.role === "vendor") {
    user = await user.populate("vendorProfile", "slug status shopName");
  }

  const isPasswordValid = await bcrypt.compare(password, user.password);

  if (!isPasswordValid) {
    throw Object.assign(new Error("Invalid credentials"), { statusCode: 401 });
  }

  if (user.role === "vendor") {
    const vendor = user.vendorProfile;
    if (!vendor) {
      throw Object.assign(new Error("Vendor profile not found. Contact support."), { statusCode: 403 });
    }
    if (vendor.status === "pending") {
      throw Object.assign(new Error("Your vendor account is pending approval."), { statusCode: 403 });
    }
    if (vendor.status === "suspended") {
      throw Object.assign(new Error("Your vendor account has been suspended. Contact support."), { statusCode: 403 });
    }
  }

  const token = jwt.sign({ id: user._id, role: user.role }, env.JWT_SECRET, {
    expiresIn: "7d",
  });

  return {
    token,
    userObject: formatUserObject(user),
  };
};

export const logoutUser = async () => {
  return { success: true };
};

export const getUserProfile = async (userId) => {
  const user = await User.findById(userId);
  if (!user) {
    throw Object.assign(new Error("User not found"), { statusCode: 404 });
  }
  return formatUserObject(user);
};

export const updateUserProfile = async (userId, updateData) => {
  const user = await User.findById(userId);
  if (!user) {
    throw Object.assign(new Error("User not found"), { statusCode: 404 });
  }

  const { name, email, phone, location, bio, image } = updateData;

  if (name !== undefined) user.name = name;
  if (phone !== undefined) user.phone = phone;
  if (location !== undefined) user.location = location;
  if (bio !== undefined) user.bio = bio;
  if (image !== undefined) user.profileImage = image;

  if (email !== undefined && email !== null) {
    const normalizedEmail = email.trim().toLowerCase();
    if (normalizedEmail !== user.email) {
      const existingUser = await User.findOne({ email: normalizedEmail });
      if (existingUser) {
        throw Object.assign(new Error("Email is already in use"), { statusCode: 400 });
      }
      user.email = normalizedEmail;
    }
  }

  await user.save();
  return formatUserObject(user);
};

const generateUniqueSlug = async (shopName) => {
  const base = slugify(shopName, { lower: true, strict: true });
  const exists = await Vendor.findOne({ slug: base });
  if (!exists) return base;
  const suffix = Math.random().toString(16).slice(2, 6);
  return `${base}-${suffix}`;
};

export const registerVendorUser = async ({ name, email, password, phone, shopName }) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    if (
      typeof name !== "string" ||
      typeof email !== "string" ||
      typeof password !== "string" ||
      typeof shopName !== "string"
    ) {
      throw Object.assign(new Error("Name, email, password, and shop name must be strings"), { statusCode: 400 });
    }

    if (!name.trim() || !email.trim() || !password || !shopName.trim()) {
      throw Object.assign(new Error("Name, email, password, and shop name are required"), { statusCode: 400 });
    }

    if (password.length < 6) {
      throw Object.assign(new Error("Password must be at least 6 characters"), { statusCode: 400 });
    }

    if (!phone?.trim()) {
      throw Object.assign(new Error("Phone number is required for vendors"), { statusCode: 400 });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const existingUser = await User.findOne({ email: normalizedEmail }).session(session);
    if (existingUser) {
      throw Object.assign(new Error("Email is already registered"), { statusCode: 400 });
    }

    // 1. Create User (role: vendor)
    const hashedPassword = await bcrypt.hash(password, 10);
    const [user] = await User.create(
      [
        {
          name: name.trim(),
          email: normalizedEmail,
          password: hashedPassword,
          phone: phone.trim(),
          role: "vendor",
        },
      ],
      { session }
    );

    // 2. Create Vendor Profile
    const slug = await generateUniqueSlug(shopName.trim());
    const [vendor] = await Vendor.create(
      [
        {
          user: user._id,
          shopName: shopName.trim(),
          slug,
          status: "pending", // admin must approve before vendor can log in
        },
      ],
      { session }
    );

    // 3. Back-link User -> Vendor
    user.vendorProfile = vendor._id;
    await user.save({ session });

    await session.commitTransaction();

    return {
      vendorObject: {
        shopName: vendor.shopName,
        slug: vendor.slug,
        status: vendor.status,
      },
    };
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
};
