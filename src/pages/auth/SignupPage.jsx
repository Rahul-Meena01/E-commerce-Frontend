import { useState } from "react";
import { useNavigate, Link, useLocation } from "react-router-dom";
import { User, Mail, Phone, Lock, Eye, EyeOff } from "lucide-react";
import "../../styles/SignupPage.css";
import { useAuth } from '@/features/auth/hooks/useAuth';
import authFetch from '@/shared/utils/http';
import OptimizedImage from "@/shared/components/ui/OptimizedImage";

export default function SignupPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [accountExistsNotice, setAccountExistsNotice] = useState("");

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
    setAccountExistsNotice("");
    setLoading(true);

    const trimmedName = name.trim();
    const normalizedEmail = email.trim().toLowerCase();
    const trimmedPhone = phone.trim();
    const trimmedPassword = password.trim();
    const trimmedConfirmPassword = confirmPassword.trim();

    if (!trimmedName || !normalizedEmail || !trimmedPassword) {
      setError("Name, email, and password are required");
      setLoading(false);
      return;
    }

    if (trimmedPassword.length < 8) {
      setError("Password must be at least 8 characters");
      setLoading(false);
      return;
    }

    if (trimmedPassword !== trimmedConfirmPassword) {
      setError("Passwords do not match");
      setLoading(false);
      return;
    }

    try {
      const res = await authFetch("/api/auth/register", {
        method: "POST",
        body: {
          name: trimmedName,
          email: normalizedEmail,
          password: trimmedPassword,
          phone: trimmedPhone,
        },
      });

      const data = await parseResponse(res);

      if (!res.ok) {
        const message =
          data?.message || "Unable to create your account. Please try again.";
        const looksLikeDuplicateUser =
          res.status === 409 ||
          /already\s+registered|already\s+exists|user\s+already/i.test(message);

        if (looksLikeDuplicateUser) {
          setError("");
          setAccountExistsNotice("Account already exists. Try signing in.");
        } else {
          setAccountExistsNotice("");
          setError(message);
        }
      } else {
        login(data?.token, data?.user);
        const from = location.state?.from || "/profile";
        navigate(from, { replace: true });
      }
    } catch {
      setError("Server unavailable. Please try again in a moment.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page signup-page">
      <div className="login-left">
        <OptimizedImage
          src="/heroSection.png"
          alt="Premium Fashion"
          className="login-left-image"
        />

        <div className="login-left-logo">Loft</div>

        <div className="login-left-overlay">
          <span className="login-left-label">WELCOME</span>
          <h1 className="login-left-heading">
            Join the World
            <br />
            of Premium
            <br />
            Fashion
          </h1>
          <p className="login-left-desc">
            Create an account to access exclusive
            <br />
            styles and premium collections.
          </p>
        </div>
      </div>

      <div className="login-right">
        <div className="login-top-bar">
          <div className="login-top-left-group">
            <span className="login-top-text">Already have an account?</span>
            <Link to="/login" className="login-top-link">
              Sign in
            </Link>
          </div>

        </div>

        <div className="login-form-wrapper">
          <h2 className="login-heading">Create your account</h2>
          <p className="login-subheading">
            Join Loft — access premium collections and faster checkout.
          </p>

          <form onSubmit={onSubmit} className="login-form">
            {error && (
              <div className="login-error" role="alert" aria-live="assertive">
                {error}
              </div>
            )}

            <div className="signup-form-grid">
              <div className="login-field-group">
                <label htmlFor="name" className="login-label">Full Name</label>
                <div className="login-input-wrap">
                  <User size={18} className="login-input-icon" />
                  <input
                    id="name"
                    name="name"
                    type="text"
                    placeholder="Enter your full name"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    autoComplete="name"
                  />
                </div>
              </div>

              <div className="login-field-group">
                <label htmlFor="email" className="login-label">Email Address</label>
                <div className="login-input-wrap">
                  <Mail size={18} className="login-input-icon" />
                  <input
                    id="email"
                    name="email"
                    type="email"
                    placeholder="Enter your email address"
                    required
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      setAccountExistsNotice("");
                    }}
                    autoComplete="email"
                  />
                </div>
                {accountExistsNotice && (
                  <div
                    className="signup-inline-notify"
                    role="status"
                    aria-live="polite"
                  >
                    {accountExistsNotice}
                  </div>
                )}
              </div>

              <div className="login-field-group">
                <label htmlFor="phone" className="login-label">Phone Number</label>
                <div className="login-input-wrap">
                  <Phone size={18} className="login-input-icon" />
                  <input
                    id="phone"
                    name="phone"
                    type="tel"
                    placeholder="Enter your phone number"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    autoComplete="tel"
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
                    placeholder="Create a password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="new-password"
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

              <div className="login-field-group signup-field-group-full">
                <label htmlFor="confirmPassword" className="login-label">Confirm Password</label>
                <div className="login-input-wrap">
                  <Lock size={18} className="login-input-icon" />
                  <input
                    id="confirmPassword"
                    name="confirmPassword"
                    type={showPassword ? "text" : "password"}
                    placeholder="Confirm your password"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    autoComplete="new-password"
                  />
                </div>
              </div>
            </div>

            <button
              type="submit"
              className="login-submit-btn signup-submit-btn"
              disabled={loading}
            >
              {loading ? "CREATING ACCOUNT..." : "CREATE ACCOUNT"}
            </button>

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
          </form>
        </div>
      </div>
    </div>
  );
}
