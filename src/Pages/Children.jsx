import { useState } from "react";
import "../styles/ShopPage.css";

const products = [
  {
    id: 1,
    name: "Premium Kids T-Shirt",
    price: 49,
    brand: "Nike",
    color: "White",
    image:
      "https://encrypted-tbn2.gstatic.com/shopping?q=tbn:ANd9GcTkr61BtAb-17hXXyaKnzhZDfAJyGlTYNV331kzVhx0SDH8mmD_5RYS7RyhhzDqD3fvfXxPrgo25Z4himgSNsPy9rQbNNZzYajgGAVHk5SmuByoWj1-YeeenHWWAibWV_QH4rRe1cI&usqp=CAc",
  },
  {
    id: 2,
    name: "Durable Denim Pants",
    price: 69,
    brand: "Levis",
    color: "Blue",
    image:
      "https://encrypted-tbn3.gstatic.com/shopping?q=tbn:ANd9GcSWzTEpwLNF43hQY9IiXu-Oy3IDE6PinO7EgRU4wGwGamCRn_Roie65piQgtW6jBIPdSme2DAs3lQD9pKXFngo6MkCaJAolAZ2yF9OUHQrPZb_KQgm4Q7bPCt65G69tE3_qnp85lU-T&usqp=CAc",
  },
  {
    id: 3,
    name: "Cozy Sweater",
    price: 79,
    brand: "H&M",
    color: "Gray",
    image:
      "https://encrypted-tbn0.gstatic.com/shopping?q=tbn:ANd9GcQELSeStljzNiD1ihI0Kh_LjY81v7Hx3ftpYonNFDuaqDFAQT-rSu1E_aFeL6hs0jaDOl1ABAonCrivYZCCJo97ErlYA694m05seypfKJiDegpPHqK6GTzQypRxDl0zvcvQpha3iQ&usqp=CAc",
  },
  {
    id: 4,
    name: "Summer Dress Collection",
    price: 59,
    brand: "Zara",
    color: "Pink",
    image:
      "data:image/jpeg;base64,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",
  },
  {
    id: 5,
    name: "Casual Hoodie",
    price: 64,
    brand: "Nike",
    color: "Black",
    image:
      "https://encrypted-tbn3.gstatic.com/shopping?q=tbn:ANd9GcSAoRx8YJHqURf8BMtYre1DDWAV-Hu5x9NIVix2XR1bJkNCDNArOtULOrJPWGYk1U7RiPF9azlhLCbOHltgLYlIMh1Osx55rdzkfrN1B6UYJG8mP6XAPmi7XPdqzFLtr0-N_m7BSw&usqp=CAc",
  },
  {
    id: 6,
    name: "Sport Jacket",
    price: 89,
    brand: "Zara",
    color: "Navy",
    image:
      "https://encrypted-tbn0.gstatic.com/shopping?q=tbn:ANd9GcSPTzoS7Lj4-sjsvHjh2REHXqnrXlKSSHP0bo_Byfyu_pB2PRzDZivnU1CBNWLZh8Xg7n80EZ9fGxODbcpsbjHvw0kFjGmzg5TDJ2iyc196muQzEXKhSgIoywLe6bZgyjMgkxX3Aw&usqp=CAc",
  },
];

const Children = () => {
  const [selectedBrand, setSelectedBrand] = useState("");
  const [selectedColor, setSelectedColor] = useState("");
  const [maxPrice, setMaxPrice] = useState(100);

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
            <option value="White">White</option>
            <option value="Blue">Blue</option>
            <option value="Gray">Gray</option>
            <option value="Pink">Pink</option>
            <option value="Black">Black</option>
            <option value="Navy">Navy</option>
          </select>
        </div>

        <div className="filter-group">
          <h3>Price Range</h3>

          <input
            type="range"
            min="40"
            max="100"
            value={maxPrice}
            onChange={(e) => setMaxPrice(e.target.value)}
          />

          <p>Up to ${maxPrice}</p>
        </div>
      </div>

      <div className="products-section">
        <div className="shop-header">
          <h1>Children's Collection</h1>

          <p>Discover premium clothing crafted for stylish kids</p>
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

export default Children;
