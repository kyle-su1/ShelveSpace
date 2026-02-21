import { createContext, useContext, useState, useEffect } from "react";
import { getToken, setToken as saveToken, clearToken, setRefreshToken } from "../api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = getToken();
    if (token) {
      try {
        // Decode Cognito IdToken payload (middle part)
        const payload = JSON.parse(atob(token.split(".")[1]));

        // Check if token is expired
        if (payload.exp * 1000 < Date.now()) {
          clearToken();
        } else {
          setUser({
            id: payload["custom:db_id"] ? parseInt(payload["custom:db_id"]) : null,
            email: payload.email,
            username: payload["preferred_username"] || payload.email,
            sub: payload.sub,
          });
        }
      } catch {
        clearToken();
      }
    }
    setLoading(false);
  }, []);

  const login = (token, userData, refreshToken) => {
    saveToken(token);
    if (refreshToken) setRefreshToken(refreshToken);
    setUser(userData);
  };

  const logout = () => {
    clearToken();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}