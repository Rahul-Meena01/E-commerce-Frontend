import { useState, useEffect, useCallback } from "react";
import "@/styles/Category.css";
import { Link } from "react-router-dom";
import { useSubCategories } from "../hooks/useSubCategories";
import OptimizedImage from "@/shared/components/ui/OptimizedImage";
import { IMAGE_FALLBACK } from "@/constants/images";

const DEFAULT_SUBCATEGORY_IMAGE = IMAGE_FALLBACK;

const getRandomSubCategories = (sourceArray, count, excludeArray = []) => {
  if (!sourceArray || sourceArray.length === 0) return [];
  
  // Filter out currently displayed items if we have enough total items
  let availableItems = sourceArray;
  if (sourceArray.length > count && excludeArray.length > 0) {
    const excludeIds = new Set(excludeArray.map(item => item._id));
    const nonExcluded = sourceArray.filter(item => !excludeIds.has(item._id));
    if (nonExcluded.length >= count) {
      availableItems = nonExcluded;
    }
  }

  // Shuffle and pick
  const shuffled = [...availableItems].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, Math.random() > 0.5 ? count : count); // Just standard slice, keeping syntax simple
};

const Category = () => {
  const { subcategories, loading, error } = useSubCategories();
  const [displayedSubCategories, setDisplayedSubCategories] = useState([]);
  const [isTransitioning, setIsTransitioning] = useState(false);

  useEffect(() => {
    if (subcategories && subcategories.length > 0 && displayedSubCategories.length === 0) {
      setDisplayedSubCategories(getRandomSubCategories(subcategories, 6));
    }
  }, [subcategories, displayedSubCategories.length]);

  const handleRefresh = useCallback(() => {
    if (!subcategories || subcategories.length <= 6) return; // Nothing to refresh if we have 6 or fewer

    setIsTransitioning(true);
    
    setTimeout(() => {
      setDisplayedSubCategories(prev => getRandomSubCategories(subcategories, 6, prev));
      setIsTransitioning(false);
    }, 400); // 400ms match css transition
  }, [subcategories]);

  if (loading && displayedSubCategories.length === 0) {
    return (
      <section className="categories">
        <div className="categories-heading">
          <p>SHOP BY CATEGORY</p>
          <h2>Loading curated styles...</h2>
        </div>
      </section>
    );
  }

  if (error || (subcategories.length === 0 && !loading)) {
    return (
      <section className="categories">
        <div className="categories-heading">
          <p>SHOP BY CATEGORY</p>
          <h2>Discover curated styles<br/>for every occasion</h2>
        </div>
      </section>
    );
  }

  return (
    <section className="categories">
      <div className="categories-heading">
        <p>SHOP BY CATEGORY</p>
        <h2>
          Discover curated styles
          <br />
          for every occasion
        </h2>
      </div>
      <div className={`categories-grid ${isTransitioning ? "fade-out" : "fade-in"}`}>
        {displayedSubCategories.map((subcat) => (
          <Link
            to={`/shop/${subcat.parentCategory?.slug || "all"}/${subcat.slug}`}
            className="category-card-link"
            key={subcat._id}
          >
            <div className="category-card">
              <OptimizedImage
                src={subcat.image || DEFAULT_SUBCATEGORY_IMAGE}
                alt={subcat.name}
              />
              <div className="category-overlay">
                <h3>{subcat.name}</h3>
              </div>
            </div>
          </Link>
        ))}
      </div>
      <div className="categories-button">
        <button onClick={handleRefresh} className="explore-button refresh-button">
          <span className={`refresh-icon ${isTransitioning ? "spinning" : ""}`}>↻</span> Refresh Collection
        </button>
      </div>
    </section>
  );
};

export default Category;
