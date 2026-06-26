import { isValidPhoneNumber } from 'libphonenumber-js';

// Country-based postal code patterns
const postalPatterns = {
  IN: /^\d{6}$/,
  US: /^\d{5}$/,
  GB: /^[A-Z]{1,2}\d[A-Z\d]? ?\d[A-Z]{2}$/i,
  CA: /^[A-Z]\d[A-Z] ?\d[A-Z]\d$/i,
  AU: /^\d{4}$/,
};

/**
 * Validates international phone numbers using libphonenumber-js.
 * Supporting inline validation.
 * 
 * @param {string} phone 
 * @param {string} [countryCode] 
 * @returns {boolean}
 */
export const validatePhone = (phone, countryCode) => {
  if (!phone) return false;
  try {
    const cleanPhone = phone.trim();
    // If it starts with + we can validate it as international format
    if (cleanPhone.startsWith('+')) {
      return isValidPhoneNumber(cleanPhone);
    }
    // If no +, parse with countryCode fallback
    if (countryCode) {
      return isValidPhoneNumber(cleanPhone, countryCode.toUpperCase());
    }
    return false;
  } catch {
    return false;
  }
};

/**
 * Validates country-aware postal codes.
 * Fallbacks to a generic alphanumeric validation for unsupported countries.
 * 
 * @param {string} postalCode 
 * @param {string} countryCode 
 * @returns {boolean}
 */
export const validatePostalCode = (postalCode, countryCode) => {
  if (!postalCode) return false;
  const cleanPostal = postalCode.trim();
  const code = (countryCode || "").toUpperCase();
  const pattern = postalPatterns[code];
  if (pattern) {
    return pattern.test(cleanPostal);
  }
  // Generic validation fallback: alphanumeric, 3 to 10 characters, allowing spaces/hyphens
  const genericPattern = /^[A-Z0-9 -]{3,10}$/i;
  return genericPattern.test(cleanPostal);
};

/**
 * Validates address line to ensure length constraints and filter out placeholder garbage.
 * 
 * @param {string} addressLine 
 * @returns {boolean}
 */
export const validateAddress = (addressLine) => {
  if (!addressLine) return false;
  const trimmed = addressLine.trim();
  
  // Asserts length limits (5-120 characters)
  if (trimmed.length < 5 || trimmed.length > 120) {
    return false;
  }

  // Check for HTML/Script XSS injection
  const htmlScriptPattern = /<[^>]*>|javascript:|onerror=|onload=/i;
  if (htmlScriptPattern.test(trimmed)) {
    return false;
  }

  // Check for common placeholders
  const placeholders = [/asdf/i, /qwer/i, /zxcv/i, /placeholder/i, /^\d+$/];
  for (const regex of placeholders) {
    if (regex.test(trimmed)) {
      return false;
    }
  }

  // Check for repeated/duplicate punctuation (e.g., ,,,, or ---- or ....)
  if (/([.,\-_])\1{2,}/.test(trimmed)) {
    return false;
  }

  // Check for inputs consisting purely of special characters/punctuation
  if (/^[^a-zA-Z0-9\s\u00C0-\u017F\u0400-\u04FF\u3040-\u30FF\u4E00-\u9FFF]+$/.test(trimmed)) {
    return false;
  }

  return true;
};

/**
 * Validates address title (e.g. "Home", "Office")
 */
export const validateTitle = (title) => {
  if (!title) return false;
  const trimmed = title.trim();
  if (trimmed.length < 2 || trimmed.length > 30) return false;
  // Check for HTML/Script XSS injection
  if (/<[^>]*>|javascript:|onerror=|onload=/i.test(trimmed)) return false;
  // Alphanumeric, spaces, dashes, parentheses
  return /^[a-zA-Z0-9\s\-_()]+$/.test(trimmed);
};

/**
 * Validates full name
 */
export const validateFullName = (name) => {
  if (!name) return false;
  const trimmed = name.trim();
  if (trimmed.length < 2 || trimmed.length > 70) return false;
  // Check for HTML/Script XSS injection
  if (/<[^>]*>|javascript:|onerror=|onload=/i.test(trimmed)) return false;
  // No numbers or special characters except space, hyphen, period, apostrophe
  return /^[a-zA-Z\s\-'.\u00C0-\u017F\u0400-\u04FF\u3040-\u30FF\u4E00-\u9FFF]+$/.test(trimmed);
};

/**
 * Validates that country value exists, is non-empty, and is clean of script tags.
 */
export const validateCountry = (country) => {
  if (!country) return false;
  const trimmed = country.trim();
  if (trimmed.length < 2 || trimmed.length > 60) return false;
  if (/<[^>]*>|javascript:|onerror=|onload=/i.test(trimmed)) return false;
  return /^[a-zA-Z\s\-'.(),&]+$/.test(trimmed);
};

/**
 * Validates that state value exists, is non-empty, and is clean of script tags.
 */
export const validateState = (state) => {
  if (!state) return false;
  const trimmed = state.trim();
  if (trimmed.length < 2 || trimmed.length > 60) return false;
  if (/<[^>]*>|javascript:|onerror=|onload=/i.test(trimmed)) return false;
  return /^[a-zA-Z0-9\s\-'.(),&]+$/.test(trimmed);
};

/**
 * Validates that city value exists, is non-empty, and is clean of script tags.
 */
export const validateCity = (city) => {
  if (!city) return false;
  const trimmed = city.trim();
  if (trimmed.length < 2 || trimmed.length > 60) return false;
  if (/<[^>]*>|javascript:|onerror=|onload=/i.test(trimmed)) return false;
  return /^[a-zA-Z0-9\s\-'.(),&]+$/.test(trimmed);
};

