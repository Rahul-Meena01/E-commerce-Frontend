/*
 * routes/addresses.js
 *
 * CRUD API for authenticated user's saved addresses.
 */
import express from "express";
import mongoose from "mongoose";
import User from "../models/User.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);

// GET /api/addresses - list addresses for current user
router.get("/", protect, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("addresses");
    if (!user)
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    return res.json({ success: true, addresses: user.addresses || [] });
  } catch (err) {
    console.error("addresses#get error:", err);
    return res
      .status(500)
      .json({ success: false, message: "Internal server error" });
  }
});

// POST /api/addresses - add a new address
router.post("/", protect, async (req, res) => {
  try {
    const { title, address, city, postalCode, country, isDefault } = req.body;

    const user = await User.findById(req.user.id);
    if (!user)
      return res
        .status(404)
        .json({ success: false, message: "User not found" });

    // If making this address default, clear previous default
    if (isDefault) {
      user.addresses.forEach((a) => (a.isDefault = false));
    }

    const newAddr = {
      title,
      address,
      city,
      postalCode,
      country,
      isDefault: !!isDefault,
    };
    user.addresses.push(newAddr);
    await user.save();

    return res
      .status(201)
      .json({
        success: true,
        address: user.addresses[user.addresses.length - 1],
      });
  } catch (err) {
    console.error("addresses#post error:", err);
    return res
      .status(500)
      .json({ success: false, message: "Internal server error" });
  }
});

// PUT /api/addresses/:id - update an address
router.put("/:id", protect, async (req, res) => {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id))
      return res
        .status(400)
        .json({ success: false, message: "Invalid address id" });

    const { title, address, city, postalCode, country, isDefault } = req.body;

    const user = await User.findById(req.user.id);
    if (!user)
      return res
        .status(404)
        .json({ success: false, message: "User not found" });

    const addr = user.addresses.id(id);
    if (!addr)
      return res
        .status(404)
        .json({ success: false, message: "Address not found" });

    if (isDefault) user.addresses.forEach((a) => (a.isDefault = false));

    addr.title = title !== undefined ? title : addr.title;
    addr.address = address !== undefined ? address : addr.address;
    addr.city = city !== undefined ? city : addr.city;
    addr.postalCode = postalCode !== undefined ? postalCode : addr.postalCode;
    addr.country = country !== undefined ? country : addr.country;
    if (isDefault !== undefined) addr.isDefault = !!isDefault;

    await user.save();

    return res.json({ success: true, address: addr });
  } catch (err) {
    console.error("addresses#put error:", err);
    return res
      .status(500)
      .json({ success: false, message: "Internal server error" });
  }
});

// DELETE /api/addresses/:id - remove an address
router.delete("/:id", protect, async (req, res) => {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id))
      return res
        .status(400)
        .json({ success: false, message: "Invalid address id" });

    const user = await User.findById(req.user.id);
    if (!user)
      return res
        .status(404)
        .json({ success: false, message: "User not found" });

    const addr = user.addresses.id(id);
    if (!addr)
      return res
        .status(404)
        .json({ success: false, message: "Address not found" });

    addr.remove();
    await user.save();

    return res.json({ success: true, message: "Address removed" });
  } catch (err) {
    console.error("addresses#delete error:", err);
    return res
      .status(500)
      .json({ success: false, message: "Internal server error" });
  }
});

export default router;
