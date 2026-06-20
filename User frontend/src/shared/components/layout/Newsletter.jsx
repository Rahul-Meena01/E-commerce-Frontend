import { useState } from "react";
import { siteContent } from "@/config/siteContent";
import "../../../styles/Newsletter.css";

const Newsletter = () => {
  const [email, setEmail] = useState("");
  const [subscribed, setSubscribed] = useState(false);
  const { newsletter } = siteContent;

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
        <p className="newsletter-label">{newsletter.label}</p>
        <h2 className="newsletter-title">{newsletter.title}</h2>
        <p className="newsletter-description">{newsletter.description}</p>

        <form className="newsletter-form" onSubmit={handleSubscribe}>
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
            />
            <button type="submit" className="newsletter-btn">
              {subscribed ? newsletter.successMessage : newsletter.buttonLabel}
            </button>
          </div>
        </form>
        <p className="newsletter-privacy">{newsletter.privacyText}</p>
      </div>
    </section>
  );
};

export default Newsletter;
