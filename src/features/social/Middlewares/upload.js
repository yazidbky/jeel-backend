import multer from "multer";
import path from "path";
import fs from "fs";
import crypto from "crypto";

const uploadDirectory = path.resolve("uploads");
fs.mkdirSync(uploadDirectory, { recursive: true });

const allowedTypes = new Map([
  ["image/jpeg", "image"],
  ["image/png", "image"],
  ["image/webp", "image"],
  ["video/mp4", "video"],
  ["video/webm", "video"],
]);

export const uploadMedia = multer({
  storage: multer.diskStorage({
    destination: uploadDirectory,
    filename: (_req, file, callback) => {
      callback(
        null,
        `${crypto.randomUUID()}${path.extname(file.originalname).toLowerCase()}`,
      );
    },
  }),
  limits: { fileSize: 50 * 1024 * 1024 - 1, files: 10 },
  fileFilter: (_req, file, callback) => {
    if (!allowedTypes.has(file.mimetype))
      return callback(new Error("Unsupported media type"));
    return callback(null, true);
  },
});

export const mediaTypeFor = (mimeType) => allowedTypes.get(mimeType);
