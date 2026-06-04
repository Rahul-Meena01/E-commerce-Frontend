import { useEffect, useState } from "react";
import "../../../styles/global.css";
import "../../../styles/ui.css";
import { ProductSkeleton } from "@/shared/ui/index.js";

export const TopProgressBar = () => {
  const [progress, setProgress] = useState(30);

  useEffect(() => {
    const timer = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 90) return prev;
        return prev + 10;
      });
    }, 150);

    return () => {
      clearInterval(timer);
      setProgress(100);
    };
  }, []);

  return (
    <div
      className="top-progress-bar"
      style={{
        "--progress": `${progress}%`,
        opacity: progress === 100 ? 0 : 1,
      }}
    />
  );
};

export default function LoadingSkeleton() {
  return (
    <div className="skeleton-page">
      <TopProgressBar />
      <div className="skeleton-header-shimmer" />
      <div className="skeleton-container">
        <ProductSkeleton count={4} />
      </div>
    </div>
  );
}
