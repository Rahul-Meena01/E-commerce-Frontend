import { useEffect, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";

/**
 * BrandLoader - A premium initial-load screen preloader for LOFT.
 * Animates a centered logo with an elegant fade-in and letter-spacing expansion.
 * Fades out smoothly, and respects prefers-reduced-motion.
 */
export default function BrandLoader({ onComplete }) {
  const shouldReduceMotion = useReducedMotion();
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    // Timings designed for premium feel, total duration is 1.8s (under the 2s limit)
    // 0.0s - 1.2s: Logo animations
    // 1.2s: Fade-out transition begins
    // 1.8s: Component unmounts
    const exitTimer = setTimeout(() => {
      setIsExiting(true);
    }, 1200);

    const completeTimer = setTimeout(() => {
      if (onComplete) {
        onComplete();
      }
    }, 1800);

    return () => {
      clearTimeout(exitTimer);
      clearTimeout(completeTimer);
    };
  }, [onComplete]);

  // Full-screen overlay container motion variants
  const containerVariants = {
    initial: {
      opacity: 1,
    },
    exit: {
      opacity: 0,
      transition: {
        duration: 0.6,
        ease: [0.25, 1, 0.5, 1], // premium cubic-bezier easeOut
      },
    },
  };

  // Center LOFT logo motion variants
  const logoVariants = {
    initial: {
      opacity: 0,
      letterSpacing: shouldReduceMotion ? "0.4em" : "0.15em",
      scale: shouldReduceMotion ? 1 : 0.98,
    },
    animate: {
      opacity: 1,
      letterSpacing: shouldReduceMotion ? "0.4em" : "0.55em",
      scale: 1,
      transition: {
        duration: shouldReduceMotion ? 0.8 : 1.2,
        ease: [0.16, 1, 0.3, 1], // easeOutQuart
      },
    },
  };

  return (
    <motion.div
      className="brand-loader-overlay"
      variants={containerVariants}
      initial="initial"
      animate={isExiting ? "exit" : "initial"}
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "#000000",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 999999, // Overlay everything including skip link
        pointerEvents: isExiting ? "none" : "auto", // Prevent interactions while animating
      }}
      aria-busy="true"
      aria-label="Loading Loft experience..."
      role="progressbar"
    >
      <div style={{ overflow: "hidden", padding: "20px" }}>
        <motion.h1
          variants={logoVariants}
          initial="initial"
          animate="animate"
          style={{
            color: "#ffffff",
            fontFamily: "'Playfair Display', Georgia, serif",
            fontWeight: 400, // Elegant serif thin/light weight
            fontSize: "clamp(2.5rem, 5vw, 4rem)", // Fluid typography
            textTransform: "uppercase",
            margin: 0,
            paddingLeft: "0.55em", // Counter-balance letter-spacing to ensure absolute horizontal centering
            textAlign: "center",
            lineHeight: 1,
            colorScheme: "dark",
          }}
        >
          Loft
        </motion.h1>
      </div>
    </motion.div>
  );
}
