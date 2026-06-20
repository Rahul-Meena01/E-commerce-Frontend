import Coupon from "./models/Coupon.js";
import GiftCard from "./models/GiftCard.js";

const setupCronJobs = () => {
  const ONE_HOUR = 60 * 60 * 1000;

  setInterval(async () => {
    try {
      console.log("[Cron] Running hourly cleanup for expired coupons and gift cards...");
      const now = new Date();

      // Invalidate expired coupons
      const expiredCoupons = await Coupon.updateMany(
        { expiryDate: { $lt: now }, status: { $ne: "inactive" } },
        { $set: { status: "inactive" } }
      );
      
      // Invalidate expired gift cards
      const expiredGiftCards = await GiftCard.updateMany(
        { expiryDate: { $lt: now }, status: { $ne: "inactive" } },
        { $set: { status: "inactive" } }
      );

      console.log(`[Cron] Inactivated ${expiredCoupons.modifiedCount} coupons and ${expiredGiftCards.modifiedCount} gift cards.`);
    } catch (error) {
      console.error("[Cron] Error running cleanup job:", error);
    }
  }, ONE_HOUR);
  
  console.log("[Cron] Hourly cleanup job initialized.");
};

export default setupCronJobs;
