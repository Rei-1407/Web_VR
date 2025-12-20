// Centralized API configuration
// Vite exposes env vars via import.meta.env.* (typically prefixed with VITE_)
// CRA used REACT_APP_*; keep fallback for compatibility.

const viteBase = typeof import.meta !== "undefined" ? import.meta.env?.VITE_API_BASE_URL : undefined;
const craBase = typeof process !== "undefined" ? process.env?.REACT_APP_API_BASE_URL : undefined;

export const API_BASE_URL = String(viteBase || craBase || "http://localhost:5000").replace(/\/+$/, "");

export const apiUrl = (path) => {
  if (!path) return API_BASE_URL;
  return `${API_BASE_URL}/${String(path).replace(/^\/+/, "")}`;
};

export const publicUrl = (filePath) => apiUrl(`public/${String(filePath || "").replace(/^\/+/, "")}`);
