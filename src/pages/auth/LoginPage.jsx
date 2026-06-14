import { useState } from "react";
import { useNavigate, Link, useLocation } from "react-router-dom";
import { Mail, Lock, Eye, EyeOff, Shield } from "lucide-react";
import "../../styles/LoginPage.css";
import { useAuth } from '@/features/auth/hooks/useAuth';
import authFetch from '@/shared/utils/http';
import OptimizedImage from "@/shared/components/ui/OptimizedImage";

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [isAdminMode, setIsAdminMode] = useState(false);

  const parseResponse = async (response) => {
    const contentType = response.headers.get("content-type") || "";

    if (contentType.includes("application/json")) {
      return response.json();
    }

    return { message: await response.text() };
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const normalizedEmail = email.trim().toLowerCase();

    if (!normalizedEmail || !password.trim()) {
      setError("Email and password are required");
      setLoading(false);
      return;
    }

    try {
      const res = await authFetch("/api/auth/login", {
        method: "POST",
        body: { email: normalizedEmail, password, role: isAdminMode ? "admin" : "user" },
      });

      const data = await parseResponse(res);

      if (!res.ok) {
        setError(
          data?.message || "Unable to sign in. Please check your credentials.",
        );
      } else {
        if (isAdminMode && data?.user?.role !== "admin") {
          setError("Access denied. You do not have administrator privileges.");
          return;
        }
        if (!isAdminMode && data?.user?.role === "admin") {
          setError("This account is an administrator account. Please select Admin Portal.");
          return;
        }

        login(data?.token, data?.user);
        
        if (data?.user?.role === "admin" || data?.user?.role === "vendor") {
          const adminUrl = import.meta.env.VITE_ADMIN_PORTAL_URL || "http://localhost:5174";
          window.location.href = `${adminUrl}/login?token=${encodeURIComponent(data.token)}&user=${encodeURIComponent(JSON.stringify(data.user))}`;
        } else {
          const from = location.state?.from || "/profile";
          navigate(from, { replace: true });
        }
      }
    } catch {
      setError("Server unavailable. Please try again in a moment.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-left">
        <OptimizedImage
          src="/heroSection.png"
          alt="Premium Fashion"
          className="login-left-image"
        />

        <div className="login-left-logo">Loft</div>

        <div className="login-left-overlay">
          <span className="login-left-label">PREMIUM COLLECTION</span>
          <h1 className="login-left-heading">
            Elevate Your
            <br />
            Style With
            <br />
            Sophistication
          </h1>
          <p className="login-left-desc">
            Discover timeless fashion pieces crafted
            <br />
            with elegance, luxury, and modern design.
          </p>
        </div>
      </div>

      <div className="login-right">
        <div className="login-top-bar">
          {!isAdminMode ? (
            <div className="login-top-left-group">
              <span className="login-top-text">New here?</span>
              <Link to="/signup" className="login-top-link">
                Create an account
              </Link>
            </div>
          ) : (
            <div className="login-top-left-group">
              <span className="login-top-text">Customer access?</span>
              <button 
                type="button" 
                className="login-top-link-btn"
                onClick={() => {
                  setIsAdminMode(false);
                  setError("");
                }}
              >
                Go to Customer Login
              </button>
            </div>
          )}
        </div>

        <div className="login-form-wrapper">
          <h2 className="login-heading">
            {isAdminMode ? "Admin Portal" : "Login to your account"}
          </h2>
          <p className="login-subheading">
            {isAdminMode 
              ? "Access the LOFT management console." 
              : "Enter your details below to access your account."}
          </p>

          <div className="login-mode-switcher">
            <button
              type="button"
              className={`login-mode-tab ${!isAdminMode ? "active" : ""}`}
              onClick={() => {
                setIsAdminMode(false);
                setError("");
              }}
            >
              Customer
            </button>
            <button
              type="button"
              className={`login-mode-tab ${isAdminMode ? "active" : ""}`}
              onClick={() => {
                setIsAdminMode(true);
                setError("");
              }}
            >
              Admin Portal
            </button>
          </div>

          <form onSubmit={onSubmit} className="login-form">
            {error && (
              <div className="login-error" role="alert" aria-live="assertive">
                {error}
              </div>
            )}
            <div className="login-field-group">
              <label htmlFor="email" className="login-label">Email Address</label>
              <div className="login-input-wrap">
                <Mail size={18} className="login-input-icon" />
                <input
                  id="email"
                  name="email"
                  type="email"
                  placeholder={isAdminMode ? "Enter admin email address" : "Enter your email address"}
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                />
              </div>
            </div>

            <div className="login-field-group">
              <label htmlFor="password" className="login-label">Password</label>
              <div className="login-input-wrap">
                <Lock size={18} className="login-input-icon" />
                <input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter your password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  className="login-eye-btn"
                  onClick={() => setShowPassword((s) => !s)}
                  aria-label="Toggle password visibility"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <div className="login-options-row">
              <label htmlFor="rememberMe" className="login-remember">
                <input id="rememberMe" name="rememberMe" type="checkbox" />
                <span>Remember me</span>
              </label>
              {!isAdminMode && (
                <Link to="/forgot" className="login-forgot">
                  Forgot password?
                </Link>
              )}
            </div>

            <button
              type="submit"
              className="login-submit-btn"
              disabled={loading}
            >
              {loading ? "Logging in..." : isAdminMode ? "ENTER PORTAL" : "LOGIN"}
            </button>
          </form>

          {!isAdminMode && (
            <>
              <div className="login-divider">
                <span>OR CONTINUE WITH</span>
              </div>

              <div className="login-social-row">
                <button className="login-social-btn" type="button">
                  <svg width="18" height="18" viewBox="0 0 24 24">
                    <path
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
                      fill="#4285F4"
                    />
                    <path
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      fill="#34A853"
                    />
                    <path
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                      fill="#FBBC05"
                    />
                    <path
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                      fill="#EA4335"
                    />
                  </svg>
                  Google
                </button>
                <button className="login-social-btn" type="button">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="#000">
                    <path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" />
                  </svg>
                  Apple
                </button>
              </div>
            </>
          )}

          <div className="login-security">
            <Shield size={18} className="login-security-icon" />
            <span>
              Your information is protected with 256-bit SSL encryption.
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
