import { Link } from "react-router-dom";

const NotFound = () => {
  return (
    <div style={{ padding: 80, textAlign: "center" }}>
      <h1>404 — Page Not Found</h1>
      <p>The page you are looking for does not exist.</p>
      <div style={{ marginTop: 24 }}>
        <Link to="/">Return to Home</Link>
      </div>
    </div>
  );
};

export default NotFound;
