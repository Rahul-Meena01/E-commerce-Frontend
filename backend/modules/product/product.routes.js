// backend/modules/product/product.routes.js
import express from "express";
import * as productController from "./product.controller.js";
import upload from "../../middleware/upload.js";
import { protect, admin } from "../../middleware/authMiddleware.js";

const router = express.Router();

const cpUpload = upload.fields([
  { name: "image", maxCount: 1 },
  { name: "image1", maxCount: 1 },
  { name: "image2", maxCount: 1 },
  { name: "image3", maxCount: 1 },
  { name: "image4", maxCount: 1 },
]);

router.post("/create", protect, admin, cpUpload, productController.createProduct);
router.get("/all", protect, admin, productController.getAllProductsAdmin);
router.get("/search", productController.searchPublicProducts);
router.get("/", productController.getPublicProducts);
router.get("/public/all", productController.getPublicAllProducts);
router.get("/public/:id", productController.getProductByIdOrSlug);
router.put("/update/:id", protect, admin, cpUpload, productController.updateProduct);
router.delete("/delete/:id", protect, admin, productController.deleteProduct);

export default router;
