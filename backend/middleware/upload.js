/*
 * Handover note: Shared multer upload configuration.
 * Product, variant, and profile routes use this middleware to accept image files,
 * store them in backend/uploads, and reject non-image extensions before saving data.
 */
import multer from "multer";
import path from "path";
import { fileURLToPath } from "url";

// Recreate __dirname for ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    // Safely joins the current directory with the uploads folder
    cb(null, path.join(__dirname, "../uploads/"));
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));
  },
});

const fileFilter = (req, file, cb) => {
  const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];

  if (allowedTypes.includes(file.mimetype)) {
    return cb(null, true);
  }

  const error = new Error("Only image files are allowed");
  error.statusCode = 400;
  return cb(error, false);
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024,
  },
});

export default upload;
