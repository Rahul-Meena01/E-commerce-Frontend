import express from "express";
import {
  getWishlist,
  addToWishlist,
  removeFromWishlist,
  clearWishlist,
} from "../controllers/wishlistController.js";
import { validate } from "../middleware/validate.js";
import { wishlistSchema } from "../middleware/schemas.js";

const router = express.Router();

router.get("/", getWishlist);
router.post("/add", validate(wishlistSchema), addToWishlist);
router.delete("/remove/:productId", removeFromWishlist);
router.delete("/clear", clearWishlist);

export default router;
