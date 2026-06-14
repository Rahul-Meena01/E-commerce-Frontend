import { useEffect, useState } from "react";
import { X, ShoppingBag, Trash2, Plus, Minus, ArrowRight } from "lucide-react";
import { Button } from "@/shared/ui";
import { useFocusTrap, useEscapeKey } from "@/shared/hooks";
import { useCart } from "@/features/cart/hooks/useCart";
import { useNavigate, Link } from "react-router-dom";
import OptimizedImage from "../ui/OptimizedImage";
import { formatPrice } from "@/utils/pricing";
import "../../../styles/CartDrawer.css";

const CartDrawer = ({ isOpen, onClose }) => {
  const {
    cartItems,
    cartSubtotal,
    cartCount,
    updateQuantity,
    removeFromCart,
    cartTotals,
    couponCode,
    appliedGiftCard,
    giftCardDiscount,
    applyCoupon,
    removeCoupon,
    isApplying,
    applyGiftCard,
    removeGiftCard,
  } = useCart();
  const navigate = useNavigate();
  const drawerRef = useFocusTrap(isOpen);

  useEscapeKey(() => { if (isOpen) onClose(); }, isOpen);

  const [couponInput, setCouponInput] = useState("");
  const [couponMsg, setCouponMsg] = useState({ type: "", text: "" });
  const [giftCardInput, setGiftCardInput] = useState("");
  const [giftCardMsg, setGiftCardMsg] = useState({ type: "", text: "" });
  const [validatingGiftCard, setValidatingGiftCard] = useState(false);

  const handleApplyCoupon = async (e) => {
    e.preventDefault();
    if (!couponInput.trim()) return;
    setCouponMsg({ type: "", text: "" });
    try {
      await applyCoupon(couponInput.trim());
      setCouponMsg({ type: "success", text: "Coupon applied successfully!" });
      setCouponInput("");
    } catch (err) {
      setCouponMsg({ type: "error", text: err.message || "Failed to apply coupon." });
    }
  };

  const handleRemoveCoupon = async () => {
    setCouponMsg({ type: "", text: "" });
    try {
      await removeCoupon();
      setCouponMsg({ type: "success", text: "Coupon removed." });
    } catch {
      setCouponMsg({ type: "error", text: "Failed to remove coupon." });
    }
  };

  const handleApplyGiftCard = async (e) => {
    e.preventDefault();
    if (!giftCardInput.trim()) return;
    setGiftCardMsg({ type: "", text: "" });
    setValidatingGiftCard(true);
    try {
      const card = await applyGiftCard(giftCardInput.trim());
      setGiftCardMsg({
        type: "success",
        text: `Gift card applied! Value: ${formatPrice(card.giftCardValue)}`,
      });
      setGiftCardInput("");
    } catch (err) {
      setGiftCardMsg({ type: "error", text: err.message || "Invalid gift card." });
    } finally {
      setValidatingGiftCard(false);
    }
  };

  const handleRemoveGiftCard = () => {
    removeGiftCard();
    setGiftCardMsg({ type: "success", text: "Gift card removed." });
  };

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  const handleCheckoutRedirect = () => {
    onClose();
    navigate("/checkout");
  };

  if (!isOpen) return null;

  return (
    <div className="cart-drawer-overlay" onClick={onClose}>
      <div
        className="cart-drawer-container"
        onClick={(e) => e.stopPropagation()}
        ref={drawerRef}
        role="dialog"
        aria-modal="true"
        aria-label="Shopping Cart Drawer"
      >
        <div className="cart-drawer-header">
          <div className="cart-drawer-title-row">
            <ShoppingBag size={20} />
            <h2>Your Cart ({cartCount})</h2>
          </div>
          <Button variant="ghost" icon={<X size={20} />} onClick={onClose} aria-label="Close cart drawer" />
        </div>

        <div className="cart-drawer-items">
          {cartItems.length === 0 ? (
            <div className="cart-drawer-empty">
              <ShoppingBag size={48} className="empty-icon" />
              <p>Your shopping cart is empty</p>
              <Button variant="primary" onClick={onClose}>
                Continue Shopping
              </Button>
            </div>
          ) : (
            cartItems.map((item) => {
              const productId = typeof item.product === 'object' && item.product
                ? (item.product._id || item.product.id)
                : item.product;
              const itemKey = item._id || `cart_item_${productId}_${item.size || ""}_${item.color || ""}`;
              return (
                <div className="cart-drawer-item" key={itemKey}>
                  <Link to={`/product/${productId}`} onClick={onClose} className="item-image-link">
                    <div className="item-image">
                      <OptimizedImage src={item.image} alt={item.name} />
                    </div>
                  </Link>
                  <div className="item-details">
                    <div className="item-info-header">
                      <Link to={`/product/${productId}`} onClick={onClose} className="item-name-link">
                        <h4>{item.name}</h4>
                      </Link>
                      <button
                        className="item-remove"
                        onClick={() =>
                          removeFromCart({
                            productId,
                            size: item.size,
                            color: item.color,
                            itemId: item._id,
                          })
                        }
                        aria-label={`Remove ${item.name} from cart`}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                    {(item.size || item.color) && (
                      <div className="item-specs">
                        {item.color && <span className="spec-tag">Color: {item.color}</span>}
                        {item.size && <span className="spec-tag">Size: {item.size}</span>}
                      </div>
                    )}
                    <div className="item-price-row">
                      <div className="quantity-selector">
                        <button
                          onClick={() =>
                            item.quantity > 1 &&
                            updateQuantity({
                              productId,
                              size: item.size,
                              color: item.color,
                              quantity: item.quantity - 1,
                              itemId: item._id,
                            })
                          }
                          disabled={item.quantity <= 1}
                          aria-label="Decrease quantity"
                        >
                          <Minus size={12} />
                        </button>
                        <span>{item.quantity}</span>
                        <button
                          onClick={() =>
                            updateQuantity({
                              productId,
                              size: item.size,
                              color: item.color,
                              quantity: item.quantity + 1,
                              itemId: item._id,
                            })
                          }
                          aria-label="Increase quantity"
                        >
                          <Plus size={12} />
                        </button>
                      </div>
                      <span className="item-price">
                        {formatPrice((item.finalPrice || item.price) * item.quantity)}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })
          )}
          {cartItems.length > 0 && (
            <div className="cart-drawer-promos">
              {/* Coupon Promo Form */}
              <div className="cart-drawer-promo-section">
                <p className="cart-drawer-promo-title">Have a Promo Code?</p>
                {couponCode ? (
                  <div className="cart-drawer-promo-applied">
                    <span className="cart-drawer-promo-badge">{couponCode}</span>
                    <button
                      type="button"
                      className="cart-drawer-promo-remove"
                      onClick={handleRemoveCoupon}
                    >
                      Remove
                    </button>
                  </div>
                ) : (
                  <form onSubmit={handleApplyCoupon} className="cart-drawer-promo-form">
                    <input
                      type="text"
                      placeholder="Enter promo code"
                      value={couponInput}
                      onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
                      className="cart-drawer-promo-input"
                      disabled={isApplying}
                    />
                    <button
                      type="submit"
                      className="cart-drawer-promo-btn"
                      disabled={isApplying || !couponInput.trim()}
                    >
                      {isApplying ? "..." : "Apply"}
                    </button>
                  </form>
                )}
                {couponMsg.text && (
                  <p className={`cart-drawer-promo-msg ${couponMsg.type}`}>{couponMsg.text}</p>
                )}
              </div>

              {/* Gift Card Form */}
              <div className="cart-drawer-promo-section">
                <p className="cart-drawer-promo-title">Have a Gift Card?</p>
                {appliedGiftCard ? (
                  <div className="cart-drawer-promo-applied">
                    <span className="cart-drawer-promo-badge">
                      {appliedGiftCard.code} ({formatPrice(appliedGiftCard.giftCardValue)})
                    </span>
                    <button
                      type="button"
                      className="cart-drawer-promo-remove"
                      onClick={handleRemoveGiftCard}
                    >
                      Remove
                    </button>
                  </div>
                ) : (
                  <form onSubmit={handleApplyGiftCard} className="cart-drawer-promo-form">
                    <input
                      type="text"
                      placeholder="Enter Gift Card Code"
                      value={giftCardInput}
                      onChange={(e) => setGiftCardInput(e.target.value.toUpperCase())}
                      className="cart-drawer-promo-input"
                      disabled={validatingGiftCard}
                    />
                    <button
                      type="submit"
                      className="cart-drawer-promo-btn"
                      disabled={validatingGiftCard || !giftCardInput.trim()}
                    >
                      {validatingGiftCard ? "..." : "Apply"}
                    </button>
                  </form>
                )}
                {giftCardMsg.text && (
                  <p className={`cart-drawer-promo-msg ${giftCardMsg.type}`}>{giftCardMsg.text}</p>
                )}
              </div>
            </div>
          )}
        </div>

        {cartItems.length > 0 && (
          <div className="cart-drawer-footer">
            {/* Price breakdown */}
            <div className="totals-row">
              <span>Subtotal</span>
              <span>{formatPrice(cartSubtotal)}</span>
            </div>

            {cartTotals.discount > 0 && (
              <div className="totals-row discount">
                <span>Coupon Discount</span>
                <span>-{formatPrice(cartTotals.discount)}</span>
              </div>
            )}

            {giftCardDiscount > 0 && (
              <div className="totals-row discount">
                <span>Gift Card Discount</span>
                <span>-{formatPrice(giftCardDiscount)}</span>
              </div>
            )}

            {(cartTotals.discount > 0 || giftCardDiscount > 0) && (
              <>
                <div className="totals-row">
                  <span>Tax (18% GST)</span>
                  <span>{formatPrice(cartTotals.tax)}</span>
                </div>
                <div className="totals-row">
                  <span>Shipping</span>
                  <span>
                    {cartTotals.shipping === 0 ? "Free" : formatPrice(cartTotals.shipping)}
                  </span>
                </div>
              </>
            )}

            <div className="subtotal-row">
              <span>Grand Total</span>
              <span className="subtotal-price">
                {formatPrice(cartTotals.grandTotal)}
              </span>
            </div>

            <p className="footer-notice">Shipping, taxes, and discounts calculated at checkout.</p>
            <Button variant="primary" icon={<ArrowRight size={16} />} onClick={handleCheckoutRedirect}>
              Proceed to Checkout
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default CartDrawer;
