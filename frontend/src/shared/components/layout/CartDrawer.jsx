import { useEffect, useRef } from "react";
import { X, ShoppingBag, Trash2, Plus, Minus, ArrowRight } from "lucide-react";
import { useCart } from "@/features/cart/hooks/useCart";
import { useNavigate, Link } from "react-router-dom";
import OptimizedImage from "../ui/OptimizedImage";
import { formatPrice } from "@/utils/pricing";
import "../../../styles/CartDrawer.css";

const CartDrawer = ({ isOpen, onClose }) => {
  const { cartItems, cartSubtotal, cartCount, updateQuantity, removeFromCart } = useCart();
  const navigate = useNavigate();
  const drawerRef = useRef(null);

  // Close on ESC key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  // Trap focus when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
      const focusableElements = drawerRef.current?.querySelectorAll(
        'button, a, input, select, textarea, [tabindex="0"]'
      );
      if (focusableElements && focusableElements.length > 0) {
        focusableElements[0].focus();
      }
    } else {
      document.body.style.overflow = "";
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
          <button className="cart-drawer-close" onClick={onClose} aria-label="Close cart drawer">
            <X size={20} />
          </button>
        </div>

        <div className="cart-drawer-items">
          {cartItems.length === 0 ? (
            <div className="cart-drawer-empty">
              <ShoppingBag size={48} className="empty-icon" />
              <p>Your shopping cart is empty</p>
              <button className="explore-btn" onClick={onClose}>
                Continue Shopping
              </button>
            </div>
          ) : (
            cartItems.map((item) => {
              const productId = typeof item.product === 'object' && item.product
                ? (item.product._id || item.product.id)
                : item.product;
              return (
                <div className="cart-drawer-item" key={item._id}>
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
                        {formatPrice(item.price * item.quantity)}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {cartItems.length > 0 && (
          <div className="cart-drawer-footer">
            <div className="subtotal-row">
              <span>Subtotal</span>
              <span className="subtotal-price">
                {formatPrice(cartSubtotal)}
              </span>
            </div>
            <p className="footer-notice">Shipping, taxes, and discounts calculated at checkout.</p>
            <button className="checkout-btn" onClick={handleCheckoutRedirect}>
              Proceed to Checkout <ArrowRight size={16} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default CartDrawer;
