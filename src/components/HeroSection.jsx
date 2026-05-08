import "../styles/HeroSection.css";
import { Link } from "react-router-dom";

const HeroSection = () => {
  return (
    <section className="hero">
      <div className="hero-left">
        <img
          src="https://images.unsplash.com/photo-1506152983158-b4a74a01c721?q=80&w=1173&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D"
          alt="Premium Fashion"
          loading="lazy"
          onError={(e) => (e.currentTarget.src = "/favicon.svg")}
        />

        <div className="hero-overlay">
          <p>PREMIUM COLLECTION</p>

          <h1>
            Elevate your
            <br />
            style with
            <br />
            sophistication
          </h1>
        </div>
      </div>

      <div className="hero-right">
        <div className="hero-content">
          <span className="small-heading">ABOUT COLLECTION</span>

          <h2>
            Timeless elegance
            <br />
            meets modern
            <br />
            fashion
          </h2>

          <p>
            Discover our curated collection of premium clothing pieces designed
            to bring sophistication and style to your wardrobe. Crafted with
            finest materials and contemporary design principles.
          </p>

          <Link to="/shop/men" className="hero-button" aria-label="Shop men">
            SHOP NOW
          </Link>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
