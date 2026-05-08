import "../styles/Footer.css";

const Footer = () => {
  return (
    <footer className="footer">
      <div className="footer-container">
        <div className="footer-left">
          <span>GET IN TOUCH</span>

          <h2>
            Let's elevate
            <br />
            your style
            <br />
            together
          </h2>

          <p>
            Have questions about our collections or need styling advice? Send us
            a message and our premium fashion team will get back to you shortly.
          </p>

          <div className="footer-info">
            <a href="mailto:support@style.com">support@style.com</a>
            <a href="tel:+919876543210">+91 98765 43210</a>
          </div>
        </div>

        <div className="footer-right">
          <form onSubmit={(e) => e.preventDefault()}>
            <input type="text" placeholder="Your Name" aria-label="Your Name" />
            <input
              type="email"
              placeholder="Email Address"
              aria-label="Email Address"
            />
            <textarea
              placeholder="Write your message..."
              rows="6"
              aria-label="Message"
            ></textarea>
            <button type="submit">SEND MESSAGE</button>
          </form>
        </div>
      </div>

      <div className="footer-bottom">
        <p>© 2026 STYLE - Premium Fashion. All rights reserved.</p>
      </div>
    </footer>
  );
};

export default Footer;
