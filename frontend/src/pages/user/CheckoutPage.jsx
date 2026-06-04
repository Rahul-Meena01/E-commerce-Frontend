import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Shield, Truck, ArrowLeft } from "lucide-react";
import { useCartActions, useCartState } from "@/features/cart/hooks/useCart";
import { useAuthState } from "@/features/auth/context/AuthContext";
import PaymentModal from "@/features/checkout/components/PaymentModal";
import "../../styles/CheckoutPage.css";
import CheckoutProgress from "../../features/checkout/components/CheckoutProgress";
import CheckoutOrderSummary from "../../features/checkout/components/CheckoutOrderSummary";
import CheckoutShippingForm from "../../features/checkout/components/CheckoutShippingForm";
import CheckoutPaymentForm from "../../features/checkout/components/CheckoutPaymentForm";
import CheckoutReview from "../../features/checkout/components/CheckoutReview";
import { useCheckoutMutation } from "../../features/checkout/hooks/useCheckoutMutation";
import {
  createRazorpayOrder,
  verifyRazorpayPayment,
} from "../../features/checkout/services/checkout.service";
import { motion, AnimatePresence } from "framer-motion";

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
  const [isPaying, setIsPaying] = useState(false);
  const [isPreparingPayment, setIsPreparingPayment] = useState(false);

  const { cartItems, cartCount, cartSubtotal, cartTotals } = useCartState();
  const { updateQuantity, removeFromCart, clearCart } = useCartActions();
  const { user } = useAuthState();
  const checkoutMutation = useCheckoutMutation();

  const [formData, setFormData] = useState({
    fullName: user?.name || "",
    email: user?.email || "",
    phone: user?.phone || "",
    country: "",
    street: "",
    apartment: "",
    city: "",
    state: "",
    postalCode: "",
  });

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleShippingSubmit = (e) => {
    e.preventDefault();
    // Basic client-side validation
    const errors = {};
    if (!formData.fullName.trim()) errors.fullName = "Full name is required";
    if (
      !formData.email.trim() ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)
    )
      errors.email = "Valid email is required";
    if (!formData.country) errors.country = "Country is required";
    if (!formData.street.trim()) errors.street = "Street address is required";
    if (!formData.city.trim()) errors.city = "City is required";
    if (!formData.state.trim()) errors.state = "State is required";
    if (!formData.postalCode.trim())
      errors.postalCode = "Postal code is required";

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

  const subtotalSafe = Number(cartTotals?.subtotal) || 0;
  const discount = Number(cartTotals?.discount) || 0;
  const shippingCost = Number(cartTotals?.shipping) || 0;
  const tax = Number(cartTotals?.tax) || 0;
  const total = Number(cartTotals?.grandTotal) || 0;

  const handlePlaceOrder = async () => {
    if (!user) {
      navigate("/login", { state: { from: "/checkout" } });
      return;
    }

    setOrderError("");
    setIsPaying(true);
    setIsPreparingPayment(true);
    const startTime = Date.now();

    try {
      const scriptLoaded = await loadRazorpayScript();
      if (!scriptLoaded) {
        throw new Error("Razorpay SDK failed to load. Please check your connection.");
      }

      const orderItemsPayload = cartItems.map((item) => ({
        product: item.product,
        name: item.name,
        price: item.price,
        qty: item.quantity,
        size: item.size,
        color: item.color,
        image: item.image,
      }));

      // Create order with Razorpay backend first (calculates authoritative pricing)
      const rzpOrderData = await createRazorpayOrder(
        orderItemsPayload,
        shippingMethod
      );

      if (!rzpOrderData?.rzpOrderId) {
        throw new Error(rzpOrderData?.message || "Failed to create payment gateway order");
      }

      // Regression validation: Assert checkoutTotal === handoffModalTotal === razorpayAmount
      const expectedAmountInPaise = Math.round(total * 100);
      if (rzpOrderData.amount !== expectedAmountInPaise) {
        console.error("Payment Integrity Mismatch:", {
          checkoutTotal: total,
          handoffModalTotal: total,
          razorpayAmount: rzpOrderData.amount / 100
        });
        throw new Error(
          `Payment Integrity Error: Checkout total (₹${total.toFixed(2)}) does not match payment gateway amount (₹${(rzpOrderData.amount / 100).toFixed(2)}). Please reload and try again.`
        );
      }

      const options = {
        key: "rzp_test_RB5wDaGRoOgFw1",
        amount: rzpOrderData.amount,
        currency: rzpOrderData.currency || "INR",
        name: "LOFT",
        description: "Secure Order Payment",
        order_id: rzpOrderData.rzpOrderId,
        prefill: {
          name: formData.fullName,
          email: formData.email,
          contact: formData.phone,
        },
        theme: {
          color: "#1f2a44",
        },
        handler: async function (response) {
          try {
            const verifyPayload = {
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_order_id: response.razorpay_order_id,
              razorpay_signature: response.razorpay_signature,
              orderItems: orderItemsPayload,
              shippingAddress: {
                address: [formData.street, formData.apartment]
                  .filter(Boolean)
                  .join(", "),
                city: formData.city,
                postalCode: formData.postalCode,
                country: formData.country,
              },
              shippingMethod,
            };

            const verificationResult = await verifyRazorpayPayment(verifyPayload);

            if (verificationResult?.success && verificationResult?.orderId) {
              clearCart();
              navigate(`/order-success/${verificationResult.orderId}`);
            } else {
              throw new Error(verificationResult?.message || "Verification failed");
            }
          } catch (verifyErr) {
            setOrderError(verifyErr?.message || "Payment verification failed");
          } finally {
            setIsPaying(false);
            setIsPreparingPayment(false);
          }
        },
        modal: {
          ondismiss: function () {
            setOrderError("Payment cancelled by user.");
            setIsPaying(false);
            setIsPreparingPayment(false);
          },
        },
      };

      const elapsed = Date.now() - startTime;
      const remainingTime = Math.max(0, 800 - elapsed);

      setTimeout(() => {
        setIsPreparingPayment(false);
        const rzp = new window.Razorpay(options);
        rzp.open();
      }, remainingTime);

    } catch (err) {
      setOrderError(err?.message || "Something went wrong. Please try again.");
      setIsPaying(false);
      setIsPreparingPayment(false);
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
                  onClick={() => navigate("/shop/men")}
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
                handleInputChange={handleInputChange}
                handleShippingSubmit={handleShippingSubmit}
                shippingMethod={shippingMethod}
                setShippingMethod={setShippingMethod}
              />
            )}

            {activeStep === 2 && (
              <CheckoutPaymentForm handlePaymentSubmit={handlePaymentSubmit} />
            )}

            {activeStep === 3 && (
              <CheckoutReview
                formData={formData}
                orderError={orderError}
                isPending={checkoutMutation.isPending}
                handlePlaceOrder={() => setIsPaymentModalOpen(true)}
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
            updateQuantity={updateQuantity}
            removeFromCart={removeFromCart}
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
