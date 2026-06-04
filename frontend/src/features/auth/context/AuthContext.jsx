/* eslint-disable react-refresh/only-export-components */
import {
  useState,
  useCallback,
  useMemo,
  useEffect,
  createContext,
  useContext,
} from "react";
import {
  getAuthToken,
  getAuthUser,
  saveAuthSession,
  clearAuthSession,
} from '@/shared/utils/authStorage';
import authFetch, { setUnauthorizedCallback } from '@/shared/utils/http';
import logger from '@/shared/utils/logger';

export const AuthContext = createContext(null);
const AuthStateContext = createContext(null);
const AuthActionsContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [token, setToken] = useState(getAuthToken);
  const [user, setUser] = useState(getAuthUser);

  const handleUnauthorized = useCallback(() => {
    setToken(null);
    setUser(null);
  }, []);

  useEffect(() => {
    setUnauthorizedCallback(handleUnauthorized);
    return () => {
      setUnauthorizedCallback(null);
    };
  }, [handleUnauthorized]);

  const isAuthenticated = useMemo(() => Boolean(token && user), [token, user]);

  const login = useCallback((newToken, newUser) => {
    saveAuthSession(newToken, newUser);
    setToken(newToken);
    setUser(newUser);
  }, []);

  const logout = useCallback(async () => {
    try {
      await authFetch("/api/auth/logout", { method: "POST" });
    } catch (err) {
      logger.error("Logout API failed", err);
    } finally {
      clearAuthSession();
      setToken(null);
      setUser(null);
    }
  }, []);

  const stateValue = useMemo(
    () => ({
      token,
      user,
      isAuthenticated,
    }),
    [token, user, isAuthenticated],
  );

  const actionsValue = useMemo(
    () => ({
      login,
      logout,
      setUser,
    }),
    [login, logout, setUser],
  );

  const value = useMemo(
    () => ({
      token,
      user,
      isAuthenticated,
      login,
      logout,
      setUser,
    }),
    [token, user, isAuthenticated, login, logout],
  );

  return (
    <AuthStateContext.Provider value={stateValue}>
      <AuthActionsContext.Provider value={actionsValue}>
        <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
      </AuthActionsContext.Provider>
    </AuthStateContext.Provider>
  );
};

export const useAuthState = () => {
  const context = useContext(AuthStateContext);
  if (!context) {
    throw new Error("useAuthState must be used within an AuthProvider");
  }
  return context;
};

export const useAuthActions = () => {
  const context = useContext(AuthActionsContext);
  if (!context) {
    throw new Error("useAuthActions must be used within an AuthProvider");
  }
  return context;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

export default useAuth;
