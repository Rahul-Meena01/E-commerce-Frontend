import { Suspense, useState } from "react";
import LoadingSkeleton from "./shared/components/ui/LoadingSkeleton";
import ScrollToTop from "./shared/components/ui/ScrollToTop";
import BrandLoader from "./shared/components/ui/BrandLoader";
import "./App.css";

function App({ children }) {
  const [showLoader, setShowLoader] = useState(() => {
    if (typeof window !== "undefined") {
      const shown = sessionStorage.getItem("loft_brand_loader_shown");
      return !shown;
    }
    return true;
  });

  const handleLoaderComplete = () => {
    sessionStorage.setItem("loft_brand_loader_shown", "true");
    setShowLoader(false);
  };

  return (
    <>
      <ScrollToTop />
      {showLoader && <BrandLoader onComplete={handleLoaderComplete} />}
      <div className="page-wrap">
        <div
          className="page-transition"
          id="main-content"
          role="main"
        >
          <Suspense fallback={<LoadingSkeleton />}>
            {children}
          </Suspense>
        </div>
      </div>
    </>
  );
}

export default App;
