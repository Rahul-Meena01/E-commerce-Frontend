import { CheckCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";

const CheckoutSuccess = ({ orderResult }) => {
  const navigate = useNavigate();
  return (
    <div className="checkout-success-step">
      <CheckCircle
        size={64}
        color="#1a1a1a"
        className="checkout-success-icon"
      />
      <h2 className="checkout-section-title checkout-success-title">
        Order Confirmed!
      </h2>
      <p className="checkout-success-message">
        Thank you for your purchase. Your order number is{" "}
        <strong>{orderResult?.orderNumber || "#ORD-00000"}</strong>
        .<br />
        We'll email you an order confirmation with details and
        tracking info.
      </p>
      <button
        onClick={() => navigate("/")}
        className="checkout-continue-btn"
      >
        CONTINUE SHOPPING
      </button>
    </div>
  );
};

export default CheckoutSuccess;
