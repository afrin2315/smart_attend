import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || "http://localhost:8000"
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("smartattend_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const downloadFile = async (path, filename) => {
  const response = await api.get(path, { responseType: "blob" });
  const blobUrl = window.URL.createObjectURL(response.data);
  const link = document.createElement("a");
  link.href = blobUrl;
  link.download = filename;
  link.click();
  window.URL.revokeObjectURL(blobUrl);
};

export const getWsBaseUrl = () => {
  const apiBase = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";
  return apiBase.replace(/^http/, "ws");
};

export default api;
