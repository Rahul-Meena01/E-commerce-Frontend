const TOKEN_KEY = "loft_auth_token";
const USER_KEY = "loft_auth_user";

const canUseStorage = () =>
  typeof window !== "undefined" && typeof window.localStorage !== "undefined";

export const setAuthDebug = () => {};

const safeParseJson = (value) => {
  if (!value) {
    return null;
  }

  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
};

export const saveAuthSession = (token, user) => {
  if (!canUseStorage()) {
    return;
  }

  try {
    if (token) {
      window.localStorage.setItem(TOKEN_KEY, token);
    } else {
      window.localStorage.removeItem(TOKEN_KEY);
    }
    if (user) {
      window.localStorage.setItem(USER_KEY, JSON.stringify(user));
    } else {
      window.localStorage.removeItem(USER_KEY);
    }
  } catch (err) {
    void err;
  }
};

export const getAuthToken = () => {
  if (!canUseStorage()) {
    return null;
  }

  try {
    return window.localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
};

export const getAuthUser = () => {
  if (!canUseStorage()) {
    return null;
  }

  try {
    const raw = window.localStorage.getItem(USER_KEY);
    return safeParseJson(raw);
  } catch {
    return null;
  }
};

export const clearAuthSession = () => {
  if (!canUseStorage()) {
    return;
  }

  try {
    window.localStorage.removeItem(TOKEN_KEY);
    window.localStorage.removeItem(USER_KEY);
  } catch (err) {
    void err;
  }
};

