import { useState, useMemo } from "react";
import { Search } from "lucide-react";
import { BLOG_ARTICLES, POPULAR_POSTS, BLOG_FILTERS } from "../constants/blog";
import "../styles/Blog.css";
import OptimizedImage from "@/shared/components/ui/OptimizedImage";

const Blog = () => {
  const [activeFilter, setActiveFilter] = useState("All");
  const [searchTerm, setSearchTerm] = useState("");

  const filteredArticles = useMemo(() => {
    return BLOG_ARTICLES.filter((article) => {
      const matchesCategory =
        activeFilter === "All" ||
        article.category.toLowerCase() === activeFilter.toLowerCase();
      const matchesSearch =
        searchTerm === "" ||
        article.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        article.description.toLowerCase().includes(searchTerm.toLowerCase());
      return matchesCategory && matchesSearch;
    });
  }, [activeFilter, searchTerm]);

  const categoryCount = useMemo(
    () => ({
      All: BLOG_ARTICLES.length,
      Fashion: BLOG_ARTICLES.filter((a) => a.category === "FASHION").length,
      Lifestyle: BLOG_ARTICLES.filter((a) => a.category === "LIFESTYLE").length,
      Guides: BLOG_ARTICLES.filter((a) => a.category === "GUIDES").length,
      Trends: BLOG_ARTICLES.filter((a) => a.category === "TRENDS").length,
    }),
    [],
  );

  return (
    <div className="blog-page">
      <section className="blog-hero">
        <div className="blog-hero-content">
          <p className="blog-label">OUR BLOG</p>
          <h1 className="blog-title">Style. Inspiration. Culture.</h1>
          <p className="blog-description">
            Discover the latest in fashion, lifestyle, and design curated by our
            team of experts.
          </p>
        </div>
        <div className="blog-hero-image">
          <OptimizedImage
            src="https://images.unsplash.com/photo-1508739773434-c26b3d09e071?w=400&h=350&fit=crop"
            alt="Blog Hero"
          />
        </div>
      </section>

      <section className="blog-main">
        <div className="blog-content">
          <div className="blog-filters">
            {BLOG_FILTERS.map((filter) => (
              <button
                key={filter}
                className={`filter-btn ${activeFilter === filter ? "active" : ""}`}
                onClick={() => setActiveFilter(filter)}
                aria-pressed={activeFilter === filter}
              >
                {filter}
              </button>
            ))}
          </div>

          <div className="articles-grid">
            {filteredArticles.map((article) => (
              <article key={article.id} className="article-card">
                <div className="article-image">
                  <OptimizedImage src={article.image} alt={article.title} />
                </div>
                <div className="article-content">
                  <p className="article-category">{article.category}</p>
                  <h3 className="article-title">{article.title}</h3>
                  <p className="article-description">{article.description}</p>
                  <div className="article-meta">
                    <span className="article-date">{article.date}</span>
                    <span className="article-author">By {article.author}</span>
                  </div>
                </div>
              </article>
            ))}
          </div>

          <div className="load-more-container">
            <button className="load-more-btn">LOAD MORE ARTICLES</button>
          </div>
        </div>

        <aside className="blog-sidebar">
          <div className="sidebar-section">
            <h3 className="sidebar-title">Search Articles</h3>
            <div className="search-box">
              <input
                type="text"
                placeholder="Search..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              <Search size={18} strokeWidth={2} />
            </div>
          </div>

          <div className="sidebar-section">
            <h3 className="sidebar-title">Categories</h3>
            <ul className="categories-list">
              {BLOG_FILTERS.map((filter) => (
                <li key={filter} className="category-item">
                  <span className="category-name">{filter}</span>
                  <span className="category-count">
                    ({categoryCount[filter]})
                  </span>
                </li>
              ))}
            </ul>
          </div>

          <div className="sidebar-section">
            <h3 className="sidebar-title">Popular Posts</h3>
            <ul className="popular-posts-list">
              {POPULAR_POSTS.map((post) => (
                <li key={post.id} className="popular-post-item">
                  <OptimizedImage
                    src={post.image}
                    alt={post.title}
                    className="popular-post-image"
                  />
                  <div className="popular-post-content">
                    <h4 className="popular-post-title">{post.title}</h4>
                    <p className="popular-post-date">{post.date}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </aside>
      </section>
    </div>
  );
};

export default Blog;
