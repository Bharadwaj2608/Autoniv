import axios from "axios";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || "http://localhost:8000";
export const API = `${BACKEND_URL}/api`;

// Vapi public key (used by web SDK for in-browser calls)
export const VAPI_PUBLIC_KEY = process.env.REACT_APP_VAPI_PUBLIC_KEY || "";

export const api = axios.create({
  baseURL: API,
  withCredentials: true, // ✅ required for cross-domain cookie auth
});

// Attach token from localStorage to every request (fallback)
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export const BRAND = {
  logo: "https://static.prod-images.emergentagent.com/jobs/5e01079e-b26a-4fcd-88fa-81479c13dc81/images/b5163931fd9febdeb235d0536add61fc7d71b3a26316a49ffff0651dae253da7.png",
  loginBg: "https://images.unsplash.com/photo-1558591710-4b4a1ae0f04d?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjA1ODh8MHwxfHNlYXJjaHwxfHxhYnN0cmFjdCUyMGdlb21ldHJpYyUyMG1pbmltYWwlMjBiYWNrZ3JvdW5kJTIwbGlnaHR8ZW58MHx8fHwxNzgwMTI0NjE2fDA&ixlib=rb-4.1.0&q=85",
};

export function formatApiError(detail) {
  if (detail == null) return "Something went wrong. Please try again.";
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail)) {
    return detail
      .map((e) => (e && typeof e.msg === "string" ? e.msg : JSON.stringify(e)))
      .filter(Boolean)
      .join(" ");
  }
  if (detail && typeof detail.msg === "string") return detail.msg;
  return String(detail);
}