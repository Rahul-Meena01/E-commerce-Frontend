import { useEffect, useState, useRef } from "react";
import { X, ShoppingBag, Trash2, Plus, Minus, ArrowRight } from "lucide-react";
import { Button } from "@/shared/ui";
import { useFocusTrap, useEscapeKey } from "@/shared/hooks";
import { useCart } from "@/features/cart/hooks/useCart";
import { useNavigate, Link } from "react-router-dom";
import OptimizedImage from "../ui/OptimizedImage";
import { formatPrice } from "@/utils/pricing";
import { useAuthState } from "@/features/auth/context/AuthContext";
import { useGiftCard } from "@/context/GiftCardContext";
import { useToast } from "@/context/ToastContext";
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
  const { isAuthenticated } = useAuthState();
  const { myGiftCards, loadingMyCards, fetchMyGiftCards } = useGiftCard();
  const toast = useToast();

  useEscapeKey(() => { if (isOpen) onClose(); }, isOpen);

  const [couponInput, setCouponInput] = useState("");
  const [couponMsg, setCouponMsg] = useState({ type: "", text: "" });
  const [isGiftCardModalOpen, setIsGiftCardModalOpen] = useState(false);
  const [touchDragY, setTouchDragY] = useState(0);
  const [isTouchDragging, setIsTouchDragging] = useState(false);
  const touchStartY = useRef(0);

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

  const handleApplyGiftCardCode = async (code) => {
    try {
      await applyGiftCard(code.trim());
      toast.success("✓ Gift Card Applied Successfully");
      setIsGiftCardModalOpen(false);
    } catch (err) {
      toast.error(err.message || "Invalid gift card.");
    }
  };

  const handleRemoveGiftCard = () => {
    removeGiftCard();
    toast.success("Gift card removed.");
  };

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  useEffect(() => {
    if (isGiftCardModalOpen && isAuthenticated) {
      fetchMyGiftCards();
    }
  }, [isGiftCardModalOpen, isAuthenticated]);

  const handleCheckoutRedirect = () => {
    onClose();
    navigate("/checkout");
  };

  const maskCode = (code) => {
    if (!code) return "";
    if (code.length <= 6) return code;
    return `${code.substring(0, 2)}-XXXX-${code.substring(code.length - 4)}`.replace(/--/g, "-");
  };

  // Drag-to-close logic for mobile bottom sheet
  const handleTouchStart = (e) => {
    touchStartY.current = e.touches[0].clientY;
    setIsTouchDragging(true);
  };

  const handleTouchMove = (e) => {
    if (!isTouchDragging) return;
    const currentY = e.touches[0].clientY;
    const deltaY = currentY - touchStartY.current;
    if (deltaY > 0) {
      setTouchDragY(deltaY);
    }
  };

  const handleTouchEnd = () => {
    setIsTouchDragging(false);
    if (touchDragY > 100) {
      setIsGiftCardModalOpen(false);
    }
    setTouchDragY(0);
  };

  // Recommendation and filter logic for active gift cards
  const activeCards = myGiftCards.filter(
    (card) => card.status === "active" && new Date(card.expiryDate) > new Date() && card.balance > 0
  );

  const sortedActiveCards = [...activeCards].sort((a, b) => {
    const dateA = new Date(a.expiryDate);
    const dateB = new Date(b.expiryDate);
    if (dateA.getTime() !== dateB.getTime()) {
      return dateA - dateB; // Nearest expiry first
    }
    return b.balance - a.balance; // Highest balance first
  });

  const recommendedCardId = sortedActiveCards[0]?._id;

  const expiredOrUsedCards = myGiftCards.filter(
    (card) => card.status === "inactive" || card.status === "expired" || new Date(card.expiryDate) <= new Date() || card.balance <= 0
  );

  const subtotal = Number(cartTotals.subtotal) || 0;
  const couponDiscount = Number(cartTotals.discount) || 0;
  const tax = Number(cartTotals.tax) || 0;
  const shipping = Number(cartTotals.shipping) || 0;
  const totalBeforeGiftCard = subtotal - couponDiscount + tax + shipping;

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

              {/* Select Gift Card Selector (Trigger) */}
              {!appliedGiftCard && (
                <div className="cart-drawer-promo-section select-giftcard-section">
                  <p className="cart-drawer-promo-title">Have a Gift Card?</p>
                  <button
                    type="button"
                    className="select-giftcard-trigger-btn"
                    onClick={() => setIsGiftCardModalOpen(true)}
                  >
                    Select Gift Card
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {cartItems.length > 0 && (
          <div className="cart-drawer-footer">
            {/* Applied Gift Card summary details block */}
            {appliedGiftCard && (
              <div className="applied-giftcard-summary-card">
                <div className="applied-giftcard-title">Gift Card Applied</div>
                <div className="applied-giftcard-row">
                  <span className="applied-giftcard-label">Code:</span>
                  <span className="applied-giftcard-value">{maskCode(appliedGiftCard.code)}</span>
                </div>
                <div className="applied-giftcard-row">
                  <span className="applied-giftcard-label">Discount Applied:</span>
                  <span className="applied-giftcard-value">-{formatPrice(giftCardDiscount)}</span>
                </div>
                <div className="applied-giftcard-row">
                  <span className="applied-giftcard-label">Remaining Balance After Purchase:</span>
                  <span className="applied-giftcard-value">
                    {formatPrice(Math.max(0, appliedGiftCard.balance - giftCardDiscount))}
                  </span>
                </div>
                <button
                  type="button"
                  className="applied-giftcard-remove-btn"
                  onClick={handleRemoveGiftCard}
                >
                  [ Remove ]
                </button>
              </div>
            )}

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
                <span>Gift Card</span>
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

      {/* Gift Card Selection Modal / Drawer */}
      {isGiftCardModalOpen && (
        <div className={`giftcard-modal-backdrop ${isGiftCardModalOpen ? "is-open" : ""}`} onClick={() => setIsGiftCardModalOpen(false)}>
          <div
            className="giftcard-modal-container"
            onClick={(e) => e.stopPropagation()}
            style={
              isTouchDragging
                ? { transform: `translateY(${touchDragY}px)`, transition: 'none' }
                : {}
            }
          >
            {/* Handle bar for mobile swipe close */}
            <div
              className="giftcard-modal-drag-handle"
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
            >
              <div className="drag-handle-bar"></div>
            </div>

            <div className="giftcard-modal-header">
              <h3>Select Gift Card</h3>
              <button className="giftcard-modal-close" onClick={() => setIsGiftCardModalOpen(false)}>
                <X size={20} />
              </button>
            </div>

            <div className="giftcard-modal-body">
              {loadingMyCards ? (
                <div className="giftcard-loading">Loading available gift cards...</div>
              ) : (
                <>
                  {/* Active Gift Cards Section */}
                  {sortedActiveCards.length > 0 && (
                    <div className="giftcard-section">
                      <p className="giftcard-list-title">Your Active Gift Cards</p>
                      <div className="giftcard-list">
                        {sortedActiveCards.map((card) => {
                          const isRec = card._id === recommendedCardId;
                          
                          // Savings Preview calculation
                          const isGuest = !isAuthenticated;
                          let saveAmt;
                          let estTotal;
                          if (isGuest) {
                            saveAmt = Math.min(card.balance, totalBeforeGiftCard);
                            estTotal = Math.max(0, totalBeforeGiftCard - saveAmt);
                          } else {
                            const base = subtotal - couponDiscount;
                            const gcDisc = Math.min(card.balance, base);
                            const newTax = ((base - gcDisc) * 18) / 100;
                            estTotal = Math.max(0, (base - gcDisc) + newTax + shipping);
                            saveAmt = Math.max(0, (subtotal - couponDiscount + tax + shipping) - estTotal);
                          }

                          return (
                            <div key={card._id} className={`giftcard-card ${isRec ? "recommended" : ""}`}>
                              {isRec && (
                                <span className="giftcard-card-recommended-badge">
                                  ✓ Recommended Gift Card
                                </span>
                              )}
                              <div className="giftcard-card-brand">LOFT</div>
                              <h4 className="giftcard-card-title">LOFT GIFT CARD</h4>
                              <div className="giftcard-card-balance">₹{card.balance} Available</div>
                              <p className="giftcard-card-code">Code: {maskCode(card.code)}</p>
                              
                              <div className="giftcard-card-grid">
                                <div className="giftcard-card-info-item">
                                  <span className="giftcard-card-info-label">Original Value</span>
                                  <span className="giftcard-card-info-val">{formatPrice(card.giftCardValue)}</span>
                                </div>
                                <div className="giftcard-card-info-item">
                                  <span className="giftcard-card-info-label">Valid Until</span>
                                  <span className="giftcard-card-info-val">
                                    {new Date(card.expiryDate).toLocaleDateString("en-US", {
                                      day: "numeric",
                                      month: "short",
                                      year: "numeric"
                                    })}
                                  </span>
                                </div>
                                <div className="giftcard-card-info-item">
                                  <span className="giftcard-card-info-label">Status</span>
                                  <span className="giftcard-card-status">Active</span>
                                </div>
                              </div>

                              {/* Savings Preview */}
                              <div className="giftcard-card-savings-preview">
                                <div className="savings-row">
                                  <span>Gift Card Balance:</span>
                                  <span>{formatPrice(card.balance)}</span>
                                </div>
                                <div className="savings-row">
                                  <span>You Will Save:</span>
                                  <span>{formatPrice(saveAmt)}</span>
                                </div>
                                <div className="savings-row font-bold">
                                  <span>New Estimated Total:</span>
                                  <span>{formatPrice(estTotal)}</span>
                                </div>
                              </div>

                              <button
                                className="giftcard-card-action"
                                onClick={() => handleApplyGiftCardCode(card.code)}
                              >
                                Apply Gift Card
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Expired/Used Cards Section */}
                  {expiredOrUsedCards.length > 0 && (
                    <div className="giftcard-section expired-section">
                      <p className="giftcard-list-title">Expired & Used Gift Cards</p>
                      <div className="giftcard-list">
                        {expiredOrUsedCards.map((card) => {
                          const isExpired = card.status === "expired" || new Date(card.expiryDate) <= new Date();
                          return (
                            <div key={card._id} className="giftcard-card expired">
                              <div className="giftcard-card-brand">LOFT</div>
                              <h4 className="giftcard-card-title">LOFT GIFT CARD</h4>
                              <div className="giftcard-card-balance">₹{card.balance} Available</div>
                              <p className="giftcard-card-code">Code: {maskCode(card.code)}</p>
                              
                              <div className="giftcard-card-grid">
                                <div className="giftcard-card-info-item">
                                  <span className="giftcard-card-info-label">Expiry Date</span>
                                  <span className="giftcard-card-info-val">
                                    {new Date(card.expiryDate).toLocaleDateString("en-US", {
                                      day: "numeric",
                                      month: "short",
                                      year: "numeric"
                                    })}
                                  </span>
                                </div>
                                <div className="giftcard-card-info-item">
                                  <span className="giftcard-card-info-label">Status</span>
                                  <span className={`giftcard-card-status ${isExpired ? "expired" : "used"}`}>
                                    {isExpired ? "Expired" : "Used"}
                                  </span>
                                </div>
                              </div>

                              <button className="giftcard-card-action" disabled>
                                {isExpired ? "Expired" : "Used"}
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Empty State */}
                  {activeCards.length === 0 && (
                    <div className="giftcard-empty-state">
                      <span className="giftcard-empty-icon">🎁</span>
                      <h4 className="giftcard-empty-title">No Gift Cards Available</h4>
                      <p className="giftcard-empty-text">
                        You currently don't have any active gift cards.
                      </p>
                    </div>
                  )}

                  {/* Manual Entry Form - Secondary Option */}
                  <div className="giftcard-modal-divider">OR</div>

                  <div className="giftcard-manual-section">
                    <p className="giftcard-manual-title">Enter Gift Card Code</p>
                    <form
                      onSubmit={async (e) => {
                        e.preventDefault();
                        const code = e.target.manualCode.value.trim();
                        if (!code) return;
                        await handleApplyGiftCardCode(code);
                        e.target.reset();
                      }}
                      className="giftcard-manual-form"
                    >
                      <input
                        type="text"
                        name="manualCode"
                        placeholder="Enter gift card code"
                        className="giftcard-manual-input"
                        required
                        style={{ textTransform: "uppercase" }}
                      />
                      <button type="submit" className="giftcard-manual-btn">
                        Apply
                      </button>
                    </form>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CartDrawer;
