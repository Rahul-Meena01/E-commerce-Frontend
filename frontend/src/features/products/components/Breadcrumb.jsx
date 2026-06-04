import { Link } from "react-router-dom";
import "@/styles/Breadcrumb.css";

const Breadcrumb = ({ items = [] }) => {
  return (
    <nav className="bc-nav" aria-label="Breadcrumb">
      <ol className="bc-list">
        {items.map((it, idx) => (
          <li
            key={idx}
            className={`bc-item ${idx === items.length - 1 ? "bc-current" : ""}`}
          >
            {it.to ? (
              <Link to={it.to}>{it.label}</Link>
            ) : (
              <span>{it.label}</span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
};

export default Breadcrumb;
