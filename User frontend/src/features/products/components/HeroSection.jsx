import "@/styles/HeroSection.css";
import { Link } from "react-router-dom";
import { siteContent } from "@/config/siteContent";

const HeroSection = () => {
  const { hero } = siteContent;
  
  return (
    <section className="hero">
      <div className="hero-left">
        <video
          src={hero.heroVideoUrl || "/hero-video.mp4"}
          autoPlay
          loop
          muted
          playsInline
          className="hero-video"
        />

        <div className="hero-overlay">
          <p>{hero.subtitle}</p>

          <h1>
            {hero.titleLeft.split("\n").map((line, index) => (
              <span key={index}>
                {line}
                <br />
              </span>
            ))}
          </h1>
        </div>
      </div>

      <div className="hero-right">
        <div className="hero-content">
          <span className="small-heading">{hero.aboutHeading}</span>

          <h2>
            {hero.titleRight.split("\n").map((line, index) => (
              <span key={index}>
                {line}
                <br />
              </span>
            ))}
          </h2>

          <p>{hero.description}</p>

          <Link to={hero.ctaLink} className="hero-button">
            {hero.ctaLabel}
          </Link>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;

