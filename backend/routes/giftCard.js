/*
 * Handover note: Gift card API.
 * Admin endpoints create, list, update, and delete gift cards with uniqueness checks around gift card codes.
 */
import express from "express";
import GiftCard from "../models/GiftCard.js";

import { protect, admin } from "../middleware/authMiddleware.js";

const router = express.Router();

// VERIFY GIFT CARD (Public verification)
router.post("/verify", async (req, res) => {
  try {
    const { code } = req.body;

    if (!code) {
      return res
        .status(400)
        .json({ success: false, message: "Gift Card code is required" });
    }

    const giftCard = await GiftCard.findOne({ code: code.toUpperCase() });

    if (!giftCard) {
      return res
        .status(404)
        .json({ success: false, message: "Gift card code not found or invalid." });
    }

    // Validate status
    if (giftCard.status === "inactive" || giftCard.balance <= 0) {
      return res
        .status(400)
        .json({ success: false, message: "This gift card has already been used." });
    }

    if (giftCard.status === "expired" || giftCard.expiryDate < new Date()) {
      return res
        .status(400)
        .json({ success: false, message: "This gift card has expired." });
    }

    if (giftCard.status !== "active") {
      return res
        .status(400)
        .json({ success: false, message: "This gift card is not active." });
    }

    res.status(200).json({
      valid: true,
      amount: giftCard.balance,
      message: "Gift card applied successfully",
    });
  } catch (error) {
    console.error("Error verifying gift card:", error);
    res.status(500).json({ success: false, message: "Server error while verifying gift card" });
  }
});

// CREATE GIFT CARD
router.post("/create", protect, admin, async (req, res) => {
  try {
    const {
      receiverName,
      senderName,
      code,
      giftCardValue,
      expiryDate,
      description,
      status,
    } = req.body;

    // VALIDATION
    if (
      !receiverName ||
      !senderName ||
      !code ||
      !giftCardValue ||
      !expiryDate
    ) {
      return res.status(400).json({
        success: false,
        message: "All required fields must be filled",
      });
    }

    // CHECK EXPIRY DATE
    if (new Date(expiryDate) < new Date()) {
      return res.status(400).json({
        success: false,
        message: "Expiry date must be a future date",
      });
    }

    // CHECK EXISTING CODE
    const existingGiftCard = await GiftCard.findOne({
      code: code.toUpperCase(),
    });

    if (existingGiftCard) {
      return res.status(400).json({
        success: false,
        message: "Gift card code already exists",
      });
    }

    // CREATE NEW CARD
    const newGiftCard = new GiftCard({
      receiverName,
      senderName,
      code: code.toUpperCase(),
      giftCardValue,
      expiryDate,
      description,
      status: status || "active",
    });

    await newGiftCard.save();

    res.status(201).json({
      success: true,
      message: "Gift card created successfully",
      data: newGiftCard,
    });
  } catch (error) {
    console.error("Error creating gift card:", error);

    res.status(500).json({
      success: false,
      message: "Server error while creating gift card",
    });
  }
});

// GET USER'S OWN ACTIVE GIFT CARDS
router.get("/my", protect, async (req, res) => {
  try {
    const userName = req.user.name;
    if (!userName) {
      return res.status(400).json({
        success: false,
        message: "User profile name not set",
      });
    }

    // Find all gift cards where receiverName matches user name (case-insensitive)
    const giftCards = await GiftCard.find({
      receiverName: { $regex: new RegExp(`^${userName.trim()}$`, "i") }
    }).sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      data: giftCards,
    });
  } catch (error) {
    console.error("Error fetching user's own active gift cards:", error);
    res.status(500).json({
      success: false,
      message: "Server error while fetching your active gift cards",
    });
  }
});

// GET ALL GIFT CARDS
router.get("/list", protect, admin, async (req, res) => {
  try {
    // SEARCH
    const search = req.query.search || "";

    // FILTER
    const status = req.query.status || "";

    // PAGINATION
    const page = parseInt(req.query.page) || 1;
    const limit = 10;

    const query = {};

    // SEARCH LOGIC
    if (search) {
      query.$or = [
        {
          receiverName: {
            $regex: search,
            $options: "i",
          },
        },
        {
          senderName: {
            $regex: search,
            $options: "i",
          },
        },
        {
          code: {
            $regex: search,
            $options: "i",
          },
        },
      ];
    }

    // FILTER LOGIC
    if (status) {
      query.status = status;
    }

    // TOTAL DOCUMENTS
    const totalGiftCards = await GiftCard.countDocuments(query);

    // FETCH DATA
    const giftCards = await GiftCard.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    res.status(200).json({
      success: true,
      message: "Gift cards fetched successfully",

      totalGiftCards,
      currentPage: page,
      totalPages: Math.ceil(totalGiftCards / limit),

      data: giftCards,
    });
  } catch (error) {
    console.error("Error fetching gift cards:", error);

    res.status(500).json({
      success: false,
      message: "Server error while fetching gift cards",
    });
  }
});

// GET SINGLE GIFT CARD
router.get("/single/:id", protect, admin, async (req, res) => {
  try {
    const { id } = req.params;

    const giftCard = await GiftCard.findById(id);

    if (!giftCard) {
      return res.status(404).json({
        success: false,
        message: "Gift card not found",
      });
    }

    res.status(200).json({
      success: true,
      data: giftCard,
    });
  } catch (error) {
    console.error("Error fetching single gift card:", error);

    res.status(500).json({
      success: false,
      message: "Server error while fetching gift card",
    });
  }
});

// UPDATE GIFT CARD
router.put("/update/:id", protect, admin, async (req, res) => {
  try {
    const { id } = req.params;

    const {
      receiverName,
      senderName,
      code,
      giftCardValue,
      expiryDate,
      description,
      status,
    } = req.body;

    const giftCard = await GiftCard.findById(id);

    if (!giftCard) {
      return res.status(404).json({
        success: false,
        message: "Gift card not found",
      });
    }

    // CHECK DUPLICATE CODE
    if (code && code.toUpperCase() !== giftCard.code) {
      const existingGiftCard = await GiftCard.findOne({
        code: code.toUpperCase(),
      });

      if (existingGiftCard) {
        return res.status(400).json({
          success: false,
          message: "Gift card code already exists",
        });
      }
    }

    // CHECK EXPIRY DATE
    if (expiryDate && new Date(expiryDate) < new Date()) {
      return res.status(400).json({
        success: false,
        message: "Expiry date must be a future date",
      });
    }

    // UPDATE FIELDS
    giftCard.receiverName = receiverName ?? giftCard.receiverName;

    giftCard.senderName = senderName ?? giftCard.senderName;

    giftCard.code = code ? code.toUpperCase() : giftCard.code;

    giftCard.giftCardValue = giftCardValue ?? giftCard.giftCardValue;

    giftCard.expiryDate = expiryDate ?? giftCard.expiryDate;

    giftCard.description = description ?? giftCard.description;

    giftCard.status = status ?? giftCard.status;

    await giftCard.save();

    res.status(200).json({
      success: true,
      message: "Gift card updated successfully",
      data: giftCard,
    });
  } catch (error) {
    console.error("Error updating gift card:", error);

    res.status(500).json({
      success: false,
      message: "Server error while updating gift card",
    });
  }
});

// DELETE GIFT CARD
router.delete("/delete/:id", protect, admin, async (req, res) => {
  try {
    const { id } = req.params;

    const giftCard = await GiftCard.findById(id);

    if (!giftCard) {
      return res.status(404).json({
        success: false,
        message: "Gift card not found",
      });
    }

    await GiftCard.findByIdAndDelete(id);

    res.status(200).json({
      success: true,
      message: "Gift card deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting gift card:", error);

    res.status(500).json({
      success: false,
      message: "Server error while deleting gift card",
    });
  }
});

// module.exports = router;
export default router;
