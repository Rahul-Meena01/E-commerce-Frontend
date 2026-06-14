export const API_BASE_URL = (import.meta.env.VITE_API_URL || "http://localhost:3000").replace(
  /\/$/,
  "",
);

export const buildApiUrl = (path) => {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${API_BASE_URL}${normalizedPath}`;
};

export const resolveProductImage = (path) => {
  if (!path) return "";
  if (path.startsWith("http://") || path.startsWith("https://") || path.startsWith("data:")) {
    return path;
  }
  if (path.startsWith("/uploads") || path.startsWith("uploads")) {
    const normalizedPath = path.startsWith("/") ? path : `/${path}`;
    return `${API_BASE_URL}${normalizedPath}`;
  }
  return path;
};

