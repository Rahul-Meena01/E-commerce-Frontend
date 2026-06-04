import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import CategoryCard from "@/features/products/components/CategoryCard";
import "../../styles/Category.css";
import { useCategories } from "@/features/products/hooks/useCategories";
import { useSubCategories } from "@/features/products/hooks/useSubCategories";
import { useProducts } from "@/features/products/hooks/useProducts";

const DEFAULT_SUBCAT_IMAGE =
  "https://via.placeholder.com/400x300?text=Subcategory";

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
          <p className="cat-sub">
            An edited edit of premium essentials and seasonal highlights.
          </p>
        </div>
      </header>

      <section className="cat-grid">
        {subcategories.map((sub) => (
          <CategoryCard
            key={sub._id}
            title={sub.name}
            image={DEFAULT_SUBCAT_IMAGE}
            count={loading ? 0 : counts[sub._id] || 0}
            to={`/shop/${selectedCategory.slug}/${sub.slug}`}
          />
        ))}
      </section>
    </div>
  );
};

export default CategoryPage;
