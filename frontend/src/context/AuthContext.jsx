import { createContext, useContext, useEffect, useState } from "react";

import api from "../api/client";

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const refresh = async () => {
    const response = await api.get("/auth/me");
    setUser(response.data);
    return response.data;
  };

  const login = async (email, password) => {
    const response = await api.post("/auth/login", { email, password });
    localStorage.setItem("smartattend_token", response.data.access_token);
    return refresh();
  };

  const register = async (payload) => {
    await api.post("/auth/register", payload);
    return login(payload.email, payload.password);
  };

  const logout = () => {
    localStorage.removeItem("smartattend_token");
    setUser(null);
  };

  useEffect(() => {
    const token = localStorage.getItem("smartattend_token");
    if (!token) {
      setLoading(false);
      return;
    }

    refresh()
      .catch(() => logout())
      .finally(() => setLoading(false));
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, refresh }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
