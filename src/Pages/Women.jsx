import { useState } from "react";
import "../styles/ShopPage.css";

const products = [
  {
    id: 1,
    name: "Silk Evening Dress",
    price: 399,
    brand: "Zara",
    color: "Black",
    image:
      "https://images.unsplash.com/photo-1704775983143-2c83798831db?q=80&w=687&auto=format&fit=crop",
  },
  {
    id: 2,
    name: "Premium Cashmere Sweater",
    price: 249,
    brand: "H&M",
    color: "Cream",
    image:
      "https://images.unsplash.com/photo-1591195853828-11db59a44f6b?q=80&w=400&auto=format&fit=crop",
  },
  {
    id: 3,
    name: "Designer Wide-Leg Pants",
    price: 189,
    brand: "Zara",
    color: "Beige",
    image:
      "https://encrypted-tbn3.gstatic.com/shopping?q=tbn:ANd9GcTqNtXDgR9G55LE-i4q_5LMg4kgYA7VMS9EbOa6nxd6ZEn-LzP8587OsoPH5H9NdbM_GL7BUGgvq3iYy1q15XLRDk0sgE8p0929_ZEcCIJVSte1omuWaPzu3Gs",
  },
  {
    id: 4,
    name: "Luxury Leather Jacket",
    price: 499,
    brand: "Levis",
    color: "Brown",
    image:
      "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSguc-eO60QJy_LV1fuQfSa5ElpQ3KBVElaXA&s",
  },
  {
    id: 5,
    name: "Elegant Blouse",
    price: 129,
    brand: "Nike",
    color: "White",
    image:
      "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQnOAupr9r_np4AsPPYV2neod6BND4TBToxZg&s",
  },
  {
    id: 6,
    name: "Premium Skirt",
    price: 159,
    brand: "H&M",
    color: "Navy",
    image:
      "https://www.labelmadhurithakkar.com/cdn/shop/files/HMP_9894_1400x.jpg?v=1766977243",
  },
];

const Women = () => {
  const [selectedBrand, setSelectedBrand] = useState("");
  const [selectedColor, setSelectedColor] = useState("");
  const [maxPrice, setMaxPrice] = useState(500);

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
            <option value="Cream">Cream</option>
            <option value="Beige">Beige</option>
            <option value="Brown">Brown</option>
            <option value="Navy">Navy</option>
          </select>
        </div>

        <div className="filter-group">
          <h3>Price Range</h3>

          <input
            type="range"
            min="50"
            max="500"
            value={maxPrice}
            onChange={(e) => setMaxPrice(e.target.value)}
          />

          <p>Up to ${maxPrice}</p>
        </div>
      </div>

      <div className="products-section">
        <div className="shop-header">
          <h1>Women's Collection</h1>

          <p>Discover premium clothing crafted for the modern woman</p>
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

export default Women;
