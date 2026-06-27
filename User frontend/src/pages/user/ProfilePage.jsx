import "../../styles/ProfilePage.css";
import { useNavigate, useLocation } from "react-router-dom";
import { useEffect, useRef, useState } from "react";
import {
  useWishlistActions,
  useWishlistState,
} from '@/features/wishlist/hooks/useWishlist';
import { useCart } from '@/features/cart/hooks/useCart';
import {
  ArrowLeft,
  Pencil,
  Mail,
  Phone,
  MapPin,
  CalendarDays,
  ShoppingBag,
  Heart,
  Ticket,
  ArrowRight,
  User,
  ClipboardList,
  Settings,
  Lock,
  Crown,
  CheckCircle,
} from "lucide-react";

import { useAuthActions, useAuthState } from '@/features/auth/context/AuthContext';
import { useToast } from "../../context/ToastContext";
import { useGiftCard } from "@/context/GiftCardContext";
import OptimizedImage from "@/shared/components/ui/OptimizedImage";
import authFetch from '@/shared/utils/http';
import { saveAuthSession, getAuthToken } from '@/shared/utils/authStorage';
import logger from '@/shared/utils/logger';
import { formatPrice } from "@/utils/pricing";
import { useProfileOrdersQuery } from "../../features/auth/hooks/useProfileOrdersQuery";
import ProfileTabs from "../../features/auth/components/ProfileTabs";
import ProfileSectionOrders from "../../features/auth/components/ProfileSectionOrders";
import ProfileSectionWishlist from "../../features/auth/components/ProfileSectionWishlist";
import ProfileSectionAddresses from "../../features/auth/components/ProfileSectionAddresses";
import ProfileSectionSettings from "../../features/auth/components/ProfileSectionSettings";
import ProfileEditModal from "../../features/auth/components/ProfileEditModal";
import ProfileAvatarModal from "../../features/auth/components/ProfileAvatarModal";

const defaultProfileData = {
  name: "",
  email: "",
  phone: "",
  location: "",
  bio: "",
  image: "/profile-avatar.png",
};

const buildProfileData = (storedUser) => ({
  ...defaultProfileData,
  ...(storedUser || {}),
  image:
    storedUser?.profileImage || storedUser?.image || defaultProfileData.image,
});


const ProfilePage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { wishlistItems, wishlistCount } = useWishlistState();
  const { removeFromWishlist } = useWishlistActions();
  const { addToCart, appliedGiftCard, applyGiftCard, removeGiftCard } = useCart();
  const { myGiftCards, fetchMyGiftCards, loadingMyCards } = useGiftCard();
  const { isAuthenticated, user } = useAuthState();
  const { logout, setUser } = useAuthActions();
  const uploadInputRef = useRef(null);
  const cameraInputRef = useRef(null);
  const toast = useToast();

  const [activeTab, setActiveTab] = useState(() => {
    const params = new URLSearchParams(location.search);
    return params.get("tab") || "Profile";
  });

  const [gcTab, setGcTab] = useState("Active");

  useEffect(() => {
    if (activeTab === "Gift Cards" && isAuthenticated) {
      fetchMyGiftCards();
    }
  }, [activeTab, isAuthenticated, fetchMyGiftCards]);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showAvatarModal, setShowAvatarModal] = useState(false);
  const [showSuccessToast, setShowSuccessToast] = useState(false);
  const [profileData, setProfileData] = useState(() => buildProfileData(user));
  const [savedAddresses, setSavedAddresses] = useState([]);
  const [formData, setFormData] = useState(() => buildProfileData(user));
  const [formErrors, setFormErrors] = useState({});
  const [isSaving, setIsSaving] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState(
    () => buildProfileData(user).image,
  );
  const [settings, setSettings] = useState({
    emailNotifications: true,
    twoFactorAuth: false,
    darkMode: false,
    privacyPublic: false,
  });

  const [couponsCount, setCouponsCount] = useState(0);

  useEffect(() => {
    if (user) {
      const data = buildProfileData(user);
      setProfileData(data);
      setFormData(data);
      setAvatarPreview(data.image);
    }
  }, [user]);

  useEffect(() => {
    if (isAuthenticated) {
      authFetch("/api/coupon")
        .then((res) => {
          if (res.ok) return res.json();
        })
        .then((data) => {
          const list = Array.isArray(data) ? data : data?.data || data?.coupons || [];
          setCouponsCount(list.filter((c) => c.isActive !== false).length);
        })
        .catch(() => {});
    }
  }, [isAuthenticated]);

  const tabs = [
    { label: "Profile", icon: User },
    { label: "Orders", icon: ClipboardList },
    { label: "Wishlist", icon: Heart },
    { label: "Addresses", icon: MapPin },
    { label: "Gift Cards", icon: Ticket },
    { label: "Settings", icon: Settings },
  ];

  useEffect(() => {
    if (!isAuthenticated) {
      navigate("/login", { replace: true });
    }
  }, [isAuthenticated, navigate]);

  const ordersQuery = useProfileOrdersQuery(
    isAuthenticated,
  );
  const orders = ordersQuery.data || [];
  const ordersLoading = ordersQuery.isLoading;

  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key !== "Escape") {
        return;
      }

      if (showAvatarModal) {
        setShowAvatarModal(false);
        setAvatarPreview(profileData.image);
        return;
      }

      if (showEditModal) {
        setShowEditModal(false);
        setFormErrors({});
      }
    };

    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [showAvatarModal, showEditModal, profileData.image]);

  useEffect(() => {
    document.body.style.overflow =
      showEditModal || showAvatarModal ? "hidden" : "unset";
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [showEditModal, showAvatarModal]);

  // Load saved addresses for display in profile header
  const loadSavedAddresses = async () => {
    try {
      const res = await authFetch('/api/addresses');
      if (res.ok) {
        const json = await res.json();
        setSavedAddresses(json.addresses || []);
      }
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    loadSavedAddresses();
    const handler = () => loadSavedAddresses();
    window.addEventListener('addresses:updated', handler);
    return () => window.removeEventListener('addresses:updated', handler);
  }, []);

  if (!isAuthenticated) {
    return null;
  }

  const validateForm = () => {
    const errors = {};

    if (!formData.name.trim()) errors.name = "Name is required";
    if (!formData.email.trim()) {
      errors.email = "Email is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      errors.email = "Please enter a valid email";
    }
    if (!formData.phone.trim()) errors.phone = "Phone number is required";
    else if (!/^\+?[\d\s\-()]{10,}$/.test(formData.phone)) {
      errors.phone = "Please enter a valid phone number";
    }
    if (!formData.location.trim()) errors.location = "Location is required";

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleOpenModal = () => {
    setShowAvatarModal(false);
    setFormData(profileData);
    setFormErrors({});
    setShowEditModal(true);
  };

  const handleOpenAvatarModal = () => {
    setShowEditModal(false);
    setAvatarPreview(profileData.image);
    setShowAvatarModal(true);
  };

  const handleCloseModal = () => {
    setShowEditModal(false);
    setFormErrors({});
    setFormData(profileData);
  };

  const handleCloseAvatarModal = () => {
    setShowAvatarModal(false);
    setAvatarPreview(profileData.image);
  };

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));

    if (formErrors[name]) {
      setFormErrors((prev) => ({ ...prev, [name]: "" }));
    }
  };

  const handleImageUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Please select a valid image file");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image size must be less than 5MB");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      setFormData((prev) => ({ ...prev, image: event.target?.result }));
    };
    reader.readAsDataURL(file);
  };

  const handleAvatarFileSelect = (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";

    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Please select a valid image file");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image size must be less than 5MB");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      setAvatarPreview(event.target?.result);
    };
    reader.readAsDataURL(file);
  };

  const handleSaveAvatar = async () => {
    setIsSaving(true);
    try {
      const res = await authFetch("/api/auth/profile", {
        method: "PUT",
        body: {
          name: profileData.name,
          email: profileData.email,
          phone: profileData.phone,
          location: profileData.location,
          bio: profileData.bio,
          image: avatarPreview,
        },
      });

      if (res.ok) {
        const json = await res.json();
        const updatedUser = json.user;
        setProfileData(buildProfileData(updatedUser));
        setFormData(buildProfileData(updatedUser));

        // Save back to AuthContext state & local storage
        setUser(updatedUser);
        saveAuthSession(getAuthToken(), updatedUser);

        setShowAvatarModal(false);
        setShowSuccessToast(true);
        setTimeout(() => setShowSuccessToast(false), 3000);
      } else {
        const errData = await res.json();
        toast.error(errData.message || "Failed to save avatar.");
      }
    } catch (err) {
      logger.error(err);
      toast.error("Network error. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveProfile = async () => {
    if (!validateForm()) return;

    setIsSaving(true);
    try {
      const res = await authFetch("/api/auth/profile", {
        method: "PUT",
        body: {
          name: formData.name,
          email: formData.email,
          phone: formData.phone,
          location: formData.location,
          bio: formData.bio,
          image: formData.image,
        },
      });

      if (res.ok) {
        const json = await res.json();
        const updatedUser = json.user;
        setProfileData(buildProfileData(updatedUser));
        setFormData(buildProfileData(updatedUser));

        // Save back to AuthContext state & local storage
        setUser(updatedUser);
        saveAuthSession(getAuthToken(), updatedUser);

        setShowEditModal(false);
        setShowSuccessToast(true);
        setTimeout(() => setShowSuccessToast(false), 3000);
      } else {
        const errData = await res.json();
        toast.error(errData.message || "Failed to save profile changes.");
      }
    } catch (err) {
      logger.error(err);
      toast.error("Network error. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleModalOverlayClick = (e) => {
    if (e.target === e.currentTarget) {
      handleCloseModal();
    }
  };

  const toggleSetting = (setting) => {
    setSettings((prev) => ({ ...prev, [setting]: !prev[setting] }));
  };

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await logout();
      navigate("/login", { replace: true });
    } catch (err) {
      logger.error("Logout failed:", err);
    } finally {
      setIsLoggingOut(false);
    }
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case "Profile":
        return (
          <div className="profile-section-profile">
            <div className="profile-cta-card">
              <div className="profile-cta-icon">
                <Lock />
              </div>
              <div className="profile-cta-text">
                <h2 className="profile-cta-heading">
                  Your Account, Your Style
                </h2>
                <p className="profile-cta-description">
                  Manage your personal information, track your orders,
                  <br />
                  and update your preferences.
                </p>
              </div>
              <button
                className="profile-cta-btn"
                id="edit-profile-button"
                onClick={handleOpenModal}
              >
                Edit Profile
              </button>
            </div>

            <div className="profile-membership-info">
              <h3 className="profile-section-title">Atelier Benefits</h3>
              <div className="profile-benefits-list">
                <div className="profile-benefit-item">
                  <div className="profile-benefit-icon">
                    <ShoppingBag />
                  </div>
                  <div>
                    <h4>Atelier Shipping</h4>
                    <p>Complimentary for curated finds above {formatPrice(1000)}</p>
                  </div>
                </div>
                <div className="profile-benefit-item">
                  <div className="profile-benefit-icon">
                    <Ticket />
                  </div>
                  <div>
                    <h4>Thoughtful Value</h4>
                    <p>Enduring quality, curated for you</p>
                  </div>
                </div>
                <div className="profile-benefit-item">
                  <div className="profile-benefit-icon">
                    <Heart />
                  </div>
                  <div>
                    <h4>Journal Access</h4>
                    <p>First look at newly curated thrift finds</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );

      case "Orders":
        return (
          <ProfileSectionOrders
            orders={orders}
            ordersLoading={ordersLoading}
            navigate={navigate}
          />
        );

      case "Wishlist":
        return (
          <ProfileSectionWishlist
            wishlistCount={wishlistCount}
            wishlistItems={wishlistItems}
            removeFromWishlist={removeFromWishlist}
            addToCart={addToCart}
            navigate={navigate}
          />
        );

      case "Addresses":
        return (
          <ProfileSectionAddresses />
        );

      case "Gift Cards": {
        const activeList = myGiftCards.filter(
          (card) =>
            card.status === "active" &&
            new Date(card.expiryDate) > new Date() &&
            card.balance > 0
        );

        const usedList = myGiftCards.filter(
          (card) => card.balance <= 0 || card.status === "inactive"
        );

        const expiredList = myGiftCards.filter(
          (card) =>
            (card.status === "expired" || new Date(card.expiryDate) <= new Date()) &&
            card.balance > 0
        );

        const getTabList = () => {
          if (gcTab === "Active") return activeList;
          if (gcTab === "Used") return usedList;
          return expiredList;
        };

        const currentList = getTabList();
        
        const maskCode = (code) => {
          if (!code) return "";
          if (code.length <= 6) return code;
          return `${code.substring(0, 2)}-XXXX-${code.substring(code.length - 4)}`.replace(/--/g, "-");
        };

        return (
          <div className="profile-section-giftcards" style={{ width: "100%" }}>
            <div className="profile-section-header">
              <h2 className="profile-section-title">Gift Cards & Vouchers</h2>
              <p className="profile-section-subtitle">
                Redeem and manage your active gift cards
              </p>
            </div>

            {/* Redeem Gift Card Form */}
            <div className="profile-cta-card" style={{ marginBottom: "30px", flexDirection: "column", alignItems: "flex-start", gap: "16px", background: "var(--ds-color-surface-warm)", padding: "24px", border: "1px solid var(--ds-color-border-strong)" }}>
              <h3 className="profile-cta-heading" style={{ fontSize: "1.2rem", margin: "0", fontFamily: "var(--ds-font-serif)" }}>Redeem a Gift Card</h3>
              <p className="profile-cta-description" style={{ fontSize: "0.9rem", margin: "0", color: "var(--ds-color-text-muted)" }}>
                Enter your gift card code below to apply it to your account cart for your next checkout.
              </p>
              <form 
                onSubmit={async (e) => {
                  e.preventDefault();
                  const code = e.target.giftCardCode.value.trim();
                  if (!code) return;
                  try {
                    await applyGiftCard(code);
                    toast.success("Gift card applied successfully!");
                    e.target.reset();
                    fetchMyGiftCards();
                  } catch (err) {
                    toast.error(err.message || "Failed to apply gift card.");
                  }
                }}
                style={{ display: "flex", gap: "12px", width: "100%", maxWidth: "500px" }}
              >
                <input
                  type="text"
                  name="giftCardCode"
                  placeholder="e.g. LOFT-XXXXXX"
                  required
                  style={{
                    flex: 1,
                    padding: "12px 16px",
                    border: "1px solid var(--ds-color-border-strong)",
                    borderRadius: "0",
                    fontSize: "0.95rem",
                    textTransform: "uppercase",
                    backgroundColor: "var(--ds-color-surface)"
                  }}
                />
                <button
                  type="submit"
                  className="profile-cta-btn"
                  style={{ whiteSpace: "nowrap", padding: "12px 24px", borderRadius: "0", backgroundColor: "var(--ds-color-brand)", color: "var(--ds-color-surface)", border: "none", cursor: "pointer", fontFamily: "var(--ds-font-sans)", fontSize: "11px", letterSpacing: "0.1em", textTransform: "uppercase" }}
                >
                  REDEEM
                </button>
              </form>
            </div>

            {/* Gift Card History Tabs */}
            <div className="giftcard-history-tabs" style={{ display: 'flex', borderBottom: '1px solid var(--ds-color-border)', marginBottom: '24px' }}>
              {["Active", "Used", "Expired"].map(tab => {
                const count = tab === "Active" ? activeList.length : tab === "Used" ? usedList.length : expiredList.length;
                return (
                  <button
                    key={tab}
                    className={`giftcard-tab-btn ${gcTab === tab ? 'active' : ''}`}
                    onClick={() => setGcTab(tab)}
                    style={{
                      padding: '12px 24px',
                      background: 'none',
                      border: 'none',
                      borderBottom: gcTab === tab ? '2px solid var(--ds-color-accent, #C9A96E)' : 'none',
                      color: gcTab === tab ? 'var(--ds-color-text)' : 'var(--ds-color-text-muted)',
                      cursor: 'pointer',
                      fontWeight: gcTab === tab ? '700' : '400',
                      fontFamily: 'var(--ds-font-sans)',
                      fontSize: '12px',
                      letterSpacing: '0.1em',
                      textTransform: 'uppercase'
                    }}
                  >
                    {tab} ({count})
                  </button>
                );
              })}
            </div>

            {/* Tab content list */}
            {loadingMyCards ? (
              <div className="giftcard-loading">Loading gift card history...</div>
            ) : currentList.length > 0 ? (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: "20px" }}>
                {currentList.map((card) => {
                  const isCurrentlyApplied = appliedGiftCard && appliedGiftCard.code === card.code;
                  return (
                    <div key={card._id} className={`giftcard-card ${gcTab === "Active" ? "" : "expired"}`} style={{ display: "flex", flexDirection: "column", gap: "16px", padding: "24px" }}>
                      {isCurrentlyApplied && (
                        <span className="giftcard-card-recommended-badge" style={{ right: "24px", top: "16px" }}>
                          ✓ Applied to Cart
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
                          <span className={`giftcard-card-status ${gcTab === "Active" ? "active" : gcTab === "Expired" ? "expired" : "used"}`}>
                            {card.status}
                          </span>
                        </div>
                      </div>

                      {gcTab === "Active" && (
                        <div style={{ marginTop: "auto" }}>
                          {isCurrentlyApplied ? (
                            <button
                              className="giftcard-card-action"
                              style={{ backgroundColor: "transparent", color: "var(--ds-color-danger, #8B3A3A)", borderColor: "var(--ds-color-danger, #8B3A3A)" }}
                              onClick={async () => {
                                try {
                                  await removeGiftCard();
                                  toast.success("Gift card removed from cart.");
                                } catch (err) {
                                  console.error("Failed to remove gift card:", err);
                                  toast.error("Failed to remove gift card.");
                                }
                              }}
                            >
                              Remove from Cart
                            </button>
                          ) : (
                            <button
                              className="giftcard-card-action"
                              onClick={async () => {
                                try {
                                  await applyGiftCard(card.code);
                                  toast.success("✓ Gift Card Applied Successfully");
                                } catch (err) {
                                  toast.error(err.message || "Failed to apply gift card.");
                                }
                              }}
                            >
                              Apply to Cart
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="profile-empty-state" style={{ padding: "40px", border: "1px dashed var(--ds-color-border-strong)", textAlign: "center", width: "100%", backgroundColor: "var(--ds-color-surface-warm)" }}>
                <Ticket size={40} color="var(--ds-color-text-subtle)" style={{ marginBottom: "12px", opacity: 0.5 }} />
                <h4 style={{ margin: "0 0 6px 0", color: "var(--ds-color-text)" }}>No {gcTab.toLowerCase()} gift cards</h4>
                <p style={{ margin: "0", fontSize: "0.9rem", color: "var(--ds-color-text-muted)" }}>
                  There are no {gcTab.toLowerCase()} gift cards linked to your account.
                </p>
              </div>
            )}
          </div>
        );
      }

      case "Settings":
        return (
          <ProfileSectionSettings
            settings={settings}
            toggleSetting={toggleSetting}
            handleLogout={handleLogout}
            isLoggingOut={isLoggingOut}
          />
        );

      default:
        return null;
    }
  };

  const orderCount = orders.length;

  return (
    <div className="profile-page">
      <button
        className="profile-back-btn"
        onClick={() => navigate("/")}
        id="profile-back-button"
      >
        <ArrowLeft />
        Back to Home
      </button>

      <div className="profile-card">
        <div className="profile-top">
          <div className="profile-avatar-wrapper">
            <OptimizedImage
              src={profileData.image}
              alt="User profile"
              className="profile-avatar"
            />
            <button
              className="profile-edit-avatar"
              aria-label="Edit profile photo"
              id="edit-avatar-button"
              onClick={handleOpenAvatarModal}
            >
              <Pencil />
            </button>
          </div>

          <div className="profile-info">
            <h1 className="profile-name">
              {profileData.name || "New Customer"}
            </h1>

            <div className="profile-badge">
              <Crown />
              <span>LOFT Member</span>
            </div>

            <div className="profile-details">
              <div className="profile-detail-row">
                <Mail />
                <span>{profileData.email || "Email not added"}</span>
              </div>
              <div className="profile-detail-row">
                <Phone />
                <span>{profileData.phone || "Phone not added"}</span>
              </div>
              {savedAddresses.length > 0 && (
                <div className="profile-detail-row">
                  <MapPin />
                  <span>{`${savedAddresses[0].address}, ${savedAddresses[0].city} ${savedAddresses[0].postalCode} ${savedAddresses[0].country}`}</span>
                </div>
              )}
              <div className="profile-detail-row">
                <MapPin />
                <span>{profileData.location || "Add your location"}</span>
              </div>
              <div className="profile-detail-row">
                <CalendarDays />
                <span>
                  Joined {user?.createdAt 
                    ? new Date(user.createdAt).toLocaleDateString("en-US", { month: "long", year: "numeric" }) 
                    : "March 2026"}
                </span>
              </div>
            </div>
          </div>

          <div className="profile-stats">
            <div className="profile-stat-item">
              <div className="profile-stat-icon">
                <ShoppingBag />
              </div>
              <div className="profile-stat-content">
                <span className="profile-stat-number">{orderCount}</span>
                <div className="profile-stat-label-row">
                  <span className="profile-stat-label">Orders</span>
                  <span
                    className="profile-stat-link"
                    onClick={() => setActiveTab("Orders")}
                  >
                    <span>View all orders</span>
                    <ArrowRight />
                  </span>
                </div>
              </div>
            </div>

            <div className="profile-stat-item">
              <div className="profile-stat-icon">
                <Heart />
              </div>
              <div className="profile-stat-content">
                <span className="profile-stat-number">{wishlistCount}</span>
                <div className="profile-stat-label-row">
                  <span className="profile-stat-label">Wishlist Items</span>
                  <span
                    className="profile-stat-link"
                    onClick={() => setActiveTab("Wishlist")}
                  >
                    <span>View wishlist</span>
                    <ArrowRight />
                  </span>
                </div>
              </div>
            </div>

            <div className="profile-stat-item">
              <div className="profile-stat-icon">
                <Ticket />
              </div>
              <div className="profile-stat-content">
                <span className="profile-stat-number">{couponsCount}</span>
                <div className="profile-stat-label-row">
                  <span className="profile-stat-label">Coupons</span>
                  <span className="profile-stat-link">
                    <span>View coupons</span>
                    <ArrowRight />
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <ProfileTabs
          tabs={tabs}
          activeTab={activeTab}
          onChange={setActiveTab}
        />

        <div
          className="profile-bottom"
          role="tabpanel"
          id={`profile-panel-${activeTab.toLowerCase()}`}
          aria-labelledby={`profile-tab-${activeTab.toLowerCase()}`}
        >
          {renderTabContent()}
        </div>
      </div>

      <ProfileEditModal
        showEditModal={showEditModal}
        handleModalOverlayClick={handleModalOverlayClick}
        handleCloseModal={handleCloseModal}
        formData={formData}
        handleFormChange={handleFormChange}
        formErrors={formErrors}
        handleImageUpload={handleImageUpload}
        handleSaveProfile={handleSaveProfile}
        isSaving={isSaving}
      />

      <ProfileAvatarModal
        showAvatarModal={showAvatarModal}
        handleCloseAvatarModal={handleCloseAvatarModal}
        avatarPreview={avatarPreview}
        uploadInputRef={uploadInputRef}
        cameraInputRef={cameraInputRef}
        handleAvatarFileSelect={handleAvatarFileSelect}
        handleSaveAvatar={handleSaveAvatar}
      />

      {showSuccessToast && (
        <div className="profile-toast">
          <div className="profile-toast-content">
            <CheckCircle size={20} />
            <span>Profile updated successfully!</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProfilePage;
