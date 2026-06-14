import Order from "../../models/Order.js";
import VendorProduct from "../../models/vendor/vendorProduct.js";

// @route   GET /api/vendor/:vendorSlug/orders
// @desc    Get all orders containing products belonging to this vendor
// @access  Private (vendor only)
export const getVendorOrders = async (req, res) => {
  try {
    // 1. Get all product IDs belonging to this vendor
    const vendorProducts = await VendorProduct.find({ vendor: req.vendorId }, "_id");
    const vendorProductIds = vendorProducts.map((p) => p._id);

    if (vendorProductIds.length === 0) {
      return res.status(200).json({ success: true, count: 0, data: [] });
    }

    // 2. Find orders that contain at least one item from this vendor
    const orders = await Order.find({
      "orderItems.product": { $in: vendorProductIds },
    })
      .populate("user", "name email phone")
      .sort({ createdAt: -1 });

    // 3. (Optional) Filter the orderItems to only show the vendor's items, 
    //    and calculate the vendor's total amount from this order.
    //    For now, we'll return the whole order, but add a vendorTotal field.
    const mappedOrders = orders.map((order) => {
      const orderObj = order.toObject();
      const vendorItems = orderObj.orderItems.filter((item) =>
        vendorProductIds.some((id) => id.toString() === item.product.toString())
      );

      const vendorTotal = vendorItems.reduce((acc, item) => acc + item.price * item.qty, 0);

      return {
        ...orderObj,
        vendorItems,
        vendorTotal,
        // override orderItems and totalAmount for frontend display 
        orderItems: vendorItems,
        totalAmount: vendorTotal,
        status: orderObj.orderStatus // mapping orderStatus to status for frontend
      };
    });

    return res.status(200).json({
      success: true,
      count: mappedOrders.length,
      data: mappedOrders,
    });
  } catch (error) {
    console.error("getVendorOrders error:", error);
    return res
      .status(500)
      .json({ success: false, message: "Internal server error" });
  }
};
