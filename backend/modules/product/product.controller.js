// backend/modules/product/product.controller.js
import * as productService from "./product.service.js";
import asyncHandler from "../../utils/asyncHandler.js";

const getImagePath = (files, field) => {
  if (files && files[field] && files[field][0] && files[field][0].filename) {
    return `/uploads/${files[field][0].filename}`;
  }
  return null;
};

export const createProduct = asyncHandler(async (req, res) => {
  const {
    subCategory,
    name,
    brand,
    price,
    discountPrice,
    discountPercent,
    stock,
    slug,
    status,
  } = req.body;

  const payload = {
    subCategory,
    name,
    brand,
    price,
    discountPrice,
    discountPercent,
    stock,
    slug,
    status,
    image: getImagePath(req.files, "image") || req.body.image || null,
    image1: getImagePath(req.files, "image1") || req.body.image1 || null,
    image2: getImagePath(req.files, "image2") || req.body.image2 || null,
    image3: getImagePath(req.files, "image3") || req.body.image3 || null,
    image4: getImagePath(req.files, "image4") || req.body.image4 || null,
  };

  const product = await productService.createProduct(payload);

  return res.status(201).json({
    success: true,
    message: "Product created successfully",
    data: product,
  });
});

export const getAllProductsAdmin = asyncHandler(async (req, res) => {
  const { total, data } = await productService.getAllProductsAdmin(req.query);
  return res.status(200).json({
    success: true,
    message: "Products fetched successfully",
    total,
    data,
  });
});

export const searchPublicProducts = asyncHandler(async (req, res) => {
  const queryStr = req.query.q || req.query.search;
  const { data, items } = await productService.searchPublicProducts(queryStr);
  return res.status(200).json({ success: true, data, items });
});

export const getPublicProducts = asyncHandler(async (req, res) => {
  const result = await productService.getPublicProducts(req.query);
  return res.status(200).json({
    success: true,
    ...result
  });
});

export const getPublicAllProducts = asyncHandler(async (req, res) => {
  const products = await productService.getPublicAllProducts();
  return res.status(200).json({
    success: true,
    data: products,
  });
});

export const getProductByIdOrSlug = asyncHandler(async (req, res) => {
  const product = await productService.getProductByIdOrSlug(req.params.id);
  return res.status(200).json({
    success: true,
    data: product,
  });
});

export const updateProduct = asyncHandler(async (req, res) => {
  const productId = req.params.id;
  const updatedData = { ...req.body };

  const imageFields = ["image", "image1", "image2", "image3", "image4"];
  imageFields.forEach((field) => {
    const newImage = getImagePath(req.files, field);
    if (newImage) {
      updatedData[field] = newImage;
    }
  });

  const updatedProduct = await productService.updateProduct(productId, updatedData);

  return res.status(200).json({
    success: true,
    message: "Product updated successfully",
    data: updatedProduct,
  });
});

export const deleteProduct = asyncHandler(async (req, res) => {
  await productService.deleteProduct(req.params.id);
  return res.status(200).json({
    success: true,
    message: "Product deleted successfully",
  });
});
