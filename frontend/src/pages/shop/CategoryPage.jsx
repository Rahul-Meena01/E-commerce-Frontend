import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import CategoryCard from "@/features/products/components/CategoryCard";
import "../../styles/Category.css";
import { useCategories } from "@/features/products/hooks/useCategories";
import { useSubCategories } from "@/features/products/hooks/useSubCategories";
import { useProducts } from "@/features/products/hooks/useProducts";
import { IMAGE_FALLBACK } from "../../constants/images";
import { API_BASE_URL } from "@/shared/utils/api";

const resolveImage = (path) => {
  if (!path) return IMAGE_FALLBACK;
  if (path.startsWith("http://") || path.startsWith("https://") || path.startsWith("data:")) {
    return path;
  }
  return `${API_BASE_URL}${path}`;
};

const CategoryPage = () => {
  const { category: categorySlug } = useParams();
  const { categories } = useCategories();
  const [selectedCategory, setSelectedCategory] = useState(null);
  const { subcategories } = useSubCategories(selectedCategory?._id);
  const { products, loading } = useProducts({
    categoryId: selectedCategory?._id,
  });

  // Find the selected category by slug
  useEffect(() => {
    if (categories.length > 0 && categorySlug) {
      const found = categories.find(
        (cat) =>
          cat.slug === categorySlug || cat.slug === categorySlug.toLowerCase(),
      );
      setSelectedCategory(found || null);
    }
  }, [categorySlug, categories]);

  if (!selectedCategory) {
    return (
      <div className="category-page">
        <header className="cat-hero">
          <div className="cat-hero-inner">
            <h1 className="cat-title">Category Not Found</h1>
          </div>
        </header>
      </div>
    );
  }

  // Count products per subcategory
  const counts = {};
  subcategories.forEach((sub) => {
    counts[sub._id] = products.filter(
      (p) => p.subCategory?._id === sub._id || p.subCategory === sub._id,
    ).length;
  });

  return (
    <div className="category-page">
      <header className="cat-hero">
        <div className="cat-hero-inner">
          <h1 className="cat-title">{selectedCategory.name} Collection</h1>
        </div>
      </header>

      <section className="cat-grid">
        {subcategories.map((sub) => (
          <CategoryCard
            key={sub._id}
            title={sub.name}
            image={resolveImage(sub.image)}
            count={loading ? 0 : counts[sub._id] || 0}
            to={`/shop/${selectedCategory.slug}/${sub.slug}`}
          />
        ))}
      </section>
    </div>
  );
};

export default CategoryPage;
