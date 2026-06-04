# 🛒 Ecommerce Category Management System

![Node.js](https://img.shields.io/badge/Node.js-Backend-green?style=for-the-badge&logo=node.js)
![Express.js](https://img.shields.io/badge/Express.js-Framework-black?style=for-the-badge&logo=express)
![MongoDB](https://img.shields.io/badge/MongoDB-Atlas-green?style=for-the-badge&logo=mongodb)
![Mongoose](https://img.shields.io/badge/Mongoose-ODM-red?style=for-the-badge)
![JavaScript](https://img.shields.io/badge/JavaScript-ES6-yellow?style=for-the-badge&logo=javascript)
![HTML](https://img.shields.io/badge/HTML-Markup-orange?style=for-the-badge&logo=html5)
![CSS](https://img.shields.io/badge/CSS-Styling-blue?style=for-the-badge&logo=css3)
![dotenv](https://img.shields.io/badge/dotenv-Environment-black?style=for-the-badge)
![Nodemon](https://img.shields.io/badge/Nodemon-Development-green?style=for-the-badge)

---

# 📌 Project Overview

The **Ecommerce Category Management System** is a full-stack backend + frontend project designed to manage a structured ecommerce product hierarchy.

This project handles a **3-layer category system**:

```bash
Parent Category → SubCategory → Products

Example:

Men
 ├── T-Shirts
 │     ├── Puma T-Shirt
 │     ├── Nike Oversized Tee
 │
 ├── Jeans
       ├── Levi's Slim Fit Jeans

Every layer is connected using MongoDB ObjectId references, ensuring products always belong to the correct subcategory and category without data mixing.

🚀 Tech Stack
Technology	Purpose
Node.js	Backend Runtime
Express.js	Server Framework
MongoDB Atlas	Cloud Database
Mongoose	MongoDB ODM
HTML	Frontend Structure
CSS	Styling
JavaScript	Frontend Logic
dotenv	Environment Variables
nodemon	Development Server
✨ Features
📂 Parent Category Management
Create Parent Categories
View All Categories
Update Categories
Delete Categories
Active / Inactive Status Control

Examples:

Men
Women
Kids
📁 SubCategory Management
Create SubCategories under specific Parent Categories
Parent validation using MongoDB ObjectId
Update/Delete SubCategories
Status Management

Examples:

T-Shirt
Jeans
Kurti
Shoes
🛍️ Product Management
Create Products under correct SubCategory
SubCategory validation
Product details:
Product Name
Brand
Price
Discount Price
Discount Percent
Status
Update/Delete Products
Prevent category mismatch
🌐 Backend Architecture
REST API based structure
MongoDB Atlas cloud integration
Clean MVC-like folder structure
Reusable routes and models
Environment variable support
🧠 Category Hierarchy Concept

This project follows a strict ecommerce hierarchy:

Parent Category
    ↓
SubCategory
    ↓
Products
Example Structure
Women
   ├── Kurti
   │      ├── Biba Printed Kurti
   │      ├── W Cotton Kurti
   │
   ├── Saree
          ├── Silk Saree
          ├── Banarasi Saree
Database Relationship
Collection	Connected With
Category	Parent Layer
SubCategory	References Category
Product	References SubCategory

This relationship ensures:

Products never mix into wrong categories
Proper ecommerce organization
Scalable database structure
Easy filtering and querying
📁 Project Folder Structure
Ecommerce-Category-Management/
│
├── config/
│   └── db.js
│
├── models/
│   ├── categoryModel.js
│   ├── subCategoryModel.js
│   └── productModel.js
│
├── routes/
│   ├── categoryRoutes.js
│   ├── subCategoryRoutes.js
│   └── productRoutes.js
│
├── public/
│   ├── css/
│   ├── js/
│   └── images/
│
├── views/
│
├── .env
├── .gitignore
├── package.json
├── server.js
└── README.md
⚙️ Installation & Setup
1️⃣ Clone Repository
git clone https://github.com/your-username/ecommerce-category-management.git
2️⃣ Move Into Project Folder
cd ecommerce-category-management
3️⃣ Install Dependencies
npm install
4️⃣ Create Environment File

Create a .env file in root directory.

MONGO_URI=your_mongodb_atlas_connection_string
PORT=5000
5️⃣ Start Development Server
npm run dev

OR

nodemon server.js
🔐 Environment Variables
Variable	Description
MONGO_URI	MongoDB Atlas Connection String
PORT	Server Running Port

Example:

MONGO_URI=mongodb+srv://username:password@cluster.mongodb.net/ecommerceDB
PORT=5000
📡 API Endpoints
📂 Category Routes
Method	Endpoint	Description
POST	/api/category	Create Category
GET	/api/category	Get All Categories
PUT	/api/category/:id	Update Category
DELETE	/api/category/:id	Delete Category
📁 SubCategory Routes
Method	Endpoint	Description
POST	/api/subCategory	Create SubCategory
GET	/api/subCategory	Get All SubCategories
PUT	/api/subCategory/:id	Update SubCategory
DELETE	/api/subCategory/:id	Delete SubCategory
🛍️ Product Routes
Method	Endpoint	Description
POST	/api/product	Create Product
GET	/api/product	Get All Products
PUT	/api/product/:id	Update Product
DELETE	/api/product/:id	Delete Product
🗄️ Sample Product Schema Concept
{
  productName: "Puma T-Shirt",
  brand: "Puma",
  price: 1500,
  discountPrice: 1200,
  discountPercent: 20,
  status: "active",
  subCategoryId: ObjectId
}
☁️ MongoDB Atlas Integration

This project uses MongoDB Atlas as a cloud database solution.

Benefits:

Cloud-hosted database
Easy scalability
Secure connections
Remote access support
Production-ready database management
🎯 Project Goals

This project was built to practice and demonstrate:

MongoDB relationships using ObjectId
REST API architecture
Backend validation logic
Structured ecommerce data handling
CRUD operations
Clean project architecture
📈 Future Improvements
Authentication & Authorization
Admin Dashboard
Image Uploads
Product Search & Filtering
Pagination
JWT Security
Role-based Access
React Frontend Integration
👨‍💻 Author
Developed By

Your Name

⭐ Support

If you found this project useful:

Star the repository ⭐
Fork the project 🍴
Improve and contribute 🚀
