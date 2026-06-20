import { useParams } from "react-router-dom";
import CategoryCard from "@/features/products/components/CategoryCard";
import "../../styles/Category.css";
import { useCategories } from "@/features/products/hooks/useCategories";
import { useSubCategories } from "@/features/products/hooks/useSubCategories";
import { useProducts } from "@/features/products/hooks/useProducts";
import { IMAGE_FALLBACK } from "../../constants/images";
import { resolveProductImage } from "@/shared/utils/api";
import ProductCardSkeleton from "@/features/products/components/ProductCardSkeleton";

const resolveImage = (path) => {
  return resolveProductImage(path) || IMAGE_FALLBACK;
};

const CategoryPage = () => {
  const { category: categorySlug } = useParams();
  const { categories, loading: categoriesLoading } = useCategories();
  
  // Derive selected category directly during render to prevent state-sync layout flash
  const selectedCategory = categories.find(
    (cat) =>
      cat.slug === categorySlug || cat.slug === categorySlug?.toLowerCase()
  );
  
  const { subcategories } = useSubCategories(selectedCategory?._id);
  const { products, loading } = useProducts({
    categoryId: selectedCategory?._id,
  });

  if (categoriesLoading || categories.length === 0) {
    return (
      <div className="category-page">
        <header className="cat-hero">
          <div className="cat-hero-inner">
            <div
              className="ds-skeleton"
              style={{
                height: "48px",
                width: "320px",
                margin: "0 auto",
              }}
            />
          </div>
        </header>

        <section className="cat-grid">
          {[...Array(6)].map((_, i) => (
            <ProductCardSkeleton key={i} />
          ))}
        </section>
      </div>
    );
  }
  
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
