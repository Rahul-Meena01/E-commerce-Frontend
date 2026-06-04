import axios from "axios";
import { getAuthToken, clearAuthSession } from "../shared/utils/authStorage";

const api = axios.create({
  baseURL: `${import.meta.env.VITE_API_URL || "http://localhost:3000"}/api`,
  withCredentials: true,
});

api.interceptors.request.use((config) => {
  const token = getAuthToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      try {
        clearAuthSession();
        window.dispatchEvent(new Event("auth:unauthorized"));
      } catch (err) {
        void err;
      }
    }
    return Promise.reject(error);
  }
);

export default api;
