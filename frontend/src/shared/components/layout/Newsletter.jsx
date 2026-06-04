import { useState } from "react";
import "../../../styles/Newsletter.css";

const Newsletter = () => {
  const [email, setEmail] = useState("");
  const [subscribed, setSubscribed] = useState(false);

  const handleSubscribe = (e) => {
    e.preventDefault();
    if (email) {
      setSubscribed(true);
      setEmail("");
      setTimeout(() => setSubscribed(false), 3000);
    }
  };

  return (
    <section className="homepage-newsletter">
      <div className="newsletter-container">
        <p className="newsletter-label">THE LOFT JOURNAL</p>
        <h2 className="newsletter-title">Join Our Luxury Edit</h2>
        <p className="newsletter-description">
          Discover exclusive collections, styling insights, and early access
          to new releases.
        </p>

        <form className="newsletter-form" onSubmit={handleSubscribe}>
          <div className="newsletter-input-wrap">
            <input
              type="email"
              placeholder="Enter your email address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              aria-label="Subscribe to newsletter"
              required
            />
            <button type="submit" className="newsletter-btn">
              {subscribed ? "Thank you" : "Subscribe"}
            </button>
          </div>
        </form>
        <p className="newsletter-privacy">
          We respect your privacy. Unsubscribe at any time.
        </p>
      </div>
    </section>
  );
};

export default Newsletter;
