// Lightweight logger that only logs in development
export function log(...args) {
  if (import.meta.env && import.meta.env.DEV) console.log(...args);
}

export function warn(...args) {
  if (import.meta.env && import.meta.env.DEV) console.warn(...args);
}

export function error(...args) {
  if (import.meta.env && import.meta.env.DEV) console.error(...args);
}

export default { log, warn, error };
