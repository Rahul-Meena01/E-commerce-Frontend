// backend/modules/product/product.service.js
import mongoose from "mongoose";
import Product from "../../models/Product.js";
import SubCategory from "../../models/SubCategory.js";

export const createProduct = async ({
  subCategory,
  name,
  brand,
  price,
  discountPrice,
  discountPercent,
  stock,
  slug,
  status,
  image,
  image1,
  image2,
  image3,
  image4
}) => {
  if (!subCategory) {
    throw Object.assign(new Error("SubCategory is required"), { statusCode: 400 });
  }

  if (!name) {
    throw Object.assign(new Error("Product name is required"), { statusCode: 400 });
  }

  if (!price) {
    throw Object.assign(new Error("Price is required"), { statusCode: 400 });
  }

  const isSubCategory = await SubCategory.findById(subCategory);
  if (!isSubCategory) {
    throw Object.assign(new Error("SubCategory not found"), { statusCode: 404 });
  }

  let finalDiscountPrice = discountPrice || 0;
  if (discountPercent && price) {
    finalDiscountPrice = Number(price) - (Number(price) * Number(discountPercent)) / 100;
  }

  const product = new Product({
    subCategory,
    name,
    brand,
    price,
    discountPrice: finalDiscountPrice,
    discountPercent,
    status,
    stock,
    slug,
    image,
    image1,
    image2,
    image3,
    image4,
  });

  await product.save();
  return product;
};

export const getAllProductsAdmin = async ({ search, limit, page, status, subCategory }) => {
  const query = {};

  if (status) query.status = status;
  if (subCategory) query.subCategory = subCategory;

  if (search) {
    query.$or = [
      { name: { $regex: search, $options: "i" } },
      { brand: { $regex: search, $options: "i" } },
    ];
  }

  const parsedLimit = parseInt(limit) || 0;
  const parsedPage = parseInt(page) || 1;
  const skip = parsedLimit > 0 ? (parsedPage - 1) * parsedLimit : 0;

  const total = await Product.countDocuments(query);

  let productsQuery = Product.find(query)
    .populate({
      path: "subCategory",
      populate: {
        path: "parentCategory",
      },
    })
    .sort({ createdAt: -1 });

  if (parsedLimit > 0) {
    productsQuery = productsQuery.skip(skip).limit(parsedLimit);
  }

  const products = await productsQuery;
  return { total, data: products };
};

export const searchPublicProducts = async (queryStr) => {
  if (!queryStr) {
    return { data: [], items: [] };
  }
  const queryObj = {
    status: "Active",
    $or: [
      { name: { $regex: queryStr, $options: "i" } },
      { brand: { $regex: queryStr, $options: "i" } },
    ]
  };

  const products = await Product.find(queryObj).populate({
    path: "subCategory",
    populate: { path: "parentCategory" }
  });
  return { data: products, items: products };
};

export const getPublicProducts = async ({ category, subCategory, search, sort, page, limit }) => {
  const query = { status: "Active" };

  if (category) {
    let categoryId = category;
    if (mongoose.Types.ObjectId.isValid(category)) {
      categoryId = category;
    } else {
      const cat = await mongoose.model("Category").findOne({ slug: category });
      if (cat) categoryId = cat._id;
    }
    
    const subCats = await SubCategory.find({ parentCategory: categoryId, status: "Active" });
    const subCatIds = subCats.map(sc => sc._id);
    query.subCategory = { $in: subCatIds };
  }

  if (subCategory) {
    let subCategoryId = subCategory;
    if (mongoose.Types.ObjectId.isValid(subCategory)) {
      subCategoryId = subCategory;
    } else {
      const lookupSlugs = [subCategory];
      if (category) {
        lookupSlugs.push(`${category}-${subCategory}`);
      }
      const sub = await SubCategory.findOne({ slug: { $in: lookupSlugs } });
      if (sub) subCategoryId = sub._id;
    }
    query.subCategory = subCategoryId;
  }

  if (search) {
    query.$or = [
      { name: { $regex: search, $options: "i" } },
      { brand: { $regex: search, $options: "i" } },
    ];
  }

  let sortQuery = { createdAt: -1 };
  if (sort) {
    if (sort === "priceAsc") sortQuery = { price: 1 };
    else if (sort === "priceDesc") sortQuery = { price: -1 };
  }

  const parsedLimit = parseInt(limit) || 20;
  const parsedPage = parseInt(page) || 1;
  const skip = (parsedPage - 1) * parsedLimit;

  const total = await Product.countDocuments(query);
  const products = await Product.find(query)
    .populate({
      path: "subCategory",
      populate: { path: "parentCategory" }
    })
    .sort(sortQuery)
    .skip(skip)
    .limit(parsedLimit);

  return {
    data: products,
    items: products,
    total,
    pagination: {
      total,
      page: parsedPage,
      pages: Math.ceil(total / parsedLimit),
      limit: parsedLimit,
    }
  };
};

export const getPublicAllProducts = async () => {
  const products = await Product.find({ status: "Active" })
    .populate({
      path: "subCategory",
      populate: {
        path: "parentCategory",
      },
    })
    .sort({ createdAt: -1 });
  return products;
};

export const getProductByIdOrSlug = async (idOrSlug) => {
  const isId = mongoose.Types.ObjectId.isValid(idOrSlug);
  let product;

  if (isId) {
    product = await Product.findById(idOrSlug).populate({
      path: "subCategory",
      populate: {
        path: "parentCategory",
      },
    });
  } else {
    product = await Product.findOne({ slug: idOrSlug }).populate({
      path: "subCategory",
      populate: {
        path: "parentCategory",
      },
    });
  }

  if (!product) {
    throw Object.assign(new Error("Product not found"), { statusCode: 404 });
  }

  const Variant = mongoose.model("Variants");
  const variants = await Variant.find({ parentProduct: product._id, status: "Active" });
  const productObj = product.toObject ? product.toObject() : product;
  productObj.variants = variants;

  return productObj;
};

export const updateProduct = async (productId, updatedData) => {
  const existingProduct = await Product.findById(productId);
  if (!existingProduct) {
    throw Object.assign(new Error("Product not found"), { statusCode: 404 });
  }

  const dataToUpdate = { ...updatedData };

  if (dataToUpdate.discountPercent && dataToUpdate.price) {
    dataToUpdate.discountPrice =
      Number(dataToUpdate.price) - (Number(dataToUpdate.price) * Number(dataToUpdate.discountPercent)) / 100;
  }

  const updatedProduct = await Product.findByIdAndUpdate(
    productId,
    dataToUpdate,
    { new: true }
  );

  return updatedProduct;
};

export const deleteProduct = async (productId) => {
  const deletedProduct = await Product.findByIdAndDelete(productId);
  if (!deletedProduct) {
    throw Object.assign(new Error("Product not found"), { statusCode: 404 });
  }
  return deletedProduct;
};
