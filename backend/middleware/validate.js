import { z } from "zod";

export const validate = (schema) => (req, res, next) => {
  const result = schema.safeParse(req.body);
  if (!result.success) {
    return res.status(400).json({ success: false, errors: result.error.errors });
  }
  req.body = result.data;
  next();
};
