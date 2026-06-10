import { Link } from "react-router-dom";
import "@/styles/Category.css";
import OptimizedImage from "@/shared/components/ui/OptimizedImage";

const CategoryCard = ({ title, image, count, to }) => {
  return (
    <Link to={to} className="cat-card">
      <div className="cat-card-media">
        <OptimizedImage
          src={image}
          alt={title}
        />
      </div>
      <div className="cat-card-body">
        <h3 className="cat-card-title">{title}</h3>
        <span className="cat-card-count">{count} products</span>
      </div>
    </Link>
  );
};

export default CategoryCard;
