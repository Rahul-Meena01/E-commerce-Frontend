import express from "express";
import Address from "../models/Address.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

router.use(protect);

router.get("/", async (req, res) => {
  try {
    const addresses = await Address.find({ user: req.user.id });
    res.json({ success: true, addresses });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server error" });
  }
});

router.post("/", async (req, res) => {
  try {
    const { title, address, city, postalCode, country } = req.body;
    const newAddress = await Address.create({
      user: req.user.id,
      title,
      address,
      city,
      postalCode,
      country,
    });
    res.status(201).json({ success: true, address: newAddress });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server error" });
  }
});

router.put("/:id", async (req, res) => {
  try {
    const { title, address, city, postalCode, country } = req.body;
    const updatedAddress = await Address.findOneAndUpdate(
      { _id: req.params.id, user: req.user.id },
      { title, address, city, postalCode, country },
      { new: true }
    );
    if (!updatedAddress) {
      return res.status(404).json({ success: false, message: "Address not found" });
    }
    res.json({ success: true, address: updatedAddress });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server error" });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const deletedAddress = await Address.findOneAndDelete({
      _id: req.params.id,
      user: req.user.id,
    });
    if (!deletedAddress) {
      return res.status(404).json({ success: false, message: "Address not found" });
    }
    res.json({ success: true, message: "Address deleted" });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server error" });
  }
});

export default router;
