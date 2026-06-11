import { createContext, useContext, useState, useEffect } from "react";
import api from "@/services/client";
import { useAuthState } from "@/features/auth/context/AuthContext";

const GiftCardContext = createContext(null);

export const GiftCardProvider = ({ children }) => {
  const [appliedGiftCard, setAppliedGiftCard] = useState(() => {
    try {
      const stored = localStorage.getItem("loft_applied_gift_card");
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const { isAuthenticated } = useAuthState();

  // Clear gift card if user logs out
  useEffect(() => {
    if (!isAuthenticated) {
      setAppliedGiftCard(null);
      localStorage.removeItem("loft_applied_gift_card");
    }
  }, [isAuthenticated]);

  const applyGiftCard = async (code) => {
    if (!code || !code.trim()) {
      setError("Please enter a gift card code.");
      return null;
    }

    setLoading(true);
    setError("");

    try {
      // Fetch cards matching the search term
      const response = await api.get(`/giftCard/list?search=${encodeURIComponent(code.trim())}`);
      const cards = response.data?.data || [];
      
      // Find an exact match (case-insensitive)
      const exactMatch = cards.find(
        (card) => card.code.toUpperCase() === code.trim().toUpperCase()
      );

      if (!exactMatch) {
        throw new Error("Gift card code not found or invalid.");
      }

      // Validate status
      if (exactMatch.status === "inactive") {
        throw new Error("This gift card has already been used.");
      }

      if (exactMatch.status === "expired" || new Date(exactMatch.expiryDate) < new Date()) {
        throw new Error("This gift card has expired.");
      }

      if (exactMatch.status !== "active") {
        throw new Error("This gift card is not active.");
      }

      // If valid, save to state and localStorage
      setAppliedGiftCard(exactMatch);
      localStorage.setItem("loft_applied_gift_card", JSON.stringify(exactMatch));
      setError("");
      return exactMatch;
    } catch (err) {
      const msg = err.response?.data?.message || err.message || "Failed to apply gift card.";
      setError(msg);
      throw new Error(msg);
    } finally {
      setLoading(false);
    }
  };

  const removeGiftCard = () => {
    setAppliedGiftCard(null);
    localStorage.removeItem("loft_applied_gift_card");
    setError("");
  };

  return (
    <GiftCardContext.Provider
      value={{
        appliedGiftCard,
        loading,
        error,
        setError,
        applyGiftCard,
        removeGiftCard,
      }}
    >
      {children}
    </GiftCardContext.Provider>
  );
};

export const useGiftCard = () => {
  const context = useContext(GiftCardContext);
  if (!context) {
    throw new Error("useGiftCard must be used within a GiftCardProvider");
  }
  return context;
};
