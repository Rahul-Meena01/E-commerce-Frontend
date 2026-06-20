import { createContext, useContext, useState, useEffect, useCallback } from "react";
import api from "@/services/client";
import { useAuthState } from "@/features/auth/context/AuthContext";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/context/ToastContext";

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
  const [myGiftCards, setMyGiftCards] = useState([]);
  const [loadingMyCards, setLoadingMyCards] = useState(false);

  const { isAuthenticated } = useAuthState();
  const queryClient = useQueryClient();
  const toast = useToast();

  const fetchMyGiftCards = async () => {
    if (!isAuthenticated) {
      setMyGiftCards([]);
      return [];
    }
    setLoadingMyCards(true);
    try {
      const res = await api.get("/giftCard/my");
      const cards = res.data?.data || [];
      setMyGiftCards(cards);
      return cards;
    } catch (err) {
      console.error("Error fetching user's own active gift cards:", err);
      return [];
    } finally {
      setLoadingMyCards(false);
    }
  };

  const handleInvalidGiftCard = useCallback(async () => {
    setAppliedGiftCard(null);
    localStorage.removeItem("loft_applied_gift_card");
    if (isAuthenticated) {
      try {
        await api.delete("/cart/remove-giftcard");
        queryClient.invalidateQueries({ queryKey: ["cart"] });
        fetchMyGiftCards();
      } catch (err) {
        console.error("Failed to remove invalid gift card from backend:", err);
      }
    }
    toast.info("The applied gift card has expired or is invalid and has been removed.");
  }, [isAuthenticated, queryClient, toast]);

  // Sync gift card status with backend when auth status changes
  useEffect(() => {
    if (!isAuthenticated) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setAppliedGiftCard(null);
      setMyGiftCards([]);
      localStorage.removeItem("loft_applied_gift_card");
      return;
    }

    fetchMyGiftCards();

    const syncBackendGiftCard = async () => {
      try {
        const cartRes = await api.get("/cart");
        const cartData = cartRes.data?.data;
        if (cartData?.giftCardCode) {
          try {
            const verifyRes = await api.post("/giftCard/verify", { code: cartData.giftCardCode });
            if (verifyRes.data?.valid) {
              const verifiedCard = {
                code: cartData.giftCardCode.toUpperCase(),
                giftCardValue: verifyRes.data.amount,
                balance: verifyRes.data.amount,
                status: "active"
              };
              setAppliedGiftCard(verifiedCard);
              localStorage.setItem("loft_applied_gift_card", JSON.stringify(verifiedCard));
            } else {
              await handleInvalidGiftCard();
            }
          } catch {
            await handleInvalidGiftCard();
          }
        } else {
          // Backend has no gift card, check if local storage has one to sync up
          const stored = localStorage.getItem("loft_applied_gift_card");
          if (stored) {
            const localGC = JSON.parse(stored);
            try {
              const verifyRes = await api.post("/giftCard/verify", { code: localGC.code });
              if (verifyRes.data?.valid) {
                await api.post("/cart/apply-giftcard", { code: localGC.code });
                queryClient.invalidateQueries({ queryKey: ["cart"] });
              } else {
                await handleInvalidGiftCard();
              }
            } catch {
              await handleInvalidGiftCard();
            }
          } else {
            setAppliedGiftCard(null);
          }
        }
      } catch (err) {
        console.error("Error syncing gift card with backend:", err);
      }
    };

    syncBackendGiftCard();
  }, [isAuthenticated, queryClient, handleInvalidGiftCard]);

  const applyGiftCard = async (code) => {
    if (!code || !code.trim()) {
      setError("Please enter a gift card code.");
      return null;
    }

    setLoading(true);
    setError("");

    try {
      const response = await api.post("/giftCard/verify", { code: code.trim() });
      
      if (!response.data?.valid) {
        throw new Error(response.data?.message || "Gift card code not found or invalid.");
      }

      const verifiedCard = {
        code: code.trim().toUpperCase(),
        giftCardValue: response.data.amount,
        balance: response.data.amount,
        status: "active"
      };

      // If valid, save to state and localStorage
      setAppliedGiftCard(verifiedCard);
      localStorage.setItem("loft_applied_gift_card", JSON.stringify(verifiedCard));

      if (isAuthenticated) {
        await api.post("/cart/apply-giftcard", { code: verifiedCard.code });
        queryClient.invalidateQueries({ queryKey: ["cart"] });
        // Refresh my list
        fetchMyGiftCards();
      }

      setError("");
      return verifiedCard;
    } catch (err) {
      const msg = err.response?.data?.message || err.message || "Failed to apply gift card.";
      setError(msg);
      // eslint-disable-next-line preserve-caught-error
      throw new Error(msg);
    } finally {
      setLoading(false);
    }
  };

  const removeGiftCard = async () => {
    setAppliedGiftCard(null);
    localStorage.removeItem("loft_applied_gift_card");
    setError("");
    if (isAuthenticated) {
      try {
        await api.delete("/cart/remove-giftcard");
        queryClient.invalidateQueries({ queryKey: ["cart"] });
        // Refresh my list
        fetchMyGiftCards();
      } catch (err) {
        console.error("Failed to remove gift card from backend:", err);
      }
    }
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
        myGiftCards,
        loadingMyCards,
        fetchMyGiftCards,
      }}
    >
      {children}
    </GiftCardContext.Provider>
  );
};

// eslint-disable-next-line react-refresh/only-export-components
export const useGiftCard = () => {
  const context = useContext(GiftCardContext);
  if (!context) {
    throw new Error("useGiftCard must be used within a GiftCardProvider");
  }
  return context;
};
