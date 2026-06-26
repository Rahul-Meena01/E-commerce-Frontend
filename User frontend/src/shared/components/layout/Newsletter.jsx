import { useState, useEffect, useRef } from "react";
import { siteContent } from "@/config/siteContent";
import { useToast } from "@/context/ToastContext";
import "../../../styles/Newsletter.css";

const Newsletter = () => {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [subscribed, setSubscribed] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");
  const { newsletter } = siteContent;
  const toast = useToast();
  const timeoutRef = useRef(null);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const handleSubscribe = (e) => {
    e.preventDefault();
    const trimmedEmail = email.trim();
    if (!trimmedEmail) return;

    setLoading(true);
    setStatusMessage("Subscribing...");

    timeoutRef.current = setTimeout(() => {
      setLoading(false);
      setSubscribed(true);
      setEmail("");
      setStatusMessage("Thank you for subscribing!");
      toast.success("✓ Thank you for subscribing to our Luxury Edit!");

      timeoutRef.current = setTimeout(() => {
        setSubscribed(false);
        setStatusMessage("");
      }, 3000);
    }, 800);
  };

  return (
    <section className="homepage-newsletter">
      <div className="newsletter-container">
        <p className="newsletter-label">{newsletter.label}</p>
        <h2 className="newsletter-title">{newsletter.title}</h2>
        <p className="newsletter-description">{newsletter.description}</p>

        <form className="newsletter-form" onSubmit={handleSubscribe} aria-busy={loading}>
          <div className="newsletter-input-wrap">
            <input
              id="newsletter-email"
              name="email"
              type="email"
              placeholder={newsletter.placeholder}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              aria-label="Subscribe to newsletter"
              required
              disabled={loading || subscribed}
            />
            <button type="submit" className="newsletter-btn" disabled={loading || subscribed}>
              {loading ? "SUBSCRIBING..." : subscribed ? newsletter.successMessage : newsletter.buttonLabel}
            </button>
          </div>
        </form>
        <div className="sr-only" aria-live="polite" role="status">
          {statusMessage}
        </div>
        <p className="newsletter-privacy">{newsletter.privacyText}</p>
      </div>
    </section>
  );
};

export default Newsletter;
