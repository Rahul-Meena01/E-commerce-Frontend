import { useState } from "react";
import "../styles/ShopPage.css";

const products = [
  {
    id: 1,
    name: "Premium Wool Blazer",
    price: 249,
    brand: "Zara",
    color: "Black",
    image:
      "https://images.unsplash.com/photo-1592878849122-facb97520f9e?q=80&w=880&auto=format&fit=crop",
  },
  {
    id: 2,
    name: "Luxury Cotton Shirt",
    price: 129,
    brand: "H&M",
    color: "White",
    image:
      "https://images.unsplash.com/photo-1594938298603-c8148c4dae35?q=80&w=400&auto=format&fit=crop",
  },
  {
    id: 3,
    name: "Designer Slim Jeans",
    price: 189,
    brand: "Levis",
    color: "Blue",
    image:
      "https://plus.unsplash.com/premium_photo-1674828600712-7d0caab39109?q=80&w=708&auto=format&fit=crop",
  },
  {
    id: 4,
    name: "Premium Casual T-Shirt",
    price: 79,
    brand: "Nike",
    color: "Green",
    image:
      "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?q=80&w=400&auto=format&fit=crop",
  },
  {
    id: 5,
    name: "Modern Overshirt",
    price: 159,
    brand: "Zara",
    color: "Brown",
    image:
      "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?q=80&w=600&auto=format&fit=crop",
  },
  {
    id: 6,
    name: "Classic Hoodie",
    price: 99,
    brand: "Nike",
    color: "Gray",
    image:
      "https://images.unsplash.com/photo-1556821840-3a63f95609a7?q=80&w=600&auto=format&fit=crop",
  },
];

const Men = () => {
  const [selectedBrand, setSelectedBrand] = useState("");
  const [selectedColor, setSelectedColor] = useState("");
  const [maxPrice, setMaxPrice] = useState(300);

  const filteredProducts = products.filter((product) => {
    return (
      (selectedBrand === "" || product.brand === selectedBrand) &&
      (selectedColor === "" || product.color === selectedColor) &&
      product.price <= parseInt(maxPrice, 10)
    );
  });

  return (
    <div className="shop-page">
      <div className="filters-section">
        <h2>Filters</h2>

        <div className="filter-group">
          <h3>Brand</h3>

          <select
            value={selectedBrand}
            onChange={(e) => setSelectedBrand(e.target.value)}
          >
            <option value="">All Brands</option>
            <option value="Zara">Zara</option>
            <option value="Nike">Nike</option>
            <option value="H&M">H&M</option>
            <option value="Levis">Levis</option>
          </select>
        </div>

        <div className="filter-group">
          <h3>Color</h3>

          <select
            value={selectedColor}
            onChange={(e) => setSelectedColor(e.target.value)}
          >
            <option value="">All Colors</option>
            <option value="Black">Black</option>
            <option value="White">White</option>
            <option value="Blue">Blue</option>
            <option value="Green">Green</option>
            <option value="Brown">Brown</option>
            <option value="Gray">Gray</option>
          </select>
        </div>

        <div className="filter-group">
          <h3>Price Range</h3>

          <input
            type="range"
            min="50"
            max="300"
            value={maxPrice}
            onChange={(e) => setMaxPrice(e.target.value)}
          />

          <p>Up to ${maxPrice}</p>
        </div>
      </div>

      <div className="products-section">
        <div className="shop-header">
          <h1>Men's Collection</h1>

          <p>Discover premium clothing crafted for the modern gentleman</p>
        </div>

        <div className="products-grid">
          {filteredProducts.map((product) => (
            <div key={product.id} className="product-card">
              <div className="product-image">
                <img
                  src={product.image}
                  alt={product.name}
                  loading="lazy"
                  onError={(e) => (e.currentTarget.src = "/favicon.svg")}
                />
              </div>

              <div className="product-info">
                <h3>{product.name}</h3>

                <p className="brand">{product.brand}</p>

                <p className="price">${product.price}</p>

                <button className="add-to-cart">Add to Cart</button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Men;
