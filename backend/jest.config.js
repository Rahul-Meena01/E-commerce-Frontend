export default {
  testEnvironment: "node",
  testMatch: ["**/__tests__/**/*.test.js"],
  collectCoverageFrom: [
    "modules/**/*.service.js",
    "utils/**/*.js",
    "!**/node_modules/**",
  ],
  coverageThreshold: {
    "./utils/calculateCartTotal.js": { branches: 50, functions: 50, lines: 70, statements: 70 },
    "./modules/auth/auth.service.js": { branches: 25, functions: 30, lines: 25, statements: 25 },
    "./modules/order/order.service.js": { branches: 25, functions: 30, lines: 25, statements: 25 },
  },
  moduleNameMapper: {
    "^.*config/env\\.js$": "<rootDir>/__tests__/helpers/mockEnv.js",
  },
  transform: {},
  testTimeout: 30000,
};
