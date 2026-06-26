import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import logger from "@/shared/utils/logger";
import { Shield, ArrowLeft } from "lucide-react";
import { useCartActions, useCartState } from "@/features/cart/hooks/useCart";
import { useAuthState } from "@/features/auth/context/AuthContext";
import PaymentModal from "@/features/checkout/components/PaymentModal";
import "../../styles/CheckoutPage.css";
import CheckoutProgress from "../../features/checkout/components/CheckoutProgress";
import CheckoutOrderSummary from "../../features/checkout/components/CheckoutOrderSummary";
import CheckoutShippingForm from "../../features/checkout/components/CheckoutShippingForm";
import CheckoutPaymentForm from "../../features/checkout/components/CheckoutPaymentForm";
import CheckoutReview from "../../features/checkout/components/CheckoutReview";
import { useCheckoutMutation } from "../../features/checkout/services/hooks/useCheckoutMutation";
import {
  createRazorpayOrder,
  verifyRazorpayPayment,
} from "../../features/checkout/services/checkout.service";
import { motion, AnimatePresence } from "framer-motion";
import api from "@/services/client";
import { getProductStock, normalizeCartItem, getFreshStockForItem } from "../../shared/utils/productUtils";
import {
  validatePhone,
  validatePostalCode,
  validateAddress,
  validateCountry,
  validateState,
  validateCity,
  validateFullName,
} from "@/shared/utils/addressValidation";

const loadRazorpayScript = () => {
  return new Promise((resolve) => {
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
};

const CheckoutPage = () => {
  const [shippingMethod, setShippingMethod] = useState("standard");
  const navigate = useNavigate();
  const [activeStep, setActiveStep] = useState(1);
  const [orderError, setOrderError] = useState("");
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [, setIsPaying] = useState(false);
  const [isPreparingPayment, setIsPreparingPayment] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState("Razorpay");
  const [createdOrderId, setCreatedOrderId] = useState(null);
  const isOrderCompletedRef = useRef(false);
  const isSubmittingRef = useRef(false);

  const {
    cartItems,
    cartCount,
    cartSubtotal,
    cartTotals,
    couponCode,
    appliedGiftCard,
    giftCardDiscount,
    applyGiftCard,
    removeGiftCard,
  } = useCartState();
  const {
    updateQuantity,
    removeFromCart,
    clearCart,
    applyCoupon,
    removeCoupon,
  } = useCartActions();
  const { user } = useAuthState();
  const checkoutMutation = useCheckoutMutation();

  const [formData, setFormData] = useState({
    fullName: user?.name || "",
    email: user?.email || "",
    phone: user?.phone || "",
    country: "",
    countryCode: "",
    street: "",
    apartment: "",
    city: "",
    state: "",
    stateCode: "",
    postalCode: "",
  });

  useEffect(() => {
    return () => {
      // If we have a created order but payment wasn't completed when unmounting (navigating away), cancel it to release inventory
      if (createdOrderId && !isOrderCompletedRef.current) {
        api.put(`/orders/${createdOrderId}/cancel`, { note: "Checkout abandoned by user." }).catch((err) => {
          console.error("Failed to cancel order on unmount:", err);
        });
      }
    };
  }, [createdOrderId]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleShippingSubmit = (e) => {
    e.preventDefault();
    setOrderError("");

    const errors = {};
    if (!validateFullName(formData.fullName)) {
      errors.fullName = "Full name must be between 2 and 70 characters (letters and spaces/hyphens/apostrophes only).";
    }
    if (
      !formData.email.trim() ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)
    ) {
      errors.email = "Valid email is required";
    }

    if (!formData.phone || !validatePhone(formData.phone, formData.countryCode)) {
      errors.phone = "Valid international phone number is required";
    }

    if (!validateCountry(formData.country)) {
      errors.country = "Country is required";
    }

    if (!validateState(formData.state)) {
      errors.state = "State is required";
    }

    if (!validateCity(formData.city)) {
      errors.city = "City is required";
    }

    if (!validateAddress(formData.street)) {
      errors.street = "Street address must be between 5 and 120 characters without repeated punctuation.";
    }

    if (!validatePostalCode(formData.postalCode, formData.countryCode)) {
      errors.postalCode = "Invalid postal code for the selected country.";
    }

    if (Object.keys(errors).length > 0) {
      setOrderError(Object.values(errors)[0]);
      return;
    }
    setOrderError("");
    setActiveStep(2);
  };

  const handlePaymentSubmit = (e) => {
    e.preventDefault();
    setOrderError("");
    setActiveStep(3);
  };

  const discount = Number(cartTotals?.discount) || 0;
  const shippingCost = Number(cartTotals?.shipping) || 0;
  const tax = Number(cartTotals?.tax) || 0;
  const total = Number(cartTotals?.grandTotal) || 0;

  useEffect(() => {
    if (appliedGiftCard || total === 0) {
      setPaymentMethod("COD");
    }
  }, [appliedGiftCard, total]);

  const redeemGiftCard = async () => {
    if (appliedGiftCard) {
      removeGiftCard();
    }
  };

  const handlePlaceOrder = async () => {
    if (isSubmittingRef.current) return;
    isSubmittingRef.current = true;

    if (!user) {
      navigate("/login", { state: { from: "/checkout" } });
      isSubmittingRef.current = false;
      return;
    }

    setOrderError("");

    // Freshness validation before proceeding: retrieve fresh data for cart products only
    let stockErrors;
    const freshProductsMap = {};
    try {
      const uniqueProductIds = Array.from(
        new Set(
          cartItems.map((item) => {
            const pid = typeof item.product === "object" && item.product
              ? (item.product._id || item.product.id)
              : item.product;
            return pid;
          }).filter(Boolean)
        )
      );

      await Promise.all(
        uniqueProductIds.map(async (id) => {
          try {
            const res = await api.get(`/product/public/${id}`);
            const prod = res.data?.data || res.data;
            if (prod) {
              freshProductsMap[id] = prod;
            }
          } catch (err) {
            console.warn(`Failed to fetch fresh stock for product ${id}:`, err);
          }
        })
      );

      stockErrors = cartItems.filter((item) => {
        const productId = typeof item.product === "object" && item.product
          ? (item.product._id || item.product.id)
          : item.product;
        const freshProduct = freshProductsMap[productId];
        if (!freshProduct) {
          // Product is deleted or disabled
          return true;
        }
        const freshStock = getFreshStockForItem(item, freshProduct);
        return typeof freshStock === "number" && Number(item.quantity) > freshStock;
      });
    } catch (err) {
      console.error("Freshness stock validation failed:", err);
      // Fallback to local stock data if API fails
      stockErrors = cartItems.filter((item) => {
        const localStock = getProductStock(item);
        return typeof localStock === "number" && Number(item.quantity) > localStock;
      });
    }

    if (stockErrors.length > 0) {
      const names = stockErrors
        .map((item) => {
          const productId = typeof item.product === "object" && item.product
            ? (item.product._id || item.product.id)
            : item.product;
          const freshProduct = freshProductsMap[productId];
          if (!freshProduct) {
            return `${item.name || "Product"} (No longer available)`;
          }
          const freshStock = getFreshStockForItem(item, freshProduct);
          return `${item.name || "Product"} (Requested: ${item.quantity}, Available: ${freshStock})`;
        })
        .join(", ");

      setOrderError(`Stock validation failed: ${names}. Please adjust quantities in your cart.`);
      setIsPaying(false);
      setIsPreparingPayment(false);
      isSubmittingRef.current = false;
      return;
    }

    setIsPaying(true);
    setIsPreparingPayment(true);
    const startTime = Date.now();
    let orderId = createdOrderId;

    try {
      if (!orderId) {
        const orderItemsPayload = cartItems.map((item) => normalizeCartItem(item));

        // Create DB order first
        // Force paymentMethod to "COD" if total is 0 (fully paid by gift card)
        const orderPayload = {
          orderItems: orderItemsPayload,
          shippingAddress: {
            address: [formData.street, formData.apartment]
              .filter(Boolean)
              .join(", "),
            city: formData.city,
            postalCode: formData.postalCode,
            country: formData.country,
          },
          paymentMethod: total === 0 ? "COD" : paymentMethod,
        };

        const dbOrder = await checkoutMutation.mutateAsync(orderPayload);
        orderId = dbOrder._id || dbOrder.id;

        if (!orderId) {
          throw new Error("Failed to create order in database");
        }
        setCreatedOrderId(orderId);
      }

      // If fully paid by gift card or COD
      if (total === 0 || paymentMethod === "COD") {
        await redeemGiftCard();
        clearCart();
        isOrderCompletedRef.current = true;
        navigate(`/order-success/${orderId}`);
        setIsPaying(false);
        setIsPreparingPayment(false);
        isSubmittingRef.current = false;
        return;
      }

      const scriptLoaded = await loadRazorpayScript();
      if (!scriptLoaded) {
        throw new Error(
          "Razorpay SDK failed to load. Please check your connection.",
        );
      }

      // Create order with Razorpay backend
      const rzpOrderData = await createRazorpayOrder({ orderId });

      if (!rzpOrderData?.razorpayOrderId) {
        throw new Error(
          rzpOrderData?.message || "Failed to create payment gateway order",
        );
      }

      // Regression validation: Assert checkoutTotal === handoffModalTotal === razorpayAmount
      const expectedAmountInPaise = Math.round(total * 100);
      if (rzpOrderData.amount !== expectedAmountInPaise) {
        logger.error("Payment Integrity Mismatch:", {
          checkoutTotal: total,
          handoffModalTotal: total,
          razorpayAmount: rzpOrderData.amount / 100,
        });
        throw new Error(
          `Payment Integrity Error: Checkout total (₹${total.toFixed(2)}) does not match payment gateway amount (₹${(rzpOrderData.amount / 100).toFixed(2)}). Please reload and try again.`,
        );
      }

      const options = {
        key: import.meta.env.VITE_RAZORPAY_KEY_ID,
        amount: rzpOrderData.amount,
        currency: rzpOrderData.currency || "INR",
        name: "LOFT",
        description: "Secure Order Payment",
        order_id: rzpOrderData.razorpayOrderId,
        prefill: {
          name: formData.fullName,
          email: formData.email,
          contact: formData.phone,
        },
        theme: {
          color: "#0F0E0C",
        },
        handler: async function (response) {
          try {
            const verifyPayload = {
              orderId,
              razorpayPaymentId: response.razorpay_payment_id,
              razorpayOrderId: response.razorpay_order_id,
              razorpaySignature: response.razorpay_signature,
            };

            const verificationResult =
              await verifyRazorpayPayment(verifyPayload);

            if (verificationResult?.success && verificationResult?.orderId) {
              await redeemGiftCard();
              clearCart();
              isOrderCompletedRef.current = true;
              navigate(`/order-success/${verificationResult.orderId}`);
            } else {
              throw new Error(
                verificationResult?.message || "Verification failed",
              );
            }
          } catch (verifyErr) {
            setOrderError(verifyErr?.message || "Payment verification failed");
            try {
              await api.put(`/orders/${orderId}/cancel`, { note: "Payment verification failed." });
            } catch (cancelErr) {
              console.error("Failed to cancel order on verification failure:", cancelErr);
            }
            setCreatedOrderId(null);
          } finally {
            setIsPaying(false);
            setIsPreparingPayment(false);
            isSubmittingRef.current = false;
          }
        },
        modal: {
          ondismiss: async function () {
            setOrderError("Payment cancelled by user.");
            setIsPaying(false);
            setIsPreparingPayment(false);
            isSubmittingRef.current = false;
            try {
              await api.put(`/orders/${orderId}/cancel`, { note: "Payment cancelled by user at checkout." });
            } catch (cancelErr) {
              console.error("Failed to cancel order on payment dismissal:", cancelErr);
            }
            setCreatedOrderId(null);
          },
        },
      };

      const elapsed = Date.now() - startTime;
      const remainingTime = Math.max(0, 800 - elapsed);

      setTimeout(() => {
        try {
          setIsPreparingPayment(false);
          const rzp = new window.Razorpay(options);
          rzp.open();
        } catch {
          setOrderError("Failed to open payment gateway. Please try again.");
          setIsPaying(false);
          isSubmittingRef.current = false;
          if (orderId) {
            api.put(`/orders/${orderId}/cancel`, { note: "Razorpay instantiation failed." }).catch(console.error);
            setCreatedOrderId(null);
          }
        }
      }, remainingTime);
    } catch (err) {
      setOrderError(err?.message || "Something went wrong. Please try again.");
      setIsPaying(false);
      setIsPreparingPayment(false);
      isSubmittingRef.current = false;
      if (orderId) {
        try {
          await api.put(`/orders/${orderId}/cancel`, { note: "Payment flow initialization failed." });
        } catch (cancelErr) {
          console.error("Failed to cancel order on error:", cancelErr);
        }
        setCreatedOrderId(null);
      }
    }
  };

  const steps = [
    { number: 1, label: "Shipping" },
    { number: 2, label: "Payment" },
    { number: 3, label: "Review" },
  ];

  if (cartCount === 0 && activeStep !== 4) {
    return (
      <div className="checkout-page">
        <div className="checkout-progress">
          <div className="checkout-progress-header">
            <button
              className="checkout-back-btn"
              onClick={() => navigate("/")}
              aria-label="Back to home"
            >
              <ArrowLeft size={18} />
              Back to Home
            </button>
          </div>
        </div>
        <div className="checkout-content">
          <div className="checkout-container">
            <div className="checkout-left">
              <div className="checkout-success-step">
                <Shield
                  size={64}
                  color="#d0d0d0"
                  className="checkout-success-icon"
                />
                <h2 className="checkout-section-title checkout-success-title">
                  Your Cart is Empty
                </h2>
                <p className="checkout-success-message">
                  Looks like you haven't added anything to your cart yet.
                  <br />
                  Browse our collections to find something you love.
                </p>
                <button
                  onClick={() => navigate("/shop")}
                  className="checkout-continue-btn"
                >
                  START SHOPPING
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="checkout-page">
      <div className="checkout-progress">
        <div className="checkout-progress-header">
          <button
            className="checkout-back-btn"
            onClick={() => navigate("/")}
            aria-label="Back to home"
          >
            <ArrowLeft size={18} />
            Back to Home
          </button>
        </div>

        <CheckoutProgress activeStep={activeStep} steps={steps} />
      </div>

      <div className="checkout-content">
        <div
          className={`checkout-container ${activeStep === 4 ? "success" : ""}`}
        >
          <div className="checkout-left">
            {activeStep === 1 && (
              <CheckoutShippingForm
                formData={formData}
                setFormData={setFormData}
                handleInputChange={handleInputChange}
                handleShippingSubmit={handleShippingSubmit}
                shippingMethod={shippingMethod}
                setShippingMethod={setShippingMethod}
                orderError={orderError}
              />
            )}

            {activeStep === 2 && (
              <CheckoutPaymentForm
                handlePaymentSubmit={handlePaymentSubmit}
                paymentMethod={paymentMethod}
                setPaymentMethod={setPaymentMethod}
                appliedGiftCard={appliedGiftCard}
              />
            )}

            {activeStep === 3 && (
              <CheckoutReview
                formData={formData}
                paymentMethod={paymentMethod}
                orderError={orderError}
                isPending={checkoutMutation.isPending}
                handlePlaceOrder={() => {
                  if (total === 0 || paymentMethod === "COD") {
                    handlePlaceOrder();
                  } else {
                    setIsPaymentModalOpen(true);
                  }
                }}
              />
            )}
          </div>

          <CheckoutOrderSummary
            cartItems={cartItems}
            cartSubtotal={cartSubtotal}
            shippingMethod={shippingMethod}
            shippingCost={shippingCost}
            tax={tax}
            total={total}
            discount={discount}
            appliedGiftCard={appliedGiftCard}
            giftCardDiscount={giftCardDiscount}
            updateQuantity={updateQuantity}
            removeFromCart={removeFromCart}
            couponCode={couponCode}
            applyCoupon={applyCoupon}
            removeCoupon={removeCoupon}
            applyGiftCard={applyGiftCard}
            removeGiftCard={removeGiftCard}
          />
        </div>
      </div>
      <PaymentModal
        isOpen={isPaymentModalOpen}
        onClose={() => setIsPaymentModalOpen(false)}
        onPaymentSuccess={() => {
          setIsPaymentModalOpen(false);
          handlePlaceOrder();
        }}
        onPaymentFailure={() => {
          setIsPaymentModalOpen(false);
        }}
        amount={total}
      />

      <AnimatePresence>
        {isPreparingPayment && (
          <motion.div
            className="checkout-preparing-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            <div className="checkout-preparing-content">
              <span className="checkout-preparing-brand">LOFT</span>
              <div className="checkout-preparing-spinner"></div>
              <h3 className="checkout-preparing-title">Securing Connection</h3>
              <p className="checkout-preparing-text">
                Initializing encrypted signature verification with Razorpay...
              </p>
              <span className="checkout-preparing-secure-note">
                Please do not refresh or close this window.
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default CheckoutPage;
