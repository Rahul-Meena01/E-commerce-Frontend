import "@/styles/HeroSection.css";
import { Link } from "react-router-dom";
import OptimizedImage from "@/shared/components/ui/OptimizedImage";

const HeroSection = () => {
  return (
    <section className="hero">
      <div className="hero-left">
        <OptimizedImage src="/heroSection.png" alt="Premium Fashion Collection" />

        <div className="hero-overlay">
          <p>Premium Collection</p>

          <h1>
            Elevate Your
            <br />
            Style With
            <br />
            Sophistication
          </h1>
        </div>
      </div>

      <div className="hero-right">
        <div className="hero-content">
          <span className="small-heading">About Collection</span>

          <h2>
            Timeless Elegance
            <br />
            Meets Modern Fashion
          </h2>

          <p>
            Discover our curated collection of premium clothing pieces designed
            to bring sophistication and style to your wardrobe. Crafted with
            finest materials and contemporary design principles.
          </p>

          <Link to="/shop/men" className="hero-button">
            Shop Now
          </Link>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
