import { useEffect, useState, useRef } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { useToast } from "../../context/ToastContext";
import {
  ChevronDown,
  ChevronUp,
  MapPin,
  Mail,
  Phone,
  Clock,
  Briefcase,
  HelpCircle,
  Shield,
  FileText,
  Truck,
  RotateCcw,
  BookOpen,
} from "lucide-react";
import "../../styles/ui.css";
import "./InfoPage.css";

const INFO_PAGES = {
  about: {
    title: "About Us",
    subtitle: "The LOFT Heritage & Philosophy",
    icon: BookOpen,
  },
  contact: {
    title: "Contact Us",
    subtitle: "Reach Our Concierge Team",
    icon: Mail,
  },
  faq: {
    title: "Frequently Asked Questions",
    subtitle: "Common Inquiries & Answers",
    icon: HelpCircle,
  },
  privacy: {
    title: "Privacy Policy",
    subtitle: "Data Security & Consent",
    icon: Shield,
  },
  terms: {
    title: "Terms & Conditions",
    subtitle: "Rules & Guidelines",
    icon: FileText,
  },
  shipping: {
    title: "Shipping Policy",
    subtitle: "Delivery & Timelines",
    icon: Truck,
  },
  returns: {
    title: "Return Policy",
    subtitle: "Hassle-Free Returns & Exchanges",
    icon: RotateCcw,
  },
  careers: {
    title: "Careers",
    subtitle: "Join the LOFT Creative Team",
    icon: Briefcase,
  },
  help: {
    title: "Help Center",
    subtitle: "Support & Assistance",
    icon: HelpCircle,
  },
};

const FAQ_ITEMS = [
  {
    q: "How can I track my order?",
    a: "Once your order is shipped, you will receive an email confirmation with your tracking ID. You can enter this ID on our Order Tracking page or view updates directly in your LOFT Account dashboard under 'My Orders'.",
  },
  {
    q: "What payment methods do you accept?",
    a: "We accept all major credit and debit cards (Visa, MasterCard, RuPay), UPI (GPay, PhonePe, Paytm), Netbanking, and Cash on Delivery (COD) on eligible orders.",
  },
  {
    q: "Can I cancel or change my order?",
    a: "Orders can be cancelled or modified within 2 hours of placing them, provided they haven't entered the processing state. You can cancel your order directly from your profile tab under 'My Orders' or contact our concierge support.",
  },
  {
    q: "How long does shipping take?",
    a: "Standard shipping takes 3–5 business days. Express shipping is delivered within 1–2 business days. Delivery times may vary slightly based on destination.",
  },
  {
    q: "What is your return policy?",
    a: "We offer a 30-day return policy for all unworn, unwashed products with tags attached. Returns are free and can be scheduled directly from your customer dashboard.",
  },
];

const OPEN_POSITIONS = [
  {
    title: "Lead Curator & Vintage Specialist",
    dept: "Curation & Design",
    location: "New Delhi, IN (On-site)",
    type: "Full-Time",
  },
  {
    title: "Senior Digital Platform Designer",
    dept: "Digital Experience",
    location: "Remote / Bengaluru, IN",
    type: "Full-Time",
  },
  {
    title: "Editorial Storyteller & Stylist",
    dept: "Creative & Editorial",
    location: "Mumbai, IN (Hybrid)",
    type: "Full-Time",
  },
  {
    title: "Curation & Styling Apprentice",
    dept: "Curation & Design",
    location: "New Delhi, IN (On-site)",
    type: "6-Month Internship",
  },
];

const SLUG_MAP = {
  "shipping-policy": "shipping",
  "return-policy": "returns",
};

export default function InfoPage() {
  useParams();
  const navigate = useNavigate();
  const location = useLocation();
  
  // Resolve active tab from URL parameter or query path
  const [activeTab, setActiveTab] = useState(() => {
    // If route path is direct /about, etc., we resolve from location
    const pathParts = location.pathname.split("/");
    const pathSlug = pathParts[pathParts.length - 1];
    const normalized = SLUG_MAP[pathSlug] || pathSlug;
    return INFO_PAGES[normalized] ? normalized : "about";
  });

  const toast = useToast();
  const timeoutRef = useRef(null);
  const [formState, setFormState] = useState({ name: "", email: "", message: "" });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");

  useEffect(() => {
    const currentTimeout = timeoutRef.current;
    return () => {
      if (currentTimeout) {
        clearTimeout(currentTimeout);
      }
    };
  }, []);

  const handleContactSubmit = async (e) => {
    e.preventDefault();
    const { name, email, message } = formState;
    if (!name.trim() || !email.trim() || !message.trim()) {
      setSubmitError("Please fill out all fields.");
      return;
    }

    setIsSubmitting(true);
    setSubmitError("");

    const formspreeId = import.meta.env.VITE_FORMSPREE_ID;

    if (formspreeId) {
      try {
        const response = await fetch(`https://formspree.io/f/${formspreeId}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name, email, message }),
        });

        if (response.ok) {
          setFormState({ name: "", email: "", message: "" });
          toast.success("✓ Your message has been sent successfully!");
        } else {
          throw new Error("Failed to send message.");
        }
      } catch (err) {
        console.error("Contact form submission error:", err);
        setSubmitError("Failed to send message. Please try again later.");
        toast.error("Failed to submit form.");
      } finally {
        setIsSubmitting(false);
      }
    } else {
      // client-side delivery fallback: mailto
      setIsSubmitting(false);
      setFormState({ name: "", email: "", message: "" });
      toast.success("✓ Opening your mail client to send the message...");

      const mailtoUrl = `mailto:concierge@loft.com?subject=LOFT Contact Form - ${encodeURIComponent(name)}&body=${encodeURIComponent(
        `From: ${name} (${email})\n\nMessage:\n${message}`
      )}`;
      window.location.href = mailtoUrl;
    }
  };

  useEffect(() => {
    const pathParts = location.pathname.split("/");
    const pathSlug = pathParts[pathParts.length - 1];
    const normalized = SLUG_MAP[pathSlug] || pathSlug;
    if (INFO_PAGES[normalized]) {
      setActiveTab(normalized);
    }
  }, [location.pathname]);

  const handleTabChange = (slug) => {
    setActiveTab(slug);
    navigate(`/info/${slug}`);
  };

  // State for FAQ accordion
  const [openFaqIndex, setOpenFaqIndex] = useState(-1);

  const toggleFaq = (idx) => {
    setOpenFaqIndex(openFaqIndex === idx ? -1 : idx);
  };

  const renderContent = () => {
    switch (activeTab) {
      case "about":
        return (
          <div className="info-tab-content fade-in">
            <p className="info-lead">
              LOFT stands for List Of Favourite Thrift. LOFT isn't simply another thrift marketplace—it's a carefully curated collection of premium pre-loved fashion where every piece earns its place.
            </p>
            <div className="info-image-block">
              <div className="info-text-overlay-block">
                <h3>Our Curation</h3>
                <p>
                  Every garment in our catalog is hand-selected. We spend weekends discovering incredible vintage and second-hand pieces, ensuring each item meets our strict standards of longevity, fabric, and character. We believe every piece has another story to tell.
                </p>
              </div>
            </div>
            <div className="info-grid-2">
              <div>
                <h4>Timeless Design</h4>
                <p>
                  We look for exceptional quality, craftsmanship, and longevity. We believe clothing should be an investment—timeless pieces you return to season after season, crafted to last and made to be worn again.
                </p>
              </div>
              <div>
                <h4>Circular Fashion</h4>
                <p>
                  At LOFT, sustainability is at our core. Every purchase extends the life of well-made clothing. We value quality over quantity, packing every order in recycled, FSC-certified boxes to keep fashion circular.
                </p>
              </div>
            </div>
          </div>
        );

      case "contact":
        return (
          <div className="info-tab-content fade-in">
            <p className="info-lead">
              Whether you need sizing details, care advice, or have questions about a curated piece, our team is here to help.
            </p>

            <div className="info-grid-2">
              <div className="contact-details-box">
                <div className="contact-item">
                  <Mail className="contact-icon" />
                  <div>
                    <h5>Email Us</h5>
                    <p>concierge@loftfashion.com</p>
                    <span>Average reply time: Under 4 hours</span>
                  </div>
                </div>

                <div className="contact-item">
                  <Phone className="contact-icon" />
                  <div>
                    <h5>Call Us</h5>
                    <p>+91 11 4050 9000</p>
                    <span>Monday – Saturday, 10:00 AM – 7:00 PM IST</span>
                  </div>
                </div>

                <div className="contact-item">
                  <MapPin className="contact-icon" />
                  <div>
                    <h5>Atelier Showroom</h5>
                    <p>D-56, Defence Colony, New Delhi, Delhi 110024</p>
                  </div>
                </div>
              </div>

              <div className="contact-form-box">
                <h4>Send Us a Message</h4>
                {submitError && (
                  <div className="form-error-message" style={{ color: "#c53030", fontSize: "13px", marginBottom: "10px", fontWeight: "500" }}>
                    {submitError}
                  </div>
                )}
                <form onSubmit={handleContactSubmit} aria-busy={isSubmitting}>
                  <div className="form-group-info">
                    <label htmlFor="contact-name">Full Name</label>
                    <input
                      id="contact-name"
                      type="text"
                      placeholder="Your name"
                      value={formState.name}
                      onChange={(e) => setFormState(prev => ({ ...prev, name: e.target.value }))}
                      required
                      disabled={isSubmitting}
                    />
                  </div>
                  <div className="form-group-info">
                    <label htmlFor="contact-email">Email Address</label>
                    <input
                      id="contact-email"
                      type="email"
                      placeholder="Your email address"
                      value={formState.email}
                      onChange={(e) => setFormState(prev => ({ ...prev, email: e.target.value }))}
                      required
                      disabled={isSubmitting}
                    />
                  </div>
                  <div className="form-group-info">
                    <label htmlFor="contact-message">Message</label>
                    <textarea
                      id="contact-message"
                      rows="4"
                      placeholder="How can we help you?"
                      value={formState.message}
                      onChange={(e) => setFormState(prev => ({ ...prev, message: e.target.value }))}
                      required
                      disabled={isSubmitting}
                    ></textarea>
                  </div>
                  <button type="submit" className="info-submit-btn" disabled={isSubmitting}>
                    {isSubmitting ? "Sending..." : "Submit Message"}
                  </button>
                </form>
              </div>
            </div>
          </div>
        );

      case "faq":
        return (
          <div className="info-tab-content fade-in">
            <p className="info-lead">
              Find instant answers to the most common questions regarding shipping, returns, payment gateways, and accounts.
            </p>
            <div className="faq-list">
              {FAQ_ITEMS.map((item, idx) => (
                <div key={idx} className={`faq-item ${openFaqIndex === idx ? "active" : ""}`}>
                  <button className="faq-header" onClick={() => toggleFaq(idx)}>
                    <span>{item.q}</span>
                    {openFaqIndex === idx ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                  </button>
                  <div className="faq-body">
                    <p>{item.a}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );

      case "privacy":
        return (
          <div className="info-tab-content fade-in legal-text">
            <p><strong>Effective Date: March 1, 2026</strong></p>
            <p>
              At LOFT, we respect your privacy and are committed to protecting your personal data. This Privacy Policy describes how we collect, use, and share information when you visit or make a purchase from our website.
            </p>
            <h4>1. Information We Collect</h4>
            <p>
              When you purchase products or register an account, we collect personal details such as your name, billing address, shipping address, email address, phone number, and encrypted payment confirmations. We also gather browser cookies and device information to optimize your shopping experience.
            </p>
            <h4>2. How We Use Your Information</h4>
            <p>
              We utilize your personal information to fulfill orders, process payments, coordinate shipments, communicate updates, check for fraud, and, where aligned with your preferences, send newsletter styling guides.
            </p>
            <h4>3. Security & Encryptions</h4>
            <p>
              Your personal data is encrypted in transit using 256-bit SSL protocols. We strictly partner with PCI-compliant payment processors (Razorpay and Stripe) and never store card numbers or UPI PINs on our servers.
            </p>
          </div>
        );

      case "terms":
        return (
          <div className="info-tab-content fade-in legal-text">
            <p><strong>Last Updated: March 1, 2026</strong></p>
            <p>
              Welcome to the LOFT online storefront. By accessing or using our website, you agree to comply with and be bound by these Terms and Conditions. Please review them carefully.
            </p>
            <h4>1. Account Registration</h4>
            <p>
              When creating an account, you agree to provide accurate, current, and complete details. You are solely responsible for maintaining the confidentiality of your account credentials and password.
            </p>
            <h4>2. Product Availability & Pricing</h4>
            <p>
              All products listed are subject to availability. We reserve the right to correct pricing errors, cancel orders due to inaccurate inventory levels, or update listings at any time without prior notice.
            </p>
            <h4>3. Intellectual Property</h4>
            <p>
              All materials on this website, including designs, photography, text, logos, icons, and software, are the exclusive property of LOFT and are protected under international copyright and trademark laws.
            </p>
          </div>
        );

      case "shipping":
        return (
          <div className="info-tab-content fade-in">
            <p className="info-lead">
              We offer complimentary standard shipping on all orders over ₹1000. Orders are dispatched from our Delhi atelier within 24 hours of confirmation.
            </p>

            <table className="info-table">
              <thead>
                <tr>
                  <th>Method</th>
                  <th>Delivery Window</th>
                  <th>Fee</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Standard Shipping</td>
                  <td>3 – 5 Business Days</td>
                  <td>Free (Orders above ₹1000) / ₹99 (Below ₹1000)</td>
                </tr>
                <tr>
                  <td>Express Delivery</td>
                  <td>1 – 2 Business Days</td>
                  <td>₹250</td>
                </tr>
                <tr>
                  <td>International Shipping</td>
                  <td>7 – 12 Business Days</td>
                  <td>Calculated at Checkout (based on weight)</td>
                </tr>
              </tbody>
            </table>

            <div className="info-note-box">
              <h5>Important Shipping Notes:</h5>
              <ul>
                <li>Orders cannot be redirected once dispatched. Please double check your postal code and phone number.</li>
                <li>Expected deliveries are computed automatically and shown on every Product Detail Page.</li>
                <li>All shipments require a signature upon delivery to ensure safety.</li>
              </ul>
            </div>
          </div>
        );

      case "returns":
        return (
          <div className="info-tab-content fade-in">
            <p className="info-lead">
              We want you to love your LOFT garment. If a fit or style isn't perfect, we accept complimentary returns and exchanges within 30 days of delivery.
            </p>

            <div className="return-steps">
              <div className="return-step">
                <span className="step-num">01</span>
                <div>
                  <h6>Initiate Return</h6>
                  <p>Go to your Profile dashboard, click on 'My Orders', select the order and click 'Return Item'.</p>
                </div>
              </div>
              <div className="return-step">
                <span className="step-num">02</span>
                <div>
                  <h6>Pack Securely</h6>
                  <p>Place the item back in its original LOFT box with all labels, tissue wrap, and tags attached.</p>
                </div>
              </div>
              <div className="return-step">
                <span className="step-num">03</span>
                <div>
                  <h6>Free Pickup</h6>
                  <p>Our courier partner will arrive at your address within 24–48 hours to collect the parcel.</p>
                </div>
              </div>
              <div className="return-step">
                <span className="step-num">04</span>
                <div>
                  <h6>Refund Issued</h6>
                  <p>Once inspected at our atelier, refunds are credited back to your original payment mode within 5 business days.</p>
                </div>
              </div>
            </div>
          </div>
        );

      case "careers":
        return (
          <div className="info-tab-content fade-in">
            <p className="info-lead">
              We are always looking for curators, designers, and circular fashion advocates to join our Delhi-based atelier and help share the stories of pre-loved garments.
            </p>
            
            <h4 style={{ marginBottom: "20px", marginTop: "30px" }}>Open Positions</h4>
            <div className="positions-list">
              {OPEN_POSITIONS.map((pos, idx) => (
                <div key={idx} className="position-card">
                  <div>
                    <h5>{pos.title}</h5>
                    <p>{pos.dept} • {pos.location}</p>
                  </div>
                  <span className="pos-badge">{pos.type}</span>
                </div>
              ))}
            </div>

            <div className="careers-cta-box" style={{ marginTop: "40px", padding: "24px", background: "var(--ds-color-accent-soft)", borderRadius: "var(--ds-radius-md)" }}>
              <h5>Spontaneous Application</h5>
              <p>Don't see your role? We'd still love to hear from you. Send your portfolio and resume to <strong>careers@loft.com</strong>.</p>
            </div>
          </div>
        );

      case "help":
        return (
          <div className="info-tab-content fade-in">
            <p className="info-lead">
              How can we assist you today? Access our primary support systems below.
            </p>

            <div className="help-grid-3">
              <div className="help-card" onClick={() => navigate("/profile?tab=Orders")}>
                <Clock className="help-card-icon" />
                <h5>Track Order</h5>
                <p>Track your shipment status and delivery coordinates.</p>
              </div>

              <div className="help-card" onClick={() => handleTabChange("faq")}>
                <HelpCircle className="help-card-icon" />
                <h5>FAQ Database</h5>
                <p>Browse common inquiries on payments, coupons, and fits.</p>
              </div>

              <div className="help-card" onClick={() => handleTabChange("contact")}>
                <Mail className="help-card-icon" />
                <h5>Support Concierge</h5>
                <p>Reach our team for personalized assistance.</p>
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="info-page-container">
      <div className="info-page-layout">
        {/* Left Side Navigation */}
        <aside className="info-sidebar">
          <h2 className="info-sidebar-title">Information</h2>
          <nav className="info-nav">
            {Object.entries(INFO_PAGES).map(([slug, page]) => {
              const Icon = page.icon;
              return (
                <button
                  key={slug}
                  onClick={() => handleTabChange(slug)}
                  className={`info-nav-link ${activeTab === slug ? "active" : ""}`}
                >
                  <Icon size={16} />
                  <span>{page.title}</span>
                </button>
              );
            })}
          </nav>
        </aside>

        {/* Right Content Area */}
        <main className="info-main-content">
          <header className="info-header">
            <span className="info-eyebrow">
              {INFO_PAGES[activeTab]?.subtitle || "Information"}
            </span>
            <h1 className="info-title-text">
              {INFO_PAGES[activeTab]?.title}
            </h1>
          </header>
          
          <div className="info-body">
            {renderContent()}
          </div>
        </main>
      </div>
    </div>
  );
}
