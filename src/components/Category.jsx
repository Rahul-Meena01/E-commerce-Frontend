import "../styles/Category.css";
import { Link } from "react-router-dom";

const categories = [
  {
    title: "Formal Wear",
    image:
      "https://images.unsplash.com/photo-1591195853828-11db59a44f6b?q=80&w=1092&auto=format&fit=crop",
  },
  {
    title: "Casual Wear",
    image:
      "https://plus.unsplash.com/premium_photo-1675186049222-0b5018db6ce9?q=80&w=687&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
  },
  {
    title: "Activewear",
    image:
      "https://images.unsplash.com/photo-1595909315417-2edd382a56dc?q=80&w=880&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
  },
  {
    title: "Accessories",
    image:
      "https://images.unsplash.com/photo-1548036328-c9fa89d128fa?q=80&w=1200&auto=format&fit=crop",
  },
  {
    title: "Streetwear",
    image:
      "https://plus.unsplash.com/premium_photo-1727967030845-6d0f0124ceb1?q=80&w=1074&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
  },
  {
    title: "Evening Wear",
    image:
      "https://plus.unsplash.com/premium_photo-1731950912675-f129f37efe5d?q=80&w=1170&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
  },
];

const CategoriesSection = () => {
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
      <div className="categories-grid">
        {categories.map((item) => (
          <div className="category-card" key={item.title}>
            <img
              src={item.image}
              alt={item.title}
              loading="lazy"
              onError={(e) => (e.currentTarget.src = "/favicon.svg")}
            />
            <div className="category-overlay">
              <h3>{item.title}</h3>
            </div>
          </div>
        ))}
      </div>
      <div className="categories-button">
        <Link to="/shop/women" className="explore-button">
          EXPLORE MORE
        </Link>
      </div>
    </section>
  );
};

export default CategoriesSection;
