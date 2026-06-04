/**
 * Wraps an async Express route handler and forwards any thrown errors to next().
 * Eliminates boilerplate try/catch in every controller.
 */
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

export default asyncHandler;
